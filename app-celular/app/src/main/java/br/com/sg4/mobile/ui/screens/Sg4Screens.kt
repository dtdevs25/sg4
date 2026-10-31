package br.com.sg4.mobile.ui.screens

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.location.LocationManager
import android.net.Uri
import android.util.Base64
import android.util.LruCache
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.core.content.ContextCompat
import br.com.sg4.mobile.R
import br.com.sg4.mobile.model.*
import br.com.sg4.mobile.ui.components.StatusBadge
import br.com.sg4.mobile.ui.components.formatIsoDateBr
import br.com.sg4.mobile.ui.theme.*
import br.com.sg4.mobile.viewmodel.Sg4UiState
import br.com.sg4.mobile.viewmodel.Sg4ViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

object MobileImageCache {
    private val maxMemory = (Runtime.getRuntime().maxMemory() / 1024).toInt()
    private val cacheSize = (maxMemory / 8).coerceAtLeast(1024)
    val lru = object : LruCache<String, Bitmap>(cacheSize) {
        override fun sizeOf(key: String, bitmap: Bitmap): Int {
            return bitmap.byteCount / 1024
        }
    }
}

val Slate700 = Color(0xFF334155)

@Composable
fun standardTextInputColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = Slate900,
    unfocusedTextColor = Slate900,
    focusedContainerColor = Color.White,
    unfocusedContainerColor = Color(0xFFF8FAFC),
    focusedBorderColor = Sg4Purple,
    unfocusedBorderColor = Color(0xFFCBD5E1),
    focusedPlaceholderColor = Slate400,
    unfocusedPlaceholderColor = Slate400,
    cursorColor = Sg4Purple,
    focusedLabelColor = Sg4Purple,
    unfocusedLabelColor = Slate600
)

fun getDeviceLocation(context: Context): Pair<Double, Double>? {
    return try {
        val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return null
        val isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
        val isNetEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
        if (!isGpsEnabled && !isNetEnabled) return null

        val hasFine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasCoarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!hasFine && !hasCoarse) return null

        val loc = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
            ?: locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
        loc?.let { it.latitude to it.longitude }
    } catch (_: Exception) {
        null
    }
}

fun formatCurrencyBrlInput(digitsOnly: String): String {
    val clean = digitsOnly.filter { it.isDigit() }
    if (clean.isBlank()) return "R$ 0,00"
    val num = clean.toLongOrNull() ?: 0L
    val valor = num / 100.0
    return String.format(Locale("pt", "BR"), "R$ %.2f", valor)
}

fun parseCurrencyValue(formatted: String): Double {
    val clean = formatted.filter { it.isDigit() }
    if (clean.isBlank()) return 0.0
    val num = clean.toLongOrNull() ?: 0L
    return num / 100.0
}

private val MESES_NOMES = listOf(
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
)

private val CATEGORIAS_OFICIAIS = listOf(
    "INSPEÇÃO DE SEGURANÇA",
    "DSS",
    "REUNIÃO",
    "AUDITORIA",
    "AVALIAÇÃO ERGONÔMICA",
    "CAMPANHA SST",
    "CIPA",
    "COMBATE A INCÊNDIO",
    "EPI",
    "GESTÃO DE ACIDENTES",
    "KIT ERGONÔMICO",
    "PGR",
    "TREINAMENTO",
    "ADMINISTRATIVA",
    "OUTROS"
)

private val FREQUENCIAS_OFICIAIS = listOf(
    "UNICA" to "Não se repete (Apenas no dia)",
    "DIARIA" to "Diariamente (Seg a Sex)",
    "SEMANAL" to "Semanalmente",
    "QUINZENAL" to "Quinzenalmente (15 dias)",
    "MENSAL" to "Mensalmente",
    "BIMESTRAL" to "Bimestralmente",
    "TRIMESTRAL" to "Trimestralmente"
)

@Composable
fun AiSpellcheckButton(
    text: String,
    enabled: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(
                if (text.isNotBlank() && enabled) Color(0xFFF3E8FF) else Color(0xFFF1F5F9)
            )
            .border(
                1.dp,
                if (text.isNotBlank() && enabled) Color(0xFFD8B4FE) else Color(0xFFE2E8F0),
                RoundedCornerShape(8.dp)
            )
            .clickable(enabled = text.isNotBlank() && enabled) { onClick() }
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Icon(
                imageVector = Icons.Default.AutoAwesome,
                contentDescription = "Corrigir com IA",
                tint = if (text.isNotBlank() && enabled) Sg4Purple else Slate400,
                modifier = Modifier.size(13.dp)
            )
            Text(
                text = "IA",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = if (text.isNotBlank() && enabled) Sg4Purple else Slate400
            )
        }
    }
}

