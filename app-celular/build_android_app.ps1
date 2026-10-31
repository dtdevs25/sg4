# ==============================================================================
# SG4 SST Mobile - Gerador Portátil de APK (Sem Android Studio)
# Configura OpenJDK 17, Android SDK Command-Line Tools e Gradle 9.3.1 em D:\android_tools
# Cria a chave de assinatura (my-upload-key.jks) e gera o APK (assembleRelease)
# ==============================================================================

$ErrorActionPreference = "Stop"

$ToolsRoot  = "D:\android_tools"
$JdkDir     = "$ToolsRoot\jdk-17"
$SdkDir     = "$ToolsRoot\android-sdk"
$GradleDir  = "$ToolsRoot\gradle-9.3.1"
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRootDir = Split-Path -Parent $ProjectDir

Write-Host "==========================================================" -ForegroundColor Magenta
Write-Host "   SG4 SST MOBILE - COMPILADOR PORTATIL DE APK ANDROID    " -ForegroundColor Magenta
Write-Host "==========================================================" -ForegroundColor Magenta

if (-not (Test-Path $ToolsRoot)) {
    New-Item -ItemType Directory -Force -Path $ToolsRoot | Out-Null
}

# 1. Verificar / Baixar OpenJDK 17
$JavaExe = Get-ChildItem -Path $JdkDir -Filter "java.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $JavaExe) {
    Write-Host "[1/5] Baixando OpenJDK 17 portatil em $JdkDir..." -ForegroundColor Cyan
    $JdkZip = "$ToolsRoot\openjdk17.zip"
    $JdkUrl = "https://aka.ms/download-jdk/microsoft-jdk-17-windows-x64.zip"
    Invoke-WebRequest -Uri $JdkUrl -OutFile $JdkZip
    Expand-Archive -Path $JdkZip -DestinationPath $JdkDir -Force
    Remove-Item $JdkZip -Force
    $JavaExe = Get-ChildItem -Path $JdkDir -Filter "java.exe" -Recurse | Select-Object -First 1
}
$JavaHome = Split-Path -Parent (Split-Path -Parent $JavaExe.FullName)
$env:JAVA_HOME = $JavaHome
Write-Host "[OK] JAVA_HOME = $env:JAVA_HOME" -ForegroundColor Green

# 2. Verificar / Baixar Android SDK Command-Line Tools
$SdkManagerBat = "$SdkDir\cmdline-tools\latest\bin\sdkmanager.bat"
if (-not (Test-Path $SdkManagerBat)) {
    Write-Host "[2/5] Baixando Android SDK Command-Line Tools em $SdkDir..." -ForegroundColor Cyan
    $CmdZip = "$ToolsRoot\cmdline-tools.zip"
    $CmdUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    Invoke-WebRequest -Uri $CmdUrl -OutFile $CmdZip
    $TempCmd = "$ToolsRoot\temp_cmdline"
    Expand-Archive -Path $CmdZip -DestinationPath $TempCmd -Force
    New-Item -ItemType Directory -Force -Path "$SdkDir\cmdline-tools\latest" | Out-Null
    Copy-Item -Path "$TempCmd\cmdline-tools\*" -Destination "$SdkDir\cmdline-tools\latest" -Recurse -Force
    Remove-Item $CmdZip -Force
    Remove-Item $TempCmd -Recurse -Force
}
$env:ANDROID_HOME = $SdkDir
$env:ANDROID_SDK_ROOT = $SdkDir

if (-not (Test-Path "$SdkDir\platforms\android-36")) {
    Write-Host "[2.1/5] Instalando pacotes do Android SDK (platform-tools, build-tools;35.0.0, platforms;android-36)..." -ForegroundColor Cyan
    cmd /c "echo y | `"$SdkManagerBat`" --sdk_root=`"$SdkDir`" `"platform-tools`" `"platforms;android-36`" `"build-tools;35.0.0`""
}

# 3. Verificar / Baixar Gradle
$GradleBat = Get-ChildItem -Path $GradleDir -Filter "gradle.bat" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $GradleBat) {
    Write-Host "[3/5] Baixando Gradle em $GradleDir..." -ForegroundColor Cyan
    $GradleZip = "$ToolsRoot\gradle.zip"
    $GradleUrl = "https://services.gradle.org/distributions/gradle-8.11.1-bin.zip"
    Invoke-WebRequest -Uri $GradleUrl -OutFile $GradleZip
    Expand-Archive -Path $GradleZip -DestinationPath $GradleDir -Force
    Remove-Item $GradleZip -Force
    $GradleBat = Get-ChildItem -Path $GradleDir -Filter "gradle.bat" -Recurse | Select-Object -First 1
}

# 4. Criar Keystore de Assinatura (my-upload-key.jks)
$KeystorePath = "$ProjectDir\my-upload-key.jks"
$KeytoolExe = "$JavaHome\bin\keytool.exe"
if (-not (Test-Path $KeystorePath)) {
    Write-Host "[4/5] Gerando chave de assinatura (my-upload-key.jks)..." -ForegroundColor Cyan
    & $KeytoolExe -genkeypair -v `
        -keystore $KeystorePath `
        -alias "sg4-key-alias" `
        -keyalg RSA -keysize 2048 -validity 10000 `
        -storepass "sg4mobile123" -keypass "sg4mobile123" `
        -dname "CN=SG4 SST Mobile, OU=Engenharia, O=SG4, L=Sao Paulo, ST=SP, C=BR"
}

# Escrever local.properties apontando para o Android SDK
$EscapedSdk = $SdkDir.Replace("\", "\\")
Set-Content -Path "$ProjectDir\local.properties" -Value "sdk.dir=$EscapedSdk" -Encoding UTF8

# 5. Compilar APK Release Assinado
Write-Host "[5/5] Compilando APK Release Assinado (assembleRelease)..." -ForegroundColor Cyan
Push-Location $ProjectDir
try {
    & $GradleBat.FullName assembleRelease --no-daemon
} finally {
    Pop-Location
}

$ReleaseApk = Get-ChildItem -Path "$ProjectDir\app\build\outputs\apk\release" -Filter "*.apk" -Recurse | Select-Object -First 1
if ($ReleaseApk) {
    $DestAppCelular = "$ProjectDir\sg4-mobile.apk"
    $DestPublicWeb  = "$WebRootDir\public\sg4-mobile.apk"
    Copy-Item -Path $ReleaseApk.FullName -Destination $DestAppCelular -Force
    Copy-Item -Path $ReleaseApk.FullName -Destination $DestPublicWeb -Force
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " SUCESSO! APK GERADO E PUBLICADO NO SISTEMA WEB:" -ForegroundColor Green
    Write-Host " -> $DestAppCelular" -ForegroundColor Yellow
    Write-Host " -> $DestPublicWeb" -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    Write-Error "Nao foi possivel localizar o APK gerado em app/build/outputs/apk/release."
}

