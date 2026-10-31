package br.com.sg4.mobile.data

import br.com.sg4.mobile.model.LoginRequest
import br.com.sg4.mobile.model.LoginResponse
import br.com.sg4.mobile.model.MobileActionRequest
import br.com.sg4.mobile.model.MobileSyncResponse
import com.squareup.moshi.Types
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import java.util.UUID

class Sg4Repository(private val dao: Sg4Dao) {

    val pendingActionsCount: Flow<Int> = dao.observePendingCount()

    private val syncAdapter = Sg4ApiService.moshi.adapter(MobileSyncResponse::class.java)
    private val mapType = Types.newParameterizedType(
        Map::class.java,
        String::class.java,
        Any::class.java
    )
    private val payloadAdapter = Sg4ApiService.moshi.adapter<Map<String, Any?>>(mapType)

    companion object {
        const val DEFAULT_PROD_URL = "https://sg4.ehspro.com.br"
    }

    suspend fun getSession(): SessionConfigEntity {
        return withContext(Dispatchers.IO) {
            val saved = dao.getSessionConfig()
            if (saved == null) {
                SessionConfigEntity(baseUrl = DEFAULT_PROD_URL)
            } else if (saved.baseUrl.contains("10.0.2.2") || saved.baseUrl.isBlank()) {
                val updated = saved.copy(baseUrl = DEFAULT_PROD_URL)
                dao.saveSessionConfig(updated)
                updated
            } else {
                saved
            }
        }
    }

    suspend fun updateBaseUrl(newUrl: String) {
        withContext(Dispatchers.IO) {
            val current = getSession()
            dao.saveSessionConfig(current.copy(baseUrl = newUrl.trim(), updatedAt = System.currentTimeMillis()))
        }
    }