@Composable
fun DualStatDashboardCard(
    titleLeft: String,
    valueLeft: String,
    subLeft: String,
    titleRight: String,
    valueRight: String,
    subRight: String,
    gradientStart: Color,
    gradientEnd: Color,
    onClick: (() -> Unit)? = null
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(
                Brush.linearGradient(
                    colors = listOf(gradientStart, gradientEnd),
                    start = Offset(0f, 0f),
                    end = Offset(900f, 400f)
                )
            )
            .then(
                if (onClick != null) Modifier.clickable { onClick() } else Modifier
            )
            .padding(horizontal = 18.dp, vertical = 16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = titleLeft.uppercase(),
                    color = Color.White.copy(alpha = 0.78f),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = valueLeft,
                    color = Color.White,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.ExtraBold
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = subLeft,
                    color = Color.White.copy(alpha = 0.85f),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            Box(
                modifier = Modifier
                    .width(1.dp)
                    .height(54.dp)
                    .background(Color.White.copy(alpha = 0.22f))
            )

            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 16.dp),
                horizontalAlignment = Alignment.End
            ) {
                Text(
                    text = titleRight.uppercase(),
                    color = Color.White.copy(alpha = 0.78f),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = valueRight,
                    color = Color.White,
                    fontSize = 26.sp,
                    fontWeight = FontWeight.ExtraBold
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = subRight,
                    color = Color.White.copy(alpha = 0.85f),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
fun LoginScreen(
    uiState: Sg4UiState,
    viewModel: Sg4ViewModel
) {
    var email by remember(uiState.savedEmail, uiState.userEmail, uiState.rememberCredentials) {
        mutableStateOf(if (uiState.rememberCredentials && uiState.savedEmail.isNotBlank()) uiState.savedEmail else uiState.userEmail)
    }
    var password by remember(uiState.savedPassword, uiState.rememberCredentials) {
        mutableStateOf(if (uiState.rememberCredentials) uiState.savedPassword else "")
    }
    var rememberCreds by remember(uiState.rememberCredentials) {
        mutableStateOf(uiState.rememberCredentials)
    }
    var showPwd by remember { mutableStateOf(false) }
    var showForgotModal by remember { mutableStateOf(false) }
    var forgotEmail by remember { mutableStateOf("") }

    val glassTextFieldColors = OutlinedTextFieldDefaults.colors(
        focusedTextColor = Color.White,
        unfocusedTextColor = Color.White,
        cursorColor = Color.White,
        focusedContainerColor = Color(0x52FFFFFF),
        unfocusedContainerColor = Color(0x3DFFFFFF),
        focusedBorderColor = Color(0xA6FFFFFF),
        unfocusedBorderColor = Color(0x4DFFFFFF),
        focusedLeadingIconColor = Color.White,
        unfocusedLeadingIconColor = Color(0x99FFFFFF),
        focusedTrailingIconColor = Color.White,
        unfocusedTrailingIconColor = Color(0x99FFFFFF),
        focusedPlaceholderColor = Color(0x80FFFFFF),
        unfocusedPlaceholderColor = Color(0x80FFFFFF)
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        Color(0xFF7F0000),
                        Color(0xFFB91C1C),
                        Color(0xFFC0392B),
                        Color(0xFF8B0000)
                    ),
                    start = Offset(0f, 0f),
                    end = Offset(1200f, 1800f)
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .size(340.dp)
                .align(Alignment.TopStart)
                .offset(x = (-90).dp, y = (-90).dp)
                .background(
                    Brush.radialGradient(
                        colors = listOf(Color(0x59FF6464), Color.Transparent)
                    ),
                    CircleShape
                )
        )

        Box(
            modifier = Modifier
                .size(320.dp)
                .align(Alignment.BottomEnd)
                .offset(x = 90.dp, y = 90.dp)
                .background(
                    Brush.radialGradient(
                        colors = listOf(Color(0x80780000), Color.Transparent)
                    ),
                    CircleShape
                )
        )

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .clip(RoundedCornerShape(28.dp))
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color(0x2EFFFFFF),
                            Color(0x1AFFFFFF)
                        )
                    )
                )
                .border(
                    BorderStroke(1.dp, Color(0x3DFFFFFF)),
                    RoundedCornerShape(28.dp)
                )
                .padding(horizontal = 26.dp, vertical = 36.dp)
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Image(
                    painter = painterResource(id = R.drawable.logo_sg4_white),
                    contentDescription = "SG4 — Segurança do Trabalho",
                    modifier = Modifier
                        .width(175.dp)
                        .height(58.dp),
                    contentScale = ContentScale.Fit
                )

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "Gestão de Segurança do Trabalho",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White,
                    letterSpacing = 0.4.sp,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(10.dp))

                Box(
                    modifier = Modifier
                        .width(40.dp)
                        .height(2.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(Color(0x59FFFFFF))
                )

                Spacer(modifier = Modifier.height(26.dp))

                Text(
                    text = "USUÁRIO",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xCCFFFFFF),
                    letterSpacing = 0.8.sp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 6.dp)
                )

                OutlinedTextField(
                    value = email,
                    onValueChange = {
                        email = it
                        if (uiState.feedbackMessage != null) viewModel.clearFeedback()
                    },
                    placeholder = { Text("Digite seu e-mail", fontSize = 14.sp) },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = null,
                            modifier = Modifier.size(19.dp)
                        )
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = glassTextFieldColors,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "SENHA",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xCCFFFFFF),
                    letterSpacing = 0.8.sp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 6.dp)
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = {
                        password = it
                        if (uiState.feedbackMessage != null) viewModel.clearFeedback()
                    },
                    placeholder = { Text("Digite sua senha", fontSize = 14.sp) },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = null,
                            modifier = Modifier.size(19.dp)
                        )
                    },
                    trailingIcon = {
                        IconButton(onClick = { showPwd = !showPwd }) {
                            Icon(
                                imageVector = if (showPwd) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = if (showPwd) "Ocultar senha" else "Mostrar senha",
                                modifier = Modifier.size(19.dp)
                            )
                        }
                    },
                    visualTransformation = if (showPwd) VisualTransformation.None else PasswordVisualTransformation(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = glassTextFieldColors,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    Text(
                        text = "Esqueci minha senha",
                        fontSize = 12.5.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xCCFFFFFF),
                        textDecoration = TextDecoration.Underline,
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .clickable {
                                forgotEmail = email
                                showForgotModal = true
                            }
                            .padding(vertical = 4.dp, horizontal = 4.dp)
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Flag visual e persistente para salvar Usuário e Senha
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { rememberCreds = !rememberCreds }
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = rememberCreds,
                        onCheckedChange = { rememberCreds = it },
                        colors = CheckboxDefaults.colors(
                            checkedColor = Color.White,
                            checkmarkColor = Color(0xFF990000),
                            uncheckedColor = Color(0xCCFFFFFF)
                        ),
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Lembrar meu usuário e senha",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.White
                    )
                }

                Spacer(modifier = Modifier.height(18.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(
                            Brush.linearGradient(
                                colors = listOf(Color(0xFFFFFFFF), Color(0xFFFFE0E0))
                            )
                        )
                        .clickable(
                            enabled = !uiState.isBlockingLoading
                        ) {
                            if (email.isBlank() || password.isBlank()) {
                                return@clickable
                            }
                            viewModel.login(uiState.baseUrl, email, password, rememberCreds)
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (uiState.isBlockingLoading) "Entrando…" else "Entrar",
                        color = Color(0xFF9B0000),
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        letterSpacing = 0.5.sp
                    )
                }

                if (!uiState.feedbackMessage.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(14.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(
                                if (uiState.isErrorFeedback) Color(0x2EFF0000) else Color(0x2EFFFFFF)
                            )
                            .border(
                                1.dp,
                                if (uiState.isErrorFeedback) Color(0x59FF6464) else Color(0x59FFFFFF),
                                RoundedCornerShape(10.dp)
                            )
                            .padding(horizontal = 12.dp, vertical = 9.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = uiState.feedbackMessage,
                            color = if (uiState.isErrorFeedback) Color(0xFFFECACA) else Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }
    }

    if (showForgotModal) {
        Dialog(onDismissRequest = { if (!uiState.isBlockingLoading) showForgotModal = false }) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(24.dp))
                    .background(Color(0xFFE53935))
                    .border(1.dp, Color(0x29FFFFFF), RoundedCornerShape(24.dp))
                    .padding(horizontal = 26.dp, vertical = 28.dp)
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "Recuperar Acesso",
                        color = Color.White,
                        fontSize = 19.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Informe seu e-mail cadastrado. Enviaremos um link para redefinir sua senha.",
                        color = Color(0xB3FFFFFF),
                        fontSize = 13.sp,
                        lineHeight = 19.sp
                    )
                    Spacer(modifier = Modifier.height(20.dp))
                    Text(
                        text = "E-MAIL",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xCCFFFFFF),
                        letterSpacing = 0.8.sp,
                        modifier = Modifier.padding(bottom = 6.dp)
                    )
                    OutlinedTextField(
                        value = forgotEmail,
                        onValueChange = { forgotEmail = it },
                        placeholder = { Text("seu@email.com", fontSize = 14.sp) },
                        leadingIcon = {
                            Icon(
                                imageVector = Icons.Default.Email,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        colors = glassTextFieldColors,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(22.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(44.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0x14FFFFFF))
                                .border(1.dp, Color(0x40FFFFFF), RoundedCornerShape(12.dp))
                                .clickable(enabled = !uiState.isBlockingLoading) {
                                    showForgotModal = false
                                    forgotEmail = ""
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "Cancelar",
                                color = Color(0xE6FFFFFF),
                                fontSize = 13.5.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(44.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(
                                    Brush.linearGradient(
                                        colors = listOf(Color(0xFFFFFFFF), Color(0xFFFFE0E0))
                                    )
                                )
                                .clickable(
                                    enabled = !uiState.isBlockingLoading && forgotEmail.contains("@")
                                ) {
                                    viewModel.forgotPassword(forgotEmail) {
                                        showForgotModal = false
                                        forgotEmail = ""
                                    }
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = if (uiState.isBlockingLoading) "Enviando..." else "Enviar Link",
                                color = Color(0xFF9B0000),
                                fontSize = 13.5.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun HomeDashboardScreen(
    uiState: Sg4UiState,
    pendingOfflineCount: Int,
    viewModel: Sg4ViewModel
) {
    val calNow = remember { Calendar.getInstance() }
    val currentYearNum = remember { calNow.get(Calendar.YEAR) }
    val currentMonth1to12 = remember { calNow.get(Calendar.MONTH) + 1 }

    var selectedYear by remember { mutableIntStateOf(currentYearNum) }
    // Por padrão vem selecionado o mês atual
    val selectedMonths = remember {
        mutableStateListOf<Int>().apply { add(currentMonth1to12) }
    }

    var showYearDropdown by remember { mutableStateOf(false) }
    var showMonthsDialog by remember { mutableStateOf(false) }
    var showTecnicoDropdown by remember { mutableStateOf(false) }

    val tecnico = uiState.syncData.currentTecnico
    val summary = uiState.syncData.summary
    val firstName = remember(tecnico?.nome, uiState.userName) {
        (tecnico?.nome ?: uiState.userName.ifBlank { "Técnico" }).trim().split(" ").firstOrNull() ?: "Técnico"
    }

    val yearsList = remember(uiState.syncData.availableYears, currentYearNum) {
        val parsed = uiState.syncData.availableYears.mapNotNull { it.toIntOrNull() }
        if (parsed.isEmpty()) listOf(currentYearNum, currentYearNum - 1) else parsed
    }

    val isMasterOrAdmin = remember(uiState.userRole) {
        uiState.userRole.uppercase() in listOf("MASTER", "ADMIN")
    }

    val isAllTecnicos = uiState.selectedTecnicoId == "ALL"
    val activeTecnicosCount = remember(uiState.syncData.tecnicos) {
        uiState.syncData.tecnicos.count { it.id != "ALL" }.coerceAtLeast(1)
    }


    val currentTecName = remember(uiState.selectedTecnicoId, uiState.syncData.tecnicos) {
        if (uiState.selectedTecnicoId == "ALL") "Todos os Colaboradores"
        else uiState.syncData.tecnicos.find { it.id == uiState.selectedTecnicoId }?.nome ?: tecnico?.nome ?: "Meu Perfil"
    }

    // Filtra as estatísticas mensais pelos meses e ano selecionados
    val monthlyStats = uiState.syncData.monthlyStats
    val activeMonthsCount = selectedMonths.size.coerceAtLeast(1)

    val filteredStats = remember(monthlyStats, selectedYear, selectedMonths.toList()) {
        monthlyStats.filter { it.year == selectedYear && selectedMonths.contains(it.month) }
    }

    val dssRealizados = if (filteredStats.isNotEmpty()) {
        filteredStats.sumOf { it.dssCount }
    } else if (selectedYear == currentYearNum && selectedMonths.contains(currentMonth1to12)) {
        summary.dssRealizadosMes
    } else 0

    val dssMeta = if (filteredStats.isNotEmpty()) {
        filteredStats.sumOf { it.dssMeta }.coerceAtLeast(8 * activeMonthsCount)
    } else {
        8 * activeMonthsCount
    }
    val dssPct = if (dssMeta > 0) ((dssRealizados * 100.0) / dssMeta).toInt() else 0

    val inspecoesRealizadas = if (filteredStats.isNotEmpty()) {
        filteredStats.sumOf { it.inspecoesCount }
    } else if (selectedYear == currentYearNum && selectedMonths.contains(currentMonth1to12)) {
        summary.inspecoesRealizadasMes
    } else 0

    val inspecoesMeta = if (filteredStats.isNotEmpty()) {
        filteredStats.sumOf { it.inspecoesMeta }.coerceAtLeast(20 * activeMonthsCount)
    } else {
        20 * activeMonthsCount
    }
    val inspecoesPct = if (inspecoesMeta > 0) ((inspecoesRealizadas * 100.0) / inspecoesMeta).toInt() else 0

    val relatoriosIncluidos = if (filteredStats.isNotEmpty()) {
        filteredStats.sumOf { it.relatoriosCount }
    } else if (selectedYear == currentYearNum && selectedMonths.contains(currentMonth1to12)) {
        summary.relatoriosMes
    } else 0

    val ncAbertas = if (filteredStats.isNotEmpty()) {
        filteredStats.sumOf { it.ncAbertas }
    } else if (selectedYear == currentYearNum && selectedMonths.contains(currentMonth1to12)) {
        summary.ncAbertasMes
    } else 0

    val ncFechadas = if (filteredStats.isNotEmpty()) {
        filteredStats.sumOf { it.ncFechadas }
    } else if (selectedYear == currentYearNum && selectedMonths.contains(currentMonth1to12)) {
        summary.ncFechadasMes
    } else 0

    val ncTotal = if (filteredStats.isNotEmpty()) {
        filteredStats.sumOf { it.ncTotal }
    } else {
        ncAbertas + ncFechadas
    }
    val ncPctFechadas = if (ncTotal > 0) ((ncFechadas * 100.0) / ncTotal).toInt() else 100

    val kmPeriodo = if (filteredStats.isNotEmpty()) {
        filteredStats.sumOf { it.kmTotal }
    } else if (selectedYear == currentYearNum && selectedMonths.contains(currentMonth1to12)) {
        summary.kmRodadosMes
    } else 0.0

    val periodoLabel = remember(selectedYear, selectedMonths.toList()) {
        if (selectedMonths.size == 12) {
            "Todos os meses de $selectedYear"
        } else {
            val nomes = selectedMonths.sorted().mapNotNull { m -> MESES_NOMES.getOrNull(m - 1) }
            "${nomes.joinToString(", ")} / $selectedYear"
        }
    }

    val periodoLabelShort = remember(selectedMonths.toList()) {
        if (selectedMonths.size == 12) "Todos os Meses"
        else if (selectedMonths.size == 1) MESES_NOMES.getOrElse(selectedMonths.first() - 1) { "Mês" }
        else "${selectedMonths.size} Meses"
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Cabeçalho do Usuário + Filtros em Listas Suspensas (Dropdowns)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Olá, $firstName! 👋",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Slate900
                            )
                        }
                    }

                    // Seletor de Colaborador para Master e Admin (Lista suspensa)
                    if (isMasterOrAdmin && uiState.syncData.tecnicos.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Box(modifier = Modifier.fillMaxWidth()) {
                            OutlinedButton(
                                onClick = { showTecnicoDropdown = true },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                border = BorderStroke(1.dp, Sg4Purple),
                                colors = ButtonDefaults.outlinedButtonColors(containerColor = Color(0xFFFBF8FF))
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Icon(
                                            Icons.Default.Person,
                                            contentDescription = null,
                                            tint = Sg4Purple,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Text(
                                            text = currentTecName,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Slate900,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                    Text("▾", fontSize = 14.sp, color = Sg4Purple, fontWeight = FontWeight.Bold)
                                }
                            }
                            DropdownMenu(
                                expanded = showTecnicoDropdown,
                                onDismissRequest = { showTecnicoDropdown = false },
                                modifier = Modifier.fillMaxWidth(0.85f).background(Color.White)
                            ) {
                                uiState.syncData.tecnicos.forEach { t ->
                                    val isSelected = t.id == uiState.selectedTecnicoId || (t.id == "ALL" && uiState.selectedTecnicoId == "ALL")
                                    DropdownMenuItem(
                                        text = {
                                            Text(
                                                text = t.nome,
                                                fontSize = 13.sp,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                                color = if (isSelected) Sg4Purple else Slate900
                                            )
                                        },
                                        onClick = {
                                            viewModel.setFilterTecnicoId(t.id)
                                            showTecnicoDropdown = false
                                        }
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Linha com Listas Suspensas de Ano e Meses
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Dropdown de Ano
                        Box(modifier = Modifier.weight(1f)) {
                            OutlinedButton(
                                onClick = { showYearDropdown = true },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                border = BorderStroke(1.dp, Sg4Purple),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Sg4Purple, containerColor = Color.White)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Ano: $selectedYear", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Sg4Purple)
                                    Text("▾", fontSize = 13.sp, color = Sg4Purple, fontWeight = FontWeight.Bold)
                                }
                            }
                            DropdownMenu(
                                expanded = showYearDropdown,
                                onDismissRequest = { showYearDropdown = false },
                                modifier = Modifier.background(Color.White)
                            ) {
                                yearsList.forEach { yr ->
                                    DropdownMenuItem(
                                        text = {
                                            Text(
                                                text = "$yr",
                                                fontWeight = if (yr == selectedYear) FontWeight.Bold else FontWeight.Normal,
                                                color = if (yr == selectedYear) Sg4Purple else Slate900
                                            )
                                        },
                                        onClick = {
                                            selectedYear = yr
                                            showYearDropdown = false
                                        }
                                    )
                                }
                            }
                        }

                        // Dropdown / Diálogo de Multi-seleção de Meses
                        Box(modifier = Modifier.weight(1f)) {
                            OutlinedButton(
                                onClick = { showMonthsDialog = true },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                border = BorderStroke(1.dp, Sg4Purple),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Sg4Purple, containerColor = Color.White)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Meses: $periodoLabelShort", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Sg4Purple, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    Text("▾", fontSize = 13.sp, color = Sg4Purple, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "PERÍODO: ${periodoLabel.uppercase()}",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Sg4Purple
                    )

                    if (pendingOfflineCount > 0) {
                        Spacer(modifier = Modifier.height(8.dp))
                        StatusBadge(
                            text = "$pendingOfflineCount registro(s) na fila offline aguardando sincronização",
                            color = Sg4Amber
                        )
                    }
                }
            }
        }

        // CARDS DO DASHBOARD (NÃO CLICÁVEIS NO MOBILE)
        // CARD 1: DSS REALIZADOS
        item {
            DualStatDashboardCard(
                titleLeft = "DSS Realizados",
                valueLeft = "$dssRealizados",
                subLeft = "Meta: $dssMeta (${activeMonthsCount}m${if (isAllTecnicos) " • $activeTecnicosCount técs" else ""})",
                titleRight = "% Concluído",
                valueRight = "$dssPct%",
                subRight = if (dssRealizados >= dssMeta) "Meta Atingida! ✓" else "Faltam: ${(dssMeta - dssRealizados).coerceAtLeast(0)}",
                gradientStart = Color(0xFF660099),
                gradientEnd = Color(0xFF4A0072),
                onClick = null
            )
        }

        // CARD 2: INSPEÇÕES REALIZADAS
        item {
            DualStatDashboardCard(
                titleLeft = "Inspeções Realizadas",
                valueLeft = "$inspecoesRealizadas",
                subLeft = "Meta: $inspecoesMeta (${activeMonthsCount}m${if (isAllTecnicos) " • $activeTecnicosCount técs" else ""})",
                titleRight = "% Concluído",
                valueRight = "$inspecoesPct%",
                subRight = if (inspecoesRealizadas >= inspecoesMeta) "Meta Atingida! ✓" else "Faltam: ${(inspecoesMeta - inspecoesRealizadas).coerceAtLeast(0)}",
                gradientStart = Color(0xFF8E44AD),
                gradientEnd = Color(0xFF732D91),
                onClick = null
            )
        }

        // CARD 3: ITENS INCLUÍDOS NO RELATÓRIO
        item {
            val mediaPorMes = Math.round(relatoriosIncluidos.toDouble() / activeMonthsCount).toString()
            DualStatDashboardCard(
                titleLeft = "Itens no Relatório",
                valueLeft = "$relatoriosIncluidos",
                subLeft = "Relatório de Atividades",
                titleRight = "Média / Mês",
                valueRight = mediaPorMes,
                subRight = "Total no período",
                gradientStart = Color(0xFF673AB7),
                gradientEnd = Color(0xFF512DA8),
                onClick = null
            )
        }

        // CARD 4: NÃO CONFORMIDADES (NCs ABERTAS)
        item {
            DualStatDashboardCard(
                titleLeft = "NCs Abertas",
                valueLeft = "$ncAbertas",
                subLeft = "Total no período: $ncTotal",
                titleRight = "% Fechadas",
                valueRight = "$ncPctFechadas%",
                subRight = "Resolvidas: $ncFechadas",
                gradientStart = Color(0xFF9C27B0),
                gradientEnd = Color(0xFF7B1FA2),
                onClick = null
            )
        }

        // Card complementar de KM & Saldo de Abastecimento (Não clicável)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "KM RODADOS",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Slate600
                        )
                        Text(
                            text = "${Math.round(kmPeriodo)} km",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Sg4Purple
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "SALDO",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Slate600
                        )
                        Text(
                            text = "R$ ${Math.round(summary.saldoAbastecimento)}",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Sg4Green
                        )
                    }
                }
            }
        }
    }

    // Modal de Multi-seleção de Meses Suspenso
    if (showMonthsDialog) {
        AlertDialog(
            onDismissRequest = { showMonthsDialog = false },
            title = {
                Text(
                    text = "Selecionar Meses de $selectedYear",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 16.sp,
                    color = Slate900
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = {
                                selectedMonths.clear()
                                selectedMonths.add(currentMonth1to12)
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, Sg4Purple)
                        ) {
                            Text("Mês Atual", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                        }
                        OutlinedButton(
                            onClick = {
                                if (selectedMonths.size == 12) {
                                    selectedMonths.clear()
                                    selectedMonths.add(currentMonth1to12)
                                } else {
                                    selectedMonths.clear()
                                    selectedMonths.addAll(1..12)
                                }
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, Sg4Purple)
                        ) {
                            Text(if (selectedMonths.size == 12) "Desmarcar" else "Todos", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                        }
                    }

                    HorizontalDivider(color = Color(0xFFE2E8F0))

                    // Grade com os 12 meses clicáveis
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        for (r in 0..3) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                for (c in 0..2) {
                                    val mNum = r * 3 + c + 1
                                    val mName = MESES_NOMES[mNum - 1]
                                    val isSel = selectedMonths.contains(mNum)
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .height(36.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(if (isSel) Sg4Purple else Color(0xFFF8FAFC))
                                            .border(1.dp, if (isSel) Sg4Purple else Color(0xFFCBD5E1), RoundedCornerShape(8.dp))
                                            .clickable {
                                                if (isSel) {
                                                    if (selectedMonths.size > 1) selectedMonths.remove(mNum)
                                                } else {
                                                    selectedMonths.add(mNum)
                                                }
                                            },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = mName,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp,
                                            color = if (isSel) Color.White else Slate900
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { showMonthsDialog = false },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Confirmar", fontWeight = FontWeight.Bold)
                }
            }
        )
    }
}

private data class DraftAgendaItem(
    val id: String,
    val dataAtividade: String,
    val frequencia: String,
    val dataFim: String,
    val hora: String,
    val titulo: String,
    val categoria: String,
    val prioridade: String,
    val local: String,
    val cidade: String,
    val estado: String,
    val descricaoOriginal: String
)

private fun parseIsoToCalendar(iso: String): Calendar? {
    if (iso.isBlank()) return null
    return try {
        val datePart = iso.take(10)
        val parts = datePart.split("-")
        if (parts.size == 3) {
            Calendar.getInstance().apply {
                set(Calendar.YEAR, parts[0].toInt())
                set(Calendar.MONTH, parts[1].toInt() - 1)
                set(Calendar.DAY_OF_MONTH, parts[2].toInt())
                set(Calendar.HOUR_OF_DAY, 12)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
        } else null
    } catch (_: Exception) {
        null
    }
}

private fun formatCalToYmd(cal: Calendar): String {
    val y = cal.get(Calendar.YEAR)
    val m = (cal.get(Calendar.MONTH) + 1).toString().padStart(2, '0')
    val d = cal.get(Calendar.DAY_OF_MONTH).toString().padStart(2, '0')
    return "$y-$m-$d"
}

private fun formatYmdToBrFull(ymd: String): String {
    val cal = parseIsoToCalendar(ymd) ?: return formatIsoDateBr(ymd)
    val dias = listOf("Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb")
    val diaSem = dias.getOrNull(cal.get(Calendar.DAY_OF_WEEK) - 1) ?: ""
    val d = cal.get(Calendar.DAY_OF_MONTH).toString().padStart(2, '0')
    val m = (cal.get(Calendar.MONTH) + 1).toString().padStart(2, '0')
    val y = cal.get(Calendar.YEAR)
    return "$diaSem, $d/$m/$y"
}

private fun buildOutlookCalendarUrl(plan: PlanejamentoDto): String {
    val dateStr = plan.dataAtividade.take(10)
    val startHour = if (plan.hora.length == 5) "${plan.hora}:00" else "08:00:00"
    val startH = startHour.take(2).toIntOrNull() ?: 8
    val endH = if (startH >= 23) "23:59:00" else "${(startH + 1).toString().padStart(2, '0')}${startHour.substring(2)}"
    val startDt = "${dateStr}T$startHour"
    val endDt = "${dateStr}T$endH"
    val subject = plan.titulo.ifBlank { plan.categoria }
    val body = "${plan.categoria} - ${plan.descricaoOriginal}\n\nGerado automaticamente via SG4 Mobile."
    val loc = "${plan.local} (${plan.cidade}-${plan.estado})".trim()
    val enc = { s: String -> URLEncoder.encode(s, "UTF-8") }
    return "https://outlook.office.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=${enc(subject)}&startdt=${enc(startDt)}&enddt=${enc(endDt)}&body=${enc(body)}&location=${enc(loc)}"
}

@Composable
fun AgendaPlanejamentoScreen(
    uiState: Sg4UiState,
    viewModel: Sg4ViewModel
) {
    val context = LocalContext.current
    val todayYmd = remember {
        SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    }

    // Modo de visualização: 0 = Semana, 1 = Mês (Todas removido a pedido do usuário)
    var viewMode by remember { mutableIntStateOf(0) }
    var statusFilter by remember { mutableStateOf("TODOS") } // TODOS, PENDENTE, CONCLUIDO
    var dayOffset by remember { mutableIntStateOf(0) } // deslocamento em semanas ou meses
    var selectedCalendarDayYmd by remember { mutableStateOf(todayYmd) }

    // Estados de Modais
    var showCreateOrEditModal by remember { mutableStateOf(false) }
    var editingPlan by remember { mutableStateOf<PlanejamentoDto?>(null) }
    var prefillDateYmd by remember { mutableStateOf(todayYmd) }

    var concludingPlan by remember { mutableStateOf<PlanejamentoDto?>(null) }
    var transferringPlan by remember { mutableStateOf<PlanejamentoDto?>(null) }
    var movingDatePlan by remember { mutableStateOf<PlanejamentoDto?>(null) }
    var deletingPlan by remember { mutableStateOf<PlanejamentoDto?>(null) }
    var editingChecklistItem by remember { mutableStateOf<Pair<PlanejamentoDto, ChecklistItemDto>?>(null) }

    // FAB State
    var fabExpanded by remember { mutableStateOf(false) }

    // Cálculo do intervalo de datas (Semana ou Mês)
    val (periodLabel, startYmd, endYmd, currentCalMonth, currentCalYear) = remember(viewMode, dayOffset) {
        val baseCal = Calendar.getInstance()
        if (viewMode == 0) {
            baseCal.add(Calendar.DAY_OF_YEAR, dayOffset * 7)
            val dow = baseCal.get(Calendar.DAY_OF_WEEK)
            val diffToMonday = if (dow == Calendar.SUNDAY) -6 else Calendar.MONDAY - dow
            baseCal.add(Calendar.DAY_OF_YEAR, diffToMonday)
            val start = formatCalToYmd(baseCal)
            val d1 = "${baseCal.get(Calendar.DAY_OF_MONTH).toString().padStart(2, '0')}/${(baseCal.get(Calendar.MONTH) + 1).toString().padStart(2, '0')}"
            baseCal.add(Calendar.DAY_OF_YEAR, 6)
            val end = formatCalToYmd(baseCal)
            val d2 = "${baseCal.get(Calendar.DAY_OF_MONTH).toString().padStart(2, '0')}/${(baseCal.get(Calendar.MONTH) + 1).toString().padStart(2, '0')}/${baseCal.get(Calendar.YEAR)}"
            Tuple5("Semana: $d1 a $d2", start, end, baseCal.get(Calendar.MONTH), baseCal.get(Calendar.YEAR))
        } else {
            baseCal.add(Calendar.MONTH, dayOffset)
            val mIdx = baseCal.get(Calendar.MONTH)
            val yr = baseCal.get(Calendar.YEAR)
            baseCal.set(Calendar.DAY_OF_MONTH, 1)
            val start = formatCalToYmd(baseCal)
            baseCal.set(Calendar.DAY_OF_MONTH, baseCal.getActualMaximum(Calendar.DAY_OF_MONTH))
            val end = formatCalToYmd(baseCal)
            Tuple5("Mês: ${MESES_NOMES.getOrElse(mIdx) { "" }} / $yr", start, end, mIdx, yr)
        }
    }

    val filteredPlans = remember(uiState.syncData.planejamentos, viewMode, startYmd, endYmd, statusFilter) {
        uiState.syncData.planejamentos
            .filter { p ->
                val ymd = p.dataAtividade.take(10)
                val inPeriod = ymd in startYmd..endYmd
                val inStatus = statusFilter == "TODOS" || p.status.equals(statusFilter, ignoreCase = true)
                inPeriod && inStatus
            }
            .sortedWith(compareBy<PlanejamentoDto> { it.dataAtividade.take(10) }.thenBy { it.hora })
    }

    val groupedByDay = remember(filteredPlans) {
        filteredPlans.groupBy { it.dataAtividade.take(10) }
    }

    // Mapa de contagem de atividades por dia para o calendário mensal
    val monthActivitiesCountByDay = remember(uiState.syncData.planejamentos, currentCalMonth, currentCalYear) {
        val map = mutableMapOf<String, Int>()
        uiState.syncData.planejamentos.forEach { p ->
            val ymd = p.dataAtividade.take(10)
            map[ymd] = (map[ymd] ?: 0) + 1
        }
        map
    }

    Box(modifier = Modifier.fillMaxSize().background(Color.White)) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Barra superior da Agenda: Seletores Semana / Mês e Filtros de Status
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Seletor de Visão (Semana / Mês) + Filtro de Status
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Alternador Semana / Mês
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFFF1F5F9))
                            .padding(3.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        listOf(0 to "Semana", 1 to "Mês").forEach { (idx, label) ->
                            val active = viewMode == idx
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (active) Sg4Purple else Color.Transparent)
                                    .clickable {
                                        viewMode = idx
                                        dayOffset = 0
                                    }
                                    .padding(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = label,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (active) Color.White else Slate600
                                )
                            }
                        }
                    }

                    // Filtro de Status: Todos / Pend. / Concl.
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        listOf("TODOS" to "Todos", "PENDENTE" to "Pend.", "CONCLUIDO" to "Concl.").forEach { (st, lbl) ->
                            val active = statusFilter == st
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (active) Sg4PurpleSurface else Color.Transparent)
                                    .border(1.dp, if (active) Sg4Purple else Color(0xFFE2E8F0), RoundedCornerShape(8.dp))
                                    .clickable { statusFilter = st }
                                    .padding(horizontal = 8.dp, vertical = 5.dp)
                            ) {
                                Text(
                                    text = lbl,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (active) Sg4Purple else Slate600
                                )
                            }
                        }
                    }
                }

                // Navegador de Período (< Hoje >) para a visão Semana
                if (viewMode == 0) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFFF8FAFC))
                            .padding(horizontal = 6.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = { dayOffset -= 1 }, modifier = Modifier.size(30.dp)) {
                            Icon(Icons.Default.ChevronLeft, contentDescription = "Anterior", tint = Sg4Purple)
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = periodLabel,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Slate900
                            )
                            if (dayOffset != 0) {
                                Text(
                                    text = "Hoje",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Sg4Purple,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(Sg4PurpleSurface)
                                        .clickable { dayOffset = 0 }
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }

                        IconButton(onClick = { dayOffset += 1 }, modifier = Modifier.size(30.dp)) {
                            Icon(Icons.Default.ChevronRight, contentDescription = "Próximo", tint = Sg4Purple)
                        }
                    }
                }
            }

            HorizontalDivider(color = Color(0xFFE2E8F0))

            // Conteúdo principal da Agenda:
            // Se MÊS: exibe Calendário Completo do Mês no topo + lista de tarefas do dia selecionado
            // Se SEMANA: exibe a lista agrupada por dias da semana
            if (viewMode == 1) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(14.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Calendário Mensal em Grade
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                // Cabeçalho do mês com navegação
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    IconButton(onClick = { dayOffset -= 1 }, modifier = Modifier.size(32.dp)) {
                                        Icon(Icons.Default.ChevronLeft, contentDescription = "Anterior", tint = Sg4Purple)
                                    }

                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text(
                                            text = periodLabel.replace("Mês: ", ""),
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = Slate900
                                        )
                                        if (dayOffset != 0) {
                                            Text(
                                                text = "Hoje",
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Sg4Purple,
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(6.dp))
                                                    .background(Sg4PurpleSurface)
                                                    .clickable {
                                                        dayOffset = 0
                                                        selectedCalendarDayYmd = todayYmd
                                                    }
                                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                    }

                                    IconButton(onClick = { dayOffset += 1 }, modifier = Modifier.size(32.dp)) {
                                        Icon(Icons.Default.ChevronRight, contentDescription = "Próximo", tint = Sg4Purple)
                                    }
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                // Cabeçalho Dias da Semana (Dom, Seg, Ter...)
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceAround
                                ) {
                                    listOf("Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb").forEach { d ->
                                        Text(
                                            text = d,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (d == "Dom" || d == "Sáb") Slate400 else Sg4Purple,
                                            modifier = Modifier.weight(1f),
                                            textAlign = TextAlign.Center
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(6.dp))

                                // Grade dos dias do mês
                                val calMonth = remember(currentCalYear, currentCalMonth) {
                                    Calendar.getInstance().apply {
                                        set(Calendar.YEAR, currentCalYear)
                                        set(Calendar.MONTH, currentCalMonth)
                                        set(Calendar.DAY_OF_MONTH, 1)
                                    }
                                }
                                val firstDayOfWeek = calMonth.get(Calendar.DAY_OF_WEEK) - 1 // 0=Dom..6=Sáb
                                val maxDaysInMonth = calMonth.getActualMaximum(Calendar.DAY_OF_MONTH)
                                val totalCells = ((firstDayOfWeek + maxDaysInMonth + 6) / 7) * 7

                                for (row in 0 until (totalCells / 7)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                                        horizontalArrangement = Arrangement.SpaceAround
                                    ) {
                                        for (col in 0..6) {
                                            val cellIdx = row * 7 + col
                                            val dayNumber = cellIdx - firstDayOfWeek + 1
                                            if (dayNumber in 1..maxDaysInMonth) {
                                                val mStr = (currentCalMonth + 1).toString().padStart(2, '0')
                                                val dStr = dayNumber.toString().padStart(2, '0')
                                                val cellYmd = "$currentCalYear-$mStr-$dStr"
                                                val isSelected = cellYmd == selectedCalendarDayYmd
                                                val isToday = cellYmd == todayYmd
                                                val countActivities = monthActivitiesCountByDay[cellYmd] ?: 0

                                                Box(
                                                    modifier = Modifier
                                                        .weight(1f)
                                                        .height(42.dp)
                                                        .clip(RoundedCornerShape(8.dp))
                                                        .background(
                                                            if (isSelected) Sg4Purple
                                                            else if (isToday) Sg4PurpleSurface
                                                            else Color.Transparent
                                                        )
                                                        .border(
                                                            1.dp,
                                                            if (isSelected) Sg4Purple
                                                            else if (isToday) Sg4Purple.copy(alpha = 0.5f)
                                                            else Color.Transparent,
                                                            RoundedCornerShape(8.dp)
                                                        )
                                                        .clickable {
                                                            selectedCalendarDayYmd = cellYmd
                                                        },
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Column(
                                                        horizontalAlignment = Alignment.CenterHorizontally,
                                                        verticalArrangement = Arrangement.Center
                                                    ) {
                                                        Text(
                                                            text = "$dayNumber",
                                                            fontSize = 12.sp,
                                                            fontWeight = if (isSelected || isToday) FontWeight.ExtraBold else FontWeight.Medium,
                                                            color = if (isSelected) Color.White else if (isToday) Sg4PurpleDark else Slate900
                                                        )
                                                        if (countActivities > 0) {
                                                            Box(
                                                                modifier = Modifier
                                                                    .size(6.dp)
                                                                    .background(
                                                                        if (isSelected) Color.White else Sg4Purple,
                                                                        CircleShape
                                                                    )
                                                            )
                                                        }
                                                    }
                                                }
                                            } else {
                                                Spacer(modifier = Modifier.weight(1f))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Título das atividades do dia selecionado
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "PROGRAMAÇÃO DO DIA: ${formatIsoDateBr(selectedCalendarDayYmd).uppercase()}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Sg4Purple
                            )
                            val dayCount = filteredPlans.count { it.dataAtividade.take(10) == selectedCalendarDayYmd }
                            Text(
                                text = "$dayCount agendada(s)",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Slate600
                            )
                        }
                    }

                    // Lista de atividades do dia selecionado
                    val dayPlans = filteredPlans.filter { it.dataAtividade.take(10) == selectedCalendarDayYmd }
                    if (dayPlans.isEmpty()) {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC))
                            ) {
                                Column(
                                    modifier = Modifier.fillMaxWidth().padding(24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text("Nenhuma atividade agendada para este dia.", fontSize = 13.sp, color = Slate600)
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Button(
                                        onClick = {
                                            editingPlan = null
                                            prefillDateYmd = selectedCalendarDayYmd
                                            showCreateOrEditModal = true
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple),
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Text("+ Agendar para este dia", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    } else {
                        items(dayPlans, key = { it.id }) { plan ->
                            AgendaCardItem(
                                plan = plan,
                                uiState = uiState,
                                viewModel = viewModel,
                                onEdit = {
                                    editingPlan = plan
                                    prefillDateYmd = plan.dataAtividade.take(10)
                                    showCreateOrEditModal = true
                                },
                                onDuplicate = {
                                    editingPlan = plan.copy(id = "")
                                    prefillDateYmd = plan.dataAtividade.take(10)
                                    showCreateOrEditModal = true
                                },
                                onMoveDate = { movingDatePlan = plan },
                                onConclude = { concludingPlan = plan },
                                onTransfer = { transferringPlan = plan },
                                onDelete = { deletingPlan = plan }
                            )
                        }
                    }
                }
            } else {
                // VISÃO SEMANA (Agrupada por Dia)
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(14.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (groupedByDay.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 40.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("Nenhuma atividade encontrada nesta semana.", color = Slate600, fontSize = 14.sp)
                            }
                        }
                    } else {
                        groupedByDay.forEach { (diaYmd, plansDoDia) ->
                            item(key = "header_$diaYmd") {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 4.dp, vertical = 2.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = formatYmdToBrFull(diaYmd),
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = if (diaYmd == todayYmd) Sg4Purple else Slate900
                                    )
                                    Text(
                                        text = "${plansDoDia.size} atividade(s)",
                                        fontSize = 11.sp,
                                        color = Slate600
                                    )
                                }
                            }

                            items(plansDoDia, key = { it.id }) { plan ->
                                AgendaCardItem(
                                    plan = plan,
                                    uiState = uiState,
                                    viewModel = viewModel,
                                    onEdit = {
                                        editingPlan = plan
                                        prefillDateYmd = plan.dataAtividade.take(10)
                                        showCreateOrEditModal = true
                                    },
                                    onDuplicate = {
                                        editingPlan = plan.copy(id = "")
                                        prefillDateYmd = plan.dataAtividade.take(10)
                                        showCreateOrEditModal = true
                                    },
                                    onMoveDate = { movingDatePlan = plan },
                                    onConclude = { concludingPlan = plan },
                                    onTransfer = { transferringPlan = plan },
                                    onDelete = { deletingPlan = plan }
                                )
                            }
                        }
                    }
                }
            }
        }

        // Floating Action Button (FAB) Expansível no canto inferior direito
        FloatingActionButton(
            onClick = {
                if (fabExpanded) {
                    editingPlan = null
                    prefillDateYmd = selectedCalendarDayYmd
                    showCreateOrEditModal = true
                    fabExpanded = false
                } else {
                    fabExpanded = true
                }
            },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(20.dp),
            containerColor = Sg4Purple,
            contentColor = Color.White,
            shape = if (fabExpanded) RoundedCornerShape(16.dp) else CircleShape
        ) {
            Row(
                modifier = Modifier.padding(horizontal = if (fabExpanded) 16.dp else 0.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = "Novo Agendamento",
                    modifier = Modifier.size(24.dp)
                )
                if (fabExpanded) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Novo Agendamento",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }

    // MODAL 1: CRIAR OU EDITAR AGENDAMENTO (COM DROPDOWN, AUTO-PREENCHIMENTO E FOTO)
    if (showCreateOrEditModal) {
        val isEditing = editingPlan?.id?.isNotBlank() == true
        var dataAtv by remember { mutableStateOf(editingPlan?.dataAtividade?.take(10) ?: prefillDateYmd) }
        var horaAtv by remember { mutableStateOf(editingPlan?.hora ?: "08:00") }
        var categoriaAtv by remember { mutableStateOf(editingPlan?.categoria ?: "INSPEÇÃO DE SEGURANÇA") }
        var tituloAtv by remember { mutableStateOf(editingPlan?.titulo ?: "") }
        var prioridadeAtv by remember { mutableStateOf(editingPlan?.prioridade ?: "MEDIA") }
        var localAtv by remember { mutableStateOf(editingPlan?.local ?: "") }
        var cidadeAtv by remember { mutableStateOf(editingPlan?.cidade ?: "") }
        var estadoAtv by remember { mutableStateOf(editingPlan?.estado ?: "SP") }
        var equipeAtv by remember { mutableStateOf(editingPlan?.equipe ?: "Individual") }
        var descricaoAtv by remember { mutableStateOf(editingPlan?.descricaoOriginal ?: "") }
        var frequenciaAtv by remember { mutableStateOf("UNICA") }
        var dataFimRecorrencia by remember { mutableStateOf(prefillDateYmd) }
        var fotoBase64 by remember { mutableStateOf("") }

        var showCategoriaDropdown by remember { mutableStateOf(false) }
        var showUnidadeDropdown by remember { mutableStateOf(false) }
        var customLocalMode by remember { mutableStateOf(editingPlan?.local?.isNotBlank() == true && uiState.syncData.unidades.none { it.nome == editingPlan?.local }) }

        val cameraLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.TakePicturePreview()
        ) { bitmap: Bitmap? ->
            bitmap?.let {
                try {
                    val stream = ByteArrayOutputStream()
                    it.compress(Bitmap.CompressFormat.JPEG, 75, stream)
                    val b64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
                    fotoBase64 = "data:image/jpeg;base64,$b64"
                } catch (_: Exception) {}
            }
        }

        val galleryLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.GetContent()
        ) { uri: Uri? ->
            uri?.let {
                try {
                    val bytes = context.contentResolver.openInputStream(it)?.use { s -> s.readBytes() }
                    if (bytes != null) {
                        val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                        fotoBase64 = "data:image/jpeg;base64,$b64"
                    }
                } catch (_: Exception) {}
            }
        }

        val textInputColors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = Slate900,
            unfocusedTextColor = Slate900,
            focusedContainerColor = Color.White,
            unfocusedContainerColor = Color.White,
            focusedBorderColor = Sg4Purple,
            unfocusedBorderColor = Color(0xFFCBD5E1),
            focusedPlaceholderColor = Slate400,
            unfocusedPlaceholderColor = Slate400,
            cursorColor = Sg4Purple
        )

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) showCreateOrEditModal = false },
            containerColor = Color.White,
            shape = RoundedCornerShape(16.dp),
            title = {
                Text(
                    text = if (isEditing) "Editar Agendamento" else "Novo Agendamento",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 17.sp,
                    color = Slate900
                )
            },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Data e Hora (labels limpos, placeholders indicativos)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = dataAtv,
                            onValueChange = { dataAtv = it },
                            label = { Text("Data", color = Slate900) },
                            placeholder = { Text("AAAA-MM-DD", color = Slate400) },
                            modifier = Modifier.weight(1.3f),
                            colors = textInputColors
                        )
                        OutlinedTextField(
                            value = horaAtv,
                            onValueChange = { horaAtv = it },
                            label = { Text("Hora", color = Slate900) },
                            placeholder = { Text("HH:mm", color = Slate400) },
                            modifier = Modifier.weight(1f),
                            colors = textInputColors
                        )
                    }

                    // Categoria: Lista Suspensa (Dropdown)
                    Text("CATEGORIA", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                    Box(modifier = Modifier.fillMaxWidth()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(8.dp))
                                .background(Color.White)
                                .clickable { showCategoriaDropdown = true }
                                .padding(horizontal = 12.dp, vertical = 14.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = categoriaAtv.ifBlank { "Selecione uma Categoria..." },
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Slate900
                                )
                                Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = Sg4Purple)
                            }
                        }

                        DropdownMenu(
                            expanded = showCategoriaDropdown,
                            onDismissRequest = { showCategoriaDropdown = false },
                            modifier = Modifier.background(Color.White)
                        ) {
                            CATEGORIAS_OFICIAIS.forEach { cat ->
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            text = cat,
                                            fontWeight = if (cat == categoriaAtv) FontWeight.ExtraBold else FontWeight.Normal,
                                            color = if (cat == categoriaAtv) Sg4Purple else Slate900
                                        )
                                    },
                                    onClick = {
                                        categoriaAtv = cat
                                        showCategoriaDropdown = false
                                    }
                                )
                            }
                        }
                    }

                    // Local / Unidade: Lista Suspensa com Auto-preenchimento de Cidade e UF
                    Text("LOCAL / UNIDADE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                    Box(modifier = Modifier.fillMaxWidth()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(8.dp))
                                .background(Color.White)
                                .clickable { showUnidadeDropdown = true }
                                .padding(horizontal = 12.dp, vertical = 14.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = if (customLocalMode) "✏️ Digitar outro local manualmente" else localAtv.ifBlank { "🏢 Selecionar unidade..." },
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Slate900,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = Sg4Purple)
                            }
                        }

                        DropdownMenu(
                            expanded = showUnidadeDropdown,
                            onDismissRequest = { showUnidadeDropdown = false },
                            modifier = Modifier.background(Color.White)
                        ) {
                            DropdownMenuItem(
                                text = {
                                    Text("✏️ Digitar outro local...", fontWeight = FontWeight.Bold, color = Sg4Purple)
                                },
                                onClick = {
                                    customLocalMode = true
                                    showUnidadeDropdown = false
                                }
                            )
                            uiState.syncData.unidades.forEach { u ->
                                DropdownMenuItem(
                                    text = {
                                        Column {
                                            Text(u.nome, fontWeight = FontWeight.Bold, color = Slate900, fontSize = 12.sp)
                                            if (u.cidade.isNotBlank()) {
                                                Text("${u.cidade}/${u.estado}", fontSize = 10.sp, color = Slate600)
                                            }
                                        }
                                    },
                                    onClick = {
                                        customLocalMode = false
                                        localAtv = u.nome
                                        if (u.cidade.isNotBlank()) cidadeAtv = u.cidade
                                        if (u.estado.isNotBlank()) estadoAtv = u.estado
                                        showUnidadeDropdown = false
                                    }
                                )
                            }
                        }
                    }

                    // Se escolheu digitar outro local ou quiser personalizar o nome
                    if (customLocalMode) {
                        OutlinedTextField(
                            value = localAtv,
                            onValueChange = { localAtv = it },
                            label = { Text("Nome do Local", color = Slate900) },
                            placeholder = { Text("Ex: Base Operacional, Cliente...", color = Slate400) },
                            modifier = Modifier.fillMaxWidth(),
                            colors = textInputColors
                        )
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = cidadeAtv,
                            onValueChange = { cidadeAtv = it },
                            label = { Text("Cidade", color = Slate900) },
                            placeholder = { Text("Ex: São Paulo", color = Slate400) },
                            modifier = Modifier.weight(2f),
                            colors = textInputColors
                        )
                        OutlinedTextField(
                            value = estadoAtv,
                            onValueChange = { estadoAtv = it },
                            label = { Text("UF", color = Slate900) },
                            placeholder = { Text("SP", color = Slate400) },
                            modifier = Modifier.weight(1f),
                            colors = textInputColors
                        )
                    }

                    // Título
                    OutlinedTextField(
                        value = tituloAtv,
                        onValueChange = { tituloAtv = it },
                        label = { Text("Título da Atividade", color = Slate900) },
                        placeholder = { Text("Ex: Inspeção Mensal de Extintores", color = Slate400) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = textInputColors
                    )

                    // Descrição com Corretor IA (apenas "IA")
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("DESCRITIVO DA ATIVIDADE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                        AiSpellcheckButton(
                            text = descricaoAtv,
                            enabled = !uiState.isBlockingLoading,
                            onClick = {
                                viewModel.correctTextWithAI(descricaoAtv) { corr ->
                                    descricaoAtv = corr
                                }
                            }
                        )
                    }

                    OutlinedTextField(
                        value = descricaoAtv,
                        onValueChange = { descricaoAtv = it },
                        placeholder = { Text("Descreva detalhadamente o que será executado...", color = Slate400) },
                        modifier = Modifier.fillMaxWidth().height(90.dp),
                        colors = textInputColors
                    )

                    // Incluir Foto (Câmera / Galeria)
                    Text("INCLUIR FOTO", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { cameraLauncher.launch(null) },
                            colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Câmera", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }

                        OutlinedButton(
                            onClick = { galleryLauncher.launch("image/*") },
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, Sg4Purple),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = Sg4Purple, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Galeria", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                        }
                    }

                    // Preview da Foto Selecionada
                    if (fotoBase64.isNotBlank()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(8.dp))
                                .background(Color(0xFFF8FAFC)),
                            contentAlignment = Alignment.Center
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text("📷 Foto anexada", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Sg4Green)
                                Spacer(Modifier.weight(1f))
                                TextButton(onClick = { fotoBase64 = "" }) {
                                    Text("Remover", color = Sg4Red, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                }
                            }
                        }
                    }

                    // Prioridade
                    Text("PRIORIDADE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("BAIXA" to "Baixa", "MEDIA" to "Média", "ALTA" to "Alta").forEach { (pr, lbl) ->
                            val isSel = prioridadeAtv == pr
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSel) Sg4Purple else Color(0xFFF1F5F9))
                                    .clickable { prioridadeAtv = pr }
                                    .padding(vertical = 8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(lbl, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = if (isSel) Color.White else Slate900)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val payload = mutableMapOf<String, Any?>(
                            "dataAtividade" to dataAtv,
                            "hora" to horaAtv,
                            "categoria" to categoriaAtv,
                            "titulo" to tituloAtv.ifBlank { categoriaAtv },
                            "prioridade" to prioridadeAtv,
                            "local" to localAtv,
                            "cidade" to cidadeAtv,
                            "estado" to estadoAtv,
                            "equipe" to equipeAtv,
                            "descricaoOriginal" to descricaoAtv.ifBlank { tituloAtv.ifBlank { categoriaAtv } },
                            "frequencia" to frequenciaAtv,
                            "dataFim" to dataFimRecorrencia,
                            "fotoUrl" to fotoBase64.ifBlank { null }
                        )
                        if (isEditing) {
                            payload["id"] = editingPlan?.id
                            viewModel.performAction(
                                actionType = "ATUALIZAR_ATIVIDADE",
                                loadingTitle = "Atualizando agendamento...",
                                description = "Atualizar: $tituloAtv",
                                payload = payload,
                                onCompleted = { showCreateOrEditModal = false }
                            )
                        } else {
                            viewModel.performAction(
                                actionType = "CRIAR_ATIVIDADE",
                                loadingTitle = "Criando agendamento...",
                                description = "Criar: $tituloAtv",
                                payload = payload,
                                onCompleted = { showCreateOrEditModal = false }
                            )
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple),
                    shape = RoundedCornerShape(8.dp),
                    enabled = !uiState.isBlockingLoading
                ) {
                    Text("Salvar", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showCreateOrEditModal = false }) {
                    Text("Cancelar", color = Slate600)
                }
            }
        )
    }

    // MODAL 2: CONCLUIR ATIVIDADE (COM TEMA DSS, RELATO DE EXECUÇÃO, CORRETOR IA E FOTO)
    concludingPlan?.let { item ->
        val isDssCategory = item.categoria.uppercase().contains("DSS")
        var temaDss by remember(item.id) {
            mutableStateOf(if (isDssCategory) item.titulo.ifBlank { "Diálogo de Segurança" } else "")
        }
        var descExecutada by remember(item.id) {
            mutableStateOf(item.descricaoExecutada.ifBlank { item.descricaoOriginal })
        }
        var observacoes by remember(item.id) { mutableStateOf(item.observacoes) }
        var fotoBase64 by remember(item.id) { mutableStateOf("") }
        var salvarDssAliado by remember(item.id) { mutableStateOf(isDssCategory) }
        var gerarRelatorioCampo by remember(item.id) { mutableStateOf(true) }
        var empresaRelatorio by remember(item.id) { mutableStateOf("Telefônica Brasil S.A") }
        var projetoRelatorio by remember(item.id) { mutableStateOf("VIVO") }

        val cameraLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.TakePicturePreview()
        ) { bitmap: Bitmap? ->
            bitmap?.let {
                try {
                    val stream = ByteArrayOutputStream()
                    it.compress(Bitmap.CompressFormat.JPEG, 75, stream)
                    val b64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
                    fotoBase64 = "data:image/jpeg;base64,$b64"
                } catch (_: Exception) {}
            }
        }

        val galleryLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.GetContent()
        ) { uri: Uri? ->
            uri?.let {
                try {
                    val bytes = context.contentResolver.openInputStream(it)?.use { s -> s.readBytes() }
                    if (bytes != null) {
                        val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                        fotoBase64 = "data:image/jpeg;base64,$b64"
                    }
                } catch (_: Exception) {}
            }
        }

        val textInputColors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = Slate900,
            unfocusedTextColor = Slate900,
            focusedContainerColor = Color.White,
            unfocusedContainerColor = Color.White,
            focusedBorderColor = Sg4Purple,
            unfocusedBorderColor = Color(0xFFCBD5E1),
            focusedPlaceholderColor = Slate400,
            unfocusedPlaceholderColor = Slate400,
            cursorColor = Sg4Purple
        )

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) concludingPlan = null },
            containerColor = Color.White,
            shape = RoundedCornerShape(16.dp),
            title = {
                Text("Concluir Atividade", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = Slate900)
            },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = item.titulo.ifBlank { item.categoria },
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = Sg4Purple
                    )

                    // Se for DSS, recebe o campo de Tema do DSS (igual à web)
                    if (isDssCategory) {
                        OutlinedTextField(
                            value = temaDss,
                            onValueChange = { temaDss = it },
                            label = { Text("Tema do DSS", color = Slate900) },
                            placeholder = { Text("Ex: Uso de EPI, Direção Defensiva...", color = Slate400) },
                            modifier = Modifier.fillMaxWidth(),
                            colors = textInputColors
                        )

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            TextButton(onClick = { salvarDssAliado = !salvarDssAliado }) {
                                Text(
                                    text = if (salvarDssAliado) "☑ Salvar no DSS Aliado" else "☐ Não salvar no DSS Aliado",
                                    color = Sg4Purple,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }

                    // Relato de Execução com botão IA
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("RELATO DE EXECUÇÃO", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                        AiSpellcheckButton(
                            text = descExecutada,
                            enabled = !uiState.isBlockingLoading,
                            onClick = {
                                viewModel.correctTextWithAI(descExecutada) { corr ->
                                    descExecutada = corr
                                }
                            }
                        )
                    }

                    OutlinedTextField(
                        value = descExecutada,
                        onValueChange = { descExecutada = it },
                        placeholder = { Text("Descreva detalhadamente como a atividade foi executada...", color = Slate400) },
                        modifier = Modifier.fillMaxWidth().height(100.dp),
                        colors = textInputColors
                    )

                    OutlinedTextField(
                        value = observacoes,
                        onValueChange = { observacoes = it },
                        label = { Text("Observações adicionais (opcional)", color = Slate900) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = textInputColors
                    )

                    // Incluir Foto da Conclusão (Câmera / Galeria)
                    Text("FOTO DA ATIVIDADE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { cameraLauncher.launch(null) },
                            colors = ButtonDefaults.buttonColors(containerColor = Sg4Green),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Câmera", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }

                        OutlinedButton(
                            onClick = { galleryLauncher.launch("image/*") },
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, Sg4Green),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = Sg4Green, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Galeria", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Sg4Green)
                        }
                    }

                    // Preview da Foto
                    if (fotoBase64.isNotBlank()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(8.dp))
                                .background(Color(0xFFF8FAFC)),
                            contentAlignment = Alignment.Center
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text("📷 Foto capturada com sucesso", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Sg4Green)
                                Spacer(Modifier.weight(1f))
                                TextButton(onClick = { fotoBase64 = "" }) {
                                    Text("Remover", color = Sg4Red, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                }
                            }
                        }
                    }

                    // Opção de incluir no Relatório de Atividades
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        TextButton(onClick = { gerarRelatorioCampo = !gerarRelatorioCampo }) {
                            Text(
                                text = if (gerarRelatorioCampo) "☑ Incluir no Relatório de Atividades" else "☐ Não incluir no Relatório",
                                color = Sg4Purple,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val payload = mutableMapOf<String, Any?>(
                            "id" to item.id,
                            "descricaoExecutada" to descExecutada,
                            "observacoes" to observacoes,
                            "fotoUrl" to fotoBase64.ifBlank { null },
                            "salvarDssAliado" to salvarDssAliado,
                            "temaDss" to temaDss,
                            "gerarRelatorioCampo" to gerarRelatorioCampo,
                            "empresa" to empresaRelatorio,
                            "projeto" to projetoRelatorio
                        )
                        viewModel.performAction(
                            actionType = "CONCLUIR_ATIVIDADE",
                            loadingTitle = "Concluindo atividade...",
                            description = "Concluir: ${item.titulo}",
                            payload = payload,
                            onCompleted = { concludingPlan = null }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Green),
                    shape = RoundedCornerShape(8.dp),
                    enabled = !uiState.isBlockingLoading
                ) {
                    Text("Confirmar", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { concludingPlan = null }) {
                    Text("Cancelar", color = Slate600)
                }
            }
        )
    }

        // MODAL 3: TRANSFERIR PENDÊNCIAS
    transferringPlan?.let { plan ->
        var novaDataTransfer by remember(plan.id) { mutableStateOf(todayYmd) }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) transferringPlan = null },
            title = { Text("Transferir Pendências", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Escolha a nova data para as pendências:", fontSize = 12.sp, color = Slate600)
                    OutlinedTextField(
                        value = novaDataTransfer,
                        onValueChange = { novaDataTransfer = it },
                        label = { Text("Nova Data (AAAA-MM-DD)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.performAction(
                            actionType = "TRANSFERIR_PENDENCIAS_ATIVIDADE",
                            loadingTitle = "Transferindo pendências...",
                            description = "Transferir pendências de: ${plan.titulo}",
                            payload = mapOf("id" to plan.id, "novaData" to novaDataTransfer),
                            onCompleted = { transferringPlan = null }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Confirmar", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { transferringPlan = null }) { Text("Cancelar") }
            }
        )
    }

    // MODAL 4: MOVER DATA
    movingDatePlan?.let { plan ->
        var novaDataMover by remember(plan.id) { mutableStateOf(plan.dataAtividade.take(10)) }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) movingDatePlan = null },
            title = { Text("Mover Atividade", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Escolha a nova data para executar:", fontSize = 12.sp, color = Slate600)
                    OutlinedTextField(
                        value = novaDataMover,
                        onValueChange = { novaDataMover = it },
                        label = { Text("Nova Data (AAAA-MM-DD)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.performAction(
                            actionType = "MOVER_DATA_ATIVIDADE",
                            loadingTitle = "Movendo atividade...",
                            description = "Mover data de: ${plan.titulo}",
                            payload = mapOf("id" to plan.id, "novaData" to novaDataMover),
                            onCompleted = { movingDatePlan = null }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Confirmar", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { movingDatePlan = null }) { Text("Cancelar") }
            }
        )
    }

    // MODAL 5: EXCLUIR ATIVIDADE
    deletingPlan?.let { plan ->
        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) deletingPlan = null },
            title = { Text("Excluir Agendamento", fontWeight = FontWeight.ExtraBold, color = Sg4Red) },
            text = {
                Text("Deseja realmente excluir este agendamento? Esta ação não pode ser desfeita.")
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.performAction(
                            actionType = "EXCLUIR_ATIVIDADE",
                            loadingTitle = "Excluindo agendamento...",
                            description = "Excluir: ${plan.titulo}",
                            payload = mapOf("id" to plan.id),
                            onCompleted = { deletingPlan = null }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Red),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Excluir", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { deletingPlan = null }) { Text("Cancelar") }
            }
        )
    }
}

