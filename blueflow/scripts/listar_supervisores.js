const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

async function listarSupervisores() {
  try {
    console.log('\n📋 Listando códigos de supervisores da planilha Excel...\n')

    // Caminho da planilha
    const excelPath = path.join(__dirname, '../public/dados_app.xlsm')

    if (!fs.existsSync(excelPath)) {
      console.error('❌ Planilha não encontrada:', excelPath)
      console.log('\n💡 Certifique-se de ter o arquivo dados_app.xlsm em public/')
      return
    }

    // Ler arquivo Excel
    const buffer = fs.readFileSync(excelPath)
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    // Acessar planilha "Mês"
    const planilha = workbook.Sheets['Mês']
    if (!planilha) {
      console.error('❌ Planilha "Mês" não encontrada')
      return
    }

    // Converter para JSON
    const dados = XLSX.utils.sheet_to_json(planilha)

    if (!dados || dados.length === 0) {
      console.error('❌ Nenhum dado encontrado na planilha')
      return
    }

    // Extrair códigos de supervisores únicos e agrupar vendedores
    const supervisores = {}

    dados.forEach((row) => {
      const codigoSupervisor = row['Supervisor']
      const codigoVendedor = row['Vendedor']
      const nomeVendedor = row['Nome Vendedor']

      // Filtrar apenas linhas com supervisor válido (número)
      if (codigoSupervisor && !isNaN(Number(codigoSupervisor))) {
        if (!supervisores[codigoSupervisor]) {
          supervisores[codigoSupervisor] = []
        }
        
        supervisores[codigoSupervisor].push({
          codigo: codigoVendedor,
          nome: nomeVendedor,
        })
      }
    })

    const codigosSupervisores = Object.keys(supervisores).map(Number).sort((a, b) => a - b)

    console.log(`✅ Encontrados ${codigosSupervisores.length} supervisores únicos:\n`)

    codigosSupervisores.forEach((codigo, index) => {
      const vendedores = supervisores[codigo]
      console.log(`${index + 1}. Supervisor: ${codigo}`)
      console.log(`   └─ ${vendedores.length} vendedores na equipe`)
      
      // Mostrar os primeiros 3 vendedores
      vendedores.slice(0, 3).forEach((v) => {
        console.log(`      • ${v.codigo} - ${v.nome}`)
      })
      
      if (vendedores.length > 3) {
        console.log(`      ... e mais ${vendedores.length - 3}`)
      }
      console.log('')
    })

    console.log('\n💡 Para criar um usuário supervisor, use o código numérico')
    console.log('   de um dos supervisores acima e edite o arquivo:')
    console.log('   scripts/adicionar_supervisor.js')
    console.log('\n   Exemplo: Se você quer o supervisor 20, edite:')
    console.log('   const codigoSupervisor = 20\n')

  } catch (error) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  }
}

listarSupervisores()
