package br.com.sg4.mobile.ui.screens

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

    val tecnico = uiState.syncData.currentTecnico
    val summary = uiState.syncData.summary
    val firstName = remember(tecnico?.nome, uiState.userName) {
        (tecnico?.nome ?: uiState.userName.ifBlank { "Técnico" }).trim().split(" ").firstOrNull() ?: "Técnico"
    }

    val yearsList = remember(uiState.syncData.availableYears, currentYearNum) {
        val parsed = uiState.syncData.availableYears.mapNotNull { it.toIntOrNull() }
        if (parsed.isEmpty()) listOf(currentYearNum, currentYearNum - 1) else parsed
    }

    // Filtra as estatísticas mensais do próprio usuário pelos meses selecionados
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

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Cabeçalho do Usuário + Filtro de Ano e Meses (Igual ao Dashboard Web)
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

                        // Seletor de Ano
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            yearsList.forEach { yr ->
                                val isSelYear = yr == selectedYear
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (isSelYear) Sg4Purple else Color(0xFFF1F5F9))
                                        .clickable { selectedYear = yr }
                                        .padding(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        text = yr.toString(),
                                        color = if (isSelYear) Color.White else Slate600,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Barra de Filtro de Meses (Multi-seleção igual à Web)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "PERÍODO: ${periodoLabel.uppercase()}",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Sg4Purple
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                text = "Mês Atual",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (selectedMonths.size == 1 && selectedMonths.contains(currentMonth1to12)) Sg4Purple else Slate600,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .clickable {
                                        selectedMonths.clear()
                                        selectedMonths.add(currentMonth1to12)
                                        selectedYear = currentYearNum
                                    }
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                            Text(
                                text = if (selectedMonths.size == 12) "Limpar" else "Todos os Meses",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Sg4Purple,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .clickable {
                                        if (selectedMonths.size == 12) {
                                            selectedMonths.clear()
                                            selectedMonths.add(currentMonth1to12)
                                        } else {
                                            selectedMonths.clear()
                                            selectedMonths.addAll(1..12)
                                        }
                                    }
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Grade de 12 Meses (2 linhas x 6 colunas para toque rápido)
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        for (rowIndex in 0..1) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                for (colIndex in 0..5) {
                                    val monthNumber = rowIndex * 6 + colIndex + 1
                                    val monthName = MESES_NOMES[monthNumber - 1]
                                    val isSelected = selectedMonths.contains(monthNumber)
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .height(34.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(
                                                if (isSelected) Sg4Purple else Color(0xFFF8FAFC)
                                            )
                                            .border(
                                                1.dp,
                                                if (isSelected) Sg4Purple else Color(0xFFE2E8F0),
                                                RoundedCornerShape(8.dp)
                                            )
                                            .clickable {
                                                if (isSelected) {
                                                    if (selectedMonths.size > 1) {
                                                        selectedMonths.remove(monthNumber)
                                                    }
                                                } else {
                                                    selectedMonths.add(monthNumber)
                                                }
                                            },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = monthName,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isSelected) Color.White else Slate600
                                        )
                                    }
                                }
                            }
                        }
                    }

                    if (pendingOfflineCount > 0) {
                        Spacer(modifier = Modifier.height(10.dp))
                        StatusBadge(
                            text = "$pendingOfflineCount registro(s) na fila offline aguardando sincronização",
                            color = Sg4Amber
                        )
                    }
                }
            }
        }

        // CARD 1: DSS REALIZADOS (Igual ao DualStatCard #660099 / #4a0072 do Dashboard Web)
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
                onClick = { viewModel.selectTab(MobileTab.AGENDA) }
            )
        }

        // CARD 2: INSPEÇÕES REALIZADAS (Igual ao DualStatCard #8e44ad / #732d91 do Dashboard Web)
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
                onClick = { viewModel.selectTab(MobileTab.AGENDA) }
            )
        }

        // CARD 3: ITENS INCLUÍDOS NO RELATÓRIO (Igual ao Card #673ab7 / #512da8 do Dashboard Web)
        item {
            val mediaPorMes = String.format(Locale("pt", "BR"), "%.1f", relatoriosIncluidos.toDouble() / activeMonthsCount)
            DualStatDashboardCard(
                titleLeft = "Itens no Relatório",
                valueLeft = "$relatoriosIncluidos",
                subLeft = "Relatório de Atividades",
                titleRight = "Média / Mês",
                valueRight = mediaPorMes,
                subRight = "Toque p/ abrir Relatórios →",
                gradientStart = Color(0xFF673AB7),
                gradientEnd = Color(0xFF512DA8),
                onClick = { viewModel.selectTab(MobileTab.RELATORIOS) }
            )
        }

        // CARD 4: NÃO CONFORMIDADES (NCs Abertas) (Igual ao DualStatCard #9c27b0 / #7b1fa2 do Dashboard Web)
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
                onClick = { viewModel.selectTab(MobileTab.RELATORIOS) }
            )
        }

        // Card complementar de KM & Saldo de Abastecimento do Usuário
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { viewModel.selectTab(MobileTab.KM) },
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

    // Modo de visualização: 0 = Semana, 1 = Mês, 2 = Todas
    var viewMode by remember { mutableIntStateOf(0) }
    var statusFilter by remember { mutableStateOf("TODOS") } // TODOS, PENDENTE, CONCLUIDO
    var dayOffset by remember { mutableIntStateOf(0) } // deslocamento em dias (Semana) ou meses (Mês)

    // Estados de Modais de Planejamento
    var showCreateOrEditModal by remember { mutableStateOf(false) }
    var editingPlan by remember { mutableStateOf<PlanejamentoDto?>(null) }
    var prefillDateYmd by remember { mutableStateOf(todayYmd) }

    var concludingPlan by remember { mutableStateOf<PlanejamentoDto?>(null) }
    var transferringPlan by remember { mutableStateOf<PlanejamentoDto?>(null) }
    var movingDatePlan by remember { mutableStateOf<PlanejamentoDto?>(null) }
    var deletingPlan by remember { mutableStateOf<PlanejamentoDto?>(null) }
    var showDssAliadoDirectModal by remember { mutableStateOf(false) }

    // Edição de sub-item do checklist
    var editingChecklistItem by remember { mutableStateOf<Pair<PlanejamentoDto, ChecklistItemDto>?>(null) }

    // Cálculo de intervalo de datas (Semana ou Mês)
    val (periodLabel, startYmd, endYmd) = remember(viewMode, dayOffset) {
        val baseCal = Calendar.getInstance()
        if (viewMode == 0) {
            baseCal.add(Calendar.DAY_OF_YEAR, dayOffset * 7)
            // Ajusta para segunda-feira da semana
            val dow = baseCal.get(Calendar.DAY_OF_WEEK)
            val diffToMonday = if (dow == Calendar.SUNDAY) -6 else Calendar.MONDAY - dow
            baseCal.add(Calendar.DAY_OF_YEAR, diffToMonday)
            val start = formatCalToYmd(baseCal)
            val d1 = "${baseCal.get(Calendar.DAY_OF_MONTH).toString().padStart(2, '0')}/${(baseCal.get(Calendar.MONTH) + 1).toString().padStart(2, '0')}"
            baseCal.add(Calendar.DAY_OF_YEAR, 6)
            val end = formatCalToYmd(baseCal)
            val d2 = "${baseCal.get(Calendar.DAY_OF_MONTH).toString().padStart(2, '0')}/${(baseCal.get(Calendar.MONTH) + 1).toString().padStart(2, '0')}/${baseCal.get(Calendar.YEAR)}"
            Triple("Semana: $d1 a $d2", start, end)
        } else if (viewMode == 1) {
            baseCal.add(Calendar.MONTH, dayOffset)
            baseCal.set(Calendar.DAY_OF_MONTH, 1)
            val start = formatCalToYmd(baseCal)
            val mIdx = baseCal.get(Calendar.MONTH)
            val yr = baseCal.get(Calendar.YEAR)
            baseCal.set(Calendar.DAY_OF_MONTH, baseCal.getActualMaximum(Calendar.DAY_OF_MONTH))
            val end = formatCalToYmd(baseCal)
            Triple("Mês: ${MESES_NOMES.getOrElse(mIdx) { "" }} / $yr", start, end)
        } else {
            Triple("Todos os Agendamentos", "1900-01-01", "2100-12-31")
        }
    }

    val filteredPlans = remember(uiState.syncData.planejamentos, viewMode, startYmd, endYmd, statusFilter) {
        uiState.syncData.planejamentos
            .filter { p ->
                val ymd = p.dataAtividade.take(10)
                val inPeriod = viewMode == 2 || (ymd >= startYmd && ymd <= endYmd)
                val inStatus = statusFilter == "TODOS" || p.status.equals(statusFilter, ignoreCase = true)
                inPeriod && inStatus
            }
            .sortedWith(compareBy<PlanejamentoDto> { it.dataAtividade.take(10) }.thenBy { it.hora })
    }

    val groupedByDay = remember(filteredPlans) {
        filteredPlans.groupBy { it.dataAtividade.take(10) }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Barra superior da Agenda: + Novo Agendamento e + DSS Aliado
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White)
                .padding(horizontal = 14.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = {
                        editingPlan = null
                        prefillDateYmd = todayYmd
                        showCreateOrEditModal = true
                    },
                    enabled = !uiState.isBlockingLoading,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Novo Agendamento", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }

                OutlinedButton(
                    onClick = { showDssAliadoDirectModal = true },
                    enabled = !uiState.isBlockingLoading,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("+ DSS Aliado", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                }
            }

            // Seletor de Visão (Semana / Mês / Todas) + Filtro de Status
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    listOf(0 to "Semana", 1 to "Mês", 2 to "Todas").forEach { (idx, label) ->
                        val active = viewMode == idx
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (active) Sg4Purple else Color(0xFFF1F5F9))
                                .clickable {
                                    viewMode = idx
                                    dayOffset = 0
                                }
                                .padding(horizontal = 10.dp, vertical = 5.dp)
                        ) {
                            Text(
                                text = label,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (active) Color.White else Slate600
                            )
                        }
                    }
                }

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
                                fontSize = 10.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (active) Sg4Purple else Slate600
                            )
                        }
                    }
                }
            }

            // Navegador de Período (< Hoje >)
            if (viewMode != 2) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0xFFF8FAFC))
                        .padding(horizontal = 6.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = { dayOffset -= 1 },
                        modifier = Modifier.size(30.dp)
                    ) {
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

                    IconButton(
                        onClick = { dayOffset += 1 },
                        modifier = Modifier.size(30.dp)
                    ) {
                        Icon(Icons.Default.ChevronRight, contentDescription = "Próximo", tint = Sg4Purple)
                    }
                }
            }
        }

        HorizontalDivider(color = Color(0xFFE2E8F0))

        // Lista de Agendamentos Agrupados por Dia
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (groupedByDay.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "Nenhuma atividade encontrada neste período.",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Slate600,
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Toque em 'Novo Agendamento' para planejar atividades com repetição e corretor IA.",
                                fontSize = 12.sp,
                                color = Slate400,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            } else {
                groupedByDay.forEach { (dayYmd, dayPlans) ->
                    item(key = "header-$dayYmd") {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .background(
                                            if (dayYmd == todayYmd) Sg4Green else Sg4Purple,
                                            CircleShape
                                        )
                                )
                                Text(
                                    text = formatYmdToBrFull(dayYmd) + if (dayYmd == todayYmd) " (HOJE)" else "",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Slate900
                                )
                            }

                            Text(
                                text = "+ Agendar no dia",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Sg4Purple,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .clickable {
                                        editingPlan = null
                                        prefillDateYmd = dayYmd
                                        showCreateOrEditModal = true
                                    }
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    items(dayPlans, key = { it.id }) { plan ->
                        val prioColor = when (plan.prioridade.uppercase()) {
                            "ALTA" -> Color(0xFFEF4444)
                            "BAIXA" -> Color(0xFF6366F1)
                            else -> Color(0xFFF59E0B)
                        }
                        val isConcluido = plan.status == "CONCLUIDO"

                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(
                                        BorderStroke(1.dp, prioColor.copy(alpha = 0.35f)),
                                        RoundedCornerShape(14.dp)
                                    )
                                    .padding(14.dp)
                            ) {
                                // Topo do Card: Hora, Categoria, Prioridade, Status
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        StatusBadge(text = "🕒 ${plan.hora}", color = Slate600)
                                        StatusBadge(
                                            text = plan.categoria.ifBlank { "ATIVIDADE" },
                                            color = Sg4Purple
                                        )
                                        StatusBadge(
                                            text = plan.prioridade,
                                            color = prioColor
                                        )
                                    }
                                    StatusBadge(
                                        text = if (isConcluido) "CONCLUÍDO" else "PENDENTE",
                                        color = if (isConcluido) Sg4Green else Sg4Amber
                                    )
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                // Título e Descrição Original
                                Text(
                                    text = plan.titulo.ifBlank { plan.categoria },
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Slate900,
                                    textDecoration = if (isConcluido) TextDecoration.LineThrough else TextDecoration.None
                                )

                                if (plan.descricaoOriginal.isNotBlank() && plan.descricaoOriginal != plan.titulo) {
                                    Spacer(modifier = Modifier.height(3.dp))
                                    Text(
                                        text = plan.descricaoOriginal,
                                        fontSize = 13.sp,
                                        color = Slate600
                                    )
                                }

                                Spacer(modifier = Modifier.height(6.dp))

                                // Local / Unidade
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.LocationOn,
                                        contentDescription = null,
                                        tint = Sg4Purple,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Text(
                                        text = "${plan.local.ifBlank { "Em Campo" }} (${plan.cidade.ifBlank { "São Paulo" }}/${plan.estado.ifBlank { "SP" }})",
                                        fontSize = 11.5.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Slate600
                                    )
                                }

                                // Checklist de Sub-itens (se houver)
                                if (plan.checklist.isNotEmpty()) {
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(10.dp))
                                            .background(Color(0xFFF8FAFC))
                                            .padding(8.dp),
                                        verticalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Text(
                                            text = "ITENS DO PLANEJAMENTO (${plan.checklist.count { it.concluido }}/${plan.checklist.size})",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = Slate600
                                        )
                                        plan.checklist.forEachIndexed { idx, chk ->
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Row(
                                                    modifier = Modifier
                                                        .weight(1f)
                                                        .clickable(enabled = !uiState.isBlockingLoading) {
                                                            val updatedList = plan.checklist.mapIndexed { i, item ->
                                                                if (i == idx) item.copy(concluido = !item.concluido) else item
                                                            }
                                                            viewModel.performAction(
                                                                actionType = "TOGGLE_CHECKLIST_ATIVIDADE",
                                                                loadingTitle = "Atualizando checklist...",
                                                                description = "Checklist ${plan.titulo}",
                                                                payload = mapOf(
                                                                    "id" to plan.id,
                                                                    "checklist" to updatedList
                                                                )
                                                            )
                                                        },
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                                ) {
                                                    Icon(
                                                        imageVector = if (chk.concluido) Icons.Default.CheckBox else Icons.Default.CheckBoxOutlineBlank,
                                                        contentDescription = null,
                                                        tint = if (chk.concluido) Sg4Green else Slate400,
                                                        modifier = Modifier.size(18.dp)
                                                    )
                                                    Text(
                                                        text = chk.texto.ifBlank { chk.titulo ?: "" },
                                                        fontSize = 12.sp,
                                                        color = if (chk.concluido) Slate400 else Slate900,
                                                        textDecoration = if (chk.concluido) TextDecoration.LineThrough else TextDecoration.None
                                                    )
                                                }
                                                IconButton(
                                                    onClick = { editingChecklistItem = plan to chk },
                                                    modifier = Modifier.size(24.dp)
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.Default.Edit,
                                                        contentDescription = "Editar item",
                                                        tint = Slate400,
                                                        modifier = Modifier.size(14.dp)
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }

                                // Box de Relato de Execução quando concluído
                                if (isConcluido && (plan.descricaoExecutada.isNotBlank() || plan.observacoes.isNotBlank())) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(10.dp))
                                            .background(Color(0xFFECFDF5))
                                            .border(1.dp, Color(0xFFA7F3D0), RoundedCornerShape(10.dp))
                                            .padding(10.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(
                                                text = "✓ RELATO DE EXECUÇÃO",
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = Sg4Green
                                            )
                                            if (plan.alteradaOriginal) {
                                                Text(
                                                    text = "Execução Ajustada",
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Sg4Amber
                                                )
                                            }
                                        }
                                        if (plan.descricaoExecutada.isNotBlank()) {
                                            Spacer(modifier = Modifier.height(3.dp))
                                            Text(
                                                text = plan.descricaoExecutada,
                                                fontSize = 12.sp,
                                                color = Slate900,
                                                fontWeight = FontWeight.Medium
                                            )
                                        }
                                        if (plan.observacoes.isNotBlank()) {
                                            Spacer(modifier = Modifier.height(3.dp))
                                            Text(
                                                text = "Obs: ${plan.observacoes}",
                                                fontSize = 11.sp,
                                                color = Slate600
                                            )
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                // Botões de Ação Principal + Ferramentas de Planejamento (Igual à Web)
                                if (!isConcluido) {
                                    val hasPartialChecklist = plan.checklist.any { it.concluido } && plan.checklist.any { !it.concluido }
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Button(
                                            onClick = { concludingPlan = plan },
                                            enabled = !uiState.isBlockingLoading,
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(10.dp),
                                            colors = ButtonDefaults.buttonColors(containerColor = Sg4Green)
                                        ) {
                                            Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Spacer(Modifier.width(5.dp))
                                            Text("Concluir Atividade", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                        }

                                        if (hasPartialChecklist) {
                                            OutlinedButton(
                                                onClick = { transferringPlan = plan },
                                                enabled = !uiState.isBlockingLoading,
                                                shape = RoundedCornerShape(10.dp)
                                            ) {
                                                Text("Transferir Pend.", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                                            }
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(6.dp))

                                // Barra de ações secundárias (Editar, Duplicar, Mover Data, Outlook, Reverter, Excluir)
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .horizontalScroll(rememberScrollState()),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Editar
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(Color(0xFFF1F5F9))
                                            .clickable(enabled = !uiState.isBlockingLoading) {
                                                if (isConcluido) {
                                                    concludingPlan = plan
                                                } else {
                                                    editingPlan = plan
                                                    prefillDateYmd = plan.dataAtividade.take(10)
                                                    showCreateOrEditModal = true
                                                }
                                            }
                                            .padding(horizontal = 9.dp, vertical = 5.dp)
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Icon(Icons.Default.Edit, contentDescription = null, tint = Slate600, modifier = Modifier.size(13.dp))
                                            Text(if (isConcluido) "Editar Relato" else "Editar", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Slate600)
                                        }
                                    }

                                    // Duplicar
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(Color(0xFFF1F5F9))
                                            .clickable(enabled = !uiState.isBlockingLoading) {
                                                editingPlan = plan.copy(id = "")
                                                prefillDateYmd = plan.dataAtividade.take(10)
                                                showCreateOrEditModal = true
                                            }
                                            .padding(horizontal = 9.dp, vertical = 5.dp)
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Icon(Icons.Default.ContentCopy, contentDescription = null, tint = Sg4Purple, modifier = Modifier.size(13.dp))
                                            Text("Duplicar", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                                        }
                                    }

                                    // Mover Data (se pendente)
                                    if (!isConcluido) {
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(Color(0xFFF1F5F9))
                                                .clickable(enabled = !uiState.isBlockingLoading) {
                                                    movingDatePlan = plan
                                                }
                                                .padding(horizontal = 9.dp, vertical = 5.dp)
                                        ) {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                Icon(Icons.Default.CalendarMonth, contentDescription = null, tint = Sg4Blue, modifier = Modifier.size(13.dp))
                                                Text("Mover Data", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Blue)
                                            }
                                        }
                                    }

                                    // Reverter para Pendente (se concluído)
                                    if (isConcluido) {
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(Color(0xFFFEF3C7))
                                                .clickable(enabled = !uiState.isBlockingLoading) {
                                                    viewModel.performAction(
                                                        actionType = "REVERTER_ATIVIDADE",
                                                        loadingTitle = "Revertendo atividade para pendente...",
                                                        description = "Reverter ${plan.titulo}",
                                                        payload = mapOf("id" to plan.id)
                                                    )
                                                }
                                                .padding(horizontal = 9.dp, vertical = 5.dp)
                                        ) {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                Icon(Icons.Default.Undo, contentDescription = null, tint = Sg4Amber, modifier = Modifier.size(13.dp))
                                                Text("Reverter p/ Pendente", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Amber)
                                            }
                                        }
                                    }

                                    // Outlook Calendar
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(Color(0xFFE0F2FE))
                                            .clickable {
                                                try {
                                                    val url = buildOutlookCalendarUrl(plan)
                                                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                                                } catch (_: Exception) {
                                                }
                                            }
                                            .padding(horizontal = 9.dp, vertical = 5.dp)
                                    ) {
                                        Text("📅 Outlook", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0284C7))
                                    }

                                    // Excluir
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(Color(0xFFFEE2E2))
                                            .clickable(enabled = !uiState.isBlockingLoading) {
                                                deletingPlan = plan
                                            }
                                            .padding(horizontal = 9.dp, vertical = 5.dp)
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Icon(Icons.Default.Delete, contentDescription = null, tint = Sg4Red, modifier = Modifier.size(13.dp))
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
    }

    // MODAL 1: CRIAR / EDITAR / DUPLICAR PLANEJAMENTO COMPLETO (IGUAL AO SISTEMA WEB)
    if (showCreateOrEditModal) {
        val isEditingExisting = editingPlan != null && editingPlan!!.id.isNotBlank()
        var dataAtv by remember(editingPlan, prefillDateYmd) {
            mutableStateOf(editingPlan?.dataAtividade?.take(10) ?: prefillDateYmd)
        }
        var hora by remember(editingPlan) { mutableStateOf(editingPlan?.hora ?: "08:00") }
        var frequencia by remember { mutableStateOf("UNICA") }
        var dataFim by remember { mutableStateOf(dataAtv) }

        var titulo by remember(editingPlan) { mutableStateOf(editingPlan?.titulo ?: "") }
        val initCat = editingPlan?.categoria ?: "INSPEÇÃO DE SEGURANÇA"
        var selectedCat by remember(editingPlan) {
            mutableStateOf(if (CATEGORIAS_OFICIAIS.contains(initCat)) initCat else "OUTROS")
        }
        var customCat by remember(editingPlan) {
            mutableStateOf(if (CATEGORIAS_OFICIAIS.contains(initCat)) "" else initCat)
        }
        var prioridade by remember(editingPlan) { mutableStateOf(editingPlan?.prioridade ?: "MEDIA") }

        val unidades = uiState.syncData.unidades
        var localSearch by remember(editingPlan) { mutableStateOf(editingPlan?.local ?: "") }
        var selectedUnidadeNome by remember(editingPlan) { mutableStateOf(editingPlan?.local ?: "") }
        var cidade by remember(editingPlan) { mutableStateOf(editingPlan?.cidade ?: "São Paulo") }
        var estado by remember(editingPlan) { mutableStateOf(editingPlan?.estado ?: "SP") }
        var isCustomLocal by remember(editingPlan) { mutableStateOf(false) }

        var descricao by remember(editingPlan) { mutableStateOf(editingPlan?.descricaoOriginal ?: "") }
        val draftList = remember { mutableStateListOf<DraftAgendaItem>() }

        val finalCategoria = if (selectedCat == "OUTROS") customCat.ifBlank { "OUTROS" } else selectedCat

        Dialog(onDismissRequest = { if (!uiState.isBlockingLoading) showCreateOrEditModal = false }) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.92f),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Header do Modal
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Sg4Purple)
                            .padding(horizontal = 18.dp, vertical = 14.dp)
                    ) {
                        Text(
                            text = when {
                                isEditingExisting -> "Editar Agendamento"
                                editingPlan != null -> "Duplicar Agendamento"
                                else -> "Novo Planejamento na Agenda"
                            },
                            color = Color.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                    }

                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Data e Hora
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedTextField(
                                value = dataAtv,
                                onValueChange = { dataAtv = it },
                                label = { Text("Data (AAAA-MM-DD)") },
                                singleLine = true,
                                modifier = Modifier.weight(1.3f)
                            )
                            OutlinedTextField(
                                value = hora,
                                onValueChange = { hora = it },
                                label = { Text("Hora (08:00)") },
                                singleLine = true,
                                modifier = Modifier.weight(0.9f)
                            )
                        }

                        // Atalhos rápidos de data
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf(
                                "Hoje" to 0,
                                "Amanhã" to 1,
                                "+7 dias" to 7
                            ).forEach { (lbl, addDays) ->
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(Color(0xFFF1F5F9))
                                        .clickable {
                                            val c = Calendar.getInstance()
                                            c.add(Calendar.DAY_OF_YEAR, addDays)
                                            dataAtv = formatCalToYmd(c)
                                        }
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(lbl, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
                                }
                            }
                        }

                        // Frequência de Repetição (apenas para criação/duplicação)
                        if (!isEditingExisting) {
                            Text(
                                text = "FREQUÊNCIA DE REPETIÇÃO",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Slate600
                            )
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                FREQUENCIAS_OFICIAIS.forEach { (code, label) ->
                                    val active = frequencia == code
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(if (active) Sg4Purple else Color(0xFFF1F5F9))
                                            .clickable { frequencia = code }
                                            .padding(horizontal = 10.dp, vertical = 6.dp)
                                    ) {
                                        Text(
                                            text = label,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (active) Color.White else Slate600
                                        )
                                    }
                                }
                            }

                            if (frequencia != "UNICA") {
                                OutlinedTextField(
                                    value = dataFim,
                                    onValueChange = { dataFim = it },
                                    label = { Text("Repetir até a Data Fim (AAAA-MM-DD)") },
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }

                        // Título + Corretor Ortográfico IA
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "TÍTULO DA ATIVIDADE",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Slate600
                            )
                            AiSpellcheckButton(
                                text = titulo,
                                enabled = !uiState.isBlockingLoading,
                                onClick = {
                                    viewModel.correctTextWithAI(titulo) { corrected ->
                                        titulo = corrected
                                    }
                                }
                            )
                        }
                        OutlinedTextField(
                            value = titulo,
                            onValueChange = { titulo = it },
                            placeholder = { Text("Ex: Inspeção nos extintores e hidrantes") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )

                        // Categoria Oficial
                        Text(
                            text = "CATEGORIA",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Slate600
                        )
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            CATEGORIAS_OFICIAIS.forEach { cat ->
                                val active = selectedCat == cat
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (active) Sg4Purple else Color(0xFFF1F5F9))
                                        .clickable { selectedCat = cat }
                                        .padding(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        text = cat,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (active) Color.White else Slate600
                                    )
                                }
                            }
                        }
                        if (selectedCat == "OUTROS") {
                            OutlinedTextField(
                                value = customCat,
                                onValueChange = { customCat = it },
                                label = { Text("Especifique a Categoria") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }

                        // Prioridade (Baixa, Média, Alta)
                        Text(
                            text = "PRIORIDADE",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Slate600
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf(
                                Triple("BAIXA", "Baixa", Color(0xFF6366F1)),
                                Triple("MEDIA", "Média", Color(0xFFF59E0B)),
                                Triple("ALTA", "Alta", Color(0xFFEF4444))
                            ).forEach { (code, lbl, color) ->
                                val active = prioridade == code
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(38.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(if (active) color else Color(0xFFF8FAFC))
                                        .border(1.dp, if (active) color else Color(0xFFE2E8F0), RoundedCornerShape(10.dp))
                                        .clickable { prioridade = code },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = lbl,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (active) Color.White else Slate600
                                    )
                                }
                            }
                        }

                        // Unidade / Local (com autopreenchimento de Cidade e UF igual à Web)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "UNIDADE / LOCAL",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Slate600
                            )
                            Text(
                                text = if (isCustomLocal) "Selecionar da Lista" else "Digitar Outro Local",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Sg4Purple,
                                modifier = Modifier.clickable { isCustomLocal = !isCustomLocal }
                            )
                        }

                        if (!isCustomLocal && unidades.isNotEmpty()) {
                            OutlinedTextField(
                                value = localSearch,
                                onValueChange = {
                                    localSearch = it
                                    selectedUnidadeNome = it
                                },
                                label = { Text("Pesquisar ou selecionar Unidade") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                            val matchingUnidades = remember(unidades, localSearch) {
                                if (localSearch.isBlank()) unidades.take(15)
                                else unidades.filter {
                                    it.nome.contains(localSearch, ignoreCase = true) ||
                                        it.cidade.contains(localSearch, ignoreCase = true)
                                }.take(15)
                            }
                            if (matchingUnidades.isNotEmpty()) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .horizontalScroll(rememberScrollState()),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    matchingUnidades.forEach { u ->
                                        val isSelU = selectedUnidadeNome == u.nome
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(if (isSelU) Sg4PurpleSurface else Color(0xFFF1F5F9))
                                                .border(1.dp, if (isSelU) Sg4Purple else Color.Transparent, RoundedCornerShape(8.dp))
                                                .clickable {
                                                    selectedUnidadeNome = u.nome
                                                    localSearch = u.nome
                                                    if (u.cidade.isNotBlank()) cidade = u.cidade
                                                    if (u.estado.isNotBlank()) estado = u.estado
                                                }
                                                .padding(horizontal = 10.dp, vertical = 6.dp)
                                        ) {
                                            Text(
                                                text = "${u.nome} (${u.cidade}/${u.estado})",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = if (isSelU) Sg4Purple else Slate900
                                            )
                                        }
                                    }
                                }
                            }
                        } else {
                            OutlinedTextField(
                                value = selectedUnidadeNome,
                                onValueChange = { selectedUnidadeNome = it },
                                label = { Text("Nome do Local / Unidade") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedTextField(
                                value = cidade,
                                onValueChange = { cidade = it },
                                label = { Text("Cidade") },
                                singleLine = true,
                                modifier = Modifier.weight(1.4f)
                            )
                            OutlinedTextField(
                                value = estado,
                                onValueChange = { estado = it.uppercase().take(2) },
                                label = { Text("UF") },
                                singleLine = true,
                                modifier = Modifier.weight(0.6f)
                            )
                        }

                        // Descrição da Atividade + Corretor Ortográfico IA
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "DESCRIÇÃO DA ATIVIDADE",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Slate600
                            )
                            AiSpellcheckButton(
                                text = descricao,
                                enabled = !uiState.isBlockingLoading,
                                onClick = {
                                    viewModel.correctTextWithAI(descricao) { corrected ->
                                        descricao = corrected
                                    }
                                }
                            )
                        }
                        OutlinedTextField(
                            value = descricao,
                            onValueChange = { descricao = it },
                            placeholder = { Text("Descreva os detalhes da atividade planejada...") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(96.dp)
                        )

                        // Opção de adicionar vários itens em lote antes de salvar (igual à Web)
                        if (!isEditingExisting) {
                            OutlinedButton(
                                onClick = {
                                    val tFinal = titulo.ifBlank { finalCategoria }
                                    val dFinal = descricao.ifBlank { tFinal }
                                    draftList.add(
                                        DraftAgendaItem(
                                            id = System.currentTimeMillis().toString(),
                                            dataAtividade = dataAtv,
                                            frequencia = frequencia,
                                            dataFim = dataFim,
                                            hora = hora,
                                            titulo = tFinal,
                                            categoria = finalCategoria,
                                            prioridade = prioridade,
                                            local = selectedUnidadeNome.ifBlank { localSearch.ifBlank { "Unidade Vivo" } },
                                            cidade = cidade.ifBlank { "São Paulo" },
                                            estado = estado.ifBlank { "SP" },
                                            descricaoOriginal = dFinal
                                        )
                                    )
                                    titulo = ""
                                    descricao = ""
                                },
                                enabled = (titulo.isNotBlank() || descricao.isNotBlank()) && !uiState.isBlockingLoading,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Adicionar à Lista em Lote (${draftList.size})", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }

                            if (draftList.isNotEmpty()) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(Color(0xFFF8FAFC))
                                        .padding(10.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        text = "ITENS PRONTOS PARA AGENDAR (${draftList.size})",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Sg4Purple
                                    )
                                    draftList.forEachIndexed { idx, dItem ->
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = "• ${dItem.dataAtividade} (${dItem.hora}) - ${dItem.titulo} [${dItem.frequencia}]",
                                                fontSize = 11.sp,
                                                color = Slate900,
                                                modifier = Modifier.weight(1f),
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Text(
                                                text = "Remover",
                                                fontSize = 10.sp,
                                                color = Sg4Red,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.clickable { draftList.removeAt(idx) }
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Rodapé de botões do Modal
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFFF8FAFC))
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = { showCreateOrEditModal = false },
                            enabled = !uiState.isBlockingLoading,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Cancelar")
                        }

                        Button(
                            onClick = {
                                val tFinal = titulo.ifBlank { finalCategoria }
                                val dFinal = descricao.ifBlank { tFinal }
                                val locFinal = selectedUnidadeNome.ifBlank { localSearch.ifBlank { "Em Campo" } }

                                if (isEditingExisting && editingPlan != null) {
                                    viewModel.performAction(
                                        actionType = "EDITAR_ATIVIDADE",
                                        loadingTitle = "Salvando alterações do agendamento...",
                                        description = "Editar: $tFinal",
                                        payload = mapOf(
                                            "id" to editingPlan!!.id,
                                            "dataAtividade" to dataAtv,
                                            "hora" to hora,
                                            "titulo" to tFinal,
                                            "categoria" to finalCategoria,
                                            "prioridade" to prioridade,
                                            "local" to locFinal,
                                            "cidade" to cidade,
                                            "estado" to estado,
                                            "descricaoOriginal" to dFinal
                                        ),
                                        onCompleted = { showCreateOrEditModal = false }
                                    )
                                } else {
                                    val allToSend = mutableListOf<Map<String, Any?>>()
                                    draftList.forEach { d ->
                                        allToSend.add(
                                            mapOf(
                                                "dataAtividade" to d.dataAtividade,
                                                "frequencia" to d.frequencia,
                                                "dataFim" to d.dataFim,
                                                "hora" to d.hora,
                                                "titulo" to d.titulo,
                                                "categoria" to d.categoria,
                                                "prioridade" to d.prioridade,
                                                "local" to d.local,
                                                "cidade" to d.cidade,
                                                "estado" to d.estado,
                                                "descricaoOriginal" to d.descricaoOriginal
                                            )
                                        )
                                    }
                                    if (titulo.isNotBlank() || descricao.isNotBlank() || allToSend.isEmpty()) {
                                        allToSend.add(
                                            mapOf(
                                                "dataAtividade" to dataAtv,
                                                "frequencia" to frequencia,
                                                "dataFim" to dataFim,
                                                "hora" to hora,
                                                "titulo" to tFinal,
                                                "categoria" to finalCategoria,
                                                "prioridade" to prioridade,
                                                "local" to locFinal,
                                                "cidade" to cidade,
                                                "estado" to estado,
                                                "descricaoOriginal" to dFinal
                                            )
                                        )
                                    }
                                    viewModel.performAction(
                                        actionType = "CRIAR_ATIVIDADE_BATCH",
                                        loadingTitle = "Salvando agendamento(s) no planejamento...",
                                        description = "Agendamento: $tFinal",
                                        payload = mapOf("items" to allToSend),
                                        onCompleted = { showCreateOrEditModal = false }
                                    )
                                }
                            },
                            enabled = (titulo.isNotBlank() || descricao.isNotBlank() || draftList.isNotEmpty()) && !uiState.isBlockingLoading,
                            modifier = Modifier.weight(1.3f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple)
                        ) {
                            Text(
                                text = if (isEditingExisting) "Salvar Alterações" else "Salvar na Agenda",
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }

    // MODAL 2: CONCLUIR ATIVIDADE DA AGENDA (COM CORRETOR IA + DSS ALIADO + RELATÓRIO DE CAMPO)
    concludingPlan?.let { item ->
        val isDssCategory = item.categoria.uppercase().contains("DSS")
        var descExec by remember(item.id) {
            mutableStateOf(item.descricaoExecutada.ifBlank { item.descricaoOriginal })
        }
        var observacoes by remember(item.id) { mutableStateOf(item.observacoes) }

        var salvarDssAliado by remember(item.id) { mutableStateOf(isDssCategory) }
        var temaDss by remember(item.id) { mutableStateOf(item.titulo.ifBlank { item.descricaoOriginal }) }

        var incluirRelatorioCampo by remember(item.id) { mutableStateOf(!isDssCategory) }
        var empresaRel by remember(item.id) { mutableStateOf("Telefônica Brasil S.A") }
        var projetoRel by remember(item.id) { mutableStateOf("VIVO") }
        var localRel by remember(item.id) { mutableStateOf(item.local.ifBlank { "Unidade Operacional" }) }
        var cidadeUfRel by remember(item.id) {
            mutableStateOf("${item.cidade.ifBlank { "São Paulo" }}/${item.estado.ifBlank { "SP" }}")
        }

        Dialog(onDismissRequest = { if (!uiState.isBlockingLoading) concludingPlan = null }) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.88f),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Sg4Green)
                            .padding(horizontal = 18.dp, vertical = 14.dp)
                    ) {
                        Text(
                            text = "Concluir Atividade da Agenda",
                            color = Color.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                    }

                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            text = "${item.categoria} • ${formatIsoDateBr(item.dataAtividade)} às ${item.hora}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Sg4Purple
                        )

                        // Relato de Execução + Corretor IA
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "RELATO DA EXECUÇÃO",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Slate600
                            )
                            AiSpellcheckButton(
                                text = descExec,
                                enabled = !uiState.isBlockingLoading,
                                onClick = {
                                    viewModel.correctTextWithAI(descExec) { corrected ->
                                        descExec = corrected
                                    }
                                }
                            )
                        }
                        OutlinedTextField(
                            value = descExec,
                            onValueChange = { descExec = it },
                            label = { Text("O que foi realizado") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(95.dp)
                        )

                        // Observações + Corretor IA
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "OBSERVAÇÕES (OPCIONAL)",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Slate600
                            )
                            AiSpellcheckButton(
                                text = observacoes,
                                enabled = !uiState.isBlockingLoading,
                                onClick = {
                                    viewModel.correctTextWithAI(observacoes) { corrected ->
                                        observacoes = corrected
                                    }
                                }
                            )
                        }
                        OutlinedTextField(
                            value = observacoes,
                            onValueChange = { observacoes = it },
                            label = { Text("Observações ou justificativa") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )

                        // Se for DSS, opção de salvar também como DSS com Aliado
                        if (isDssCategory) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Color(0xFFF3E8FF))
                                    .padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { salvarDssAliado = !salvarDssAliado },
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(
                                        imageVector = if (salvarDssAliado) Icons.Default.CheckBox else Icons.Default.CheckBoxOutlineBlank,
                                        contentDescription = null,
                                        tint = Sg4Purple
                                    )
                                    Text(
                                        text = "Foi um DSS com Aliado? (Contabilizar no Painel)",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Sg4PurpleDark
                                    )
                                }
                                if (salvarDssAliado) {
                                    OutlinedTextField(
                                        value = temaDss,
                                        onValueChange = { temaDss = it },
                                        label = { Text("Tema abordado no DSS") },
                                        singleLine = true,
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }
                            }
                        }

                        // Opção de incluir automaticamente no Relatório de Atividades de Campo
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFFF8FAFC))
                                .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
                                .padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { incluirRelatorioCampo = !incluirRelatorioCampo },
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(
                                    imageVector = if (incluirRelatorioCampo) Icons.Default.CheckBox else Icons.Default.CheckBoxOutlineBlank,
                                    contentDescription = null,
                                    tint = Sg4Purple
                                )
                                Text(
                                    text = "Incluir também no Relatório de Campo?",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Slate900
                                )
                            }

                            if (incluirRelatorioCampo) {
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedTextField(
                                        value = empresaRel,
                                        onValueChange = { empresaRel = it },
                                        label = { Text("Empresa") },
                                        singleLine = true,
                                        modifier = Modifier.weight(1.2f)
                                    )
                                    OutlinedTextField(
                                        value = projetoRel,
                                        onValueChange = { projetoRel = it },
                                        label = { Text("Projeto") },
                                        singleLine = true,
                                        modifier = Modifier.weight(0.8f)
                                    )
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedTextField(
                                        value = localRel,
                                        onValueChange = { localRel = it },
                                        label = { Text("Local") },
                                        singleLine = true,
                                        modifier = Modifier.weight(1f)
                                    )
                                    OutlinedTextField(
                                        value = cidadeUfRel,
                                        onValueChange = { cidadeUfRel = it },
                                        label = { Text("Cidade/UF") },
                                        singleLine = true,
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }
                        }
                    }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFFF8FAFC))
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = { concludingPlan = null },
                            enabled = !uiState.isBlockingLoading,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Cancelar")
                        }
                        Button(
                            onClick = {
                                if (descExec.isNotBlank() && !uiState.isBlockingLoading) {
                                    viewModel.performAction(
                                        actionType = "CONCLUIR_ATIVIDADE",
                                        loadingTitle = "Concluindo atividade...",
                                        description = "Concluir: ${item.titulo}",
                                        payload = mapOf(
                                            "id" to item.id,
                                            "descricaoExecutada" to descExec,
                                            "observacoes" to observacoes,
                                            "salvarDssAliado" to salvarDssAliado,
                                            "temaDss" to temaDss,
                                            "gerarRelatorioCampo" to incluirRelatorioCampo,
                                            "empresa" to empresaRel,
                                            "projeto" to projetoRel,
                                            "local" to localRel,
                                            "cidadeUf" to cidadeUfRel,
                                            "descricaoRelatorio" to descExec
                                        ),
                                        onCompleted = { concludingPlan = null }
                                    )
                                }
                            },
                            enabled = descExec.isNotBlank() && !uiState.isBlockingLoading,
                            modifier = Modifier.weight(1.3f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Sg4Green)
                        ) {
                            Text("Confirmar Conclusão", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }

    // MODAL 3: CONCLUIR E TRANSFERIR PENDÊNCIAS PARA OUTRA DATA
    transferringPlan?.let { plan ->
        var novaDataTransfer by remember(plan.id) { mutableStateOf(todayYmd) }
        var obsTransfer by remember(plan.id) { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) transferringPlan = null },
            title = { Text("Concluir e Transferir Pendências", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Os itens marcados serão concluídos hoje e os itens pendentes serão transferidos para a nova data:",
                        fontSize = 12.sp,
                        color = Slate600
                    )
                    OutlinedTextField(
                        value = novaDataTransfer,
                        onValueChange = { novaDataTransfer = it },
                        label = { Text("Nova Data (AAAA-MM-DD)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = obsTransfer,
                        onValueChange = { obsTransfer = it },
                        label = { Text("Observação (opcional)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.performAction(
                            actionType = "TRANSFERIR_PENDENCIAS_ATIVIDADE",
                            loadingTitle = "Concluindo e transferindo pendências...",
                            description = "Transferência: ${plan.titulo}",
                            payload = mapOf(
                                "id" to plan.id,
                                "novaData" to novaDataTransfer,
                                "observacoes" to obsTransfer,
                                "checklist" to plan.checklist
                            ),
                            onCompleted = { transferringPlan = null }
                        )
                    },
                    enabled = novaDataTransfer.isNotBlank() && !uiState.isBlockingLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple)
                ) {
                    Text("Confirmar")
                }
            },
            dismissButton = {
                TextButton(onClick = { transferringPlan = null }) { Text("Cancelar") }
            }
        )
    }

    // MODAL 4: MOVER DATA DO AGENDAMENTO
    movingDatePlan?.let { plan ->
        var novaDataMove by remember(plan.id) { mutableStateOf(plan.dataAtividade.take(10)) }
        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) movingDatePlan = null },
            title = { Text("Mover Data da Atividade", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(plan.titulo.ifBlank { plan.categoria }, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    OutlinedTextField(
                        value = novaDataMove,
                        onValueChange = { novaDataMove = it },
                        label = { Text("Nova Data (AAAA-MM-DD)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.performAction(
                            actionType = "MOVER_DATA_ATIVIDADE",
                            loadingTitle = "Movendo atividade para nova data...",
                            description = "Mover data: ${plan.titulo}",
                            payload = mapOf("id" to plan.id, "novaData" to novaDataMove),
                            onCompleted = { movingDatePlan = null }
                        )
                    },
                    enabled = novaDataMove.isNotBlank() && !uiState.isBlockingLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple)
                ) {
                    Text("Mover")
                }
            },
            dismissButton = {
                TextButton(onClick = { movingDatePlan = null }) { Text("Cancelar") }
            }
        )
    }

    // MODAL 5: CONFIRMAR EXCLUSÃO
    deletingPlan?.let { plan ->
        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) deletingPlan = null },
            title = { Text("Excluir Agendamento", fontWeight = FontWeight.ExtraBold) },
            text = {
                Text("Deseja realmente excluir a atividade \"${plan.titulo.ifBlank { plan.categoria }}\" da sua agenda?")
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.performAction(
                            actionType = "EXCLUIR_ATIVIDADE",
                            loadingTitle = "Excluindo atividade da agenda...",
                            description = "Excluir ${plan.titulo}",
                            payload = mapOf("id" to plan.id),
                            onCompleted = { deletingPlan = null }
                        )
                    },
                    enabled = !uiState.isBlockingLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Red)
                ) {
                    Text("Excluir")
                }
            },
            dismissButton = {
                TextButton(onClick = { deletingPlan = null }) { Text("Cancelar") }
            }
        )
    }

    // MODAL 6: EDITAR SUB-ITEM DO CHECKLIST COM CORRETOR IA
    editingChecklistItem?.let { (plan, chk) ->
        var itemText by remember(chk.id) { mutableStateOf(chk.texto) }
        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) editingChecklistItem = null },
            title = { Text("Editar Item do Planejamento", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Descrição do Item", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Slate600)
                        AiSpellcheckButton(
                            text = itemText,
                            enabled = !uiState.isBlockingLoading,
                            onClick = {
                                viewModel.correctTextWithAI(itemText) { corrected ->
                                    itemText = corrected
                                }
                            }
                        )
                    }
                    OutlinedTextField(
                        value = itemText,
                        onValueChange = { itemText = it },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val updatedList = plan.checklist.map {
                            if (it.id == chk.id) it.copy(texto = itemText, titulo = itemText) else it
                        }
                        viewModel.performAction(
                            actionType = "TOGGLE_CHECKLIST_ATIVIDADE",
                            loadingTitle = "Salvando edição do item...",
                            description = "Editar item checklist",
                            payload = mapOf("id" to plan.id, "checklist" to updatedList),
                            onCompleted = { editingChecklistItem = null }
                        )
                    },
                    enabled = itemText.isNotBlank() && !uiState.isBlockingLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple)
                ) {
                    Text("Salvar")
                }
            },
            dismissButton = {
                TextButton(onClick = { editingChecklistItem = null }) { Text("Cancelar") }
            }
        )
    }

    // MODAL 7: LANÇAR DSS COM ALIADO DIRETO
    if (showDssAliadoDirectModal) {
        var tema by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) showDssAliadoDirectModal = false },
            title = { Text("Lançar DSS com Aliado", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("TEMA DO DSS", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Slate600)
                        AiSpellcheckButton(
                            text = tema,
                            enabled = !uiState.isBlockingLoading,
                            onClick = {
                                viewModel.correctTextWithAI(tema) { corrected ->
                                    tema = corrected
                                }
                            }
                        )
                    }
                    OutlinedTextField(
                        value = tema,
                        onValueChange = { tema = it },
                        label = { Text("Tema do Diálogo de Segurança") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (tema.isNotBlank() && !uiState.isBlockingLoading) {
                            viewModel.performAction(
                                actionType = "CRIAR_DSS_ALIADO",
                                loadingTitle = "Registrando DSS com Aliado...",
                                description = "DSS Aliado: $tema",
                                payload = mapOf("tema" to tema),
                                onCompleted = { showDssAliadoDirectModal = false }
                            )
                        }
                    },
                    enabled = tema.isNotBlank() && !uiState.isBlockingLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple)
                ) {
                    Text("Registrar DSS")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showDssAliadoDirectModal = false },
                    enabled = !uiState.isBlockingLoading
                ) {
                    Text("Cancelar")
                }
            }
        )
    }
}

