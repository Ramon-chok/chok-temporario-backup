import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    let lastUpdate = Date.now()

    const { data: files } = await supabaseAdmin.storage
      .from('excel-files')
      .list('', { search: 'dados_app.xlsx' })

    if (files && files.length > 0) {
      const file = files[0]
      // Usar updated_at que é mantido automaticamente pelo Supabase
      if (file.updated_at) {
        lastUpdate = new Date(file.updated_at).getTime()
      } else if (file.created_at) {
        lastUpdate = new Date(file.created_at).getTime()
      }
    }

    return NextResponse.json({ lastUpdate })
  } catch (error) {
    console.error('Erro ao buscar última atualização:', error)
    return NextResponse.json({ lastUpdate: Date.now() })
  }
}
