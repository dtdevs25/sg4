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

    suspend fun getSession(): SessionConfigEntity {
        return withContext(Dispatchers.IO) {
            dao.getSessionConfig() ?: SessionConfigEntity()
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
                val api = Sg4ApiService.create(baseUrl)
                val response = api.login(LoginRequest(email.trim(), password))
                if (response.success && !response.token.isNullOrBlank() && response.user != null) {
                    dao.saveSessionConfig(
                        SessionConfigEntity(
                            id = 1,
                            baseUrl = baseUrl.trim(),
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
                    Result.failure(Exception(response.error ?: "Credenciais inválidas."))
                }
            } catch (e: Exception) {
                Result.failure(Exception("Falha de conexão com o servidor ($baseUrl): ${e.localizedMessage}"))
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

                // 2. Busca o pacote atualizado do PostgreSQL
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
                    if (overrideTecnicoId != null) {
                        dao.saveSessionConfig(session.copy(selectedTecnicoId = overrideTecnicoId))
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
            } catch (networkError: Exception) {
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
}

