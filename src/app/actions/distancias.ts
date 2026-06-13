'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

export async function calcularDistanciasBase(baseFixa: any, outrasBases: any[]) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return { success: false, error: 'Chave do Gemini não configurada' }
    }
    
    if (!baseFixa || outrasBases.length === 0) {
      return { success: true, distancias: [] }
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    const destinoStrings = outrasBases.map((b, i) => 
      `[${i}] ${b.nome} - Endereço: ${b.endereco || 'N/A'} - Cidade: ${b.cidade || 'N/A'}/${b.estado || 'N/A'}`
    ).join('\n')

    const prompt = `Você é um assistente logístico para um aplicativo no Brasil.
Eu tenho uma "Base Fixa" e várias "Bases de Atuação". Quero que você calcule a distância rodoviária aproximada (em KM) e o tempo médio de viagem (em minutos) da Base Fixa para cada uma das Bases de Atuação.

Base Fixa:
${baseFixa.nome} - Endereço: ${baseFixa.endereco || 'N/A'} - Cidade: ${baseFixa.cidade || 'N/A'}/${baseFixa.estado || 'N/A'}

Bases de Atuação:
${destinoStrings}

Retorne os dados SOMENTE em formato JSON válido, onde a chave raiz é "distancias" e o valor é um array de objetos. Cada objeto deve ter:
- "index": o índice numérico da base fornecida.
- "distanciaKm": o valor estimado da distância em quilômetros (apenas número).
- "tempoMinutos": o valor estimado do tempo em minutos (apenas número).
- "detalhes": uma string super curta resumindo a rota (ex: "Pela Rodovia BR-116").

Não inclua formatação de markdown como \`\`\`json no retorno, retorne APENAS o JSON puro.
`
    const result = await model.generateContent(prompt)
    const response = await result.response
    let text = response.text()
    
    // Limpar o markdown caso o modelo tenha retornado
    text = text.replace(/```json/g, '').replace(/```/g, '').trim()

    const data = JSON.parse(text)
    
    // Combinar com o id da base original
    const resultadoMapeado = outrasBases.map((base, i) => {
      const calc = data.distancias?.find((d: any) => d.index === i) || null
      return {
        baseId: base.id,
        distanciaKm: calc ? calc.distanciaKm : null,
        tempoMinutos: calc ? calc.tempoMinutos : null,
        detalhes: calc ? calc.detalhes : null
      }
    })

    return { success: true, data: resultadoMapeado }
  } catch (error) {
    console.error('Erro ao calcular distâncias:', error)
    return { success: false, error: 'Falha ao conectar com inteligência artificial para cálculo.' }
  }
}
