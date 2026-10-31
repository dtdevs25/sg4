package br.com.sg4.mobile.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Sg4Purple,
    onPrimary = Color.White,
    primaryContainer = Color.White,
    onPrimaryContainer = Sg4PurpleDark,
    secondary = Sg4Blue,
    onSecondary = Color.White,
    background = Color.White,
    onBackground = Slate900,
    surface = Color.White,
    onSurface = Slate900,
    surfaceVariant = Color.White,
    onSurfaceVariant = Slate900,
    error = Sg4Red,
    onError = Color.White
)

@Composable
fun SG4MobileTheme(
    darkTheme: Boolean = false, // Sempre tema claro para SG4 Mobile
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = LightColors,
        content = content
    )
}

