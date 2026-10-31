package br.com.sg4.mobile.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface Sg4Dao {
    @Query("SELECT * FROM session_config WHERE id = 1 LIMIT 1")
    suspend fun getSessionConfig(): SessionConfigEntity?

    @Query("SELECT * FROM session_config WHERE id = 1 LIMIT 1")
    fun observeSessionConfig(): Flow<SessionConfigEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveSessionConfig(config: SessionConfigEntity)

    @Query("DELETE FROM session_config")
    suspend fun clearSessionConfig()

    @Query("SELECT * FROM cached_sync_snapshot WHERE `key` = 'latest_sync' LIMIT 1")
    suspend fun getLatestSnapshot(): CachedSyncSnapshotEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveSnapshot(snapshot: CachedSyncSnapshotEntity)

    @Query("SELECT * FROM pending_sync_actions WHERE synced = 0 ORDER BY createdAt ASC")
    suspend fun getPendingActions(): List<PendingSyncActionEntity>

    @Query("SELECT COUNT(*) FROM pending_sync_actions WHERE synced = 0")
    fun observePendingCount(): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPendingAction(action: PendingSyncActionEntity): Long

    @Query("UPDATE pending_sync_actions SET synced = 1 WHERE localId = :localId")
    suspend fun markActionSynced(localId: Long)

    @Query("DELETE FROM pending_sync_actions WHERE synced = 1")
    suspend fun deleteSyncedActions()
}

