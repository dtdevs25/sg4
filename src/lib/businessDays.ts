export function getBusinessDaysInMonth(year: number, month: number): number {
  let count = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }
  return count;
}

export function getBusinessDaysPassedInMonth(year: number, month: number, maxDay: number): number {
  let count = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const limit = Math.min(maxDay, daysInMonth);
  for (let i = 1; i <= limit; i++) {
    const d = new Date(year, month, i);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }
  return count;
}

export function getValidMonthsCount(admissao: Date, targetAno: number, targetMes: number): number {
  // Marco zero global: Julho de 2026 (mês 6 em 0-index)
  let validMonths = 0;
  
  let currDate = new Date(2026, 6, 1);
  const endDate = new Date(targetAno, targetMes - 1, 1);
  
  // Normalizar admissão (remover horas)
  const admissaoDate = new Date(admissao);
  admissaoDate.setHours(0,0,0,0);

  while (currDate <= endDate) {
    const ano = currDate.getFullYear();
    const mes = currDate.getMonth();
    
    // Descobrir qual é o 1º dia útil deste mês
    let firstBusinessDay = new Date(ano, mes, 1);
    for(let i=1; i<=7; i++) {
        let d = new Date(ano, mes, i);
        if(d.getDay() !== 0 && d.getDay() !== 6) {
           firstBusinessDay = d;
           break;
        }
    }
    
    // Se a admissão for ANTES ou NO MESMO DIA do 1º dia útil, o mês é válido para receber verba
    if (admissaoDate <= firstBusinessDay) {
        validMonths++;
    }
    
    currDate.setMonth(currDate.getMonth() + 1);
  }
  
  return validMonths;
}

export function isQuintoDiaUtil(dataObj = new Date()) {
  const ano = dataObj.getFullYear()
  const mes = dataObj.getMonth()
  let diasUteis = 0
  let diaIteracao = 1

  while (diaIteracao <= 31) {
    const d = new Date(ano, mes, diaIteracao)
    if (d.getMonth() !== mes) break 
    
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    if (!isWeekend) {
      diasUteis++
      if (diasUteis === 5) {
        return dataObj.getDate() === diaIteracao
      }
    }
    diaIteracao++
  }
  return false
}
