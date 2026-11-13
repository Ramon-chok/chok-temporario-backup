import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionUserFromRequest } from '@/lib/session'

type PeriodFilter = 'today' | '7d' | 'this_month' | 'last_month'

interface PageLogRow {
  id: number
  user_id: string | null
  user_email: string | null
  page_path: string
  page_name: string
  session_id: string
  duration_seconds: number
  created_at: string
}

function isAdminIdentity(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase() === 'admin'
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const hasSupabaseConfig = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

function createEmptyAnalytics() {
  return {
    cards: {
      visitsToday: 0,
      visitsMonth: 0,
      uniqueUsersToday: 0,
      mostVisitedPage: '-',
    },
    visitsByDay: [] as Array<{ date: string; visitas: number }>,
    topPages: [] as Array<{
      pagePath: string
      pageName: string
      visitsToday: number
      visitsMonth: number
      averageDurationSeconds: number
      uniqueUsers: number
      periodVisits: number
    }>,
    recentActivity: [] as Array<{
      id: number
      user: string
      pageName: string
      pagePath: string
      createdAt: string
      durationSeconds: number
    }>,
  }
}

function isSchemaNotReadyError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: string }).code) : ''
  return code === '42P01' || code === '42703' || code === 'PGRST204' || code === 'PGRST205'
}

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function resolvePeriodBounds(period: PeriodFilter) {
  const now = new Date()
  const todayStart = startOfDay(now)

  if (period === 'today') {
    return { start: todayStart, end: now }
  }

  if (period === '7d') {
    const start = new Date(todayStart)
    start.setDate(start.getDate() - 6)
    return { start, end: now }
  }

  if (period === 'this_month') {
    return { start: startOfMonth(now), end: now }
  }

  const currentMonthStart = startOfMonth(now)
  const previousMonthStart = new Date(currentMonthStart)
  previousMonthStart.setMonth(previousMonthStart.getMonth() - 1)

  return {
    start: previousMonthStart,
    end: new Date(currentMonthStart.getTime() - 1),
  }
}

function isWithinRange(dateIso: string, start: Date, end: Date) {
  const date = new Date(dateIso)
  return date >= start && date <= end
}

function getIdentityKey(row: PageLogRow) {
  return row.user_id || row.user_email || 'anonimo'
}

function aggregateMostVisitedPage(rows: PageLogRow[]) {
  if (rows.length === 0) return '-'

  const map = new Map<string, number>()
  for (const row of rows) {
    const key = row.page_name || row.page_path
    map.set(key, (map.get(key) || 0) + 1)
  }

  const top = Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0]
  return top?.[0] || '-'
}

function getBarSeriesLast30Days(rows: PageLogRow[]) {
  const start = startOfDay(new Date())
  start.setDate(start.getDate() - 29)

  const labels: string[] = []
  const counts = new Map<string, number>()

  for (let i = 0; i < 30; i++) {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    const label = day.toISOString().slice(0, 10)
    labels.push(label)
    counts.set(label, 0)
  }

  for (const row of rows) {
    const label = row.created_at.slice(0, 10)
    if (counts.has(label)) {
      counts.set(label, (counts.get(label) || 0) + 1)
    }
  }

  return labels.map((date) => ({
    date,
    visitas: counts.get(date) || 0,
  }))
}

function aggregatePagesTable(rowsAll: PageLogRow[], rowsPeriod: PageLogRow[]) {
  const todayStart = startOfDay()
  const monthStart = startOfMonth()

  const byPath = new Map<
    string,
    {
      pagePath: string
      pageName: string
      visitsToday: number
      visitsMonth: number
      periodVisits: number
      durationTotal: number
      users: Set<string>
    }
  >()

  const ensure = (row: PageLogRow) => {
    const key = row.page_path
    if (!byPath.has(key)) {
      byPath.set(key, {
        pagePath: key,
        pageName: row.page_name || key,
        visitsToday: 0,
        visitsMonth: 0,
        periodVisits: 0,
        durationTotal: 0,
        users: new Set<string>(),
      })
    }
    return byPath.get(key)!
  }

  for (const row of rowsAll) {
    const item = ensure(row)
    const createdAt = new Date(row.created_at)

    if (createdAt >= todayStart) item.visitsToday += 1
    if (createdAt >= monthStart) item.visitsMonth += 1
  }

  for (const row of rowsPeriod) {
    const item = ensure(row)
    item.periodVisits += 1
    item.durationTotal += row.duration_seconds || 0
    item.users.add(getIdentityKey(row))
  }

  return Array.from(byPath.values())
    .map((item) => ({
      pagePath: item.pagePath,
      pageName: item.pageName,
      visitsToday: item.visitsToday,
      visitsMonth: item.visitsMonth,
      averageDurationSeconds: item.periodVisits > 0 ? Math.round(item.durationTotal / item.periodVisits) : 0,
      uniqueUsers: item.users.size,
      periodVisits: item.periodVisits,
    }))
    .sort((a, b) => b.periodVisits - a.periodVisits)
}

