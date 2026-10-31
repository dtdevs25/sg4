package br.com.sg4.mobile.data

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Handler
import android.os.Looper

class NetworkMonitor(
    private val context: Context,
    private val onStatusChange: (isOnline: Boolean) -> Unit
) {
    private val connectivityManager =
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager

    private val mainHandler = Handler(Looper.getMainLooper())
    private var isRegistered = false

    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            mainHandler.post {
                onStatusChange(true)
            }
        }

        override fun onLost(network: Network) {
            mainHandler.post {
                val stillOnline = checkCurrentOnline()
                onStatusChange(stillOnline)
            }
        }

        override fun onCapabilitiesChanged(
            network: Network,
            networkCapabilities: NetworkCapabilities
        ) {
            val hasInternet = networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            mainHandler.post {
                onStatusChange(hasInternet)
            }
        }
    }

    fun isOnline(): Boolean {
        return checkCurrentOnline()
    }

    private fun checkCurrentOnline(): Boolean {
        val cm = connectivityManager ?: return false
        val active = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(active) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    fun start() {
        if (isRegistered || connectivityManager == null) return
        try {
            val request = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()
            connectivityManager.registerNetworkCallback(request, networkCallback)
            isRegistered = true
            onStatusChange(checkCurrentOnline())
        } catch (_: Exception) {
            onStatusChange(checkCurrentOnline())
        }
    }

    fun stop() {
        if (!isRegistered || connectivityManager == null) return
        try {
            connectivityManager.unregisterNetworkCallback(networkCallback)
        } catch (_: Exception) {}
        isRegistered = false
    }
}

