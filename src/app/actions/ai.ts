'use server'

export async function optimizeTextWithAI(text: string) {
  try {
    if (!text || text.trim().length === 0) {
      return { success: false, error: 'Texto vazio' }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return { success: false, error: 'Chave da API do Gemini não configurada.' }
    }

    const prompt = `Você é um assistente especialista em redação e segurança do trabalho.
Sua tarefa é corrigir e aprimorar o seguinte relato de atividade preenchido por um técnico.
Siga estas regras estritamente:
1. Corrija erros ortográficos e gramaticais do português.
2. Melhore a clareza, a coesão e a objetividade (português impecável).
3. Mantenha os termos técnicos, os locais e as informações exatas relatadas.
4. Não adicione informações inventadas, não faça comentários extras, retorne APENAS o texto corrigido.
5. O texto deve ser profissional e adequado para um relatório gerencial.

Relato original:
"${text}"`

    // URL usando a API REST oficial do Gemini 1.5 Flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Erro Gemini REST:', data)
      // Tenta extrair a mensagem de erro direto do payload do Google
      const errMsg = data?.error?.message || `Erro da API: ${response.status} ${response.statusText}`
      return { success: false, error: errMsg }
    }

    const correctedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const cleanText = correctedText.replace(/^["']|["']$/g, '').trim()

    if (!cleanText) {
      return { success: false, error: 'A IA não retornou um texto válido.' }
    }

    return { success: true, text: cleanText }
  } catch (error: any) {
    console.error('Erro na integração com Gemini:', error)
    return { success: false, error: error.message || 'Erro ao conectar com a inteligência artificial.' }
  }
}
