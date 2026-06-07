'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

export async function optimizeTextWithAI(text: string) {
  try {
    if (!text || text.trim().length === 0) {
      return { success: false, error: 'Texto vazio' }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return { success: false, error: 'Chave da API do Gemini não configurada.' }
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

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

    const result = await model.generateContent(prompt)
    const response = await result.response
    const correctedText = response.text().trim()

    // Caso a IA coloque aspas no começo e fim, vamos limpar:
    const cleanText = correctedText.replace(/^["']|["']$/g, '').trim()

    return { success: true, text: cleanText }
  } catch (error: any) {
    console.error('Erro na integração com Gemini:', error)
    return { success: false, error: 'Erro ao conectar com a inteligência artificial.' }
  }
}
