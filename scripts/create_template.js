/**
 * Script para gerar arquivo Excel TEMPLATE
 * 
 * Uso: node scripts/create_template.js
 * 
 * Gera um arquivo template_dados.xlsx com exemplos de estrutura
 */

const XLSX = require('xlsx');
const path = require('path');

// Dados exemplo
const pedidosExemplo = [
  {
    nu_ped: 1001,
    dt_ped: '2026-02-01',
    total: 1500.50,
    cd_vend: 'V001',
    nm_vend: 'João Silva',
    cd_clie: 100,
    nm_clie: 'Cliente A',
    cd_cid: 1,
    nm_cid: 'São Paulo-SP',
    cd_cat: 'CAT001',
    nm_cat: 'Eletrônicos'
  },
  {
    nu_ped: 1002,
    dt_ped: '2026-02-02',
    total: 2300.00,
    cd_vend: 'V002',
    nm_vend: 'Maria Santos',
    cd_clie: 101,
    nm_clie: 'Cliente B',
    cd_cid: 2,
    nm_cid: 'Rio de Janeiro-RJ',
    cd_cat: 'CAT002',
    nm_cat: 'Alimentos'
  },
  {
    nu_ped: 1003,
    dt_ped: '2026-02-03',
    total: 3456.78,
    cd_vend: 'V003',
    nm_vend: 'Carlos Oliveira',
    cd_clie: 102,
    nm_clie: 'Cliente C',
    cd_cid: 3,
    nm_cid: 'Belo Horizonte-MG',
    cd_cat: 'CAT003',
    nm_cat: 'Vestuário'
  }
];

const itensExemplo = [
  {
    nu_ped: 1001,
    nu_item: 1,
    qtd: 2,
    vl_unit: 500.00,
    vl_venda: 1000.00,
    vl_venda_av: 50.00,
    vl_mg_brt_cmp: 150.00,
    cd_prod: 'PROD001',
    nm_prod: 'Notebook Dell'
  },
  {
    nu_ped: 1001,
    nu_item: 2,
    qtd: 1,
    vl_unit: 500.50,
    vl_venda: 500.50,
    vl_venda_av: 0.00,
    vl_mg_brt_cmp: 100.00,
    cd_prod: 'PROD002',
    nm_prod: 'Mouse Logitech'
  },
  {
    nu_ped: 1002,
    nu_item: 1,
    qtd: 1,
    vl_unit: 2300.00,
    vl_venda: 2300.00,
    vl_venda_av: 100.00,
    vl_mg_brt_cmp: 200.00,
    cd_prod: 'PROD003',
    nm_prod: 'Impressora HP'
  },
  {
    nu_ped: 1003,
    nu_item: 1,
    qtd: 5,
    vl_unit: 450.00,
    vl_venda: 2250.00,
    vl_venda_av: 75.00,
    vl_mg_brt_cmp: 180.00,
    cd_prod: 'PROD004',
    nm_prod: 'Camiseta Básica'
  },
  {
    nu_ped: 1003,
    nu_item: 2,
    qtd: 2,
    vl_unit: 603.39,
    vl_venda: 1206.78,
    vl_venda_av: 50.00,
    vl_mg_brt_cmp: 100.00,
    cd_prod: 'PROD005',
    nm_prod: 'Calça Jeans'
  }
];

// Criar workbook
const wb = XLSX.utils.book_new();

// Adicionar abas
XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.json_to_sheet(pedidosExemplo),
  'ped_vda'
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.json_to_sheet(itensExemplo),
  'it_pedv'
);

// Salvar
const outputPath = path.join(__dirname, 'template_dados.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`✅ Template criado: ${outputPath}`);
console.log(`\n📊 Conteúdo:`);
console.log(`   - Aba "ped_vda": ${pedidosExemplo.length} pedidos`);
console.log(`   - Aba "it_pedv": ${itensExemplo.length} itens`);
console.log(`\n💡 Use como referência para sua planilha de dados`);
console.log(`\n📝 Para importar:`);
console.log(`   node scripts/import_from_excel.js template_dados.xlsx`);
