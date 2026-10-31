package br.com.sg4.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import br.com.sg4.mobile.model.MobileTab
import br.com.sg4.mobile.ui.components.ActionLoadingOverlay
import br.com.sg4.mobile.ui.screens.AgendaPlanejamentoScreen
import br.com.sg4.mobile.ui.screens.CampoNcScreen
import br.com.sg4.mobile.ui.screens.HomeDashboardScreen
import br.com.sg4.mobile.ui.screens.KmAbastecimentoScreen
import br.com.sg4.mobile.ui.screens.LoginScreen
import br.com.sg4.mobile.ui.theme.SG4MobileTheme
import br.com.sg4.mobile.ui.theme.Sg4Amber
import br.com.sg4.mobile.ui.theme.Sg4Green
import br.com.sg4.mobile.ui.theme.Sg4Purple
import br.com.sg4.mobile.ui.theme.Sg4PurpleSurface
import br.com.sg4.mobile.ui.theme.Slate600
import br.com.sg4.mobile.viewmodel.Sg4ViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SG4MobileTheme {
                SG4MobileRoot()
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
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    text = "SG4 Mobile",
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 18.sp
                                )
                                Box(
                                    modifier = Modifier
                                        .background(
                                            if (uiState.isOnline) Sg4Green.copy(alpha = 0.2f) else Sg4Amber.copy(alpha = 0.2f),
                                            RoundedCornerShape(6.dp)
                                        )
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = if (uiState.isOnline) "ONLINE" else "OFFLINE",
                                        color = if (uiState.isOnline) Sg4Green else Sg4Amber,
                                        fontSize = 9.sp,
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
                                    contentDescription = "Sincronizar",
                                    tint = Sg4Purple
                                )
                            }
                            IconButton(
                                onClick = { sg4ViewModel.logout() },
                                enabled = !uiState.isBlockingLoading
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ExitToApp,
                                    contentDescription = "Sair",
                                    tint = Slate600
                                )
                            }
                        },
                        colors = TopAppBarDefaults.topAppBarColors(
                            containerColor = Color.White
                        )
                    )
                },
                bottomBar = {
                    NavigationBar(containerColor = Color.White) {
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
                                icon = { Icon(icon, contentDescription = tab.title) },
                                label = { Text(tab.title, fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = Sg4Purple,
                                    selectedTextColor = Sg4Purple,
                                    indicatorColor = Sg4PurpleSurface
                                )
                            )
                        }
                    }
                }
            ) { innerPadding ->
                Box(
                    modifier = Modifier
                        .fillMaxSize()
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
                        MobileTab.RELATORIOS -> CampoNcScreen(
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
