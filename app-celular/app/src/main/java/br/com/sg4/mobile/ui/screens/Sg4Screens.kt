package br.com.sg4.mobile.ui.screens

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import androidx.core.content.ContextCompat
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FloatingActionButton
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import br.com.sg4.mobile.model.RelatorioPdfDto
import br.com.sg4.mobile.model.RelatorioCampoDto
import br.com.sg4.mobile.model.ManutencaoDto
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckBox
import androidx.compose.material.icons.filled.CheckBoxOutlineBlank
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.EventRepeat
import androidx.compose.material.icons.filled.LocalGasStation
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Undo
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import br.com.sg4.mobile.R
import br.com.sg4.mobile.model.ChecklistItemDto
import br.com.sg4.mobile.model.MobileTab
import br.com.sg4.mobile.model.NaoConformidadeDto
import br.com.sg4.mobile.model.PlanejamentoDto
import br.com.sg4.mobile.model.QuilometragemDto
import br.com.sg4.mobile.ui.components.StatusBadge
import br.com.sg4.mobile.ui.components.formatIsoDateBr
import br.com.sg4.mobile.ui.theme.Sg4Amber
import br.com.sg4.mobile.ui.theme.Sg4Blue
import br.com.sg4.mobile.ui.theme.Sg4Green
import br.com.sg4.mobile.ui.theme.Sg4Purple
import br.com.sg4.mobile.ui.theme.Sg4PurpleDark
import br.com.sg4.mobile.ui.theme.Sg4PurpleSurface
import br.com.sg4.mobile.ui.theme.Sg4Red
import br.com.sg4.mobile.ui.theme.Slate400
import br.com.sg4.mobile.ui.theme.Slate600
import br.com.sg4.mobile.ui.theme.Slate900
import br.com.sg4.mobile.viewmodel.Sg4UiState
import br.com.sg4.mobile.viewmodel.Sg4ViewModel
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone



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
                text = "Corrigir com IA",
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
    var email by remember { mutableStateOf(uiState.userEmail) }
    var password by remember { mutableStateOf("") }
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

                Spacer(modifier = Modifier.height(22.dp))

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
                            viewModel.login(uiState.baseUrl, email, password)
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
                            Text(
                                text = "${tecnico?.nome ?: uiState.userName} • Base: ${tecnico?.baseFixaNome ?: "Geral"}",
                                fontSize = 12.sp,
                                color = Slate600
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
                subLeft = "Meta: $dssMeta (${activeMonthsCount}m)",
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
                subLeft = "Meta: $inspecoesMeta (${activeMonthsCount}m)",
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
            val mediaPorMes = String.format(Locale("pt", "BR"), "%.1f", relatoriosIncluidos.toDouble() / activeMonthsCount)
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
                            text = "KM RODADOS NO PERÍODO",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Slate600
                        )
                        Text(
                            text = "${String.format(Locale("pt", "BR"), "%.1f", kmPeriodo)} km",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Sg4Purple
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "SALDO ABASTECIMENTO (MÊS)",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Slate600
                        )
                        Text(
                            text = String.format(Locale("pt", "BR"), "R$ %.2f", summary.saldoAbastecimento),
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

    // MODAL 1: CRIAR OU EDITAR AGENDAMENTO (COM CORRETOR IA)
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
                    // Data e Hora
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = dataAtv,
                            onValueChange = { dataAtv = it },
                            label = { Text("Data (AAAA-MM-DD)") },
                            modifier = Modifier.weight(1.3f),
                            colors = textInputColors
                        )
                        OutlinedTextField(
                            value = horaAtv,
                            onValueChange = { horaAtv = it },
                            label = { Text("Hora (HH:mm)") },
                            modifier = Modifier.weight(1f),
                            colors = textInputColors
                        )
                    }

                    // Categoria
                    Text("CATEGORIA", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                    Row(
                        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        CATEGORIAS_OFICIAIS.forEach { cat ->
                            val isSel = cat.equals(categoriaAtv, ignoreCase = true)
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSel) Sg4Purple else Color(0xFFF1F5F9))
                                    .clickable { categoriaAtv = cat }
                                    .padding(horizontal = 9.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = cat,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSel) Color.White else Slate900
                                )
                            }
                        }
                    }

                    // Título
                    OutlinedTextField(
                        value = tituloAtv,
                        onValueChange = { tituloAtv = it },
                        label = { Text("Título da Atividade") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = textInputColors
                    )

                    // Descrição com Corretor IA
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
                        label = { Text("Descreva detalhadamente o que será executado...") },
                        modifier = Modifier.fillMaxWidth().height(90.dp),
                        colors = textInputColors
                    )

                    // Local, Cidade e UF
                    OutlinedTextField(
                        value = localAtv,
                        onValueChange = { localAtv = it },
                        label = { Text("Local / Unidade") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = textInputColors
                    )

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = cidadeAtv,
                            onValueChange = { cidadeAtv = it },
                            label = { Text("Cidade") },
                            modifier = Modifier.weight(2f),
                            colors = textInputColors
                        )
                        OutlinedTextField(
                            value = estadoAtv,
                            onValueChange = { estadoAtv = it },
                            label = { Text("UF") },
                            modifier = Modifier.weight(1f),
                            colors = textInputColors
                        )
                    }

                    // Prioridade (ALTA, MEDIA, BAIXA)
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
                            "dataFim" to dataFimRecorrencia
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

    // MODAL 2: CONCLUIR ATIVIDADE (COM CORRETOR IA)
    concludingPlan?.let { item ->
        val isDssCategory = item.categoria.uppercase().contains("DSS")
        var descExecutada by remember(item.id) {
            mutableStateOf(item.descricaoExecutada.ifBlank { item.descricaoOriginal })
        }
        var observacoes by remember(item.id) { mutableStateOf(item.observacoes) }
        var fotoUrl by remember(item.id) { mutableStateOf("") }
        var salvarDssAliado by remember(item.id) { mutableStateOf(isDssCategory) }
        var gerarRelatorioCampo by remember(item.id) { mutableStateOf(true) }
        var empresaRelatorio by remember(item.id) { mutableStateOf("Telefônica Brasil S.A") }
        var projetoRelatorio by remember(item.id) { mutableStateOf("VIVO") }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) concludingPlan = null },
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
                        label = { Text("Descreva como a atividade foi executada...") },
                        modifier = Modifier.fillMaxWidth().height(100.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Slate900,
                            unfocusedTextColor = Slate900,
                            focusedContainerColor = Color.White,
                            unfocusedContainerColor = Color.White
                        )
                    )

                    OutlinedTextField(
                        value = observacoes,
                        onValueChange = { observacoes = it },
                        label = { Text("Observações adicionais (opcional)") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Slate900,
                            unfocusedTextColor = Slate900,
                            focusedContainerColor = Color.White,
                            unfocusedContainerColor = Color.White
                        )
                    )

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
                        viewModel.performAction(
                            actionType = "CONCLUIR_ATIVIDADE",
                            loadingTitle = "Concluindo atividade...",
                            description = "Concluir: ${item.titulo}",
                            payload = mapOf(
                                "id" to item.id,
                                "descricaoExecutada" to descExecutada,
                                "observacoes" to observacoes,
                                "fotoUrl" to fotoUrl.ifBlank { null },
                                "salvarDssAliado" to salvarDssAliado,
                                "gerarRelatorioCampo" to gerarRelatorioCampo,
                                "empresa" to empresaRelatorio,
                                "projeto" to projetoRelatorio
                            ),
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
    var confirmAction by remember { mutableStateOf<String?>(null) }

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
                color = if (isConcluido) Slate600 else Slate900,
                textDecoration = if (isConcluido) TextDecoration.None else TextDecoration.None
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

            // Botão Principal: Concluir (com confirmação em dois toques)
            if (!isConcluido) {
                val isConcluirConfirm = confirmAction == "CONCLUIR"
                Button(
                    onClick = {
                        if (isConcluirConfirm) {
                            onConclude()
                            confirmAction = null
                        } else {
                            confirmAction = "CONCLUIR"
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isConcluirConfirm) Color(0xFF047857) else Sg4Green
                    ),
                    enabled = !uiState.isBlockingLoading
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(if (isConcluirConfirm) "Confirmar" else "Concluir", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }

                Spacer(modifier = Modifier.height(6.dp))
            }

            // Barra de Botões Secundários: Editar, Duplicar, Mover, Reverter, Excluir, Outlook
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Editar (1º toque confirma ou abre)
                val isEditConfirm = confirmAction == "EDIT"
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isEditConfirm) Sg4Purple else Color(0xFFF1F5F9))
                        .clickable(enabled = !uiState.isBlockingLoading) {
                            if (isEditConfirm) {
                                onEdit()
                                confirmAction = null
                            } else {
                                confirmAction = "EDIT"
                            }
                        }
                        .padding(horizontal = 9.dp, vertical = 5.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Icon(Icons.Default.Edit, contentDescription = null, tint = if (isEditConfirm) Color.White else Slate600, modifier = Modifier.size(13.dp))
                        Text(if (isEditConfirm) "Confirmar" else "Editar", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (isEditConfirm) Color.White else Slate600)
                    }
                }

                // Duplicar
                val isDupConfirm = confirmAction == "DUP"
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isDupConfirm) Sg4Purple else Color(0xFFF1F5F9))
                        .clickable(enabled = !uiState.isBlockingLoading) {
                            if (isDupConfirm) {
                                onDuplicate()
                                confirmAction = null
                            } else {
                                confirmAction = "DUP"
                            }
                        }
                        .padding(horizontal = 9.dp, vertical = 5.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Icon(Icons.Default.ContentCopy, contentDescription = null, tint = if (isDupConfirm) Color.White else Sg4Purple, modifier = Modifier.size(13.dp))
                        Text(if (isDupConfirm) "Confirmar" else "Duplicar", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (isDupConfirm) Color.White else Sg4Purple)
                    }
                }

                // Mover Data (se pendente)
                if (!isConcluido) {
                    val isMoveConfirm = confirmAction == "MOVE"
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isMoveConfirm) Sg4Blue else Color(0xFFF1F5F9))
                            .clickable(enabled = !uiState.isBlockingLoading) {
                                if (isMoveConfirm) {
                                    onMoveDate()
                                    confirmAction = null
                                } else {
                                    confirmAction = "MOVE"
                                }
                            }
                            .padding(horizontal = 9.dp, vertical = 5.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Icon(Icons.Default.CalendarMonth, contentDescription = null, tint = if (isMoveConfirm) Color.White else Sg4Blue, modifier = Modifier.size(13.dp))
                            Text(if (isMoveConfirm) "Confirmar" else "Mover", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (isMoveConfirm) Color.White else Sg4Blue)
                        }
                    }
                }

                // Reverter para Pendente (se concluído)
                if (isConcluido) {
                    val isRevConfirm = confirmAction == "REV"
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isRevConfirm) Sg4Amber else Color(0xFFFEF3C7))
                            .clickable(enabled = !uiState.isBlockingLoading) {
                                if (isRevConfirm) {
                                    viewModel.performAction(
                                        actionType = "REVERTER_ATIVIDADE",
                                        loadingTitle = "Revertendo atividade...",
                                        description = "Reverter ${plan.titulo}",
                                        payload = mapOf("id" to plan.id)
                                    )
                                    confirmAction = null
                                } else {
                                    confirmAction = "REV"
                                }
                            }
                            .padding(horizontal = 9.dp, vertical = 5.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Icon(Icons.Default.Undo, contentDescription = null, tint = if (isRevConfirm) Color.White else Sg4Amber, modifier = Modifier.size(13.dp))
                            Text(if (isRevConfirm) "Confirmar" else "Reverter", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (isRevConfirm) Color.White else Sg4Amber)
                        }
                    }
                }

                // Excluir
                val isDelConfirm = confirmAction == "DEL"
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isDelConfirm) Sg4Red else Color(0xFFFEE2E2))
                        .clickable(enabled = !uiState.isBlockingLoading) {
                            if (isDelConfirm) {
                                onDelete()
                                confirmAction = null
                            } else {
                                confirmAction = "DEL"
                            }
                        }
                        .padding(horizontal = 9.dp, vertical = 5.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Icon(Icons.Default.Delete, contentDescription = null, tint = if (isDelConfirm) Color.White else Sg4Red, modifier = Modifier.size(13.dp))
                        Text(if (isDelConfirm) "Confirmar" else "Excluir", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (isDelConfirm) Color.White else Sg4Red)
                    }
                }

                // Sincronizar com Calendário Outlook
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFFF1F5F9))
                        .clickable(enabled = !uiState.isBlockingLoading) {
                            val url = buildOutlookCalendarUrl(plan)
                            try {
                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                            } catch (_: Exception) {}
                        }
                        .padding(horizontal = 9.dp, vertical = 5.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Icon(Icons.Default.EventRepeat, contentDescription = null, tint = Sg4Purple, modifier = Modifier.size(13.dp))
                        Text("Outlook", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
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
@Composable
fun KmAbastecimentoScreen(
    uiState: Sg4UiState,
    viewModel: Sg4ViewModel
) {
    val context = LocalContext.current
    var selectedSubTab by remember { mutableIntStateOf(0) } // 0=KM, 1=Abastecimento, 2=Manutenções

    var showStartKmDialog by remember { mutableStateOf(false) }
    var finishingKmItem by remember { mutableStateOf<QuilometragemDto?>(null) }
    var showAbastecimentoDialog by remember { mutableStateOf(false) }
    var showManutencaoDialog by remember { mutableStateOf(false) }

    val openKm = uiState.syncData.quilometragens.firstOrNull { it.kmFinal == null }

    Column(modifier = Modifier.fillMaxSize().background(Color.White)) {
        TabRow(
            selectedTabIndex = selectedSubTab,
            containerColor = Color.White,
            contentColor = Sg4Purple
        ) {
            Tab(
                selected = selectedSubTab == 0,
                onClick = { selectedSubTab = 0 },
                text = { Text("Quilometragem", fontWeight = FontWeight.Bold, fontSize = 12.sp) }
            )
            Tab(
                selected = selectedSubTab == 1,
                onClick = { selectedSubTab = 1 },
                text = { Text("Abastecimento", fontWeight = FontWeight.Bold, fontSize = 12.sp) }
            )
            Tab(
                selected = selectedSubTab == 2,
                onClick = { selectedSubTab = 2 },
                text = { Text("Manutenções", fontWeight = FontWeight.Bold, fontSize = 12.sp) }
            )
        }

        // ABA 0: QUILOMETRAGEM
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
                                    text = "KM Inicial: ${openKm.kmInicial.toInt()} km",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Sg4PurpleDark
                                )
                                Text(
                                    text = "${openKm.diaSemana} • ${formatIsoDateBr(openKm.dataInicial)}",
                                    fontSize = 12.sp,
                                    color = Slate600
                                )
                                if (openKm.latitudeInicial != null && openKm.longitudeInicial != null) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "📍 GPS Início: ${openKm.latitudeInicial}, ${openKm.longitudeInicial}",
                                        fontSize = 11.sp,
                                        color = Sg4Purple
                                    )
                                }
                                Spacer(modifier = Modifier.height(10.dp))
                                Button(
                                    onClick = { finishingKmItem = openKm },
                                    enabled = !uiState.isBlockingLoading,
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text("Encerrar KM do Dia", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    } else {
                        Button(
                            onClick = { showStartKmDialog = true },
                            enabled = !uiState.isBlockingLoading,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.DirectionsCar, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Iniciar KM do Dia", fontWeight = FontWeight.Bold)
                        }
                    }
                }

                items(uiState.syncData.quilometragens, key = { it.id }) { km ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "${km.diaSemana} • ${formatIsoDateBr(km.dataInicial)}",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = Slate900
                                )
                                Text(
                                    text = "Início: ${km.kmInicial.toInt()} km" + (if (km.kmFinal != null) " → Fim: ${km.kmFinal.toInt()} km" else " (Em rota)"),
                                    fontSize = 12.sp,
                                    color = Slate600
                                )
                                if (km.latitudeInicial != null || km.latitudeFinal != null) {
                                    Text(
                                        text = "📍 Geolocalização salva",
                                        fontSize = 10.sp,
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
                                        text = "+${km.diferenca.toInt()} km",
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
        // ABA 1: ABASTECIMENTO
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
                        colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.LocalGasStation, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Registrar Abastecimento", fontWeight = FontWeight.Bold)
                    }
                }

                items(uiState.syncData.abastecimentos, key = { it.id }) { ab ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
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
        // ABA 2: MANUTENÇÕES
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
                        colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Build, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Registrar Manutenção", fontWeight = FontWeight.Bold)
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
                                    Text(
                                        text = "${man.kmManutencao} km",
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
                                        text = "📎 Comprovante anexado",
                                        fontSize = 11.sp,
                                        color = Sg4Purple,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.clickable {
                                            try {
                                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(man.comprovanteUrl)))
                                            } catch (_: Exception) {}
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // MODAIS DE KM & ABASTECIMENTO
    // Diálogo: Iniciar KM com captura de GPS
    if (showStartKmDialog) {
        var kmIniStr by remember { mutableStateOf("") }
        var fotoIniUrl by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) showStartKmDialog = false },
            title = { Text("Iniciar KM do Dia", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("📍 A geolocalização atual será salva automaticamente.", fontSize = 11.sp, color = Sg4Purple)
                    OutlinedTextField(
                        value = kmIniStr,
                        onValueChange = { kmIniStr = it.filter { ch -> ch.isDigit() } },
                        label = { Text("KM Inicial do Hodômetro") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = fotoIniUrl,
                        onValueChange = { fotoIniUrl = it },
                        label = { Text("URL / Caminho da Foto do Hodômetro (opcional)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val kmVal = kmIniStr.toDoubleOrNull() ?: 0.0
                        val loc = getDeviceLocation(context)
                        viewModel.performAction(
                            actionType = "INICIAR_KM",
                            loadingTitle = "Iniciando KM do dia...",
                            description = "Início com ${kmVal.toInt()} km",
                            payload = mapOf(
                                "kmInicial" to kmVal,
                                "fotoInicial" to fotoIniUrl.ifBlank { null },
                                "latitude" to loc?.first,
                                "longitude" to loc?.second
                            ),
                            onCompleted = { showStartKmDialog = false }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple),
                    shape = RoundedCornerShape(8.dp),
                    enabled = kmIniStr.isNotBlank() && !uiState.isBlockingLoading
                ) {
                    Text("Confirmar", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showStartKmDialog = false }) { Text("Cancelar") }
            }
        )
    }

    // Diálogo: Finalizar KM com captura de GPS
    finishingKmItem?.let { kmItem ->
        var kmFimStr by remember(kmItem.id) { mutableStateOf("") }
        var fotoFimUrl by remember(kmItem.id) { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) finishingKmItem = null },
            title = { Text("Encerrar KM do Dia", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("KM Inicial registrado: ${kmItem.kmInicial.toInt()} km", fontSize = 12.sp, color = Slate600)
                    Text("📍 A geolocalização atual de término será salva.", fontSize = 11.sp, color = Sg4Purple)
                    OutlinedTextField(
                        value = kmFimStr,
                        onValueChange = { kmFimStr = it.filter { ch -> ch.isDigit() } },
                        label = { Text("KM Final do Hodômetro") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = fotoFimUrl,
                        onValueChange = { fotoFimUrl = it },
                        label = { Text("URL da Foto do Hodômetro Final (opcional)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val kmFim = kmFimStr.toDoubleOrNull() ?: 0.0
                        val loc = getDeviceLocation(context)
                        viewModel.performAction(
                            actionType = "FINALIZAR_KM",
                            loadingTitle = "Encerrando KM do dia...",
                            description = "Encerramento com ${kmFim.toInt()} km",
                            payload = mapOf(
                                "id" to kmItem.id,
                                "kmFinal" to kmFim,
                                "fotoFinal" to fotoFimUrl.ifBlank { null },
                                "latitude" to loc?.first,
                                "longitude" to loc?.second
                            ),
                            onCompleted = { finishingKmItem = null }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple),
                    shape = RoundedCornerShape(8.dp),
                    enabled = kmFimStr.isNotBlank() && !uiState.isBlockingLoading
                ) {
                    Text("Confirmar", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { finishingKmItem = null }) { Text("Cancelar") }
            }
        )
    }

    // Diálogo: Registrar Abastecimento com formatação de moeda R$ 0,00
    if (showAbastecimentoDialog) {
        var rawDigits by remember { mutableStateOf("") }
        var fotoCupomUrl by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) showAbastecimentoDialog = false },
            title = { Text("Registrar Abastecimento", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Digite os números para formatar automaticamente:", fontSize = 11.sp, color = Slate600)
                    OutlinedTextField(
                        value = formatCurrencyBrlInput(rawDigits),
                        onValueChange = { rawDigits = it.filter { ch -> ch.isDigit() } },
                        label = { Text("Valor do Abastecimento (R$)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = fotoCupomUrl,
                        onValueChange = { fotoCupomUrl = it },
                        label = { Text("URL / Caminho da Foto do Cupom (opcional)") },
                        modifier = Modifier.fillMaxWidth()
                    )
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
                                "fotoCupom" to fotoCupomUrl.ifBlank { null }
                            ),
                            onCompleted = { showAbastecimentoDialog = false }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple),
                    shape = RoundedCornerShape(8.dp),
                    enabled = rawDigits.isNotBlank() && !uiState.isBlockingLoading
                ) {
                    Text("Confirmar", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAbastecimentoDialog = false }) { Text("Cancelar") }
            }
        )
    }

    // Diálogo: Registrar Manutenção Veicular
    if (showManutencaoDialog) {
        val calNow = Calendar.getInstance()
        var dataManutStr by remember { mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())) }
        var horaManutStr by remember { mutableStateOf(SimpleDateFormat("HH:mm", Locale.US).format(Date())) }
        var kmManutStr by remember { mutableStateOf("") }
        var descManut by remember { mutableStateOf("") }
        var fotoComprovanteUrl by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) showManutencaoDialog = false },
            title = { Text("Registrar Manutenção", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = dataManutStr,
                            onValueChange = { dataManutStr = it },
                            label = { Text("Data (AAAA-MM-DD)") },
                            modifier = Modifier.weight(1.3f)
                        )
                        OutlinedTextField(
                            value = horaManutStr,
                            onValueChange = { horaManutStr = it },
                            label = { Text("Hora (HH:mm)") },
                            modifier = Modifier.weight(1f)
                        )
                    }
                    OutlinedTextField(
                        value = kmManutStr,
                        onValueChange = { kmManutStr = it.filter { ch -> ch.isDigit() } },
                        label = { Text("KM no Momento da Manutenção") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = descManut,
                        onValueChange = { descManut = it },
                        label = { Text("Descrição do Serviço / Peças Trocadas") },
                        modifier = Modifier.fillMaxWidth().height(80.dp)
                    )
                    OutlinedTextField(
                        value = fotoComprovanteUrl,
                        onValueChange = { fotoComprovanteUrl = it },
                        label = { Text("URL / Caminho da Foto do Comprovante (opcional)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val km = kmManutStr.toIntOrNull() ?: 0
                        viewModel.performAction(
                            actionType = "CRIAR_MANUTENCAO",
                            loadingTitle = "Registrando manutenção...",
                            description = "Manutenção aos $km km",
                            payload = mapOf(
                                "kmManutencao" to km,
                                "dataManutencao" to "${dataManutStr}T${horaManutStr}:00Z",
                                "descricao" to descManut.ifBlank { null },
                                "fotoUrl" to fotoComprovanteUrl.ifBlank { null }
                            ),
                            onCompleted = { showManutencaoDialog = false }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple),
                    shape = RoundedCornerShape(8.dp),
                    enabled = kmManutStr.isNotBlank() && !uiState.isBlockingLoading
                ) {
                    Text("Confirmar", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showManutencaoDialog = false }) { Text("Cancelar") }
            }
        )
    }
}