    suspend fun login(baseUrl: String, email: String, password: String): Result<LoginResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val targetUrl = DEFAULT_PROD_URL
                val api = Sg4ApiService.create(targetUrl)
                val response = api.login(LoginRequest(email = email.trim(), password = password))
                if (response.success && !response.token.isNullOrBlank() && response.user != null) {
                    dao.saveSessionConfig(
                        SessionConfigEntity(
                            id = 1,
                            baseUrl = targetUrl,
                            authToken = response.token,
                            userId = response.user.id,
                            userName = response.user.name,
                            userEmail = response.user.email,
                            userRole = response.user.role,
                            selectedTecnicoId = response.user.tecnicoId ?: response.user.tecnico?.id
                        )
                    )
                    Result.success(response)
                } else {
                    Result.failure(Exception(response.error ?: "E-mail ou senha incorretos."))
                }
            } catch (e: retrofit2.HttpException) {
                if (e.code() == 401) {
                    Result.failure(Exception("E-mail ou senha incorretos."))
                } else if (e.code() == 429) {
                    Result.failure(Exception("Conta bloqueada por 15 min. Muitas tentativas."))
                } else if (e.code() == 403) {
                    Result.failure(Exception("Usuário inativo. Contate o administrador."))
                } else {
                    Result.failure(Exception("E-mail ou senha incorretos."))
                }
            } catch (_: Exception) {
                Result.failure(Exception("Não foi possível autenticar. Verifique sua conexão com a internet."))
            }
        }
    }

    suspend fun forgotPassword(email: String): Result<String> {
        return withContext(Dispatchers.IO) {
            try {
                val api = Sg4ApiService.create(DEFAULT_PROD_URL)
                val response = api.login(
                    LoginRequest(
                        email = email.trim(),
                        password = "",
                        action = "FORGOT_PASSWORD"
                    )
                )
                if (response.success) {
                    Result.success(response.message ?: "📧 Link de recuperação enviado para ${email.trim()}")
                } else {
                    Result.failure(Exception(response.error ?: "E-mail não cadastrado."))
                }
            } catch (_: Exception) {
                Result.failure(Exception("Erro ao enviar link de recuperação. Verifique sua conexão."))
            }
        }
    }

    suspend fun logout() {
        withContext(Dispatchers.IO) {
            val current = getSession()
            dao.saveSessionConfig(
                SessionConfigEntity(
                    id = 1,
                    baseUrl = current.baseUrl,
                    authToken = ""
                )
            )
        }
    }

    suspend fun loadCachedSync(): MobileSyncResponse? {
        return withContext(Dispatchers.IO) {
            try {
                val cached = dao.getLatestSnapshot() ?: return@withContext null
                syncAdapter.fromJson(cached.rawJson)
            } catch (_: Exception) {
                null
            }
        }
    }

    suspend fun syncWithServer(overrideTecnicoId: String? = null): Result<MobileSyncResponse> {
        return withContext(Dispatchers.IO) {
            val session = getSession()
            if (session.authToken.isBlank()) {
                return@withContext Result.failure(Exception("Sessão expirada. Faça login novamente."))
            }
            try {
                val api = Sg4ApiService.create(session.baseUrl)
                val bearer = "Bearer ${session.authToken}"

                // 1. Envia ações pendentes da fila offline antes de puxar os dados novos
                flushPendingActions(api, bearer)

                // 2. Busca o pacote atualizado do PostgreSQL (estritamente do próprio usuário)
                val targetTec = overrideTecnicoId ?: session.selectedTecnicoId
                val syncData = api.syncAll(bearer, targetTec)
                if (syncData.success) {
                    val rawJson = syncAdapter.toJson(syncData)
                    dao.saveSnapshot(
                        CachedSyncSnapshotEntity(
                            key = "latest_sync",
                            rawJson = rawJson,
                            syncedAtIso = syncData.syncedAt
                        )
                    )
                    val resolvedTecId = syncData.currentTecnico?.id ?: overrideTecnicoId
                    if (resolvedTecId != null && resolvedTecId != session.selectedTecnicoId) {
                        dao.saveSessionConfig(session.copy(selectedTecnicoId = resolvedTecId))
                    }
                    Result.success(syncData)
                } else {
                    Result.failure(Exception("Servidor retornou erro ao sincronizar."))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    private suspend fun flushPendingActions(api: Sg4ApiService, bearer: String) {
        val pendingList = dao.getPendingActions()
        for (item in pendingList) {
            try {
                val payload = payloadAdapter.fromJson(item.payloadJson) ?: emptyMap()
                val res = api.submitAction(
                    bearerToken = bearer,
                    request = MobileActionRequest(
                        actionType = item.actionType,
                        payload = payload,
                        clientRequestId = item.clientRequestId
                    )
                )
                if (res.success) {
                    dao.markActionSynced(item.localId)
                }
            } catch (_: Exception) {
                // Continua na fila para a próxima tentativa quando a rede estabilizar
            }
        }
        dao.deleteSyncedActions()
    }

    /**
     * Corretor ortográfico e gramatical com IA (Gemini / Groq) idêntico ao sistema web.
     */
    suspend fun correctTextWithAI(text: String): Result<String> {
        return withContext(Dispatchers.IO) {
            try {
                val session = getSession()
                if (session.authToken.isBlank()) {
                    return@withContext Result.failure(Exception("Sessão expirada. Faça login novamente."))
                }
                val api = Sg4ApiService.create(session.baseUrl)
                val response = api.submitAction(
                    bearerToken = "Bearer ${session.authToken}",
                    request = MobileActionRequest(
                        actionType = "CORRIGIR_TEXTO_IA",
                        payload = mapOf("texto" to text),
                        clientRequestId = UUID.randomUUID().toString()
                    )
                )
                if (response.success && !response.correctedText.isNullOrBlank()) {
                    Result.success(response.correctedText)
                } else {
                    Result.failure(Exception(response.error ?: "Não foi possível corrigir o texto com a IA."))
                }
            } catch (_: Exception) {
                Result.failure(Exception("Sem conexão com a internet para usar o Corretor IA."))
            }
        }
    }

    /**
     * Executa uma ação no banco do servidor ou salva na fila offline do Room caso sem internet.
     * Retorna Pair< enviadoOnline: Boolean, mensagem: String >
     */
    suspend fun executeOrQueueAction(
        actionType: String,
        description: String,
        payload: Map<String, Any?>
    ): Result<Pair<Boolean, String>> {
        return withContext(Dispatchers.IO) {
            val session = getSession()
            val requestId = UUID.randomUUID().toString()
            val enrichedPayload = payload.toMutableMap().apply {
                if (!containsKey("tecnicoId") && session.selectedTecnicoId != null) {
                    put("tecnicoId", session.selectedTecnicoId)
                }
            }

            try {
                if (session.authToken.isBlank()) {
                    throw IllegalStateException("Sem token de autenticação")
                }
                val api = Sg4ApiService.create(session.baseUrl)
                val response = api.submitAction(
                    bearerToken = "Bearer ${session.authToken}",
                    request = MobileActionRequest(
                        actionType = actionType,
                        payload = enrichedPayload,
                        clientRequestId = requestId
                    )
                )
                if (response.success) {
                    Result.success(true to "Salvo no banco de dados com sucesso!")
                } else {
                    Result.failure(Exception(response.error ?: "Erro ao salvar registro no servidor."))
                }
            } catch (_: Exception) {
                // Salva no Room Database (SQLite local) para sincronizar automaticamente depois
                val payloadJson = payloadAdapter.toJson(enrichedPayload)
                dao.insertPendingAction(
                    PendingSyncActionEntity(
                        clientRequestId = requestId,
                        actionType = actionType,
                        description = description,
                        payloadJson = payloadJson
                    )
                )
                Result.success(
                    false to "Sem sinal: salvo no banco local (Room) e será sincronizado automaticamente!"
                )
            }
        }
    }
    suspend fun clearSessionToken() {
        withContext(Dispatchers.IO) {
            val current = dao.getSessionConfig()
            if (current != null) {
                dao.saveSessionConfig(current.copy(authToken = ""))
            }
        }
    }
}