@Composable
fun KmAbastecimentoScreen(
    uiState: Sg4UiState,
    viewModel: Sg4ViewModel
) {
    var selectedSubTab by remember { mutableIntStateOf(0) }
    var showStartKmDialog by remember { mutableStateOf(false) }
    var finishingKmItem by remember { mutableStateOf<QuilometragemDto?>(null) }
    var showAbastecimentoDialog by remember { mutableStateOf(false) }
    var showManutencaoDialog by remember { mutableStateOf(false) }

    val openKm = uiState.syncData.quilometragens.firstOrNull { it.kmFinal == null }

    Column(modifier = Modifier.fillMaxSize()) {
        TabRow(
            selectedTabIndex = selectedSubTab,
            containerColor = Color.White,
            contentColor = Sg4Purple
        ) {
            Tab(
                selected = selectedSubTab == 0,
                onClick = { selectedSubTab = 0 },
                text = { Text("Quilometragem", fontWeight = FontWeight.Bold) }
            )
            Tab(
                selected = selectedSubTab == 1,
                onClick = { selectedSubTab = 1 },
                text = { Text("Abastecimento", fontWeight = FontWeight.Bold) }
            )
        }

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
                                Spacer(modifier = Modifier.height(10.dp))
                                Button(
                                    onClick = { finishingKmItem = openKm },
                                    enabled = !uiState.isBlockingLoading,
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple)
                                ) {
                                    Text("Encerrar KM do Dia", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    } else {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = { showStartKmDialog = true },
                                enabled = !uiState.isBlockingLoading,
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple)
                            ) {
                                Icon(Icons.Default.DirectionsCar, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Iniciar KM", fontWeight = FontWeight.Bold)
                            }
                            OutlinedButton(
                                onClick = { showManutencaoDialog = true },
                                enabled = !uiState.isBlockingLoading,
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.Build, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Manutenção", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                items(uiState.syncData.quilometragens, key = { it.id }) { km ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "${formatIsoDateBr(km.dataInicial)} (${km.diaSemana})",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = Slate900
                                )
                                Text(
                                    text = "Inicial: ${km.kmInicial.toInt()} km → Final: ${km.kmFinal?.toInt()?.toString() ?: "Em rota"}",
                                    fontSize = 12.sp,
                                    color = Slate600
                                )
                            }
                            StatusBadge(
                                text = if (km.diferenca != null) "+${km.diferenca} km" else "ABERTO",
                                color = if (km.diferenca != null) Sg4Green else Sg4Amber
                            )
                        }
                    }
                }
            }
        } else {
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
                        colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple)
                    ) {
                        Icon(Icons.Default.LocalGasStation, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Registrar Novo Abastecimento", fontWeight = FontWeight.Bold)
                    }
                }

                items(uiState.syncData.abastecimentos, key = { it.id }) { abs ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = abs.tipo,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = Slate900
                                )
                                Text(
                                    text = formatIsoDateBr(abs.data),
                                    fontSize = 11.sp,
                                    color = Slate600
                                )
                            }
                            Text(
                                text = String.format(Locale("pt", "BR"), "R$ %.2f", abs.valor),
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 15.sp,
                                color = Sg4Purple
                            )
                        }
                    }
                }
            }
        }
    }

    if (showStartKmDialog) {
        var kmInicialText by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) showStartKmDialog = false },
            title = { Text("Iniciar KM do Dia", fontWeight = FontWeight.ExtraBold) },
            text = {
                OutlinedTextField(
                    value = kmInicialText,
                    onValueChange = { kmInicialText = it.filter { ch -> ch.isDigit() || ch == '.' } },
                    label = { Text("Hodômetro Inicial (KM)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        val valNum = kmInicialText.toDoubleOrNull()
                        if (valNum != null && !uiState.isBlockingLoading) {
                            viewModel.performAction(
                                actionType = "INICIAR_KM",
                                loadingTitle = "Registrando KM Inicial...",
                                description = "Início de KM: $valNum",
                                payload = mapOf("kmInicial" to valNum),
                                onCompleted = { showStartKmDialog = false }
                            )
                        }
                    },
                    enabled = kmInicialText.toDoubleOrNull() != null && !uiState.isBlockingLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple)
                ) {
                    Text("Iniciar Rota")
                }
            },
            dismissButton = {
                TextButton(onClick = { showStartKmDialog = false }) { Text("Cancelar") }
            }
        )
    }

    finishingKmItem?.let { item ->
        var kmFinalText by remember(item.id) { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) finishingKmItem = null },
            title = { Text("Encerrar KM (Inicial: ${item.kmInicial.toInt()})", fontWeight = FontWeight.ExtraBold) },
            text = {
                OutlinedTextField(
                    value = kmFinalText,
                    onValueChange = { kmFinalText = it.filter { ch -> ch.isDigit() || ch == '.' } },
                    label = { Text("Hodômetro Final (KM)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        val valNum = kmFinalText.toDoubleOrNull()
                        if (valNum != null && valNum >= item.kmInicial && !uiState.isBlockingLoading) {
                            viewModel.performAction(
                                actionType = "FINALIZAR_KM",
                                loadingTitle = "Encerrando rota e calculando KM...",
                                description = "Fim de KM: $valNum",
                                payload = mapOf("id" to item.id, "kmFinal" to valNum),
                                onCompleted = { finishingKmItem = null }
                            )
                        }
                    },
                    enabled = (kmFinalText.toDoubleOrNull() ?: -1.0) >= item.kmInicial && !uiState.isBlockingLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Green)
                ) {
                    Text("Salvar KM Final")
                }
            },
            dismissButton = {
                TextButton(onClick = { finishingKmItem = null }) { Text("Cancelar") }
            }
        )
    }

    if (showAbastecimentoDialog) {
        var valorText by remember { mutableStateOf("") }
        var tipoText by remember { mutableStateOf("ABASTECIMENTO") }
        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) showAbastecimentoDialog = false },
            title = { Text("Lançar Abastecimento / Despesa", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = valorText,
                        onValueChange = { valorText = it.replace(',', '.') },
                        label = { Text("Valor Total (R$)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = tipoText,
                        onValueChange = { tipoText = it },
                        label = { Text("Tipo (ABASTECIMENTO, PEDAGIO, LAVAGEM)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val valNum = valorText.toDoubleOrNull()
                        if (valNum != null && valNum > 0 && !uiState.isBlockingLoading) {
                            viewModel.performAction(
                                actionType = "CRIAR_ABASTECIMENTO",
                                loadingTitle = "Registrando abastecimento...",
                                description = "Abastecimento R$ $valNum",
                                payload = mapOf("valor" to valNum, "tipo" to tipoText),
                                onCompleted = { showAbastecimentoDialog = false }
                            )
                        }
                    },
                    enabled = (valorText.toDoubleOrNull() ?: 0.0) > 0 && !uiState.isBlockingLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple)
                ) {
                    Text("Salvar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAbastecimentoDialog = false }) { Text("Cancelar") }
            }
        )
    }

    if (showManutencaoDialog) {
        var kmManutText by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) showManutencaoDialog = false },
            title = { Text("Registrar Manutenção / Revisão", fontWeight = FontWeight.ExtraBold) },
            text = {
                OutlinedTextField(
                    value = kmManutText,
                    onValueChange = { kmManutText = it.filter { ch -> ch.isDigit() } },
                    label = { Text("KM da Manutenção") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        val kmVal = kmManutText.toIntOrNull()
                        if (kmVal != null && kmVal > 0 && !uiState.isBlockingLoading) {
                            viewModel.performAction(
                                actionType = "CRIAR_MANUTENCAO",
                                loadingTitle = "Salvando manutenção do veículo...",
                                description = "Manutenção em $kmVal km",
                                payload = mapOf("kmManutencao" to kmVal),
                                onCompleted = { showManutencaoDialog = false }
                            )
                        }
                    },
                    enabled = (kmManutText.toIntOrNull() ?: 0) > 0 && !uiState.isBlockingLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple)
                ) {
                    Text("Registrar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showManutencaoDialog = false }) { Text("Cancelar") }
            }
        )
    }
}

