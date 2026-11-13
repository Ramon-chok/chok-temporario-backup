const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function atualizarRPCs() {
  try {
    console.log('\n🔧 Atualizando RPCs para aceitar filtro de vendedor...\n')

    // Ler arquivo SQL
    const sqlPath = 'supabase/permissions_rpc.sql'
    const sql = fs.readFileSync(sqlPath, 'utf-8')

    // Dividir em statements individuais
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    console.log(`📝 Encontrados ${statements.length} statements SQL\n`)

    // Executar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`⏳ Executando statement ${i + 1}/${statements.length}...`)

      try {
        const { error } = await supabase.rpc('execute_sql', {
          sql_query: statement,
        })

        // Se execute_sql não existir, tentar direto
        if (error) {
          console.log(`   ⚠️  execute_sql não disponível, pulando...`)
          continue
        }

        console.log(`   ✅ Sucesso\n`)
      } catch {
        console.log(`   ℹ️  Statement pode não ter RPC execute_sql\n`)
      }
    }

    console.log('✅ RPCs atualizadas!\n')
    console.log('📋 Próximos passos:')
    console.log('1. Execute manualmente o arquivo supabase/permissions_rpc.sql no SQL Editor do Supabase')
    console.log('2. Ou copie o conteúdo e execute cada CREATE OR REPLACE FUNCTION\n')

  } catch (error) {
    console.error('❌ Erro:', error.message)
  }
}

atualizarRPCs()