/**
 * Card de Atividade com dois toques para confirmação de ações e estilização diferenciada:
 * - Tarefas concluídas: estilo esmaecido (alpha = 0.60f).
 * - Tarefas a executar: cores fortes e vívidas (alpha = 1.0f).
 */
@Composable
fun AgendaCardItem(
    plan: PlanejamentoDto,
    uiState: Sg4UiState,
    viewModel: Sg4ViewModel,
    onEdit: () -> Unit,
    onDuplicate: () -> Unit,
    onMoveDate: () -> Unit,
    onConclude: () -> Unit,
    onTransfer: () -> Unit,
    onDelete: () -> Unit
) {
    val context = LocalContext.current
    val isConcluido = plan.status.equals("CONCLUIDO", ignoreCase = true)
    var expandedAction by remember { mutableStateOf<String?>(null) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (isConcluido) Modifier.background(Color.White).border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(16.dp)) else Modifier),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isConcluido) Color(0xFFFBFBFB) else Color.White
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isConcluido) 1.dp else 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
                .then(if (isConcluido) Modifier.background(Color.Transparent) else Modifier)
        ) {
            // Linha de Cabeçalho: Horário + Categoria + Status
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(if (isConcluido) Color(0xFFE2E8F0) else Sg4PurpleSurface)
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = plan.hora.ifBlank { "08:00" },
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (isConcluido) Slate600 else Sg4PurpleDark
                        )
                    }

                    Text(
                        text = plan.categoria.uppercase(),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isConcluido) Slate600 else Sg4Purple,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                StatusBadge(
                    text = if (isConcluido) "CONCLUÍDO" else "PENDENTE",
                    color = if (isConcluido) Color(0xFF16A34A).copy(alpha = 0.75f) else Sg4Amber
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Título
            Text(
                text = plan.titulo.ifBlank { plan.categoria },
                fontWeight = FontWeight.ExtraBold,
                fontSize = 15.sp,
                color = if (isConcluido) Slate600 else Slate900
            )

            // Descritivo
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = if (isConcluido && plan.descricaoExecutada.isNotBlank()) plan.descricaoExecutada else plan.descricaoOriginal,
                fontSize = 12.sp,
                color = if (isConcluido) Slate400 else Slate600,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )

            // Localidade
            if (plan.local.isNotBlank() || plan.cidade.isNotBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = if (isConcluido) Slate400 else Sg4Purple,
                        modifier = Modifier.size(13.dp)
                    )
                    Text(
                        text = "${plan.local} • ${plan.cidade}/${plan.estado}",
                        fontSize = 11.sp,
                        color = Slate600
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Botão Principal: Concluir (clique único direto para abrir modal de conclusão)
            if (!isConcluido) {
                Button(
                    onClick = onConclude,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Green),
                    enabled = !uiState.isBlockingLoading
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Concluir", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }

                Spacer(modifier = Modifier.height(8.dp))
            }

            // Barra de Botões Secundários (Atalhos): Apenas ícone por padrão; 1º clique expande o texto, 2º clique executa
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // 1. Editar (Canetinha)
                val isEditExpanded = expandedAction == "EDIT"
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isEditExpanded) Sg4Purple else Color(0xFFF1F5F9))
                        .clickable(enabled = !uiState.isBlockingLoading) {
                            if (isEditExpanded) {
                                onEdit()
                                expandedAction = null
                            } else {
                                expandedAction = "EDIT"
                            }
                        }
                        .padding(horizontal = if (isEditExpanded) 10.dp else 8.dp, vertical = 6.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Edit,
                            contentDescription = "Editar",
                            tint = if (isEditExpanded) Color.White else Slate700,
                            modifier = Modifier.size(15.dp)
                        )
                        if (isEditExpanded) {
                            Text(
                                text = "Editar",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }

                // 2. Duplicar (Cópia)
                val isDupExpanded = expandedAction == "DUP"
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isDupExpanded) Sg4Purple else Color(0xFFF1F5F9))
                        .clickable(enabled = !uiState.isBlockingLoading) {
                            if (isDupExpanded) {
                                onDuplicate()
                                expandedAction = null
                            } else {
                                expandedAction = "DUP"
                            }
                        }
                        .padding(horizontal = if (isDupExpanded) 10.dp else 8.dp, vertical = 6.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ContentCopy,
                            contentDescription = "Duplicar",
                            tint = if (isDupExpanded) Color.White else Sg4Purple,
                            modifier = Modifier.size(15.dp)
                        )
                        if (isDupExpanded) {
                            Text(
                                text = "Duplicar",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }

                // 3. Mover Data (se pendente)
                if (!isConcluido) {
                    val isMoveExpanded = expandedAction == "MOVE"
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isMoveExpanded) Sg4Blue else Color(0xFFF1F5F9))
                        .clickable(enabled = !uiState.isBlockingLoading) {
                            if (isMoveExpanded) {
                                onMoveDate()
                                expandedAction = null
                            } else {
                                expandedAction = "MOVE"
                            }
                        }
                        .padding(horizontal = if (isMoveExpanded) 10.dp else 8.dp, vertical = 6.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.CalendarMonth,
                                contentDescription = "Mover",
                                tint = if (isMoveExpanded) Color.White else Sg4Blue,
                                modifier = Modifier.size(15.dp)
                            )
                            if (isMoveExpanded) {
                                Text(
                                    text = "Mover",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    }
                }

                // 4. Reverter para Pendente (se concluído)
                if (isConcluido) {
                    val isRevExpanded = expandedAction == "REV"
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isRevExpanded) Sg4Amber else Color(0xFFFEF3C7))
                            .clickable(enabled = !uiState.isBlockingLoading) {
                                if (isRevExpanded) {
                                    viewModel.performAction(
                                        actionType = "REVERTER_ATIVIDADE",
                                        loadingTitle = "Revertendo atividade...",
                                        description = "Reverter ${plan.titulo}",
                                        payload = mapOf("id" to plan.id)
                                    )
                                    expandedAction = null
                                } else {
                                    expandedAction = "REV"
                                }
                            }
                            .padding(horizontal = if (isRevExpanded) 10.dp else 8.dp, vertical = 6.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Undo,
                                contentDescription = "Reverter",
                                tint = if (isRevExpanded) Color.White else Sg4Amber,
                                modifier = Modifier.size(15.dp)
                            )
                            if (isRevExpanded) {
                                Text(
                                    text = "Reverter",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    }
                }

                // 5. Excluir (Lixeira)
                val isDelExpanded = expandedAction == "DEL"
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isDelExpanded) Sg4Red else Color(0xFFFEE2E2))
                        .clickable(enabled = !uiState.isBlockingLoading) {
                            if (isDelExpanded) {
                                onDelete()
                                expandedAction = null
                            } else {
                                expandedAction = "DEL"
                            }
                        }
                        .padding(horizontal = if (isDelExpanded) 10.dp else 8.dp, vertical = 6.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = "Excluir",
                            tint = if (isDelExpanded) Color.White else Sg4Red,
                            modifier = Modifier.size(15.dp)
                        )
                        if (isDelExpanded) {
                            Text(
                                text = "Excluir",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }

                // 6. Sincronizar com Calendário Outlook
                val isOutlookExpanded = expandedAction == "OUTLOOK"
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isOutlookExpanded) Sg4Purple else Color(0xFFF1F5F9))
                        .clickable(enabled = !uiState.isBlockingLoading) {
                            if (isOutlookExpanded) {
                                val url = buildOutlookCalendarUrl(plan)
                                try {
                                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                                } catch (_: Exception) {}
                                expandedAction = null
                            } else {
                                expandedAction = "OUTLOOK"
                            }
                        }
                        .padding(horizontal = if (isOutlookExpanded) 10.dp else 8.dp, vertical = 6.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.EventRepeat,
                            contentDescription = "Outlook",
                            tint = if (isOutlookExpanded) Color.White else Sg4Purple,
                            modifier = Modifier.size(15.dp)
                        )
                        if (isOutlookExpanded) {
                            Text(
                                text = "Outlook",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }
            }
        }
    }
}


