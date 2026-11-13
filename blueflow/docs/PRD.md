# Atualização 2026-03-18

## Mudanças Recentes
- Footer ocupa toda a largura, fundo gradiente igual em todas as páginas (dashboard, nao-positivados).
- Visual das tabelas padronizado: zebra stripes, cabeçalho grafite, responsividade, contraste.
- Variáveis CSS para temas claro/escuro, incluindo cor do texto do footer.
- Estrutura de pastas revisada: componentes, hooks, stores, lib, types.
- Regras de negócio e filtros combinados revisados.
- Documentação técnica e PRD atualizados conforme estado atual.

## Funcionalidades Visuais
- Tabelas com zebra stripes alternando linhas.
- Cabeçalho das tabelas com cor grafite no modo claro.
- Footer sempre visível, com contraste adequado.
- Cards KPI e filtros responsivos.

## Estrutura de Pastas (atual)
- src/app: páginas, layouts, endpoints API
- src/components: DataTable, KPICard, Sidebar, Header, Footer
- src/hooks: useQueries, useAuth, useLastUpdate, usePermissions
- src/lib: excel-service, export-pdf, supabase/client
- src/store: Zustand stores para filtros e estado
- src/types: tipagem global

## Regras de Negócio (atual)
- Cliente é positivado se valor na categoria (ou geral) > 0
- Deduplicação de clientes por código, status consolidado por filtro
- Filtros combinados para admin/gerência
- Visualização adaptada ao perfil do usuário

## Segurança e Monitoramento
- Autenticação por perfil
- Políticas de acesso no Supabase
- Sentry para erros e performance

## Testes
- Scripts de teste e validação (agora movidos para archive)
# PRD — Dashboard Blueflow

**Objetivo:**
Permitir acompanhamento de KPIs, clientes positivados/não-positivados, filtros por vendedor, equipe, gerência e categoria, com visualização de dados importados do Excel/Supabase.

**Usuários-alvo:**
- Vendedores
- Supervisores
- Gerentes
- Administradores

**Funcionalidades principais:**
- Login e autenticação por perfil (vendedor, supervisor, gerência, admin)
- Dashboard com KPIs (faturamento, cobertura, sortimento, margem, etc)
- Tela de clientes não-positivados, com filtros por categoria, município, status, vendedor, equipe, gerência
- Cards de resumo: total de clientes, positivados, não-positivados, % positivação
- Tabela de clientes com status, valor, município, código, razão social
- Exportação de dados (PDF)
- Notificações de loading, erros e sucesso
- Importação de dados via Excel/Supabase Storage
- Cache e otimização de requisições com React Query

**Regras de negócio:**
- Cliente é positivado se valor na categoria (ou geral) > 0
- Deduplicação de clientes por código, status consolidado por filtro
- Filtros combinados para admin/gerência
- Visualização adaptada ao perfil do usuário

**Restrições:**
- Dados sensíveis protegidos por autenticação
- Apenas admin pode acessar área administrativa
