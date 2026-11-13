#!/bin/bash
# Script para verificar se o projeto está pronto para deploy no Vercel

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║    🚀 VERIFICADOR DE PRONTIDÃO PARA DEPLOYMENT VERCEL         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Função para verificar
check() {
  local name=$1
  local command=$2
  
  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} $name"
    ((PASSED++))
  else
    echo -e "${RED}❌${NC} $name"
    ((FAILED++))
  fi
}

# Função para avisar
warn() {
  local name=$1
  echo -e "${YELLOW}⚠️${NC}  $name"
}

echo "📋 VERIFICAÇÕES TÉCNICAS:"
echo "─────────────────────────────────────────────────────────────────"

# Verificações técnicas
check "Node.js instalado (v18+)" "node --version | grep -E 'v(1[8-9]|2[0-9])'"
check "NPM instalado" "npm --version"
check "Arquivo package.json existe" "test -f package.json"
check "Arquivo .env.local existe" "test -f .env.local"
check "Pasta src/ existe" "test -d src"
check "next.config.js existe" "test -f next.config.js"

echo ""
echo "🔨 VERIFICAÇÕES DE BUILD:"
echo "─────────────────────────────────────────────────────────────────"

check "Dependências instaladas (node_modules)" "test -d node_modules"
check "TypeScript compila" "npx tsc --noEmit"
check "Next.js build funciona" "npm run build"

echo ""
echo "📦 VERIFICAÇÕES DE AMBIENTE:"
echo "─────────────────────────────────────────────────────────────────"

# Verificar variáveis de ambiente
if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
  echo -e "${GREEN}✅${NC} NEXT_PUBLIC_SUPABASE_URL configurada"
  ((PASSED++))
else
  echo -e "${RED}❌${NC} NEXT_PUBLIC_SUPABASE_URL não configurada"
  ((FAILED++))
fi

if grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local; then
  echo -e "${GREEN}✅${NC} SUPABASE_SERVICE_ROLE_KEY configurada"
  ((PASSED++))
else
  echo -e "${RED}❌${NC} SUPABASE_SERVICE_ROLE_KEY não configurada"
  ((FAILED++))
fi

echo ""
echo "🗄️  VERIFICAÇÕES DE BANCO DE DADOS:"
echo "─────────────────────────────────────────────────────────────────"

check "Tabela 'usuarios' existe" "grep -r \"from.*usuarios\" src/ > /dev/null"
check "Hook usePermissions existe" "test -f src/hooks/usePermissions.ts"
check "AuthContext existe" "test -f src/contexts/AuthContext.tsx"

echo ""
echo "🔐 VERIFICAÇÕES DE SEGURANÇA:"
echo "─────────────────────────────────────────────────────────────────"

check ".env.local está em .gitignore" "grep -q '.env.local' .gitignore"
check ".env.local não foi commitado" "! git ls-files | grep -q '.env.local'"

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] && grep -q "SUPABASE_SERVICE_ROLE_KEY=" .env.local; then
  echo -e "${GREEN}✅${NC} Service role key não está em variável de ambiente global"
  ((PASSED++))
else
  warn "Verificar que SERVICE_ROLE_KEY não está em variável de ambiente"
fi

echo ""
echo "═════════════════════════════════════════════════════════════════"
echo "📊 RESULTADO:"
echo "─────────────────────────────────────────────────────────────────"
echo -e "  ${GREEN}Passed: $PASSED${NC}"
echo -e "  ${RED}Failed: $FAILED${NC}"
echo "═════════════════════════════════════════════════════════════════"

if [ $FAILED -eq 0 ]; then
  echo -e "\n${GREEN}🎉 TUDO PRONTO PARA DEPLOY!${NC}\n"
  echo "Próximos passos:"
  echo "1. Crie repositório GitHub: https://github.com/new"
  echo "2. Envie código para GitHub:"
  echo "   git remote add origin https://github.com/seu_usuario/dashboard-vendas.git"
  echo "   git push -u origin main"
  echo "3. Faça login em Vercel: https://vercel.com/dashboard"
  echo "4. Clique em '+ New Project' e importe seu repositório"
  echo "5. Configure variáveis de ambiente em Settings"
  echo "6. Clique em 'Deploy'"
  echo ""
  exit 0
else
  echo -e "\n${RED}⚠️  EXISTEM PROBLEMAS QUE PRECISAM SER RESOLVIDOS${NC}\n"
  exit 1
fi