/**
 * Tela de KM & Abastecimento & Manutenções com:
 * - Captação de geolocalização no início e fim do KM
 * - Formatação em máscara R$ 0,00 no abastecimento
 * - Aba de registro de manutenções com data, hora, KM, descrição e foto
 */

fun formatKmDigits(rawDigits: String): String {
    val digits = rawDigits.filter { it.isDigit() }
    if (digits.isBlank()) return ""
    val number = digits.toLongOrNull() ?: 0L
    return NumberFormat.getIntegerInstance(Locale("pt", "BR")).format(number)
}

@Composable
fun Base64OrUrlImage(
    source: String,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Fit
) {
    if (source.isBlank()) {
        Box(
            modifier = modifier.background(Color(0xFFF1F5F9)),
            contentAlignment = Alignment.Center
        ) {
            Text("Sem imagem", fontSize = 11.sp, color = Slate600)
        }
        return
    }

    var bitmap by remember(source) { mutableStateOf<Bitmap?>(MobileImageCache.lru.get(source)) }
    var isLoading by remember(source) { mutableStateOf(bitmap == null) }
    var hasError by remember(source) { mutableStateOf(false) }

    LaunchedEffect(source) {
        if (bitmap != null) {
            isLoading = false
            return@LaunchedEffect
        }
        isLoading = true
        hasError = false

        withContext(Dispatchers.IO) {
            try {
                val bmp = if (source.startsWith("data:image")) {
                    val cleanBase64 = source.substringAfter("base64,")
                    val decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT)
                    BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
                } else if (source.startsWith("http://") || source.startsWith("https://")) {
                    val url = URL(source)
                    val conn = url.openConnection() as HttpURLConnection
                    conn.connectTimeout = 12000
                    conn.readTimeout = 20000
                    conn.instanceFollowRedirects = true
                    conn.doInput = true
                    conn.connect()
                    if (conn.responseCode in 200..299) {
                        conn.inputStream.use { input ->
                            BitmapFactory.decodeStream(input)
                        }
                    } else null
                } else null

                if (bmp != null) {
                    MobileImageCache.lru.put(source, bmp)
                    withContext(Dispatchers.Main) {
                        bitmap = bmp
                        isLoading = false
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        hasError = true
                        isLoading = false
                    }
                }
            } catch (_: Exception) {
                withContext(Dispatchers.Main) {
                    hasError = true
                    isLoading = false
                }
            }
        }
    }

    Box(
        modifier = modifier,
        contentAlignment = Alignment.Center
    ) {
        when {
            bitmap != null -> {
                Image(
                    bitmap = bitmap!!.asImageBitmap(),
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = contentScale
                )
            }
            isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0xFFF8FAFC)),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = Sg4Purple,
                        strokeWidth = 2.dp
                    )
                }
            }
            else -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0xFFF1F5F9)),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.BrokenImage,
                            contentDescription = null,
                            tint = Slate400,
                            modifier = Modifier.size(24.dp)
                        )
                        Text("Imagem não disponível", fontSize = 10.sp, color = Slate600)
                    }
                }
            }
        }
    }
}

