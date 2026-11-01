package br.com.sg4.mobile.ui.screens

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

/**
 * GPS OBRIGATÓRIO para KM (início/fim), Abastecimento e Manutenção.
 * - Exige permissão de localização e GPS/localização do aparelho ligados.
 * - Busca uma posição NOVA no momento do lançamento (não usa posição antiga).
 * - Recusa localização falsa (apps de "Fake GPS" / mock location).
 * Funciona offline: o GPS não depende de internet.
 */
sealed class GpsResultado {
    data class Ok(val lat: Double, val lng: Double) : GpsResultado()
    data class Falha(val motivo: GpsFalha, val mensagem: String) : GpsResultado()
}

enum class GpsFalha { SEM_PERMISSAO, GPS_DESLIGADO, SEM_SINAL, LOCALIZACAO_FALSA }

private const val PRECISAO_ACEITA_METROS = 100f
private const val IDADE_MAXIMA_FALLBACK_MS = 2 * 60 * 1000L

fun temPermissaoLocalizacao(context: Context): Boolean {
    val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
    val coarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    return fine || coarse
}

private fun isLocalizacaoFalsa(loc: Location): Boolean {
    return if (Build.VERSION.SDK_INT >= 31) {
        loc.isMock
    } else {
        @Suppress("DEPRECATION")
        loc.isFromMockProvider
    }
}

private fun idadeMs(loc: Location): Long =
    (SystemClock.elapsedRealtimeNanos() - loc.elapsedRealtimeNanos) / 1_000_000L

private fun coordenadaValida(lat: Double, lng: Double): Boolean =
    !lat.isNaN() && !lng.isNaN() && lat in -90.0..90.0 && lng in -180.0..180.0 && !(lat == 0.0 && lng == 0.0)

@SuppressLint("MissingPermission")
suspend fun obterLocalizacaoObrigatoria(context: Context, timeoutMs: Long = 20_000L): GpsResultado {
    if (!temPermissaoLocalizacao(context)) {
        return GpsResultado.Falha(
            GpsFalha.SEM_PERMISSAO,
            "O SG4 precisa da permissão de localização para registrar KM, abastecimento e manutenção. Toque em \"Permitir\" e escolha \"Durante o uso do app\"."
        )
    }
    val lm = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        ?: return GpsResultado.Falha(GpsFalha.SEM_SINAL, "Não foi possível acessar o GPS deste aparelho.")

    val providers = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
        .filter { runCatching { lm.isProviderEnabled(it) }.getOrDefault(false) }
    if (providers.isEmpty()) {
        return GpsResultado.Falha(
            GpsFalha.GPS_DESLIGADO,
            "A localização (GPS) do celular está desligada. Ative a localização para continuar com o lançamento."
        )
    }

    var melhor: Location? = null
    var falsaDetectada = false
    var listener: LocationListener? = null

    val boa: Location? = try {
        withTimeoutOrNull(timeoutMs) {
            suspendCancellableCoroutine { cont ->
                val l = object : LocationListener {
                    override fun onLocationChanged(location: Location) {
                        if (isLocalizacaoFalsa(location)) {
                            falsaDetectada = true
                            return
                        }
                        val atual = melhor
                        if (atual == null || (location.hasAccuracy() && (!atual.hasAccuracy() || location.accuracy < atual.accuracy))) {
                            melhor = location
                        }
                        val precisa = !location.hasAccuracy() || location.accuracy <= PRECISAO_ACEITA_METROS
                        if (precisa && cont.isActive) cont.resume(location)
                    }
                    override fun onProviderEnabled(provider: String) {}
                    override fun onProviderDisabled(provider: String) {}
                    @Deprecated("Deprecated in Java")
                    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
                }
                listener = l
                providers.forEach { p ->
                    runCatching { lm.requestLocationUpdates(p, 0L, 0f, l, Looper.getMainLooper()) }
                }
            }
        }
    } finally {
        listener?.let { runCatching { lm.removeUpdates(it) } }
    }

    // Se não chegou fix preciso no tempo: usa o melhor recebido, ou uma posição MUITO recente (até 2 min)
    val loc = boa ?: melhor ?: providers
        .mapNotNull { runCatching { lm.getLastKnownLocation(it) }.getOrNull() }
        .filter { idadeMs(it) <= IDADE_MAXIMA_FALLBACK_MS }
        .maxByOrNull { it.time }

    if (loc == null) {
        if (falsaDetectada) {
            return GpsResultado.Falha(
                GpsFalha.LOCALIZACAO_FALSA,
                "Foi detectada uma localização falsa (app de GPS simulado). Desative qualquer aplicativo de localização falsa para registrar o lançamento."
            )
        }
        return GpsResultado.Falha(
            GpsFalha.SEM_SINAL,
            "Não foi possível obter sua localização GPS. Vá para um local aberto (longe de coberturas) e tente novamente."
        )
    }
    if (isLocalizacaoFalsa(loc)) {
        return GpsResultado.Falha(
            GpsFalha.LOCALIZACAO_FALSA,
            "Foi detectada uma localização falsa (app de GPS simulado). Desative qualquer aplicativo de localização falsa para registrar o lançamento."
        )
    }
    if (!coordenadaValida(loc.latitude, loc.longitude)) {
        return GpsResultado.Falha(GpsFalha.SEM_SINAL, "A localização recebida é inválida. Tente novamente em alguns segundos.")
    }
    return GpsResultado.Ok(loc.latitude, loc.longitude)
}

