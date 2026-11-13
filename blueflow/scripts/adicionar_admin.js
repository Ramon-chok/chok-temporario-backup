const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function adicionarAdmin() {
  try {
    console.log('\n🔐 Adicionando usuário admin...\n')

    const novoAdmin = {
      usuario: 'admin',
      senha_hash: 'admin@ckdgp26', // Plain text por enquanto, pode ser melhorado depois
      perfil: 'admin',
    }

    const { data, error } = await supabase
      .from('usuarios')
      .upsert([novoAdmin], { onConflict: 'usuario' })
      .select()

    if (error) {
      console.error('❌ Erro ao adicionar admin:', error.message)
      throw error
    }

    console.log('✅ Usuário admin adicionado/atualizado com sucesso!')
    console.log('\n📋 Dados do novo admin:')
    console.log(`   Usuario: ${data[0].usuario}`)
    console.log(`   Perfil: ${data[0].perfil}`)
    console.log(`   Senha: admin@ckdgp26`)
    
    console.log('\n🔓 Credenciais de login:')
    console.log(`   Usuario: admin`)
    console.log(`   Senha: admin@ckdgp26`)
    console.log('\n')

  } catch (error) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  }
}

adicionarAdmin()