/**
 * Tela de Relatórios do Usuário (sem NCs):
 * - Aba Principal: Relatórios em PDF gerados com link para abrir/visualizar
 * - Aba Secundária: Atividades de Campo individuais registradas pelo usuário (criar/editar/excluir)
 */
@Composable
fun RelatoriosMobileScreen(
    uiState: Sg4UiState,
    viewModel: Sg4ViewModel
) {
    val context = LocalContext.current
    var selectedSubTab by remember { mutableIntStateOf(0) } // 0 = PDFs, 1 = Atividades de Campo

    var showNovoItemDialog by remember { mutableStateOf(false) }
    var editingItem by remember { mutableStateOf<RelatorioCampoDto?>(null) }
    var deletingItem by remember { mutableStateOf<RelatorioCampoDto?>(null) }

    Column(modifier = Modifier.fillMaxSize().background(Color.White)) {
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
                        text = "Relatórios em PDF (${uiState.syncData.relatoriosPdf.size})",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
            )
            Tab(
                selected = selectedSubTab == 1,
                onClick = { selectedSubTab = 1 },
                text = {
                    Text(
                        text = "Atividades de Campo (${uiState.syncData.relatoriosCampo.size})",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
            )
        }

        // ABA 0: RELATÓRIOS EM PDF GERADOS
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
                                    text = "Os relatórios consolidados em PDF aparecerão aqui automaticamente após a geração.",
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
                                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text("Visualizar / Baixar PDF", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }
        }
        // ABA 1: ATIVIDADES DE CAMPO (REGISTROS INDIVIDUAIS)
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
                        colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Incluir Item no Relatório", fontWeight = FontWeight.Bold)
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
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedButton(
                                        onClick = { editingItem = rel },
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("Editar", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                                    }
                                    OutlinedButton(
                                        onClick = { deletingItem = rel },
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("Excluir", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Red)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Modal: Incluir Novo Item no Relatório
    if (showNovoItemDialog) {
        var dataItem by remember { mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())) }
        var empresa by remember { mutableStateOf("Telefônica Brasil S.A") }
        var projeto by remember { mutableStateOf("VIVO") }
        var local by remember { mutableStateOf("") }
        var cidadeUf by remember { mutableStateOf("São Paulo/SP") }
        var descricao by remember { mutableStateOf("") }
        var fotoUrl by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) showNovoItemDialog = false },
            title = { Text("Incluir Item no Relatório", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = dataItem,
                        onValueChange = { dataItem = it },
                        label = { Text("Data (AAAA-MM-DD)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = empresa,
                        onValueChange = { empresa = it },
                        label = { Text("Empresa") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = projeto,
                        onValueChange = { projeto = it },
                        label = { Text("Projeto") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = local,
                        onValueChange = { local = it },
                        label = { Text("Local / Unidade") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = cidadeUf,
                        onValueChange = { cidadeUf = it },
                        label = { Text("Cidade / UF") },
                        modifier = Modifier.fillMaxWidth()
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
                        label = { Text("Descreva detalhadamente...") },
                        modifier = Modifier.fillMaxWidth().height(90.dp)
                    )

                    OutlinedTextField(
                        value = fotoUrl,
                        onValueChange = { fotoUrl = it },
                        label = { Text("URL / Caminho da Foto (opcional)") },
                        modifier = Modifier.fillMaxWidth()
                    )
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
                                "fotoUrl" to fotoUrl.ifBlank { null }
                            ),
                            onCompleted = { showNovoItemDialog = false }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple),
                    shape = RoundedCornerShape(8.dp),
                    enabled = descricao.isNotBlank() && !uiState.isBlockingLoading
                ) {
                    Text("Salvar", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showNovoItemDialog = false }) { Text("Cancelar") }
            }
        )
    }

    // Modal: Editar Item do Relatório
    editingItem?.let { item ->
        var dataItem by remember(item.id) { mutableStateOf(item.data.take(10)) }
        var empresa by remember(item.id) { mutableStateOf(item.empresa) }
        var projeto by remember(item.id) { mutableStateOf(item.projeto) }
        var local by remember(item.id) { mutableStateOf(item.local) }
        var cidadeUf by remember(item.id) { mutableStateOf(item.cidadeUf) }
        var descricao by remember(item.id) { mutableStateOf(item.descricao) }
        var fotoUrl by remember(item.id) { mutableStateOf(item.fotoUrl ?: "") }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) editingItem = null },
            title = { Text("Editar Item do Relatório", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = dataItem,
                        onValueChange = { dataItem = it },
                        label = { Text("Data (AAAA-MM-DD)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = empresa,
                        onValueChange = { empresa = it },
                        label = { Text("Empresa") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = projeto,
                        onValueChange = { projeto = it },
                        label = { Text("Projeto") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = local,
                        onValueChange = { local = it },
                        label = { Text("Local / Unidade") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = cidadeUf,
                        onValueChange = { cidadeUf = it },
                        label = { Text("Cidade / UF") },
                        modifier = Modifier.fillMaxWidth()
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
                        label = { Text("Descrição detalhada") },
                        modifier = Modifier.fillMaxWidth().height(90.dp)
                    )

                    OutlinedTextField(
                        value = fotoUrl,
                        onValueChange = { fotoUrl = it },
                        label = { Text("URL da Foto") },
                        modifier = Modifier.fillMaxWidth()
                    )
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
                                "fotoUrl" to fotoUrl.ifBlank { null }
                            ),
                            onCompleted = { editingItem = null }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple),
                    shape = RoundedCornerShape(8.dp),
                    enabled = descricao.isNotBlank() && !uiState.isBlockingLoading
                ) {
                    Text("Confirmar", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { editingItem = null }) { Text("Cancelar") }
            }
        )
    }

    // Modal: Excluir Item do Relatório
    deletingItem?.let { item ->
        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) deletingItem = null },
            title = { Text("Excluir Item", fontWeight = FontWeight.ExtraBold, color = Sg4Red) },
            text = { Text("Deseja realmente excluir este item do relatório?") },
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
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Red),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Excluir", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { deletingItem = null }) { Text("Cancelar") }
            }
        )
    }
}

// Alias de retrocompatibilidade
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
