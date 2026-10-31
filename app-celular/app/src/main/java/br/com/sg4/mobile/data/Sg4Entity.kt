package br.com.sg4.mobile.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "session_config")
data class SessionConfigEntity(
    @PrimaryKey val id: Int = 1,
    val baseUrl: String = "https://sg4.ehspro.com.br",
    val authToken: String = "",
    val userId: String = "",
    val userName: String = "",
    val userEmail: String = "",
    val userRole: String = "TST",
    val selectedTecnicoId: String? = null,
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "cached_sync_snapshot")
data class CachedSyncSnapshotEntity(
    @PrimaryKey val key: String = "latest_sync",
    val rawJson: String,
    val syncedAtIso: String,
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "pending_sync_actions")
data class PendingSyncActionEntity(
    @PrimaryKey(autoGenerate = true) val localId: Long = 0,
    val clientRequestId: String,
    val actionType: String,
    val description: String,
    val payloadJson: String,
    val createdAt: Long = System.currentTimeMillis(),
    val synced: Boolean = false
)

