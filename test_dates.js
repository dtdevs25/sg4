const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function parseDateToJsDate(dateStr) {
  if (!dateStr) return null
  const str = String(dateStr).trim()
  if (!str) return null

  const num = Number(str)
  if (!isNaN(num) && num > 20000) {
    return new Date(Math.round((num - 25569) * 86400 * 1000))
  }

  const partsDmy = str.split('/')
  if (partsDmy.length === 3) {
    const day = parseInt(partsDmy[0], 10)
    const month = parseInt(partsDmy[1], 10) - 1
    const yearPart = partsDmy[2].trim()
    const spaceIdx = yearPart.indexOf(' ')
    let yearStr = yearPart
    let hour = 0
    let minute = 0
    let second = 0
    if (spaceIdx !== -1) {
      yearStr = yearPart.substring(0, spaceIdx)
      const timePart = yearPart.substring(spaceIdx + 1).trim()
      const timeParts = timePart.split(':')
      if (timeParts.length >= 2) {
        hour = parseInt(timeParts[0], 10)
        minute = parseInt(timeParts[1], 10)
        if (timeParts.length >= 3) {
          second = parseInt(timeParts[2], 10)
        }
      }
    }
    const year = parseInt(yearStr, 10)
    const finalYear = year < 100 ? year + 2000 : year
    if (!isNaN(day) && !isNaN(month) && !isNaN(finalYear) && !isNaN(hour) && !isNaN(minute)) {
      return new Date(finalYear, month, day, hour, minute, second)
    }
  }

  const partsYmd = str.split('-')
  if (partsYmd.length >= 3) {
    const year = parseInt(partsYmd[0], 10)
    const month = parseInt(partsYmd[1], 10) - 1
    const dayPart = partsYmd[2].trim()
    const spaceIdx = dayPart.indexOf(' ')
    let dayStr = dayPart
    let hour = 0
    let minute = 0
    let second = 0
    if (spaceIdx !== -1) {
      dayStr = dayPart.substring(0, spaceIdx)
      const timePart = dayPart.substring(spaceIdx + 1).trim()
      const timeParts = timePart.split(':')
      if (timeParts.length >= 2) {
        hour = parseInt(timeParts[0], 10)
        minute = parseInt(timeParts[1], 10)
        if (timeParts.length >= 3) {
          second = parseInt(timeParts[2], 10)
        }
      }
    }
    const day = parseInt(dayStr, 10)
    if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(hour) && !isNaN(minute)) {
      return new Date(year, month, day, hour, minute, second)
    }
  }
  return null
}

async function run() {
  const data = await prisma.aprArkium.findMany({
    where: { dataAbertura: { not: null }, dataFechamento: { not: null } },
    select: { id: true, dataAbertura: true, dataFechamento: true },
    take: 20
  })

  let sumDelayMs = 0
  let delayCount = 0

  for (const apr of data) {
    console.log(`\nID: ${apr.id}`)
    console.log(`Original Abertura: '${apr.dataAbertura}'`)
    console.log(`Original Fechamento: '${apr.dataFechamento}'`)
    
    const abert = parseDateToJsDate(apr.dataAbertura)
    const fech = parseDateToJsDate(apr.dataFechamento)
    console.log(`Parsed Abertura:`, abert)
    console.log(`Parsed Fechamento:`, fech)

    if (abert && fech) {
      const diffMs = fech.getTime() - abert.getTime()
      if (diffMs >= 0) {
        console.log(`Diff MS: ${diffMs} (${diffMs / 1000} seg)`)
        sumDelayMs += diffMs
        delayCount++
      } else {
        console.log(`Diff is negative: ${diffMs}`)
      }
    } else {
      console.log('Failed to parse one or both dates')
    }
  }

  const avgDelayMs = delayCount > 0 ? sumDelayMs / delayCount : 0
  console.log(`\nAverage Delay MS: ${avgDelayMs}`)
  process.exit(0)
}

run()