@Composable
fun CampoNcScreen(
    uiState: Sg4UiState,
    viewModel: Sg4ViewModel
) {
    var selectedSubTab by remember { mutableIntStateOf(0) }
    var showRelatorioDialog by remember { mutableStateOf(false) }
    var treatingNc by remember { mutableStateOf<NaoConformidadeDto?>(null) }

    Column(modifier = Modifier.fillMaxSize()) {
        TabRow(
            selectedTabIndex = selectedSubTab,
            containerColor = Color.White,
            contentColor = Sg4Purple
        ) {
            Tab(
                selected = selectedSubTab == 0,
                onClick = { selectedSubTab = 0 },
                text = { Text("Relatório (${uiState.syncData.relatoriosCampo.size})", fontWeight = FontWeight.Bold) }
            )
            Tab(
                selected = selectedSubTab == 1,
                onClick = { selectedSubTab = 1 },
                text = { Text("NCs (${uiState.syncData.naoConformidades.size})", fontWeight = FontWeight.Bold) }
            )
        }

        if (selectedSubTab == 0) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                item {
                    Button(
                        onClick = { showRelatorioDialog = true },
                        enabled = !uiState.isBlockingLoading,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Incluir Item no Relatório", fontWeight = FontWeight.Bold)
                    }
                }

                items(uiState.syncData.relatoriosCampo, key = { it.id }) { rel ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                StatusBadge(text = rel.projeto.ifBlank { "VIVO" }, color = Sg4Purple)
                                Text(formatIsoDateBr(rel.data), fontSize = 11.sp, color = Slate600)
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(rel.descricao, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Slate900)
                            Text("${rel.local} • ${rel.cidadeUf}", fontSize = 11.sp, color = Slate600)
                        }
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(uiState.syncData.naoConformidades, key = { it.id }) { nc ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                StatusBadge(
                                    text = nc.classificacao.ifBlank { "NC" },
                                    color = Sg4Red
                                )
                                StatusBadge(
                                    text = nc.status,
                                    color = if (nc.status == "RESOLVIDO") Sg4Green else Sg4Amber
                                )
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = nc.pergunta.ifBlank { nc.questionario },
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = Slate900
                            )
                            Text(
                                text = "Local: ${nc.localidade.ifBlank { nc.base }} • Abertura: ${formatIsoDateBr(nc.dataAbertura)}",
                                fontSize = 11.sp,
                                color = Slate600
                            )
                            if (nc.updates.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Última ação: ${nc.updates.last().text}",
                                    fontSize = 11.sp,
                                    color = Sg4Purple
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedButton(
                                onClick = { treatingNc = nc },
                                enabled = !uiState.isBlockingLoading,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Registrar Tratativa / Atualizar Status", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }

    if (showRelatorioDialog) {
        var empresa by remember { mutableStateOf("Telefônica Brasil S.A") }
        var projeto by remember { mutableStateOf("VIVO") }
        var local by remember { mutableStateOf("") }
        var cidadeUf by remember { mutableStateOf("São Paulo/SP") }
        var descricao by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) showRelatorioDialog = false },
            title = { Text("Incluir Item no Relatório", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        OutlinedTextField(
                            value = empresa,
                            onValueChange = { empresa = it },
                            label = { Text("Empresa") },
                            singleLine = true,
                            modifier = Modifier.weight(1.2f)
                        )
                        OutlinedTextField(
                            value = projeto,
                            onValueChange = { projeto = it },
                            label = { Text("Projeto") },
                            singleLine = true,
                            modifier = Modifier.weight(0.8f)
                        )
                    }
                    OutlinedTextField(
                        value = local,
                        onValueChange = { local = it },
                        label = { Text("Unidade / Local") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = cidadeUf,
                        onValueChange = { cidadeUf = it },
                        label = { Text("Cidade/UF") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("DESCRIÇÃO", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Slate600)
                        AiSpellcheckButton(
                            text = descricao,
                            enabled = !uiState.isBlockingLoading,
                            onClick = {
                                viewModel.correctTextWithAI(descricao) { corrected ->
                                    descricao = corrected
                                }
                            }
                        )
                    }
                    OutlinedTextField(
                        value = descricao,
                        onValueChange = { descricao = it },
                        label = { Text("Descrição detalhada da atividade") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (descricao.isNotBlank() && !uiState.isBlockingLoading) {
                            viewModel.performAction(
                                actionType = "CRIAR_RELATORIO_CAMPO",
                                loadingTitle = "Salvando item no relatório...",
                                description = "Relatório: $projeto",
                                payload = mapOf(
                                    "empresa" to empresa,
                                    "projeto" to projeto,
                                    "local" to local,
                                    "cidadeUf" to cidadeUf,
                                    "descricao" to descricao
                                ),
                                onCompleted = { showRelatorioDialog = false }
                            )
                        }
                    },
                    enabled = descricao.isNotBlank() && !uiState.isBlockingLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple)
                ) {
                    Text("Salvar no Relatório")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRelatorioDialog = false }) { Text("Cancelar") }
            }
        )
    }

    treatingNc?.let { nc ->
        var tratativaText by remember(nc.id) { mutableStateOf("") }
        var markResolvido by remember(nc.id) { mutableStateOf(true) }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) treatingNc = null },
            title = { Text("Tratar Não Conformidade", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(nc.pergunta, fontSize = 12.sp, color = Slate600)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("AÇÃO CORRETIVA", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Slate600)
                        AiSpellcheckButton(
                            text = tratativaText,
                            enabled = !uiState.isBlockingLoading,
                            onClick = {
                                viewModel.correctTextWithAI(tratativaText) { corrected ->
                                    tratativaText = corrected
                                }
                            }
                        )
                    }
                    OutlinedTextField(
                        value = tratativaText,
                        onValueChange = { tratativaText = it },
                        label = { Text("Descreva a ação corretiva realizada") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        TextButton(onClick = { markResolvido = !markResolvido }) {
                            Text(
                                text = if (markResolvido) "☑ Marcar como RESOLVIDO" else "☐ Manter EM ANDAMENTO",
                                color = Sg4Purple,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (tratativaText.isNotBlank() && !uiState.isBlockingLoading) {
                            viewModel.performAction(
                                actionType = "TRATAR_NC",
                                loadingTitle = "Salvando tratativa da Não Conformidade...",
                                description = "Tratativa NC ${nc.originalId}",
                                payload = mapOf(
                                    "id" to nc.id,
                                    "texto" to tratativaText,
                                    "status" to if (markResolvido) "RESOLVIDO" else "EM_ANDAMENTO"
                                ),
                                onCompleted = { treatingNc = null }
                            )
                        }
                    },
                    enabled = tratativaText.isNotBlank() && !uiState.isBlockingLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Green)
                ) {
                    Text("Salvar Tratativa")
                }
            },
            dismissButton = {
                TextButton(onClick = { treatingNc = null }) { Text("Cancelar") }
            }
        )
    }
}
