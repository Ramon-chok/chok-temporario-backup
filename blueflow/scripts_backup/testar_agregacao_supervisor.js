const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

async function testarAgregacaoSupervisor(codigoSupervisor) {
  try {
    console.log(`\n🧪 Testando agregação de dados para supervisor código: ${codigoSupervisor}\n`)

    // Caminho da planilha
    const excelPath = path.join(__dirname, '../public/dados_app.xlsm')

    if (!fs.existsSync(excelPath)) {
      console.error('❌ Planilha não encontrada:', excelPath)
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

    // Filtrar vendedores do supervisor pelo CÓDIGO
    const vendedoresSupervisor = dados.filter(
      (row) => Number(row['Supervisor']) === Number(codigoSupervisor)
    )

    if (vendedoresSupervisor.length === 0) {
      console.error(`❌ Nenhum vendedor encontrado para o supervisor código: ${codigoSupervisor}`)
      console.log('\n💡 Execute o script listar_supervisores.js para ver os códigos disponíveis')
      return
    }

    console.log(`✅ Encontrados ${vendedoresSupervisor.length} vendedores\n`)

    // Agregar dados
    let metaFaseamento = 0
    let realizadoFaseamento = 0
    let metaDesconcentracao = 0
    let realizadoDesconcentracao = 0
    let metaFaturamento = 0
    let realizadoFaturamento = 0
    let metaCobertura = 0
    let realizadoCobertura = 0

    vendedoresSupervisor.forEach((v) => {
      console.log(`📊 ${v['Vendedor']} - ${v['Nome Vendedor']}`)
      console.log(`   Meta Faseamento: ${v['Meta Faseamento'] || 0}`)
      console.log(`   Realizado Faseamento: ${v['Realizado Faseamento'] || 0}`)
      
      metaFaseamento += v['Meta Faseamento'] || 0
      realizadoFaseamento += v['Realizado Faseamento'] || 0
      metaDesconcentracao += v['Meta Desconcentração'] || 0
      realizadoDesconcentracao += v['Realizado Desconcentração'] || 0
      metaFaturamento += v['Meta Faturamento'] || 0
      realizadoFaturamento += v['Realizado Faturamento'] || 0
      metaCobertura += v['Meta Cobertura'] || 0
      realizadoCobertura += v['Realizado Cobertura'] || 0
    })

    console.log('\n📈 TOTAIS AGREGADOS:\n')
    console.log('┌─────────────────────────────────────────────┐')
    console.log('│ FATURAMENTO                                 │')
    console.log(`│ Meta:      ${metaFaturamento.toLocaleString('pt-BR').padEnd(33)}│`)
    console.log(`│ Realizado: ${realizadoFaturamento.toLocaleString('pt-BR').padEnd(33)}│`)
    console.log(`│ %:         ${metaFaturamento > 0 ? Math.round((realizadoFaturamento / metaFaturamento) * 100) : 0}%`.padEnd(46) + '│')
    console.log('├─────────────────────────────────────────────┤')
    console.log('│ COBERTURA                                   │')
    console.log(`│ Meta:      ${metaCobertura.toLocaleString('pt-BR').padEnd(33)}│`)
    console.log(`│ Realizado: ${realizadoCobertura.toLocaleString('pt-BR').padEnd(33)}│`)
    console.log(`│ %:         ${metaCobertura > 0 ? Math.round((realizadoCobertura / metaCobertura) * 100) : 0}%`.padEnd(46) + '│')
    console.log('├─────────────────────────────────────────────┤')
    console.log('│ FASEAMENTO                                  │')
    console.log(`│ Meta:      ${metaFaseamento.toLocaleString('pt-BR').padEnd(33)}│`)
    console.log(`│ Realizado: ${realizadoFaseamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padEnd(33)}│`)
    console.log(`│ %:         ${metaFaseamento > 0 ? Math.round((realizadoFaseamento / metaFaseamento) * 100) : 0}%`.padEnd(46) + '│')
    console.log('├─────────────────────────────────────────────┤')
    console.log('│ DESCONCENTRAÇÃO                             │')
    console.log(`│ Meta:      ${metaDesconcentracao.toLocaleString('pt-BR').padEnd(33)}│`)
    console.log(`│ Realizado: ${realizadoDesconcentracao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padEnd(33)}│`)
    console.log(`│ %:         ${metaDesconcentracao > 0 ? Math.round((realizadoDesconcentracao / metaDesconcentracao) * 100) : 0}%`.padEnd(46) + '│')
    console.log('└─────────────────────────────────────────────┘\n')

    console.log('✅ Estes são os valores que devem aparecer no dashboard!')
    console.log('💡 Compare com os valores exibidos após fazer login\n')

  } catch (error) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  }
}

// Usar o código do supervisor como argumento ou um padrão
const codigoSupervisor = process.argv[2] || 20

console.log('\n═══════════════════════════════════════════════════')
console.log('  🧪 TESTE DE AGREGAÇÃO - PERFIL SUPERVISOR')
console.log('═══════════════════════════════════════════════════')

testarAgregacaoSupervisor(codigoSupervisor)
