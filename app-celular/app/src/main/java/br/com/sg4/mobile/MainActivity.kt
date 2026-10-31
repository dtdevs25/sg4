package br.com.sg4.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.draw.clip
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import br.com.sg4.mobile.model.MobileTab
import br.com.sg4.mobile.ui.components.ActionLoadingOverlay
import br.com.sg4.mobile.ui.screens.AgendaPlanejamentoScreen
import br.com.sg4.mobile.ui.screens.HomeDashboardScreen
import br.com.sg4.mobile.ui.screens.KmAbastecimentoScreen
import br.com.sg4.mobile.ui.screens.LoginScreen
import br.com.sg4.mobile.ui.screens.RelatoriosMobileScreen
import br.com.sg4.mobile.ui.theme.SG4MobileTheme
import br.com.sg4.mobile.ui.theme.Sg4Amber
import br.com.sg4.mobile.ui.theme.Sg4Green
import br.com.sg4.mobile.ui.theme.Sg4Purple
import br.com.sg4.mobile.viewmodel.Sg4ViewModel

class MainActivity : ComponentActivity() {
    private var mainViewModel: Sg4ViewModel? = null
    private var networkMonitor: br.com.sg4.mobile.data.NetworkMonitor? = null

    override fun onDestroy() {
        networkMonitor?.stop()
        // Quando o usuário sai do app / fecha a aplicação, desloga automaticamente conforme solicitado
        if (isFinishing) {
            mainViewModel?.logoutOnAppExit()
        }
        super.onDestroy()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val vm: Sg4ViewModel = viewModel()
            mainViewModel = vm

            androidx.compose.runtime.DisposableEffect(vm) {
                val monitor = br.com.sg4.mobile.data.NetworkMonitor(this@MainActivity) { isOnline ->
                    vm.onNetworkStatusChanged(isOnline)
                }
                networkMonitor = monitor
                monitor.start()
                onDispose {
                    monitor.stop()
                }
            }

            SG4MobileTheme {
                SG4MobileRoot(sg4ViewModel = vm)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SG4MobileRoot(
    sg4ViewModel: Sg4ViewModel = viewModel()
) {
    val uiState by sg4ViewModel.uiState.collectAsState()
    val pendingOfflineCount by sg4ViewModel.pendingOfflineCount.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.feedbackMessage) {
        val msg = uiState.feedbackMessage
        if (!msg.isNullOrBlank() && uiState.isLoggedIn) {
            snackbarHostState.showSnackbar(msg)
            sg4ViewModel.clearFeedback()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        if (!uiState.isLoggedIn) {
            LoginScreen(
                uiState = uiState,
                viewModel = sg4ViewModel
            )
        } else {
            Scaffold(
                snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
                topBar = {
                    TopAppBar(
                        title = {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Image(
                                    painter = painterResource(id = R.drawable.logo_sg4_white),
                                    contentDescription = "Logo SG4",
                                    modifier = Modifier.height(30.dp)
                                )

                                val infiniteTransition = rememberInfiniteTransition(label = "pulse")
                                val dotAlpha by infiniteTransition.animateFloat(
                                    initialValue = 0.35f,
                                    targetValue = 1.0f,
                                    animationSpec = infiniteRepeatable(
                                        animation = tween(800, easing = LinearEasing),
                                        repeatMode = RepeatMode.Reverse
                                    ),
                                    label = "dotAlpha"
                                )

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                                    modifier = Modifier
                                        .background(
                                            Color.White.copy(alpha = 0.18f),
                                            RoundedCornerShape(12.dp)
                                        )
                                        .padding(horizontal = 8.dp, vertical = 3.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .clip(CircleShape)
                                            .background(
                                                if (uiState.isOnline) Color(0xFF22C55E).copy(alpha = dotAlpha)
                                                else Color(0xFFEF4444)
                                            )
                                    )
                                    Text(
                                        text = if (uiState.isOnline) "On" else "Off",
                                        color = Color.White,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.ExtraBold
                                    )
                                }
                            }
                        },
                        actions = {
                            IconButton(
                                onClick = { sg4ViewModel.refreshData(silent = false) },
                                enabled = !uiState.isBlockingLoading
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Refresh,
                                    contentDescription = "Sincronizar com o banco",
                                    tint = Color.White
                                )
                            }
                        },
                        colors = TopAppBarDefaults.topAppBarColors(
                            containerColor = Sg4Purple,
                            titleContentColor = Color.White,
                            actionIconContentColor = Color.White
                        )
                    )
                },
                bottomBar = {
                    NavigationBar(containerColor = Sg4Purple) {
                        val tabs = listOf(
                            MobileTab.HOME to Icons.Default.Dashboard,
                            MobileTab.AGENDA to Icons.Default.CalendarToday,
                            MobileTab.KM to Icons.Default.DirectionsCar,
                            MobileTab.RELATORIOS to Icons.Default.Assignment
                        )
                        tabs.forEach { (tab, icon) ->
                            NavigationBarItem(
                                selected = uiState.activeTab == tab,
                                onClick = { sg4ViewModel.selectTab(tab) },
                                icon = {
                                    Icon(
                                        icon,
                                        contentDescription = tab.title,
                                        modifier = Modifier.size(22.dp)
                                    )
                                },
                                label = { Text(tab.title, fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = Sg4Purple,
                                    selectedTextColor = Color.White,
                                    indicatorColor = Color.White,
                                    unselectedIconColor = Color.White.copy(alpha = 0.70f),
                                    unselectedTextColor = Color.White.copy(alpha = 0.70f)
                                )
                            )
                        }
                    }
                }
            ) { innerPadding ->
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.White)
                        .padding(innerPadding)
                ) {
                    when (uiState.activeTab) {
                        MobileTab.HOME -> HomeDashboardScreen(
                            uiState = uiState,
                            pendingOfflineCount = pendingOfflineCount,
                            viewModel = sg4ViewModel
                        )
                        MobileTab.AGENDA -> AgendaPlanejamentoScreen(
                            uiState = uiState,
                            viewModel = sg4ViewModel
                        )
                        MobileTab.KM -> KmAbastecimentoScreen(
                            uiState = uiState,
                            viewModel = sg4ViewModel
                        )
                        MobileTab.RELATORIOS -> RelatoriosMobileScreen(
                            uiState = uiState,
                            viewModel = sg4ViewModel
                        )
                    }
                }
            }
        }

        // Overlay de carregamento global que trava qualquer clique adicional
        ActionLoadingOverlay(
            visible = uiState.isBlockingLoading,
            title = uiState.blockingTitle,
            subtitle = uiState.blockingSubtitle
        )
    }
}