@Composable
fun KmAbastecimentoScreen(
    uiState: Sg4UiState,
    viewModel: Sg4ViewModel
) {
    val context = LocalContext.current
    val todayFormatted = remember {
        SimpleDateFormat("dd/MM/yyyy", Locale.US).format(Date())
    }

    // Permissões limpas ao entrar na tela: Câmera e Geolocalização
    val permissionsLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { _ -> }

    LaunchedEffect(Unit) {
        val hasLoc = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasCam = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        if (!hasLoc || !hasCam) {
            permissionsLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                    Manifest.permission.CAMERA
                )
            )
        }
    }

    // Abas: Km, Abastecimento, Manutenções (escrita solicitada pelo usuário)
    var selectedSubTab by remember { mutableIntStateOf(0) } // 0=Km, 1=Abastecimento, 2=Manutenções

    var showStartKmDialog by remember { mutableStateOf(false) }
    var finishingKmItem by remember { mutableStateOf<QuilometragemDto?>(null) }
    var showAbastecimentoDialog by remember { mutableStateOf(false) }
    var showManutencaoDialog by remember { mutableStateOf(false) }

    // Visualizadores de imagens dos itens já registrados
    var viewingKmPhotos by remember { mutableStateOf<QuilometragemDto?>(null) }
    var viewingAbsPhoto by remember { mutableStateOf<AbastecimentoDto?>(null) }
    var viewingManutPhoto by remember { mutableStateOf<ManutencaoDto?>(null) }

    val openKm = uiState.syncData.quilometragens.firstOrNull { it.kmFinal == null }

    val textInputColors = OutlinedTextFieldDefaults.colors(
        focusedTextColor = Slate900,
        unfocusedTextColor = Slate900,
        focusedContainerColor = Color.White,
        unfocusedContainerColor = Color.White,
        focusedBorderColor = Sg4Purple,
        unfocusedBorderColor = Color(0xFFCBD5E1),
        focusedPlaceholderColor = Slate400,
        unfocusedPlaceholderColor = Slate400,
        cursorColor = Sg4Purple
    )

    Column(modifier = Modifier.fillMaxSize().background(Color.White)) {
        TabRow(
            selectedTabIndex = selectedSubTab,
            containerColor = Color.White,
            contentColor = Sg4Purple
        ) {
            Tab(
                selected = selectedSubTab == 0,
                onClick = { selectedSubTab = 0 },
                text = { Text("Km", fontWeight = FontWeight.Bold, fontSize = 13.sp) }
            )
            Tab(
                selected = selectedSubTab == 1,
                onClick = { selectedSubTab = 1 },
                text = { Text("Abastecimento", fontWeight = FontWeight.Bold, fontSize = 13.sp) }
            )
            Tab(
                selected = selectedSubTab == 2,
                onClick = { selectedSubTab = 2 },
                text = { Text("Manutenções", fontWeight = FontWeight.Bold, fontSize = 13.sp) }
            )
        }

        // ══════════════════════════════════════════════════════════════════════
        // ABA 0: KM (com suporte a visualização das fotos de início e fim)
        // ══════════════════════════════════════════════════════════════════════
        if (selectedSubTab == 0) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                item {
                    if (openKm != null) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Sg4PurpleSurface)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                StatusBadge(text = "ROTA EM ANDAMENTO", color = Sg4Purple)
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "KM Inicial: ${NumberFormat.getIntegerInstance(Locale("pt", "BR")).format(openKm.kmInicial.toInt())} km",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Sg4PurpleDark
                                )
                                Text(
                                    text = "${openKm.diaSemana} • ${formatIsoDateBr(openKm.dataInicial)}",
                                    fontSize = 12.sp,
                                    color = Slate600
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                Button(
                                    onClick = { finishingKmItem = openKm },
                                    enabled = !uiState.isBlockingLoading,
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple, contentColor = Color.White),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text("Encerrar KM do Dia", fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }
                        }
                    } else {
                        Button(
                            onClick = { showStartKmDialog = true },
                            enabled = !uiState.isBlockingLoading,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple, contentColor = Color.White),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.DirectionsCar, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Iniciar KM do Dia", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }

                items(uiState.syncData.quilometragens, key = { it.id }) { km ->
                    val hasPhotos = !km.fotoInicial.isNullOrBlank() || !km.fotoFinal.isNullOrBlank()
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { viewingKmPhotos = km },
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "${km.diaSemana} • ${formatIsoDateBr(km.dataInicial)}",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = Slate900
                                )
                                Text(
                                    text = "Início: ${NumberFormat.getIntegerInstance(Locale("pt", "BR")).format(km.kmInicial.toInt())} km" +
                                            (if (km.kmFinal != null) " → Fim: ${NumberFormat.getIntegerInstance(Locale("pt", "BR")).format(km.kmFinal.toInt())} km" else " (Em rota)"),
                                    fontSize = 12.sp,
                                    color = Slate600
                                )
                                if (hasPhotos) {
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "📷 Toque para ver as fotos do odômetro",
                                        fontSize = 10.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Sg4Purple
                                    )
                                }
                            }

                            if (km.diferenca != null) {
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(Sg4PurpleSurface)
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = "+${NumberFormat.getIntegerInstance(Locale("pt", "BR")).format(km.diferenca.toInt())} km",
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Sg4Purple,
                                        fontSize = 13.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
        // ══════════════════════════════════════════════════════════════════════
        // ABA 1: ABASTECIMENTO (com visualização do comprovante)
        // ══════════════════════════════════════════════════════════════════════
        else if (selectedSubTab == 1) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                item {
                    Button(
                        onClick = { showAbastecimentoDialog = true },
                        enabled = !uiState.isBlockingLoading,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple, contentColor = Color.White),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.LocalGasStation, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Registrar Abastecimento", fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }

                items(uiState.syncData.abastecimentos, key = { it.id }) { ab ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { viewingAbsPhoto = ab },
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = ab.tipo.ifBlank { "ABASTECIMENTO" },
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = Slate900
                                )
                                Text(
                                    text = formatIsoDateBr(ab.data),
                                    fontSize = 12.sp,
                                    color = Slate600
                                )
                                if (!ab.fotoCupom.isNullOrBlank()) {
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "📎 Toque para ver o comprovante",
                                        fontSize = 10.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Sg4Purple
                                    )
                                }
                            }
                            Text(
                                text = String.format(Locale("pt", "BR"), "R$ %.2f", ab.valor),
                                fontSize = 16.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Sg4Green
                            )
                        }
                    }
                }
            }
        }
        // ══════════════════════════════════════════════════════════════════════
        // ABA 2: MANUTENÇÕES (com visualização do comprovante)
        // ══════════════════════════════════════════════════════════════════════
        else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                item {
                    Button(
                        onClick = { showManutencaoDialog = true },
                        enabled = !uiState.isBlockingLoading,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple, contentColor = Color.White),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Build, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Registrar Manutenção", fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }

                if (uiState.syncData.manutencoes.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("Nenhuma manutenção veicular registrada.", color = Slate600, fontSize = 13.sp)
                        }
                    }
                } else {
                    items(uiState.syncData.manutencoes, key = { it.id }) { man ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { viewingManutPhoto = man },
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "${NumberFormat.getIntegerInstance(Locale("pt", "BR")).format(man.kmManutencao)} km",
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 15.sp,
                                        color = Sg4Purple
                                    )
                                    Text(
                                        text = formatIsoDateBr(man.dataManutencao),
                                        fontSize = 12.sp,
                                        color = Slate600
                                    )
                                }
                                if (!man.descricao.isNullOrBlank()) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = man.descricao,
                                        fontSize = 13.sp,
                                        color = Slate900,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                                if (!man.comprovanteUrl.isNullOrBlank()) {
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = "📎 Toque para ver a foto do comprovante",
                                        fontSize = 11.sp,
                                        color = Sg4Purple,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // MODAIS DE KM & ABASTECIMENTO COM CÂMERA, GALERIA E TECLADO NUMÉRICO
    // ══════════════════════════════════════════════════════════════════════

    // 1. DIÁLOGO: INICIAR KM DO DIA
    if (showStartKmDialog) {
        var rawKmIni by remember { mutableStateOf("") }
        var fotoIniBase64 by remember { mutableStateOf("") }

        val cameraLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.TakePicturePreview()
        ) { bitmap: Bitmap? ->
            bitmap?.let {
                try {
                    val stream = ByteArrayOutputStream()
                    it.compress(Bitmap.CompressFormat.JPEG, 75, stream)
                    val b64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
                    fotoIniBase64 = "data:image/jpeg;base64,$b64"
                } catch (_: Exception) {}
            }
        }

        val galleryLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.GetContent()
        ) { uri: Uri? ->
            uri?.let {
                try {
                    val bytes = context.contentResolver.openInputStream(it)?.use { s -> s.readBytes() }
                    if (bytes != null) {
                        val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                        fotoIniBase64 = "data:image/jpeg;base64,$b64"
                    }
                } catch (_: Exception) {}
            }
        }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) showStartKmDialog = false },
            containerColor = Color.White,
            shape = RoundedCornerShape(16.dp),
            title = {
                Text("Iniciar KM do Dia", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = Slate900)
            },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Dia preenchido
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("DATA DE REGISTRO", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                        Text("Hoje, $todayFormatted", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Slate900)
                    }

                    // Campo de Odômetro Inicial com formatação automática de milhar (ex: 12345 -> 12.345)
                    OutlinedTextField(
                        value = formatKmDigits(rawKmIni),
                        onValueChange = { rawKmIni = it.filter { ch -> ch.isDigit() } },
                        label = { Text("Odômetro Inicial (KM)", color = Slate900) },
                        placeholder = { Text("Ex: 45.210", color = Slate400) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        colors = textInputColors
                    )

                    // Foto do Odômetro
                    Text("FOTO DO ODÔMETRO INICIAL", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { cameraLauncher.launch(null) },
                            colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple, contentColor = Color.White),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.CameraAlt, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Câmera", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        OutlinedButton(
                            onClick = { galleryLauncher.launch("image/*") },
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, Sg4Purple),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = Sg4Purple, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Galeria", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                        }
                    }

                    if (fotoIniBase64.isNotBlank()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(8.dp))
                                .background(Color(0xFFF8FAFC)),
                            contentAlignment = Alignment.Center
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text("📷 Foto anexada", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Sg4Green)
                                Spacer(Modifier.weight(1f))
                                TextButton(onClick = { fotoIniBase64 = "" }) {
                                    Text("Remover", color = Sg4Red, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val kmVal = rawKmIni.toDoubleOrNull() ?: 0.0
                        val loc = getDeviceLocation(context)
                        viewModel.performAction(
                            actionType = "INICIAR_KM",
                            loadingTitle = "Iniciando KM do dia...",
                            description = "Início com ${kmVal.toInt()} km",
                            payload = mapOf(
                                "kmInicial" to kmVal,
                                "fotoInicial" to fotoIniBase64.ifBlank { null },
                                "latitude" to loc?.first,
                                "longitude" to loc?.second
                            ),
                            onCompleted = { showStartKmDialog = false }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Green, contentColor = Color.White),
                    shape = RoundedCornerShape(8.dp),
                    enabled = rawKmIni.isNotBlank() && !uiState.isBlockingLoading
                ) {
                    Text("Confirmar", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showStartKmDialog = false }) {
                    Text("Cancelar", color = Slate600)
                }
            }
        )
    }

    // 2. DIÁLOGO: ENCERRAR KM DO DIA
    finishingKmItem?.let { kmItem ->
        var rawKmFim by remember(kmItem.id) { mutableStateOf("") }
        var fotoFimBase64 by remember(kmItem.id) { mutableStateOf("") }

        val cameraLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.TakePicturePreview()
        ) { bitmap: Bitmap? ->
            bitmap?.let {
                try {
                    val stream = ByteArrayOutputStream()
                    it.compress(Bitmap.CompressFormat.JPEG, 75, stream)
                    val b64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
                    fotoFimBase64 = "data:image/jpeg;base64,$b64"
                } catch (_: Exception) {}
            }
        }

        val galleryLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.GetContent()
        ) { uri: Uri? ->
            uri?.let {
                try {
                    val bytes = context.contentResolver.openInputStream(it)?.use { s -> s.readBytes() }
                    if (bytes != null) {
                        val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                        fotoFimBase64 = "data:image/jpeg;base64,$b64"
                    }
                } catch (_: Exception) {}
            }
        }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) finishingKmItem = null },
            containerColor = Color.White,
            shape = RoundedCornerShape(16.dp),
            title = {
                Text("Encerrar KM do Dia", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = Slate900)
            },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("DATA DE REGISTRO", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                        Text("Hoje, $todayFormatted", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Slate900)
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0xFFF1F5F9))
                            .padding(10.dp)
                    ) {
                        Text(
                            text = "KM Inicial registrado: ${NumberFormat.getIntegerInstance(Locale("pt", "BR")).format(kmItem.kmInicial.toInt())} km",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Slate700
                        )
                    }

                    // Campo de Odômetro Final com formatação de milhar
                    OutlinedTextField(
                        value = formatKmDigits(rawKmFim),
                        onValueChange = { rawKmFim = it.filter { ch -> ch.isDigit() } },
                        label = { Text("Odômetro Final (KM)", color = Slate900) },
                        placeholder = { Text("Ex: 45.320", color = Slate400) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        colors = textInputColors
                    )

                    // Foto do Odômetro Final
                    Text("FOTO DO ODÔMETRO FINAL", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { cameraLauncher.launch(null) },
                            colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple, contentColor = Color.White),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.CameraAlt, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Câmera", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        OutlinedButton(
                            onClick = { galleryLauncher.launch("image/*") },
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, Sg4Purple),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = Sg4Purple, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Galeria", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                        }
                    }

                    if (fotoFimBase64.isNotBlank()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(8.dp))
                                .background(Color(0xFFF8FAFC)),
                            contentAlignment = Alignment.Center
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text("📷 Foto anexada", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Sg4Green)
                                Spacer(Modifier.weight(1f))
                                TextButton(onClick = { fotoFimBase64 = "" }) {
                                    Text("Remover", color = Sg4Red, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val kmFim = rawKmFim.toDoubleOrNull() ?: 0.0
                        val loc = getDeviceLocation(context)
                        viewModel.performAction(
                            actionType = "FINALIZAR_KM",
                            loadingTitle = "Encerrando KM do dia...",
                            description = "Encerramento com ${kmFim.toInt()} km",
                            payload = mapOf(
                                "id" to kmItem.id,
                                "kmFinal" to kmFim,
                                "fotoFinal" to fotoFimBase64.ifBlank { null },
                                "latitude" to loc?.first,
                                "longitude" to loc?.second
                            ),
                            onCompleted = { finishingKmItem = null }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Green, contentColor = Color.White),
                    shape = RoundedCornerShape(8.dp),
                    enabled = rawKmFim.isNotBlank() && !uiState.isBlockingLoading
                ) {
                    Text("Confirmar", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { finishingKmItem = null }) {
                    Text("Cancelar", color = Slate600)
                }
            }
        )
    }

    // 3. DIÁLOGO: REGISTRAR ABASTECIMENTO (COM TECLADO NUMÉRICO E FOTO)
    if (showAbastecimentoDialog) {
        var rawDigits by remember { mutableStateOf("") }
        var fotoCupomBase64 by remember { mutableStateOf("") }

        val cameraLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.TakePicturePreview()
        ) { bitmap: Bitmap? ->
            bitmap?.let {
                try {
                    val stream = ByteArrayOutputStream()
                    it.compress(Bitmap.CompressFormat.JPEG, 75, stream)
                    val b64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
                    fotoCupomBase64 = "data:image/jpeg;base64,$b64"
                } catch (_: Exception) {}
            }
        }

        val galleryLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.GetContent()
        ) { uri: Uri? ->
            uri?.let {
                try {
                    val bytes = context.contentResolver.openInputStream(it)?.use { s -> s.readBytes() }
                    if (bytes != null) {
                        val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                        fotoCupomBase64 = "data:image/jpeg;base64,$b64"
                    }
                } catch (_: Exception) {}
            }
        }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) showAbastecimentoDialog = false },
            containerColor = Color.White,
            shape = RoundedCornerShape(16.dp),
            title = {
                Text("Registrar Abastecimento", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = Slate900)
            },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("DATA DE REGISTRO", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                        Text("Hoje, $todayFormatted", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Slate900)
                    }

                    OutlinedTextField(
                        value = formatCurrencyBrlInput(rawDigits),
                        onValueChange = { rawDigits = it.filter { ch -> ch.isDigit() } },
                        label = { Text("Valor do Abastecimento (R$)", color = Slate900) },
                        placeholder = { Text("R$ 0,00", color = Slate400) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        colors = textInputColors
                    )

                    Text("FOTO DO COMPROVANTE / CUPOM", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { cameraLauncher.launch(null) },
                            colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple, contentColor = Color.White),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.CameraAlt, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Câmera", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        OutlinedButton(
                            onClick = { galleryLauncher.launch("image/*") },
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, Sg4Purple),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = Sg4Purple, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Galeria", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                        }
                    }

                    if (fotoCupomBase64.isNotBlank()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(8.dp))
                                .background(Color(0xFFF8FAFC)),
                            contentAlignment = Alignment.Center
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text("📷 Comprovante anexado", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Sg4Green)
                                Spacer(Modifier.weight(1f))
                                TextButton(onClick = { fotoCupomBase64 = "" }) {
                                    Text("Remover", color = Sg4Red, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val valor = parseCurrencyValue(rawDigits)
                        viewModel.performAction(
                            actionType = "CRIAR_ABASTECIMENTO",
                            loadingTitle = "Registrando abastecimento...",
                            description = "Abastecimento: R$ valor",
                            payload = mapOf(
                                "valor" to valor,
                                "fotoCupom" to fotoCupomBase64.ifBlank { null }
                            ),
                            onCompleted = { showAbastecimentoDialog = false }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Green, contentColor = Color.White),
                    shape = RoundedCornerShape(8.dp),
                    enabled = rawDigits.isNotBlank() && !uiState.isBlockingLoading
                ) {
                    Text("Confirmar", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAbastecimentoDialog = false }) {
                    Text("Cancelar", color = Slate600)
                }
            }
        )
    }

    // 4. DIÁLOGO: REGISTRAR MANUTENÇÃO (COM TECLADO NUMÉRICO E FOTO)
    if (showManutencaoDialog) {
        var rawKmManut by remember { mutableStateOf("") }
        var descManut by remember { mutableStateOf("") }
        var fotoManutBase64 by remember { mutableStateOf("") }

        val cameraLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.TakePicturePreview()
        ) { bitmap: Bitmap? ->
            bitmap?.let {
                try {
                    val stream = ByteArrayOutputStream()
                    it.compress(Bitmap.CompressFormat.JPEG, 75, stream)
                    val b64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
                    fotoManutBase64 = "data:image/jpeg;base64,$b64"
                } catch (_: Exception) {}
            }
        }

        val galleryLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.GetContent()
        ) { uri: Uri? ->
            uri?.let {
                try {
                    val bytes = context.contentResolver.openInputStream(it)?.use { s -> s.readBytes() }
                    if (bytes != null) {
                        val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                        fotoManutBase64 = "data:image/jpeg;base64,$b64"
                    }
                } catch (_: Exception) {}
            }
        }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) showManutencaoDialog = false },
            containerColor = Color.White,
            shape = RoundedCornerShape(16.dp),
            title = {
                Text("Registrar Manutenção", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = Slate900)
            },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("DATA DE REGISTRO", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                        Text("Hoje, $todayFormatted", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Slate900)
                    }

                    OutlinedTextField(
                        value = formatKmDigits(rawKmManut),
                        onValueChange = { rawKmManut = it.filter { ch -> ch.isDigit() } },
                        label = { Text("KM no Momento da Manutenção", color = Slate900) },
                        placeholder = { Text("Ex: 50.000", color = Slate400) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        colors = textInputColors
                    )

                    OutlinedTextField(
                        value = descManut,
                        onValueChange = { descManut = it },
                        label = { Text("Descrição do Serviço / Peças Trocadas", color = Slate900) },
                        placeholder = { Text("Ex: Troca de óleo, pastilhas de freio...", color = Slate400) },
                        modifier = Modifier.fillMaxWidth().height(80.dp),
                        colors = textInputColors
                    )

                    Text("FOTO DA NOTA / COMPROVANTE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { cameraLauncher.launch(null) },
                            colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple, contentColor = Color.White),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.CameraAlt, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Câmera", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        OutlinedButton(
                            onClick = { galleryLauncher.launch("image/*") },
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, Sg4Purple),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = Sg4Purple, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Galeria", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                        }
                    }

                    if (fotoManutBase64.isNotBlank()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(8.dp))
                                .background(Color(0xFFF8FAFC)),
                            contentAlignment = Alignment.Center
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text("📷 Comprovante anexado", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Sg4Green)
                                Spacer(Modifier.weight(1f))
                                TextButton(onClick = { fotoManutBase64 = "" }) {
                                    Text("Remover", color = Sg4Red, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val km = rawKmManut.toIntOrNull() ?: 0
                        viewModel.performAction(
                            actionType = "CRIAR_MANUTENCAO",
                            loadingTitle = "Registrando manutenção...",
                            description = "Manutenção aos $km km",
                            payload = mapOf(
                                "kmManutencao" to km,
                                "descricao" to descManut,
                                "comprovanteUrl" to fotoManutBase64.ifBlank { null }
                            ),
                            onCompleted = { showManutencaoDialog = false }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Green, contentColor = Color.White),
                    shape = RoundedCornerShape(8.dp),
                    enabled = rawKmManut.isNotBlank() && !uiState.isBlockingLoading
                ) {
                    Text("Confirmar", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showManutencaoDialog = false }) {
                    Text("Cancelar", color = Slate600)
                }
            }
        )
    }

    // ══════════════════════════════════════════════════════════════════════
    // MODAIS DE VISUALIZAÇÃO DE FOTOS GRANDES AO CLICAR NOS ITENS DA TELA
    // ══════════════════════════════════════════════════════════════════════

    // 5. VISUALIZAR FOTOS DO ODÔMETRO (INÍCIO E FIM)
    viewingKmPhotos?.let { km ->
        AlertDialog(
            onDismissRequest = { viewingKmPhotos = null },
            containerColor = Color.White,
            shape = RoundedCornerShape(16.dp),
            title = {
                Text("Fotos do Odômetro", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = Slate900)
            },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("${km.diaSemana} • ${formatIsoDateBr(km.dataInicial)}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Sg4Purple)

                    // Foto Inicial
                    Column {
                        Text(
                            text = "Início: ${NumberFormat.getIntegerInstance(Locale("pt", "BR")).format(km.kmInicial.toInt())} km",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = Slate900
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        if (!km.fotoInicial.isNullOrBlank()) {
                            Base64OrUrlImage(
                                source = km.fotoInicial,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(180.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(8.dp))
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(70.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color(0xFFF1F5F9)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("Nenhuma foto do odômetro inicial", fontSize = 11.sp, color = Slate600)
                            }
                        }
                    }

                    // Foto Final
                    Column {
                        Text(
                            text = "Fim: " + (if (km.kmFinal != null) "${NumberFormat.getIntegerInstance(Locale("pt", "BR")).format(km.kmFinal.toInt())} km" else "Em rota"),
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = Slate900
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        if (!km.fotoFinal.isNullOrBlank()) {
                            Base64OrUrlImage(
                                source = km.fotoFinal,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(180.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(8.dp))
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(70.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color(0xFFF1F5F9)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("Nenhuma foto do odômetro final", fontSize = 11.sp, color = Slate600)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { viewingKmPhotos = null },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple, contentColor = Color.White),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Fechar", fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        )
    }

    // 6. VISUALIZAR FOTO DO ABASTECIMENTO
    viewingAbsPhoto?.let { ab ->
        AlertDialog(
            onDismissRequest = { viewingAbsPhoto = null },
            containerColor = Color.White,
            shape = RoundedCornerShape(16.dp),
            title = {
                Text("Comprovante de Abastecimento", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = Slate900)
            },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "${ab.tipo} • ${String.format(Locale("pt", "BR"), "R$ %.2f", ab.valor)}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = Sg4Green
                    )
                    Text(formatIsoDateBr(ab.data), fontSize = 12.sp, color = Slate600)
                    Spacer(modifier = Modifier.height(4.dp))

                    if (!ab.fotoCupom.isNullOrBlank()) {
                        Base64OrUrlImage(
                            source = ab.fotoCupom,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(260.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(8.dp))
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFFF1F5F9)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("Nenhum comprovante anexado a este abastecimento", fontSize = 12.sp, color = Slate600)
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { viewingAbsPhoto = null },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple, contentColor = Color.White),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Fechar", fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        )
    }

    // 7. VISUALIZAR FOTO DA MANUTENÇÃO
    viewingManutPhoto?.let { man ->
        AlertDialog(
            onDismissRequest = { viewingManutPhoto = null },
            containerColor = Color.White,
            shape = RoundedCornerShape(16.dp),
            title = {
                Text("Comprovante de Manutenção", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = Slate900)
            },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "Manutenção aos ${NumberFormat.getIntegerInstance(Locale("pt", "BR")).format(man.kmManutencao)} km",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = Sg4Purple
                    )
                    Text(formatIsoDateBr(man.dataManutencao), fontSize = 12.sp, color = Slate600)
                    if (!man.descricao.isNullOrBlank()) {
                        Text(man.descricao, fontSize = 12.sp, color = Slate900)
                    }
                    Spacer(modifier = Modifier.height(4.dp))

                    if (!man.comprovanteUrl.isNullOrBlank()) {
                        Base64OrUrlImage(
                            source = man.comprovanteUrl,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(260.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(8.dp))
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFFF1F5F9)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("Nenhum comprovante anexado a esta manutenção", fontSize = 12.sp, color = Slate600)
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { viewingManutPhoto = null },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple, contentColor = Color.White),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Fechar", fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        )
    }
}


@Composable
fun RelatoriosMobileScreen(
    uiState: Sg4UiState,
    viewModel: Sg4ViewModel
) {
    val context = LocalContext.current
    var selectedSubTab by remember { mutableIntStateOf(0) } // 0 = Relatórios, 1 = Atividades

    var showNovoItemDialog by remember { mutableStateOf(false) }
    var editingItem by remember { mutableStateOf<RelatorioCampoDto?>(null) }
    var deletingItem by remember { mutableStateOf<RelatorioCampoDto?>(null) }

    val textInputColors = OutlinedTextFieldDefaults.colors(
        focusedTextColor = Slate900,
        unfocusedTextColor = Slate900,
        focusedContainerColor = Color.White,
        unfocusedContainerColor = Color.White,
        focusedBorderColor = Sg4Purple,
        unfocusedBorderColor = Color(0xFFCBD5E1),
        focusedPlaceholderColor = Slate400,
        unfocusedPlaceholderColor = Slate400,
        cursorColor = Sg4Purple
    )

    Column(modifier = Modifier.fillMaxSize().background(Color.White)) {
        // Guias com nomes limpos: Relatórios e Atividades
        TabRow(
            selectedTabIndex = selectedSubTab,
            containerColor = Color.White,
            contentColor = Sg4Purple
        ) {
            Tab(
                selected = selectedSubTab == 0,
                onClick = { selectedSubTab = 0 },
                text = {
                    Text(
                        text = "Relatórios",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                }
            )
            Tab(
                selected = selectedSubTab == 1,
                onClick = { selectedSubTab = 1 },
                text = {
                    Text(
                        text = "Atividades",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                }
            )
        }

        // ══════════════════════════════════════════════════════════════════════
        // ABA 0: RELATÓRIOS (PDFs Emitidos)
        // ══════════════════════════════════════════════════════════════════════
        if (selectedSubTab == 0) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                if (uiState.syncData.relatoriosPdf.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC))
                        ) {
                            Column(
                                modifier = Modifier.fillMaxWidth().padding(32.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text("📄", fontSize = 36.sp)
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Nenhum relatório em PDF gerado no momento.",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = Slate900,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Os relatórios emitidos aparecerão aqui automaticamente para visualização e download.",
                                    fontSize = 12.sp,
                                    color = Slate600,
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                    }
                } else {
                    items(uiState.syncData.relatoriosPdf, key = { it.id }) { pdf ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(Sg4PurpleSurface)
                                            .padding(horizontal = 7.dp, vertical = 3.dp)
                                    ) {
                                        Text(
                                            text = "PDF • ${pdf.mesAno}",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = Sg4Purple
                                        )
                                    }

                                    val sizeKb = (pdf.tamanhoBytes / 1024).coerceAtLeast(1)
                                    Text(
                                        text = "${sizeKb} KB",
                                        fontSize = 11.sp,
                                        color = Slate600
                                    )
                                }

                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = pdf.nomeArquivo,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = Slate900
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "Elaborado por: ${pdf.elaborador} • ${formatIsoDateBr(pdf.createdAt)}",
                                    fontSize = 11.sp,
                                    color = Slate600
                                )

                                Spacer(modifier = Modifier.height(10.dp))
                                Button(
                                    onClick = {
                                        try {
                                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(pdf.url)))
                                        } catch (_: Exception) {}
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple, contentColor = Color.White),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text("Visualizar / Baixar PDF", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.White)
                                }
                            }
                        }
                    }
                }
            }
        }
        // ══════════════════════════════════════════════════════════════════════
        // ABA 1: ATIVIDADES (com botões de atalho de 2 toques: Editar e Excluir)
        // ══════════════════════════════════════════════════════════════════════
        else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                item {
                    Button(
                        onClick = { showNovoItemDialog = true },
                        enabled = !uiState.isBlockingLoading,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple, contentColor = Color.White),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Incluir Item no Relatório", fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }

                if (uiState.syncData.relatoriosCampo.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("Nenhum item registrado para o relatório de atividades.", color = Slate600, fontSize = 13.sp)
                        }
                    }
                } else {
                    items(uiState.syncData.relatoriosCampo, key = { it.id }) { rel ->
                        var expandedAction by remember { mutableStateOf<String?>(null) }

                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    StatusBadge(text = rel.projeto.ifBlank { "VIVO" }, color = Sg4Purple)
                                    Text(formatIsoDateBr(rel.data), fontSize = 11.sp, color = Slate600)
                                }

                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = rel.descricao,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = Slate900
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "${rel.empresa} • ${rel.local} (${rel.cidadeUf})",
                                    fontSize = 11.sp,
                                    color = Slate600
                                )

                                Spacer(modifier = Modifier.height(8.dp))

                                // Barra de Botões Secundários: Ícones por padrão, 1º clique expande o texto, 2º clique executa
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // 1. Editar (Canetinha)
                                    val isEditExpanded = expandedAction == "EDIT"
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(if (isEditExpanded) Sg4Purple else Color(0xFFF1F5F9))
                                            .clickable(enabled = !uiState.isBlockingLoading) {
                                                if (isEditExpanded) {
                                                    editingItem = rel
                                                    expandedAction = null
                                                } else {
                                                    expandedAction = "EDIT"
                                                }
                                            }
                                            .padding(horizontal = if (isEditExpanded) 12.dp else 10.dp, vertical = 7.dp)
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Edit,
                                                contentDescription = "Editar",
                                                tint = if (isEditExpanded) Color.White else Slate700,
                                                modifier = Modifier.size(15.dp)
                                            )
                                            if (isEditExpanded) {
                                                Text(
                                                    text = "Editar",
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color.White
                                                )
                                            }
                                        }
                                    }

                                    // 2. Excluir (Lixeira)
                                    val isDelExpanded = expandedAction == "DEL"
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(if (isDelExpanded) Sg4Red else Color(0xFFFEE2E2))
                                            .clickable(enabled = !uiState.isBlockingLoading) {
                                                if (isDelExpanded) {
                                                    deletingItem = rel
                                                    expandedAction = null
                                                } else {
                                                    expandedAction = "DEL"
                                                }
                                            }
                                            .padding(horizontal = if (isDelExpanded) 12.dp else 10.dp, vertical = 7.dp)
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Delete,
                                                contentDescription = "Excluir",
                                                tint = if (isDelExpanded) Color.White else Sg4Red,
                                                modifier = Modifier.size(15.dp)
                                            )
                                            if (isDelExpanded) {
                                                Text(
                                                    text = "Excluir",
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color.White
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Modal: Incluir Novo Item no Relatório (com IA, Câmera e Galeria)
    if (showNovoItemDialog) {
        var dataItem by remember { mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())) }
        var empresa by remember { mutableStateOf("Telefônica Brasil S.A") }
        var projeto by remember { mutableStateOf("VIVO") }
        var local by remember { mutableStateOf("") }
        var cidadeUf by remember { mutableStateOf("São Paulo/SP") }
        var descricao by remember { mutableStateOf("") }
        var fotoBase64 by remember { mutableStateOf("") }

        val cameraLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.TakePicturePreview()
        ) { bitmap: Bitmap? ->
            bitmap?.let {
                try {
                    val stream = ByteArrayOutputStream()
                    it.compress(Bitmap.CompressFormat.JPEG, 75, stream)
                    val b64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
                    fotoBase64 = "data:image/jpeg;base64,$b64"
                } catch (_: Exception) {}
            }
        }

        val galleryLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.GetContent()
        ) { uri: Uri? ->
            uri?.let {
                try {
                    val bytes = context.contentResolver.openInputStream(it)?.use { s -> s.readBytes() }
                    if (bytes != null) {
                        val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                        fotoBase64 = "data:image/jpeg;base64,$b64"
                    }
                } catch (_: Exception) {}
            }
        }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) showNovoItemDialog = false },
            containerColor = Color.White,
            shape = RoundedCornerShape(16.dp),
            title = { Text("Incluir Item no Relatório", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = Slate900) },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = dataItem,
                        onValueChange = { dataItem = it },
                        label = { Text("Data", color = Slate900) },
                        placeholder = { Text("AAAA-MM-DD", color = Slate400) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = textInputColors
                    )
                    OutlinedTextField(
                        value = empresa,
                        onValueChange = { empresa = it },
                        label = { Text("Empresa", color = Slate900) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = textInputColors
                    )
                    OutlinedTextField(
                        value = projeto,
                        onValueChange = { projeto = it },
                        label = { Text("Projeto", color = Slate900) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = textInputColors
                    )
                    OutlinedTextField(
                        value = local,
                        onValueChange = { local = it },
                        label = { Text("Local / Unidade", color = Slate900) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = textInputColors
                    )
                    OutlinedTextField(
                        value = cidadeUf,
                        onValueChange = { cidadeUf = it },
                        label = { Text("Cidade / UF", color = Slate900) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = textInputColors
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("DESCRIÇÃO DA ATIVIDADE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                        AiSpellcheckButton(
                            text = descricao,
                            enabled = !uiState.isBlockingLoading,
                            onClick = {
                                viewModel.correctTextWithAI(descricao) { corr ->
                                    descricao = corr
                                }
                            }
                        )
                    }

                    OutlinedTextField(
                        value = descricao,
                        onValueChange = { descricao = it },
                        placeholder = { Text("Descreva detalhadamente o que foi realizado...", color = Slate400) },
                        modifier = Modifier.fillMaxWidth().height(90.dp),
                        colors = textInputColors
                    )

                    // Foto da Atividade (Câmera / Galeria)
                    Text("FOTO DA ATIVIDADE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { cameraLauncher.launch(null) },
                            colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple, contentColor = Color.White),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.CameraAlt, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Câmera", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        OutlinedButton(
                            onClick = { galleryLauncher.launch("image/*") },
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, Sg4Purple),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = Sg4Purple, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Galeria", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                        }
                    }

                    if (fotoBase64.isNotBlank()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(8.dp))
                                .background(Color(0xFFF8FAFC)),
                            contentAlignment = Alignment.Center
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text("📷 Foto anexada", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Sg4Green)
                                Spacer(Modifier.weight(1f))
                                TextButton(onClick = { fotoBase64 = "" }) {
                                    Text("Remover", color = Sg4Red, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.performAction(
                            actionType = "CRIAR_RELATORIO_CAMPO",
                            loadingTitle = "Salvando item no relatório...",
                            description = "Item: $descricao",
                            payload = mapOf(
                                "data" to dataItem,
                                "empresa" to empresa,
                                "projeto" to projeto,
                                "local" to local,
                                "cidadeUf" to cidadeUf,
                                "descricao" to descricao,
                                "fotoUrl" to fotoBase64.ifBlank { null }
                            ),
                            onCompleted = { showNovoItemDialog = false }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple, contentColor = Color.White),
                    shape = RoundedCornerShape(8.dp),
                    enabled = descricao.isNotBlank() && !uiState.isBlockingLoading
                ) {
                    Text("Salvar", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showNovoItemDialog = false }) { Text("Cancelar", color = Slate600) }
            }
        )
    }

    // Modal: Editar Item do Relatório (com IA, Câmera e Galeria)
    editingItem?.let { item ->
        var dataItem by remember(item.id) { mutableStateOf(item.data.take(10)) }
        var empresa by remember(item.id) { mutableStateOf(item.empresa) }
        var projeto by remember(item.id) { mutableStateOf(item.projeto) }
        var local by remember(item.id) { mutableStateOf(item.local) }
        var cidadeUf by remember(item.id) { mutableStateOf(item.cidadeUf) }
        var descricao by remember(item.id) { mutableStateOf(item.descricao) }
        var fotoBase64 by remember(item.id) { mutableStateOf(item.fotoUrl ?: "") }

        val cameraLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.TakePicturePreview()
        ) { bitmap: Bitmap? ->
            bitmap?.let {
                try {
                    val stream = ByteArrayOutputStream()
                    it.compress(Bitmap.CompressFormat.JPEG, 75, stream)
                    val b64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
                    fotoBase64 = "data:image/jpeg;base64,$b64"
                } catch (_: Exception) {}
            }
        }

        val galleryLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.GetContent()
        ) { uri: Uri? ->
            uri?.let {
                try {
                    val bytes = context.contentResolver.openInputStream(it)?.use { s -> s.readBytes() }
                    if (bytes != null) {
                        val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                        fotoBase64 = "data:image/jpeg;base64,$b64"
                    }
                } catch (_: Exception) {}
            }
        }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) editingItem = null },
            containerColor = Color.White,
            shape = RoundedCornerShape(16.dp),
            title = { Text("Editar Item do Relatório", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = Slate900) },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = dataItem,
                        onValueChange = { dataItem = it },
                        label = { Text("Data", color = Slate900) },
                        placeholder = { Text("AAAA-MM-DD", color = Slate400) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = textInputColors
                    )
                    OutlinedTextField(
                        value = empresa,
                        onValueChange = { empresa = it },
                        label = { Text("Empresa", color = Slate900) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = textInputColors
                    )
                    OutlinedTextField(
                        value = projeto,
                        onValueChange = { projeto = it },
                        label = { Text("Projeto", color = Slate900) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = textInputColors
                    )
                    OutlinedTextField(
                        value = local,
                        onValueChange = { local = it },
                        label = { Text("Local / Unidade", color = Slate900) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = textInputColors
                    )
                    OutlinedTextField(
                        value = cidadeUf,
                        onValueChange = { cidadeUf = it },
                        label = { Text("Cidade / UF", color = Slate900) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = textInputColors
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("DESCRIÇÃO DA ATIVIDADE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                        AiSpellcheckButton(
                            text = descricao,
                            enabled = !uiState.isBlockingLoading,
                            onClick = {
                                viewModel.correctTextWithAI(descricao) { corr ->
                                    descricao = corr
                                }
                            }
                        )
                    }

                    OutlinedTextField(
                        value = descricao,
                        onValueChange = { descricao = it },
                        placeholder = { Text("Descreva detalhadamente...", color = Slate400) },
                        modifier = Modifier.fillMaxWidth().height(90.dp),
                        colors = textInputColors
                    )

                    // Foto da Atividade
                    Text("FOTO DA ATIVIDADE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { cameraLauncher.launch(null) },
                            colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple, contentColor = Color.White),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.CameraAlt, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Câmera", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        OutlinedButton(
                            onClick = { galleryLauncher.launch("image/*") },
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, Sg4Purple),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = Sg4Purple, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Galeria", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                        }
                    }

                    if (fotoBase64.isNotBlank()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(8.dp))
                                .background(Color(0xFFF8FAFC)),
                            contentAlignment = Alignment.Center
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text("📷 Foto anexada", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Sg4Green)
                                Spacer(Modifier.weight(1f))
                                TextButton(onClick = { fotoBase64 = "" }) {
                                    Text("Remover", color = Sg4Red, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.performAction(
                            actionType = "EDITAR_RELATORIO_CAMPO",
                            loadingTitle = "Atualizando item do relatório...",
                            description = "Atualizar item",
                            payload = mapOf(
                                "id" to item.id,
                                "data" to dataItem,
                                "empresa" to empresa,
                                "projeto" to projeto,
                                "local" to local,
                                "cidadeUf" to cidadeUf,
                                "descricao" to descricao,
                                "fotoUrl" to fotoBase64.ifBlank { null }
                            ),
                            onCompleted = { editingItem = null }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple, contentColor = Color.White),
                    shape = RoundedCornerShape(8.dp),
                    enabled = descricao.isNotBlank() && !uiState.isBlockingLoading
                ) {
                    Text("Confirmar", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { editingItem = null }) { Text("Cancelar", color = Slate600) }
            }
        )
    }

    // Modal: Excluir Item do Relatório
    deletingItem?.let { item ->
        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) deletingItem = null },
            containerColor = Color.White,
            shape = RoundedCornerShape(16.dp),
            title = { Text("Excluir Item", fontWeight = FontWeight.ExtraBold, color = Sg4Red, fontSize = 17.sp) },
            text = { Text("Deseja realmente excluir este item do relatório?", color = Slate900) },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.performAction(
                            actionType = "EXCLUIR_RELATORIO_CAMPO",
                            loadingTitle = "Excluindo item do relatório...",
                            description = "Excluir item",
                            payload = mapOf("id" to item.id),
                            onCompleted = { deletingItem = null }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Red, contentColor = Color.White),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Excluir", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { deletingItem = null }) { Text("Cancelar", color = Slate600) }
            }
        )
    }
}

@Composable
fun CampoNcScreen(uiState: Sg4UiState, viewModel: Sg4ViewModel) {
    RelatoriosMobileScreen(uiState = uiState, viewModel = viewModel)
}

data class Tuple5<A, B, C, D, E>(
    val first: A,
    val second: B,
    val third: C,
    val fourth: D,
    val fifth: E
)
