import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import s3Client from '@/lib/s3'
import { auth } from '@/lib/auth'

export const maxDuration = 60

// Cache simples para não baixar o mesmo PDF do MinIO toda requisição
const procedureCache = new Map<string, { data: string; mime: string; ts: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutos

async function fetchProcedure(key: string): Promise<{ data: string; mime: string } | null> {
  const cached = procedureCache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { data: cached.data, mime: cached.mime }
  }

  try {
    const res = await s3Client.send(new GetObjectCommand({ Bucket: 'sg4-km', Key: key }))
    const chunks: Uint8Array[] = []
    for await (const chunk of res.Body as any) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)
    const base64 = buffer.toString('base64')
    const mime = key.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/plain'
    procedureCache.set(key, { data: base64, mime, ts: Date.now() })
    return { data: base64, mime }
  } catch (e) {
    console.error('Erro ao buscar procedimento do MinIO:', e)
    return null
  }
}

export async function POST(req: Request) {
  try {
    // Verificar autenticação
    const session = await auth()
    if (!session?.user) {
      return new Response('Não autorizado', { status: 401 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('GEMINI_API_KEY não configurada')
      return new Response('Chave da API não configurada no servidor', { status: 500 })
    }

    const body = await req.json()
    const { messages, procedureKey } = body

    // Configurar o provider com a chave correta do projeto
    const googleProvider = createGoogleGenerativeAI({ apiKey })

    // Montar o prompt de sistema
    let systemPrompt = `Você é o Revisor IA, um assistente especialista da empresa SG4.
Você ajuda técnicos de segurança do trabalho a revisarem seus documentos (APRs, Investigações de Acidentes, Relatórios, etc).
Seja detalhado, profissional e aponte melhorias concretas com base nos procedimentos da empresa.
Responda sempre em português do Brasil.`

    // Construir mensagens finais
    let finalMessages = [...messages]

    // Se há um procedimento selecionado, injetá-lo como contexto no início da conversa
    if (procedureKey && !messages.some((m: any) => m._procedureInjected)) {
      const proc = await fetchProcedure(procedureKey)
      if (proc) {
        // Injeta o procedimento como primeira mensagem do usuário + resposta do assistente
        finalMessages = [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Aqui está o procedimento oficial da empresa que você deve usar como referência para revisar os documentos:' },
              { type: 'file', data: proc.data, mimeType: proc.mime }
            ]
          },
          {
            role: 'assistant',
            content: 'Entendido. Li o procedimento e agora sou especialista nele. Estou pronto para revisar seus documentos com base neste material. Como posso ajudar?',
          },
          ...messages
        ]
      }
    }

    const result = await streamText({
      model: googleProvider('gemini-1.5-pro-latest'),
      system: systemPrompt,
      messages: finalMessages,
    })

    return result.toDataStreamResponse()
  } catch (error: any) {
    console.error('Erro na rota de chat:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao processar requisição' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
