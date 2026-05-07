import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionOrThrow } from '@/lib/auth'
import { isRateLimited } from '@/lib/rateLimit'

/** Corpo da requisição para a rota de revisão por IA. */
interface IARequestBody {
  gaepId: string
  data: string
  horario: string
  categoria: string
  atividade: string
  equipe: string[]
  descricaoBruta: string
}

/** Formato esperado de retorno da API OpenAI. */
interface OpenAIResponse {
  choices: Array<{
    message: { content: string }
    finish_reason: string
  }>
  error?: { message: string }
}

/**
 * POST /api/ia
 *
 * Envia a descrição bruta para o GPT-4o usando o prompt configurado
 * na tabela `config_ia` do GAEP. Retorna o texto revisado.
 *
 * Requer sessão ativa — rejeita com 401 se o usuário não estiver autenticado.
 */
export async function POST(req: NextRequest) {
  // ── 1. Validar sessão ─────────────────────────────────────────
  let userId: string
  try {
    const user = await getSessionOrThrow()
    userId = user.id
  } catch {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  // ── 1b. Rate limit: máx 10 chamadas/hora por usuário ─────────
  if (isRateLimited(`ia:${userId}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Limite de 10 revisões por hora atingido. Tente mais tarde.' },
      { status: 429 }
    )
  }

  // ── 2. Validar tamanho e parsear body ────────────────────────
  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > 50_000) {
    return NextResponse.json({ error: 'Requisição muito grande.' }, { status: 413 })
  }

  let body: IARequestBody
  try {
    body = (await req.json()) as IARequestBody
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  const { gaepId, data, horario, categoria, atividade, equipe, descricaoBruta } = body

  if (!descricaoBruta?.trim()) {
    return NextResponse.json({ error: 'Descrição bruta não pode estar vazia.' }, { status: 400 })
  }
  if (descricaoBruta.length > 5_000) {
    return NextResponse.json({ error: 'Descrição muito longa. Máximo: 5.000 caracteres.' }, { status: 400 })
  }
  if (!Array.isArray(equipe)) {
    return NextResponse.json({ error: 'Campo equipe inválido.' }, { status: 400 })
  }

  // ── 3. Buscar config_ia do GAEP ───────────────────────────────
  const admin = createAdminClient()
  const { data: configData, error: configError } = await admin
    .from('config_ia')
    .select('modelo, temperatura, prompt')
    .eq('gaep_id', gaepId)
    .single()

  if (configError || !configData) {
    console.error('[/api/ia] Config IA não encontrada para gaepId:', gaepId, configError)
    return NextResponse.json(
      { error: 'Configuração de IA não encontrada. Contate o administrador.' },
      { status: 404 }
    )
  }

  // ── 4. Montar prompt e chamar OpenAI ──────────────────────────
  // Formata data de YYYY-MM-DD para DD/MM/AAAA
  const dataFormatada = data
    ? data.split('-').reverse().join('/')
    : 'data não informada'

  const plural = equipe.length !== 1
  const sujeito = plural
    ? `os operadores ${equipe.length > 0 ? equipe.join(', ') : ''}`
    : `o operador ${equipe[0] ?? ''}`
  const verbo = plural ? 'realizaram' : 'realizou'

  // Converte o nome da categoria (infinitivo) para substantivo concordado
  function nominarCategoria(cat: string): { artigo: string; nome: string } {
    switch (cat.toUpperCase().trim()) {
      case 'OPERAR':   return { artigo: 'a', nome: 'operação' }
      case 'TREINAR':  return { artigo: 'o', nome: 'treinamento' }
      case 'INSTRUIR': return { artigo: 'a', nome: 'instrução' }
      default:         return { artigo: 'a', nome: cat.toLowerCase() }
    }
  }

  let catStr: string
  if (categoria) {
    const { artigo, nome } = nominarCategoria(categoria)
    catStr = atividade ? `${artigo} ${nome} de ${atividade}` : `${artigo} ${nome}`
  } else {
    catStr = atividade ? `a atividade de ${atividade}` : 'a atividade'
  }

  const abertura = `No dia ${dataFormatada} no período de ${horario}, ${sujeito}, ${verbo} ${catStr}, e `

  const userPrompt = [
    `Escreva o relatório operacional OBRIGATORIAMENTE iniciando com a seguinte frase (não altere nem omita nenhuma palavra desta abertura):`,
    ``,
    `"${abertura}"`,
    ``,
    `Em seguida, incorpore o texto abaixo ao relatório: corrija o português (ortografia, concordância nominal e verbal, semântica), torne-o mais claro e profissional, sem inventar fatos e sem deixá-lo excessivamente longo.`,
    ``,
    `Texto do operador:`,
    `"${descricaoBruta}"`,
    ``,
    `Retorne APENAS o texto completo do relatório. Sem títulos, sem comentários, sem formatação adicional.`,
  ].join('\n')

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    console.error('[/api/ia] OPENAI_API_KEY não definida.')
    return NextResponse.json(
      { error: 'Serviço de IA temporariamente indisponível.' },
      { status: 503 }
    )
  }

  let openaiRes: Response
  try {
    openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(45_000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: (configData.modelo as string) || 'gpt-4o',
        temperature: Number(configData.temperatura ?? 0.3),
        messages: [
          { role: 'system', content: configData.prompt as string },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1024,
      }),
    })
  } catch (fetchErr) {
    const isTimeout = fetchErr instanceof Error && fetchErr.name === 'TimeoutError'
    console.error('[/api/ia] Falha ao chamar OpenAI:', fetchErr)
    return NextResponse.json(
      { error: isTimeout ? 'A IA demorou demais para responder. Tente novamente.' : 'Falha de conexão com o serviço de IA.' },
      { status: 502 }
    )
  }

  // ── 5. Tratar resposta da OpenAI ──────────────────────────────
  let json: OpenAIResponse
  try {
    json = (await openaiRes.json()) as OpenAIResponse
  } catch {
    return NextResponse.json({ error: 'Resposta inválida da IA.' }, { status: 502 })
  }

  if (!openaiRes.ok || json.error) {
    console.error('[/api/ia] OpenAI retornou erro:', json.error)
    return NextResponse.json(
      { error: json.error?.message ?? 'A IA retornou um erro inesperado.' },
      { status: 502 }
    )
  }

  const descricaoRevisada = json.choices[0]?.message?.content?.trim()
  if (!descricaoRevisada) {
    return NextResponse.json(
      { error: 'A IA não retornou conteúdo. Tente novamente.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ descricaoRevisada })
}
