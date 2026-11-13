const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function adicionarSupervisor() {
  try {
    console.log('\n🔐 Adicionando usuário supervisor...\n')

    // Substitua pelo CÓDIGO NUMÉRICO que aparece na coluna "Supervisor"
    // da sua planilha Excel (ex: 20, 30, 577, 40, etc.)
    const codigoSupervisor = 20 // ⚠️ AJUSTE ESTE CÓDIGO
    const senhaSupervisor = 'super123'

    const novoSupervisor = {
      usuario: String(codigoSupervisor), // Converter para string para o campo usuario
      senha_hash: senhaSupervisor,
      perfil: 'supervisor', // Perfil supervisor (diferente de gerencia)
    }

    const { data, error } = await supabase
      .from('usuarios')
      .upsert([novoSupervisor], { onConflict: 'usuario' })
      .select()

    if (error) {
      console.error('❌ Erro ao adicionar supervisor:', error.message)
      throw error
    }

    console.log('✅ Usuário supervisor adicionado/atualizado com sucesso!')
    console.log('\n📋 Dados do supervisor:')
    console.log(`   Codigo: ${codigoSupervisor}`)
    console.log(`   Usuario: ${data[0].usuario}`)
    console.log(`   Perfil: ${data[0].perfil}`)
    console.log(`   Senha: ${senhaSupervisor}`)
    
    console.log('\n🔓 Credenciais de login:')
    console.log(`   Usuario: ${codigoSupervisor}`)
    console.log(`   Senha: ${senhaSupervisor}`)
    
    console.log('\n⚠️  IMPORTANTE:')
    console.log('   O código do usuário DEVE ser exatamente igual ao código')
    console.log('   que aparece na coluna "Supervisor" da planilha Excel.')
    console.log('   Caso contrário, não encontrará dados.\n')

  } catch (error) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  }
}

adicionarSupervisor()