fun abrirConfiguracoesLocalizacao(context: Context) {
    runCatching {
        context.startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}

fun abrirConfiguracoesDoApp(context: Context) {
    runCatching {
        context.startActivity(
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
    }
}

/** Overlay "Obtendo localização" + diálogo de erro de GPS obrigatório. */
@Composable
fun GpsObrigatorioDialogs(
    context: Context,
    obtendo: Boolean,
    falha: GpsResultado.Falha?,
    onDismissFalha: () -> Unit,
    onPedirPermissao: () -> Unit
) {
    if (obtendo) {
        Dialog(
            onDismissRequest = {},
            properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)
        ) {
            Column(
                modifier = Modifier
                    .background(Color.White, RoundedCornerShape(16.dp))
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                CircularProgressIndicator(color = Color(0xFF660099))
                Text("Obtendo localização GPS...", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF1E293B))
                Text(
                    "A localização é obrigatória para este lançamento.",
                    fontSize = 12.sp, color = Color(0xFF64748B), textAlign = TextAlign.Center
                )
            }
        }
    }

    if (falha != null) {
        AlertDialog(
            onDismissRequest = onDismissFalha,
            icon = { Icon(Icons.Filled.LocationOff, contentDescription = null, tint = Color(0xFFDC2626), modifier = Modifier.size(32.dp)) },
            title = { Text("Localização obrigatória", fontWeight = FontWeight.Bold) },
            text = { Text(falha.mensagem, fontSize = 14.sp) },
            confirmButton = {
                when (falha.motivo) {
                    GpsFalha.SEM_PERMISSAO -> Button(
                        onClick = { onDismissFalha(); onPedirPermissao() },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF660099))
                    ) { Text("Permitir", color = Color.White, fontWeight = FontWeight.Bold) }
                    GpsFalha.GPS_DESLIGADO -> Button(
                        onClick = { onDismissFalha(); abrirConfiguracoesLocalizacao(context) },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF660099))
                    ) { Text("Ativar localização", color = Color.White, fontWeight = FontWeight.Bold) }
                    else -> Button(
                        onClick = onDismissFalha,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF660099))
                    ) { Text("Entendi", color = Color.White, fontWeight = FontWeight.Bold) }
                }
            },
            dismissButton = {
                if (falha.motivo == GpsFalha.SEM_PERMISSAO) {
                    TextButton(onClick = { onDismissFalha(); abrirConfiguracoesDoApp(context) }) {
                        Text("Abrir configurações", color = Color(0xFF475569))
                    }
                } else {
                    TextButton(onClick = onDismissFalha) { Text("Fechar", color = Color(0xFF475569)) }
                }
            }
        )
    }
}

