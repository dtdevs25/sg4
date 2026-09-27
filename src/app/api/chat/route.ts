import { google } from '@ai-sdk/google'
import { streamText } from 'ai'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import s3Client from '@/lib/s3'

export const maxDuration = 60 // Allow up to 60 seconds

// Cache for procedures to avoid downloading from S3 on every message
const proceduresCache = new Map<string, string>()

async function getProcedureText(procedureKey: string): Promise<string> {
  if (!procedureKey) return ''
  
  if (proceduresCache.has(procedureKey)) {
    return proceduresCache.get(procedureKey)!
  }

  try {
    const command = new GetObjectCommand({
      Bucket: 'sg4-km',
      Key: procedureKey
    })
    
    const response = await s3Client.send(command)
    const stream = response.Body as any
    const chunks = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    
    // Convert to base64 or extract text?
    // Since Gemini supports PDF processing directly via the File API or base64 inline data for some models,
    // actually passing a raw PDF base64 as text prompt doesn't work well unless it's sent as a multimodal part.
    // For now, if we assume it's text/markdown, we convert to string. If it's PDF, we need to pass it as an attachment.
    
    // We will return base64 and mime type
    const mimeType = procedureKey.endsWith('.pdf') ? 'application/pdf' : 'text/plain'
    const base64 = buffer.toString('base64')
    
    const dataUrl = `data:${mimeType};base64,${base64}`
    proceduresCache.set(procedureKey, dataUrl)
    return dataUrl
  } catch (e) {
    console.error('Error fetching procedure from MinIO:', e)
    return ''
  }
}

export async function POST(req: Request) {
  try {
    const { messages, procedureKey } = await req.json()
    
    let systemPrompt = `Você é um Assistente Especialista e Revisor de Documentos da empresa SG4.
Seu objetivo é ajudar os técnicos a revisarem e melhorarem seus documentos (como APRs, Investigações de Acidentes, etc).
Você deve ser extremamente educado, profissional e detalhista.`

    // If a procedure is selected, we could either inject text or handle it as an attachment
    // But since Vercel AI SDK lets us put base64 PDFs in the user message, we will prepend a system message or inject it
    // Note: Gemini 1.5 Pro natively supports reading PDFs passed as Data URLs in the messages array.

    let finalMessages = [...messages]

    if (procedureKey) {
       const procedureDataUrl = await getProcedureText(procedureKey)
       if (procedureDataUrl) {
          systemPrompt += `\n\nVocê é um especialista estrito no procedimento fornecido pelo usuário. Avalie tudo com base nele.`
          
          // Inject the procedure as a "system" level document in the first message
          finalMessages = [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Aqui está o procedimento oficial da empresa que você deve seguir e ser o especialista:' },
                { type: 'file', data: procedureDataUrl.split(',')[1], mimeType: procedureDataUrl.split(';')[0].split(':')[1] }
              ]
            },
            {
              role: 'assistant',
              content: 'Entendido. Eu li o procedimento e agora sou o especialista nele. Como posso ajudar com seus documentos hoje?'
            },
            ...messages
          ]
       }
    }

    const result = await streamText({
      model: google('models/gemini-1.5-pro-latest'),
      system: systemPrompt,
      messages: finalMessages,
    })

    return result.toDataStreamResponse()
  } catch (error: any) {
    console.error('Chat API Error:', error)
    return new Response(error.message || 'Error processing request', { status: 500 })
  }
}
