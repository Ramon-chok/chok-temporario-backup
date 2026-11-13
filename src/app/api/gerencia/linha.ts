import { NextResponse } from 'next/server'
import { buscarLinhaGerencia } from '@/lib/excel-service'
import { getSessionUserFromRequest } from '@/lib/session'

export async function GET() {
  const sessionUser = await getSessionUserFromRequest()
  if (!sessionUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (sessionUser.perfil !== 'gerencia' && sessionUser.perfil !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const linha = await buscarLinhaGerencia()
  if (!linha) {
    return NextResponse.json({ error: 'Linha gerencia não encontrada' }, { status: 404 })
  }
  return NextResponse.json(linha)
}
