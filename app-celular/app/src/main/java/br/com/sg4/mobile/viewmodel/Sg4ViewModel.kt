package br.com.sg4.mobile.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import br.com.sg4.mobile.data.AppDatabase
import br.com.sg4.mobile.data.Sg4Repository
import br.com.sg4.mobile.model.MobileSyncResponse
import br.com.sg4.mobile.model.MobileTab
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicBoolean

data class Sg4UiState(
    val isInitialized: Boolean = false,
    val isLoggedIn: Boolean = false,
    val baseUrl: String = "https://sg4.ehspro.com.br",
    val userName: String = "",
    val userEmail: String = "",
    val userRole: String = "TST",
    val selectedTecnicoId: String? = null,
    val activeTab: MobileTab = MobileTab.HOME,
    val isOnline: Boolean = true,
    val isSyncing: Boolean = false,
    val isBlockingLoading: Boolean = false,
    val blockingTitle: String = "Processando solicitação...",
    val blockingSubtitle: String = "Aguarde a resposta do servidor. Não feche nem clique novamente.",
    val feedbackMessage: String? = null,
    val isErrorFeedback: Boolean = false,
    val syncData: MobileSyncResponse = MobileSyncResponse()
)

class Sg4ViewModel(application: Application) : AndroidViewModel(application) {

    private val repository: Sg4Repository = Sg4Repository(
        AppDatabase.getInstance(application).sg4Dao()
    )

    // Trava atômica síncrona para impedir cliques duplos antes da recomposição do Compose
    private val actionLock = AtomicBoolean(false)

    private val _uiState = MutableStateFlow(Sg4UiState())
    val uiState: StateFlow<Sg4UiState> = _uiState.asStateFlow()

