import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const CANDIDATE_APK_PATHS = [
  path.join(process.cwd(), 'app-celular', 'sg4-mobile.apk'),
  path.join(process.cwd(), 'public', 'sg4-mobile.apk'),
  path.join(
    process.cwd(),
    'app-celular',
    'app',
    'build',
    'outputs',
    'apk',
    'release',
    'app-release.apk'
  ),
]

function findExistingApkPath(): { filePath: string; stat: fs.Stats } | null {
  for (const candidate of CANDIDATE_APK_PATHS) {
    try {
      if (fs.existsSync(candidate)) {
        const stat = fs.statSync(candidate)
        if (stat.isFile() && stat.size > 0) {
          return { filePath: candidate, stat }
        }
      }
    } catch {
      // Ignore read errors
    }
  }
  return null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const isInfoRequest = searchParams.get('info') === '1'

  const found = findExistingApkPath()

  if (isInfoRequest) {
    return NextResponse.json({
      available: !!found,
      version: '2.6.0',
      packageName: 'br.com.sg4.mobile',
      minSdk: 24,
      targetSdk: 36,
      kotlinVersion: '2.2.10',
      fileName: 'SG4-Mobile-v2.6.0.apk',
      sizeBytes: found ? found.stat.size : 0,
      updatedAt: found ? found.stat.mtime.toISOString() : null,
      path: found ? path.relative(process.cwd(), found.filePath) : 'app-celular/sg4-mobile.apk',
    })
  }

  if (!found) {
    return NextResponse.json(
      {
        error:
          'O arquivo APK ainda não foi compilado. Execute app-celular/build_android_app.ps1 ou app-celular/compilar_apk.bat para gerar o instalador assinado.',
      },
      { status: 404 }
    )
  }

  const fileBuffer = fs.readFileSync(found.filePath)
  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="SG4-Mobile.apk"',
      'Content-Length': String(found.stat.size),
      'Cache-Control': 'no-store',
    },
  })
}