export async function POST(request: NextRequest) {
  try {
    if (!hasSupabaseConfig) {
      return NextResponse.json({ id: null, skipped: true })
    }

    const sessionUser = await getSessionUserFromRequest()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (sessionUser.perfil === 'admin') {
      return NextResponse.json({ id: null, skipped: true })
    }

    const body = await request.json()

    const pagePath = String(body?.pagePath || '').trim()
    const pageName = String(body?.pageName || '').trim()
    const sessionId = String(body?.sessionId || '').trim()

    if (!pagePath || !pageName || !sessionId) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
    }

    const payload = {
      user_id: sessionUser.usuario,
      user_email: null,
      page_path: pagePath,
      page_name: pageName,
      session_id: sessionId,
      duration_seconds: 0,
    }

    const { data, error } = await supabaseAdmin
      .from('page_logs')
      .insert(payload)
      .select('id')
      .single()

    if (error) {
      if (isSchemaNotReadyError(error)) {
        return NextResponse.json({ id: null, skipped: true })
      }
      console.error('Erro ao inserir page log:', error)
      return NextResponse.json({ error: 'Erro ao registrar page log' }, { status: 500 })
    }

    return NextResponse.json({ id: data.id })
  } catch (error) {
    console.error('Erro ao processar page log:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!hasSupabaseConfig) {
      return NextResponse.json(createEmptyAnalytics())
    }

    const sessionUser = await getSessionUserFromRequest()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (sessionUser.perfil !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const period = (request.nextUrl.searchParams.get('period') || 'today') as PeriodFilter

    const todayStart = startOfDay()
    const monthStart = startOfMonth()
    const { start: periodStart, end: periodEnd } = resolvePeriodBounds(period)

    const earliestNeeded = new Date(Math.min(todayStart.getTime(), monthStart.getTime(), periodStart.getTime()))
    earliestNeeded.setDate(earliestNeeded.getDate() - 30)

    const { data, error } = await supabaseAdmin
      .from('page_logs')
      .select('id, user_id, user_email, page_path, page_name, session_id, duration_seconds, created_at')
      .gte('created_at', earliestNeeded.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      if (isSchemaNotReadyError(error)) {
        return NextResponse.json(createEmptyAnalytics())
      }
      console.error('Erro ao buscar logs:', error)
      return NextResponse.json({ error: 'Erro ao buscar logs' }, { status: 500 })
    }

    const rows = (data || []) as PageLogRow[]
    const rowsFiltered = rows.filter((row) => {
      if (!row.user_id && !row.user_email) return false
      if (isAdminIdentity(row.user_id) || isAdminIdentity(row.user_email)) return false
      return true
    })

    const rowsToday = rowsFiltered.filter((row) => isWithinRange(row.created_at, todayStart, new Date()))
    const rowsMonth = rowsFiltered.filter((row) => isWithinRange(row.created_at, monthStart, new Date()))
    const rowsPeriod = rowsFiltered.filter((row) => isWithinRange(row.created_at, periodStart, periodEnd))

    const uniqueToday = new Set(rowsToday.map((row) => getIdentityKey(row)))

    const cards = {
      visitsToday: rowsToday.length,
      visitsMonth: rowsMonth.length,
      uniqueUsersToday: uniqueToday.size,
      mostVisitedPage: aggregateMostVisitedPage(rowsPeriod),
    }

    const visitsByDay = getBarSeriesLast30Days(rowsFiltered)
    const topPages = aggregatePagesTable(rowsFiltered, rowsPeriod).slice(0, 20)
    const recentActivity = rowsPeriod.slice(0, 50).map((row) => ({
      id: row.id,
      user: row.user_email || row.user_id || 'Anônimo',
      pageName: row.page_name || row.page_path,
      pagePath: row.page_path,
      createdAt: row.created_at,
      durationSeconds: row.duration_seconds || 0,
    }))

    return NextResponse.json({
      cards,
      visitsByDay,
      topPages,
      recentActivity,
    })
  } catch (error) {
    console.error('Erro no analytics de page logs:', error)
    return NextResponse.json({ error: 'Erro interno ao buscar analytics' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    if (!hasSupabaseConfig) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const sessionUser = await getSessionUserFromRequest()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (sessionUser.perfil !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('page_logs')
      .delete()
      .not('id', 'is', null)

    if (error) {
      if (isSchemaNotReadyError(error)) {
        return NextResponse.json({ success: true, skipped: true })
      }
      console.error('Erro ao limpar logs:', error)
      return NextResponse.json({ error: 'Erro ao limpar logs' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao limpar logs:', error)
    return NextResponse.json({ error: 'Erro interno ao limpar logs' }, { status: 500 })
  }
}
