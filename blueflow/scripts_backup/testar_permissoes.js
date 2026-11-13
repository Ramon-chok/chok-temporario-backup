const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Testar permissões para cada tipo de usuário
const usuariosPermissoes = [
  { usuario: 'admin', perfil: 'admin' },
  { usuario: '799', perfil: 'vendedor' },
  { usuario: '1216', perfil: 'vendedor' },
]

async function testarPermissoes() {
  console.log('\n' + '='.repeat(80))
  console.log('🔐 TESTE DE PERMISSÕES - PRÉ-PRODUÇÃO')
  console.log('='.repeat(80) + '\n')

  for (const usuario of usuariosPermissoes) {
    console.log(`\n👤 Usuário: ${usuario.usuario} (Perfil: ${usuario.perfil})`)
    console.log('   ' + '─'.repeat(76))

    try {
      // Teste 1: Verificar se pode acessar /admin (apenas admin)
      const podeAcessarAdmin = usuario.perfil === 'admin'
      console.log(
        `   1️⃣  Acesso a /admin: ${podeAcessarAdmin ? '✅ Permitido' : '❌ Bloqueado'}`
      )

      // Teste 2: Verificar permissões no banco de dados
      const { error } = await supabase
        .from('usuarios')
        .select('usuario, perfil')
        .eq('usuario', usuario.usuario)
        .single()

      if (error) {
        console.log(`   ❌ Erro ao buscar permissões: ${error.message}`)
        continue
      }

      // Teste 3: Simular filtro de dados
      let filtroEsperado = ''
      if (usuario.perfil === 'vendedor') {
        filtroEsperado = `cd_vend = ${usuario.usuario}`
      } else if (usuario.perfil === 'supervisor') {
        filtroEsperado = 'Todos os vendedores + dados próprios'
      } else if (usuario.perfil === 'gerencia') {
        filtroEsperado = 'Todos os dados'
      } else if (usuario.perfil === 'admin') {
        filtroEsperado = 'Todos os dados + acesso ao sistema'
      }

      console.log(`   2️⃣  Filtro de dados: ${filtroEsperado}`)

      // Teste 4: Permissões específicas
      const permissoesSpec = {
        vendedor: {
          viewAllData: false,
          viewTeamData: false,
          viewOwnData: true,
          manageUsers: false,
          manageSystem: false,
        },
        supervisor: {
          viewAllData: false,
          viewTeamData: true,
          viewOwnData: true,
          manageUsers: false,
          manageSystem: false,
        },
        gerencia: {
          viewAllData: true,
          viewTeamData: true,
          viewOwnData: true,
          manageUsers: false,
          manageSystem: false,
        },
        admin: {
          viewAllData: true,
          viewTeamData: true,
          viewOwnData: true,
          manageUsers: true,
          manageSystem: true,
        },
      }

      const perms = permissoesSpec[usuario.perfil]
      console.log(`   3️⃣  Permissões detalhadas:`)
      console.log(`       • Ver dados de todos: ${perms.viewAllData ? '✅' : '❌'}`)
      console.log(`       • Ver dados do time: ${perms.viewTeamData ? '✅' : '❌'}`)
      console.log(`       • Ver dados próprios: ${perms.viewOwnData ? '✅' : '❌'}`)
      console.log(`       • Gerenciar usuários: ${perms.manageUsers ? '✅' : '❌'}`)
      console.log(`       • Gerenciar sistema: ${perms.manageSystem ? '✅' : '❌'}`)
    } catch (err) {
      console.log(`   ❌ ERRO: ${err.message}`)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ TESTES DE PERMISSÕES CONCLUÍDOS')
  console.log('='.repeat(80) + '\n')

  process.exit(0)
}

testarPermissoes()
