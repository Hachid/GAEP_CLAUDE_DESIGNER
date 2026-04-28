import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface IARequestBody {
  gaepId: string
  data: string
  horario: string
  categoria: string
  atividade: string
  equipe: string[]
  descricaoBruta: string
}

interface OpenAIResponse {
  choices: Array<{ message: { content: string } }>
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as IARequestBody
  const { gaepId, data, horario, categoria, atividade, equipe, descricaoBruta } = body

  const admin = createAdminClient()
  const { data: configData, error } = await admin
    .from('config_ia')
    .select('modelo, temperatura, prompt')
    .eq('gaep_id', gaepId)
    .single()

  if (error || !configData) {
    return NextResponse.json({ error: 'Config IA não encontrada.' }, { status: 404 })
  }

  const userPrompt =
    `Data: ${data}\n` +
    `Horário: ${horario}\n` +
    `Categoria: ${categoria}\n` +
    `Atividade: ${atividade}\n` +
    `Equipe: ${equipe.join(', ')}\n\n` +
    `Descrição bruta: ${descricaoBruta}`

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: configData.modelo as string,
      temperature: Number(configData.temperatura),
      messages: [
        { role: 'system', content: configData.prompt as string },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!openaiRes.ok) {
    const errText = await openaiRes.text()
    console.error('OpenAI error:', errText)
    return NextResponse.json({ error: 'Falha ao chamar a IA.' }, { status: 502 })
  }

  const json = (await openaiRes.json()) as OpenAIResponse
  const descricaoRevisada = json.choices[0]?.message?.content?.trim() ?? ''

  return NextResponse.json({ descricaoRevisada })
}
