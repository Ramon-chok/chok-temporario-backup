import { buscarGerencias } from '@/lib/excel-service'
import { NextResponse } from 'next/server'
import { getSessionUserFromRequest } from '@/lib/session'

/**
 * GET /api/gerencias/lista
 * Retorna lista de gerências disponíveis na planilha
 */
export async function GET() {
  try {
    const sessionUser = await getSessionUserFromRequest()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (sessionUser.perfil !== 'gerencia' && sessionUser.perfil !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    console.log('[API] Buscando lista de gerências')

    const gerencias = await buscarGerencias()

    if (!gerencias) {
      return NextResponse.json(
        { error: 'Erro ao buscar lista de gerências' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      gerencias,
      count: gerencias.length,
    })
  } catch (error) {
    console.error('[API] Erro ao buscar lista de gerências:', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar gerências' },
      { status: 500 }
    )
  }
}
