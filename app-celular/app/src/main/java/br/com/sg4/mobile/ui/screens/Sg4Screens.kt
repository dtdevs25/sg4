package br.com.sg4.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.LocalGasStation
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Warning
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
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.sg4.mobile.model.MobileTab
import br.com.sg4.mobile.model.NaoConformidadeDto
import br.com.sg4.mobile.model.PlanejamentoDto
import br.com.sg4.mobile.model.QuilometragemDto
import br.com.sg4.mobile.ui.components.KpiProgressCard
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
import java.util.Locale

@Composable
fun LoginScreen(
    uiState: Sg4UiState,
    viewModel: Sg4ViewModel
) {
    var email by remember { mutableStateOf(uiState.userEmail) }
    var password by remember { mutableStateOf("") }
    var serverUrl by remember(uiState.baseUrl) { mutableStateOf(uiState.baseUrl) }
    var showServerDialog by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    colors = listOf(Color(0xFF4A0072), Sg4Purple, Color(0xFF8E24AA))
                )
            )
            .padding(20.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 10.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    StatusBadge(text = "SG4 SST MOBILE v2.6", color = Sg4Purple)
                    IconButton(onClick = { showServerDialog = true }) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Configurar Servidor",
                            tint = Slate600
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .background(Sg4PurpleSurface, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "SG4",
                        color = Sg4Purple,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 20.sp
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "Acesso ao Sistema SG4",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Slate900
                )
                Text(
                    text = "Conectado ao banco PostgreSQL + Room Offline",
                    fontSize = 12.sp,
                    color = Slate600
                )

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = serverUrl,
                    onValueChange = { serverUrl = it },
                    label = { Text("URL do Servidor SG4") },
                    leadingIcon = { Icon(Icons.Default.Settings, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("E-mail Corporativo") },
                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Senha") },
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                if (!uiState.feedbackMessage.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = uiState.feedbackMessage,
                        color = if (uiState.isErrorFeedback) Sg4Red else Sg4Green,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = {
                        if (!uiState.isBlockingLoading && email.isNotBlank() && password.isNotBlank()) {
                            viewModel.login(serverUrl, email, password)
                        }
                    },
                    enabled = !uiState.isBlockingLoading && email.isNotBlank() && password.isNotBlank(),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple)
                ) {
                    Text(
                        text = if (uiState.isBlockingLoading) "Autenticando..." else "Entrar no Aplicativo",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 15.sp
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "Servidor: $serverUrl",
                    fontSize = 11.sp,
                    color = Slate400,
                    modifier = Modifier.clickable { showServerDialog = true }
                )
            }
        }
    }

    if (showServerDialog) {
        AlertDialog(
            onDismissRequest = { showServerDialog = false },
            title = { Text("URL do Servidor SG4", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text(
                        text = "Informe a URL onde o sistema SG4 está hospedado (ex: https://seu-dominio.vercel.app ou http://10.0.2.2:3000 no emulador):",
                        fontSize = 12.sp,
                        color = Slate600
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = serverUrl,
                        onValueChange = { serverUrl = it },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.saveServerUrl(serverUrl)
                        showServerDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple)
                ) {
                    Text("Salvar URL")
                }
            },
            dismissButton = {
                TextButton(onClick = { showServerDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }
}

@Composable
fun HomeDashboardScreen(
    uiState: Sg4UiState,
    pendingOfflineCount: Int,
    viewModel: Sg4ViewModel
) {
    val summary = uiState.syncData.summary
    val tecnico = uiState.syncData.currentTecnico

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Card do Técnico / Perfil
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Sg4Purple)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = tecnico?.nome ?: uiState.userName.ifBlank { "Técnico SG4" },
                                color = Color.White,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.ExtraBold
                            )
                            Text(
                                text = "${tecnico?.cargo ?: "SST"} • Base: ${tecnico?.baseFixaNome ?: "Geral"}",
                                color = Color.White.copy(alpha = 0.8f),
                                fontSize = 12.sp
                            )
                        }
                        IconButton(
                            onClick = { viewModel.refreshData(silent = false) },
                            enabled = !uiState.isBlockingLoading
                        ) {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = "Sincronizar",
                                tint = Color.White
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                text = "SALDO ABASTECIMENTO (${summary.mesReferencia.ifBlank { "MÊS ATUAL" }})",
                                color = Color.White.copy(alpha = 0.7f),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = String.format(Locale("pt", "BR"), "R$ %.2f", summary.saldoAbastecimento),
                                color = Color.White,
                                fontSize = 22.sp,
                                fontWeight = FontWeight.ExtraBold
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "KM RODADOS NO MÊS",
                                color = Color.White.copy(alpha = 0.7f),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "${summary.kmRodadosMes} km",
                                color = Color.White,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.ExtraBold
                            )
                        }
                    }

                    if (pendingOfflineCount > 0) {
                        Spacer(modifier = Modifier.height(10.dp))
                        StatusBadge(
                            text = "$pendingOfflineCount registro(s) na fila offline aguardando internet",
                            color = Sg4Amber
                        )
                    }
                }
            }
        }

        // KPIs de Metas Mensais (DSS e Inspeções)
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                KpiProgressCard(
                    title = "META DSS MÊS",
                    currentValue = summary.dssRealizadosMes,
                    targetValue = summary.dssMetaMes,
                    accentColor = Sg4Blue,
                    modifier = Modifier.weight(1f)
                )
                KpiProgressCard(
                    title = "META INSPEÇÕES",
                    currentValue = summary.inspecoesRealizadasMes,
                    targetValue = summary.inspecoesMetaMes,
                    accentColor = Sg4Green,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Alertas rápidos de pendências
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { viewModel.selectTab(MobileTab.AGENDA) },
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text("Atividades Pendentes", fontSize = 11.sp, color = Slate600, fontWeight = FontWeight.Bold)
                        Text(
                            text = "${summary.atividadesPendentesCount}",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Sg4Purple
                        )
                        Text("Toque para abrir agenda →", fontSize = 10.sp, color = Slate400)
                    }
                }
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { viewModel.selectTab(MobileTab.CAMPO) },
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text("NCs em Aberto", fontSize = 11.sp, color = Slate600, fontWeight = FontWeight.Bold)
                        Text(
                            text = "${summary.ncPendentesCount}",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (summary.ncPendentesCount > 0) Sg4Red else Sg4Green
                        )
                        Text("Toque para tratar NCs →", fontSize = 10.sp, color = Slate400)
                    }
                }
            }
        }

        // Atalhos rápidos de lançamento em campo
        item {
            Text(
                text = "Ações Rápidas de Campo",
                fontSize = 14.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Slate900
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = { viewModel.selectTab(MobileTab.KM) },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.DirectionsCar, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Lançar KM", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                OutlinedButton(
                    onClick = { viewModel.selectTab(MobileTab.KM) },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.LocalGasStation, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Abastecer", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Próximas atividades do planejamento
        item {
            Text(
                text = "Próximas Atividades da Agenda",
                fontSize = 14.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Slate900
            )
        }

        val proximas = uiState.syncData.planejamentos.take(5)
        if (proximas.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Text(
                        text = "Nenhuma atividade planejada encontrada.",
                        modifier = Modifier.padding(16.dp),
                        fontSize = 13.sp,
                        color = Slate600
                    )
                }
            }
        } else {
            items(proximas, key = { it.id }) { item ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { viewModel.selectTab(MobileTab.AGENDA) },
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
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = item.titulo.ifBlank { item.categoria },
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = Slate900
                            )
                            Text(
                                text = "${formatIsoDateBr(item.dataAtividade)} às ${item.hora} • ${item.local.ifBlank { item.cidade }}",
                                fontSize = 11.sp,
                                color = Slate600
                            )
                        }
                        StatusBadge(
                            text = item.status,
                            color = if (item.status == "CONCLUIDO") Sg4Green else Sg4Amber
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun AgendaPlanejamentoScreen(
    uiState: Sg4UiState,
    viewModel: Sg4ViewModel
) {
    var showCreateDialog by remember { mutableStateOf(false) }
    var showDssDialog by remember { mutableStateOf(false) }
    var concludingItem by remember { mutableStateOf<PlanejamentoDto?>(null) }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Button(
                onClick = { showCreateDialog = true },
                enabled = !uiState.isBlockingLoading,
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple)
            ) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text("Nova Atividade", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }

            OutlinedButton(
                onClick = { showDssDialog = true },
                enabled = !uiState.isBlockingLoading,
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("+ DSS com Aliado", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Sg4Purple)
            }
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(uiState.syncData.planejamentos, key = { it.id }) { plan ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            StatusBadge(
                                text = plan.categoria.ifBlank { "Atividade" },
                                color = Sg4Purple
                            )
                            StatusBadge(
                                text = plan.status,
                                color = if (plan.status == "CONCLUIDO") Sg4Green else Sg4Amber
                            )
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        Text(
                            text = plan.descricaoOriginal,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = Slate900
                        )

                        Text(
                            text = "${formatIsoDateBr(plan.dataAtividade)} • ${plan.hora} • ${plan.local} (${plan.cidade}/${plan.estado})",
                            fontSize = 11.sp,
                            color = Slate600
                        )

                        if (plan.status != "CONCLUIDO") {
                            Spacer(modifier = Modifier.height(10.dp))
                            Button(
                                onClick = { concludingItem = plan },
                                enabled = !uiState.isBlockingLoading,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Sg4Green)
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Concluir Atividade", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        } else if (plan.descricaoExecutada.isNotBlank()) {
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Executado: ${plan.descricaoExecutada}",
                                fontSize = 11.sp,
                                color = Sg4Green,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }
        }
    }

    if (showCreateDialog) {
        var categoria by remember { mutableStateOf("Visita Técnica") }
        var descricao by remember { mutableStateOf("") }
        var local by remember { mutableStateOf("") }
        var cidade by remember { mutableStateOf("São Paulo") }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) showCreateDialog = false },
            title = { Text("Cadastrar Atividade", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = categoria,
                        onValueChange = { categoria = it },
                        label = { Text("Categoria (ex: Inspeção, DSS, Reunião)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = descricao,
                        onValueChange = { descricao = it },
                        label = { Text("Descrição da Atividade") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = local,
                        onValueChange = { local = it },
                        label = { Text("Unidade / Local") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = cidade,
                        onValueChange = { cidade = it },
                        label = { Text("Cidade") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (descricao.isNotBlank() && !uiState.isBlockingLoading) {
                            viewModel.performAction(
                                actionType = "CRIAR_ATIVIDADE",
                                loadingTitle = "Cadastrando atividade no planejamento...",
                                description = "Nova atividade: $categoria",
                                payload = mapOf(
                                    "categoria" to categoria,
                                    "descricaoOriginal" to descricao,
                                    "local" to local,
                                    "cidade" to cidade,
                                    "estado" to "SP"
                                ),
                                onCompleted = { showCreateDialog = false }
                            )
                        }
                    },
                    enabled = descricao.isNotBlank() && !uiState.isBlockingLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Purple)
                ) {
                    Text("Salvar")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showCreateDialog = false },
                    enabled = !uiState.isBlockingLoading
                ) {
                    Text("Cancelar")
                }
            }
        )
    }

    if (showDssDialog) {
        var tema by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) showDssDialog = false },
            title = { Text("Lançar DSS com Aliado", fontWeight = FontWeight.ExtraBold) },
            text = {
                OutlinedTextField(
                    value = tema,
                    onValueChange = { tema = it },
                    label = { Text("Tema do Diálogo de Segurança") },
                    modifier = Modifier.fillMaxWidth()
                )
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
                                onCompleted = { showDssDialog = false }
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
                    onClick = { showDssDialog = false },
                    enabled = !uiState.isBlockingLoading
                ) {
                    Text("Cancelar")
                }
            }
        )
    }

    concludingItem?.let { item ->
        var descExec by remember(item.id) { mutableStateOf(item.descricaoOriginal) }
        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) concludingItem = null },
            title = { Text("Concluir Atividade", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Confirme o relato da execução (também será enviado para o Relatório de Campo):",
                        fontSize = 12.sp,
                        color = Slate600
                    )
                    OutlinedTextField(
                        value = descExec,
                        onValueChange = { descExec = it },
                        label = { Text("Descrição Executada") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (descExec.isNotBlank() && !uiState.isBlockingLoading) {
                            viewModel.performAction(
                                actionType = "CONCLUIR_ATIVIDADE",
                                loadingTitle = "Concluindo atividade e gerando relatório...",
                                description = "Conclusão: ${item.categoria}",
                                payload = mapOf(
                                    "id" to item.id,
                                    "descricaoExecutada" to descExec,
                                    "gerarRelatorioCampo" to true
                                ),
                                onCompleted = { concludingItem = null }
                            )
                        }
                    },
                    enabled = descExec.isNotBlank() && !uiState.isBlockingLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Sg4Green)
                ) {
                    Text("Confirmar Conclusão")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { concludingItem = null },
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
                text = { Text("Relatórios Campo", fontWeight = FontWeight.Bold) }
            )
            Tab(
                selected = selectedSubTab == 1,
                onClick = { selectedSubTab = 1 },
                text = { Text("Não Conformidades (${uiState.syncData.naoConformidades.size})", fontWeight = FontWeight.Bold) }
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
                        Text("Novo Relatório de Campo", fontWeight = FontWeight.Bold)
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
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                StatusBadge(text = rel.projeto.ifBlank { "SST" }, color = Sg4Purple)
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
        var projeto by remember { mutableStateOf("Inspeção Técnica") }
        var local by remember { mutableStateOf("") }
        var cidadeUf by remember { mutableStateOf("São Paulo/SP") }
        var descricao by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { if (!uiState.isBlockingLoading) showRelatorioDialog = false },
            title = { Text("Registrar Atividade de Campo", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = projeto,
                        onValueChange = { projeto = it },
                        label = { Text("Projeto / Tipo") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
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
                    OutlinedTextField(
                        value = descricao,
                        onValueChange = { descricao = it },
                        label = { Text("Descrição detalhada") },
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
                                loadingTitle = "Salvando relatório de campo...",
                                description = "Relatório: $projeto",
                                payload = mapOf(
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
                    Text("Salvar Relatório")
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
                    OutlinedTextField(
                        value = tratativaText,
                        onValueChange = { tratativaText = it },
                        label = { Text("Ação corretiva realizada") },
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

@Composable
fun DossieReunioesScreen(
    uiState: Sg4UiState
) {
    var selectedSubTab by remember { mutableIntStateOf(0) }

    Column(modifier = Modifier.fillMaxSize()) {
        TabRow(
            selectedTabIndex = selectedSubTab,
            containerColor = Color.White,
            contentColor = Sg4Purple
        ) {
            Tab(
                selected = selectedSubTab == 0,
                onClick = { selectedSubTab = 0 },
                text = { Text("Documentos (${uiState.syncData.documentos.size})", fontWeight = FontWeight.Bold) }
            )
            Tab(
                selected = selectedSubTab == 1,
                onClick = { selectedSubTab = 1 },
                text = { Text("Reuniões (${uiState.syncData.reunioes.size})", fontWeight = FontWeight.Bold) }
            )
        }

        if (selectedSubTab == 0) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(uiState.syncData.documentos, key = { it.id }) { doc ->
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
                            Column(modifier = Modifier.weight(1f)) {
                                Text(doc.tipoNome, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Slate900)
                                Text(
                                    text = "Emissão: ${formatIsoDateBr(doc.dataEmissao)} • Vencimento: ${formatIsoDateBr(doc.dataVencimento)}",
                                    fontSize = 11.sp,
                                    color = Slate600
                                )
                            }
                            StatusBadge(
                                text = doc.status,
                                color = when (doc.status) {
                                    "VENCIDO" -> Sg4Red
                                    "A_VENCER" -> Sg4Amber
                                    else -> Sg4Green
                                }
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
                items(uiState.syncData.reunioes, key = { it.id }) { reu ->
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
                            Column(modifier = Modifier.weight(1f)) {
                                Text(reu.assunto, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Slate900)
                                Text(
                                    text = "${formatIsoDateBr(reu.data)} • Pontualidade: ${reu.pontualidade}",
                                    fontSize = 11.sp,
                                    color = Slate600
                                )
                            }
                            StatusBadge(
                                text = reu.presenca,
                                color = if (reu.presenca == "PRESENTE") Sg4Green else Sg4Red
                            )
                        }
                    }
                }
            }
        }
    }
}

