const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Usuários para testar
const usuariosTeste = [
  { usuario: 'admin', senha: 'admin@ckdgp26', perfil: 'admin', descricao: 'Admin - Full Access' },
  { usuario: '799', senha: '823491', perfil: 'vendedor', descricao: 'Vendedor 1' },
  { usuario: '1216', senha: '647582', perfil: 'vendedor', descricao: 'Vendedor 2' },
]

async function testarLogin() {
  console.log('\n' + '='.repeat(80))
  console.log('🧪 TESTE DE AUTENTICAÇÃO - PRÉ-PRODUÇÃO')
  console.log('='.repeat(80) + '\n')

  let sucessos = 0
  let falhas = 0

  for (const teste of usuariosTeste) {
    console.log(`\n📝 Testando: ${teste.descricao}`)
    console.log(`   Usuario: ${teste.usuario}`)
    console.log(`   Perfil: ${teste.perfil}`)
    console.log('   ---')

    try {
      // Buscar usuário no banco
      const { data, error } = await supabase
        .from('usuarios')
        .select('usuario, perfil, senha_hash')
        .eq('usuario', teste.usuario)
        .single()

      if (error) {
        console.log(`   ❌ ERRO: Usuário não encontrado`)
        falhas++
        continue
      }

      // Verificar perfil
      if (data.perfil !== teste.perfil) {
        console.log(
          `   ❌ ERRO: Perfil incorreto. Esperado: ${teste.perfil}, Encontrado: ${data.perfil}`
        )
        falhas++
        continue
      }

      // Verificar senha
      if (data.senha_hash !== teste.senha) {
        console.log(
          `   ❌ ERRO: Senha incorreta. Esperado: ${teste.senha}, Encontrado: ${data.senha_hash}`
        )
        falhas++
        continue
      }

      console.log(`   ✅ SUCESSO!`)
      console.log(`      • Usuario: ${data.usuario}`)
      console.log(`      • Perfil: ${data.perfil}`)
      console.log(`      • Status: Pronto para login`)
      sucessos++
    } catch (err) {
      console.log(`   ❌ ERRO: ${err.message}`)
      falhas++
    }
  }

  // Stats
  console.log('\n' + '='.repeat(80))
  console.log('📊 RESULTADO DOS TESTES')
  console.log('='.repeat(80))
  console.log(`✅ Sucesso: ${sucessos}/${usuariosTeste.length}`)
  console.log(`❌ Falhas:  ${falhas}/${usuariosTeste.length}`)

  if (falhas === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! Pronto para produção.')
  } else {
    console.log(`\n⚠️  ${falhas} teste(s) falharam. Verificar erros acima.`)
  }

  console.log('='.repeat(80) + '\n')

  process.exit(falhas > 0 ? 1 : 0)
}

testarLogin()