    val pendingOfflineCount: StateFlow<Int> = repository.pendingActionsCount.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = 0
    )

    init {
        bootstrapSession()
    }

    private fun bootstrapSession() {
        viewModelScope.launch {
            val session = repository.getSession()
            val cached = repository.loadCachedSync()
            val logged = session.authToken.isNotBlank()

            _uiState.update {
                it.copy(
                    isInitialized = true,
                    isLoggedIn = logged,
                    baseUrl = session.baseUrl,
                    userName = session.userName,
                    userEmail = session.userEmail,
                    userRole = session.userRole,
                    selectedTecnicoId = session.selectedTecnicoId,
                    syncData = cached ?: MobileSyncResponse()
                )
            }

            if (logged) {
                refreshData(silent = true)
            }
        }
    }

    fun selectTab(tab: MobileTab) {
        _uiState.update { it.copy(activeTab = tab) }
    }

    fun clearFeedback() {
        _uiState.update { it.copy(feedbackMessage = null, isErrorFeedback = false) }
    }

    fun login(baseUrl: String, email: String, password: String) {
        if (!actionLock.compareAndSet(false, true)) return
        viewModelScope.launch {
            try {
                _uiState.update {
                    it.copy(
                        isBlockingLoading = true,
                        blockingTitle = "Autenticando no sistema...",
                        blockingSubtitle = "Aguarde a validação das suas credenciais.",
                        feedbackMessage = null
                    )
                }
                val result = repository.login(baseUrl, email, password)
                result.fold(
                    onSuccess = { res ->
                        val user = res.user
                        _uiState.update {
                            it.copy(
                                isLoggedIn = true,
                                baseUrl = Sg4Repository.DEFAULT_PROD_URL,
                                userName = user?.name ?: "Usuário SG4",
                                userEmail = user?.email ?: email,
                                userRole = user?.role ?: "TST",
                                selectedTecnicoId = user?.tecnicoId ?: user?.tecnico?.id,
                                isOnline = true
                            )
                        }
                        refreshDataInternal(overrideTecnicoId = user?.tecnicoId ?: user?.tecnico?.id)
                    },
                    onFailure = { err ->
                        _uiState.update {
                            it.copy(
                                feedbackMessage = err.message ?: "E-mail ou senha incorretos.",
                                isErrorFeedback = true
                            )
                        }
                    }
                )
            } finally {
                _uiState.update { it.copy(isBlockingLoading = false) }
                actionLock.set(false)
            }
        }
    }

    fun forgotPassword(email: String, onCompleted: () -> Unit = {}) {
        if (!actionLock.compareAndSet(false, true)) return
        viewModelScope.launch {
            try {
                _uiState.update {
                    it.copy(
                        isBlockingLoading = true,
                        blockingTitle = "Enviando link de recuperação...",
                        blockingSubtitle = "Aguarde enquanto enviamos o e-mail de redefinição de senha.",
                        feedbackMessage = null
                    )
                }
                val res = repository.forgotPassword(email)
                res.fold(
                    onSuccess = { msg ->
                        onCompleted()
                        _uiState.update {
                            it.copy(
                                feedbackMessage = "📧 $msg",
                                isErrorFeedback = false
                            )
                        }
                    },
                    onFailure = { err ->
                        _uiState.update {
                            it.copy(
                                feedbackMessage = err.message ?: "E-mail não cadastrado.",
                                isErrorFeedback = true
                            )
                        }
                    }
                )
            } finally {
                _uiState.update { it.copy(isBlockingLoading = false) }
                actionLock.set(false)
            }
        }
    }

    fun logout() {
        if (!actionLock.compareAndSet(false, true)) return
        viewModelScope.launch {
            try {
                _uiState.update {
                    it.copy(
                        isBlockingLoading = true,
                        blockingTitle = "Encerrando sessão..."
                    )
                }
                repository.logout()
                _uiState.update {
                    it.copy(
                        isLoggedIn = false,
                        activeTab = MobileTab.HOME,
                        feedbackMessage = null
                    )
                }
            } finally {
                _uiState.update { it.copy(isBlockingLoading = false) }
                actionLock.set(false)
            }
        }
    }

    fun refreshData(silent: Boolean = false) {
        if (!silent) {
            if (!actionLock.compareAndSet(false, true)) return
        }
        viewModelScope.launch {
            try {
                if (!silent) {
                    _uiState.update {
                        it.copy(
                            isBlockingLoading = true,
                            blockingTitle = "Sincronizando com o banco SG4...",
                            blockingSubtitle = "Enviando fila offline e atualizando dados em tempo real."
                        )
                    }
                } else {
                    _uiState.update { it.copy(isSyncing = true) }
                }
                refreshDataInternal(overrideTecnicoId = _uiState.value.selectedTecnicoId)
            } finally {
                _uiState.update {
                    it.copy(
                        isBlockingLoading = false,
                        isSyncing = false
                    )
                }
                if (!silent) {
                    actionLock.set(false)
                }
            }
        }
    }

    private suspend fun refreshDataInternal(overrideTecnicoId: String? = null) {
        val syncRes = repository.syncWithServer(overrideTecnicoId)
        syncRes.fold(
            onSuccess = { data ->
                _uiState.update {
                    it.copy(
                        isOnline = true,
                        syncData = data,
                        selectedTecnicoId = data.currentTecnico?.id ?: it.selectedTecnicoId
                    )
                }
            },
            onFailure = {
                val cached = repository.loadCachedSync()
                _uiState.update {
                    it.copy(
                        isOnline = false,
                        syncData = cached ?: it.syncData,
                        feedbackMessage = "Modo Offline ativo: exibindo dados salvos no celular (Room Database).",
                        isErrorFeedback = false
                    )
                }
            }
        )
    }

    /**
     * Corretor ortográfico com IA (Gemini / Groq) igual ao sistema web.
     */
    fun correctTextWithAI(text: String, onCorrected: (String) -> Unit) {
        if (text.isBlank()) return
        if (!actionLock.compareAndSet(false, true)) return
        viewModelScope.launch {
            try {
                _uiState.update {
                    it.copy(
                        isBlockingLoading = true,
                        blockingTitle = "✨ Corrigindo ortografia com IA...",
                        blockingSubtitle = "Aplicando norma culta e terminologia técnica de SST sem alterar o sentido."
                    )
                }
                val result = repository.correctTextWithAI(text)
                result.fold(
                    onSuccess = { corrected ->
                        onCorrected(corrected)
                        _uiState.update {
                            it.copy(
                                feedbackMessage = "✨ Texto corrigido pela Inteligência Artificial!",
                                isErrorFeedback = false
                            )
                        }
                    },
                    onFailure = { err ->
                        _uiState.update {
                            it.copy(
                                feedbackMessage = err.message ?: "Não foi possível corrigir o texto com a IA.",
                                isErrorFeedback = true
                            )
                        }
                    }
                )
            } finally {
                _uiState.update { it.copy(isBlockingLoading = false) }
                actionLock.set(false)
            }
        }
    }

    /**
     * Executa qualquer ação de cadastro/salvamento com bloqueio total da tela
     * impedindo cliques repetidos e sincronizando em seguida.
     */
    fun performAction(
        actionType: String,
        loadingTitle: String,
        description: String,
        payload: Map<String, Any?>,
        onCompleted: () -> Unit = {}
    ) {
        if (!actionLock.compareAndSet(false, true)) return
        viewModelScope.launch {
            try {
                _uiState.update {
                    it.copy(
                        isBlockingLoading = true,
                        blockingTitle = loadingTitle,
                        blockingSubtitle = "Por favor, aguarde. Não clique novamente para evitar duplicidade."
                    )
                }

                val result = repository.executeOrQueueAction(
                    actionType = actionType,
                    description = description,
                    payload = payload
                )

                result.fold(
                    onSuccess = { (sentOnline, msg) ->
                        onCompleted()
                        if (sentOnline) {
                            refreshDataInternal(overrideTecnicoId = _uiState.value.selectedTecnicoId)
                        }
                        _uiState.update {
                            it.copy(
                                isOnline = sentOnline,
                                feedbackMessage = msg,
                                isErrorFeedback = false
                            )
                        }
                    },
                    onFailure = { err ->
                        _uiState.update {
                            it.copy(
                                feedbackMessage = err.message ?: "Erro ao salvar registro.",
                                isErrorFeedback = true
                            )
                        }
                    }
                )
            } finally {
                _uiState.update { it.copy(isBlockingLoading = false) }
                actionLock.set(false)
            }
        }
    }
}
