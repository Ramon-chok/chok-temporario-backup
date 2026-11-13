const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function adicionarGerencia() {
  try {
    console.log('\n🔐 Adicionando usuário gerência...\n')

    // Usuário gerência pode ser qualquer string (não precisa corresponder ao Excel)
    const usuarioGerencia = 'gerente' // ⚠️ AJUSTE SE NECESSÁRIO
    const senhaGerencia = 'gerente123'

    const novoGerente = {
      usuario: usuarioGerencia,
      senha_hash: senhaGerencia,
      perfil: 'gerencia', // Perfil gerência vê TODOS os dados
    }

    const { data, error } = await supabase
      .from('usuarios')
      .upsert([novoGerente], { onConflict: 'usuario' })
      .select()

    if (error) {
      console.error('❌ Erro ao adicionar gerência:', error.message)
      throw error
    }

    console.log('✅ Usuário gerência adicionado/atualizado com sucesso!')
    console.log('\n📋 Dados do gerente:')
    console.log(`   Usuario: ${data[0].usuario}`)
    console.log(`   Perfil: ${data[0].perfil}`)
    console.log(`   Senha: ${senhaGerencia}`)
    
    console.log('\n🔓 Credenciais de login:')
    console.log(`   Usuario: ${usuarioGerencia}`)
    console.log(`   Senha: ${senhaGerencia}`)
    
    console.log('\n⚠️  IMPORTANTE:')
    console.log('   Perfil GERÊNCIA visualiza dados agregados de TODOS os vendedores.')
    console.log('   Não há filtro por supervisor - vê toda a empresa.\n')

  } catch (error) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  }
}

adicionarGerencia()
