import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function formatarDataBrasilSaoPaulo(valorIso: string) {
  const data = new Date(valorIso)
  if (Number.isNaN(data.getTime())) return null

  const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(data)

  const horaFormatada = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(data)

  return `Última atualização: ${dataFormatada} às ${horaFormatada}`
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('config')
      .select('value')
      .eq('key', 'ultima_atualizacao')
      .maybeSingle()

    if (error) {
      throw error
    }

    const valorIso = data?.value ?? null
    const texto = valorIso ? formatarDataBrasilSaoPaulo(valorIso) : null

    return NextResponse.json({ valorIso, texto })
  } catch (error) {
    console.error('Erro ao buscar config.ultima_atualizacao:', error)
    return NextResponse.json({ valorIso: null, texto: null }, { status: 500 })
  }
}
