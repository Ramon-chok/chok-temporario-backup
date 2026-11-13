import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  // Se já foi criado, retorna o mesmo
  if (supabaseClient) {
    return supabaseClient
  }

  // Validar que as variáveis existem
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Variáveis de ambiente do Supabase não configuradas. Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY estão definidas no .env.local ou nas variáveis de ambiente do Vercel.'
    )
  }

  // Criar o cliente
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  return supabaseClient
}

// Exportar como `supabase` para compatibilidade com código existente
export const supabase = new Proxy(
  {},
  {
    get: (target, prop) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (getSupabaseClient() as any)[prop]
    },
  }
) as SupabaseClient
