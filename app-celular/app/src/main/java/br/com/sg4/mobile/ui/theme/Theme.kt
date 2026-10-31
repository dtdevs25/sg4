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
    primaryContainer = Sg4PurpleSurface,
    onPrimaryContainer = Sg4PurpleDark,
    secondary = Sg4Blue,
    onSecondary = Color.White,
    background = Slate50,
    onBackground = Slate900,
    surface = Color.White,
    onSurface = Slate800,
    error = Sg4Red,
    onError = Color.White
)

private val DarkColors = darkColorScheme(
    primary = Sg4PurpleLight,
    onPrimary = Slate900,
    primaryContainer = Sg4PurpleDark,
    onPrimaryContainer = Color.White,
    secondary = Sg4Blue,
    onSecondary = Slate900,
    background = Slate900,
    onBackground = Slate100,
    surface = Slate800,
    onSurface = Slate100,
    error = Sg4Red,
    onError = Color.White
)

@Composable
fun SG4MobileTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColors else LightColors
    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}

