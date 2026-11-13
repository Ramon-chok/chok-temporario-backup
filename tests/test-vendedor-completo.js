// Testar vendedor com dados completos
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testar() {
  const { data } = await supabase.storage
    .from('excel-files')
    .download('dados_app.xlsx');
  
  const buffer = Buffer.from(await data.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const planilha = workbook.Sheets['Mês'];
  const dados = XLSX.utils.sheet_to_json(planilha);
  
  console.log('📊 Procurando vendedor com Meta Faseamento > 0...\n');
  
  const vendedoresComMeta = dados.filter(v => v['Meta Faseamento'] && v['Meta Faseamento'] > 0);
  
  console.log(`✅ Encontrados ${vendedoresComMeta.length} vendedores com Meta Faseamento\n`);
  
  if (vendedoresComMeta.length > 0) {
    const primeiro = vendedoresComMeta[0];
    console.log('🔍 Primeiro vendedor com dados de Faseamento:\n');
    console.log(`  Código: ${primeiro['Vendedor']}`);
    console.log(`  Nome: ${primeiro['Nome Vendedor']}`);
    console.log(`  Meta Faseamento: ${primeiro['Meta Faseamento']}`);
    console.log(`  Realizado Faseamento: ${primeiro['Realizado Faseamento']}`);
    console.log(`  Data Inicial: ${primeiro['Data Inicial Faseamento']}`);
    console.log(`  Data Final: ${primeiro['Data Final Faseamento']}`);
    
    // Listar todos os vendedores com meta
    console.log('\n\n📋 Todos os vendedores com Meta Faseamento > 0:\n');
    vendedoresComMeta.forEach(v => {
      console.log(`  ${v['Vendedor']} - ${v['Nome Vendedor']}: Meta ${v['Meta Faseamento']}, Realizado ${v['Realizado Faseamento'] || 'null/undefined'}`);
    });
  }
}

testar();
