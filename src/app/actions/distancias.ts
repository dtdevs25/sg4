'use server'

export async function calcularDistanciasBase(baseFixa: any, outrasBases: any[]) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return { success: false, error: 'Chave do Gemini não configurada' }
    }
    
    if (!baseFixa || outrasBases.length === 0) {
      return { success: true, distancias: [] }
    }

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

    // Descobre dinamicamente os modelos disponíveis para esta chave de API
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    const listRes = await fetch(listUrl)
    const listData = await listRes.json()

    if (!listRes.ok) {
      return { success: false, error: listData?.error?.message || 'Falha ao validar a chave da API.' }
    }

    // Filtra modelos que suportam geração de texto e contêm 'gemini'
    const availableModels = listData.models || []
    const compatibleModels = availableModels.filter((m: any) => 
      m.supportedGenerationMethods?.includes('generateContent') && 
      m.name.includes('gemini')
    )

    if (compatibleModels.length === 0) {
      return { success: false, error: 'Sua chave de API não possui acesso a modelos Gemini de texto.' }
    }

    // Prefere o 1.5 flash, senão pega o primeiro disponível
    let selectedModelName = compatibleModels[0].name
    const flashModel = compatibleModels.find((m: any) => m.name.includes('1.5-flash'))
    if (flashModel) selectedModelName = flashModel.name

    // selectedModelName já vem no formato "models/gemini-..."
    const url = `https://generativelanguage.googleapis.com/v1beta/${selectedModelName}:generateContent?key=${apiKey}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
        }
      })
    })

    const responseData = await response.json()

    if (!response.ok) {
      const errMsg = responseData?.error?.message || `Erro da API: ${response.status}`
      return { success: false, error: errMsg }
    }

    let text = responseData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    // Limpar o markdown caso o modelo tenha retornado
    text = text.replace(/```json/g, '').replace(/```/g, '').trim()

    let data;
    try {
      data = JSON.parse(text)
    } catch (e) {
      console.error("Falha ao parsear JSON:", text)
      return { success: false, error: 'Falha ao processar o formato de resposta da Inteligência Artificial.' }
    }
    
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
  } catch (error: any) {
    console.error('Erro ao calcular distâncias:', error)
    return { success: false, error: 'Falha ao conectar com inteligência artificial para cálculo.' }
  }
}
