# Atualização 2026-03-18

## Mudanças Recentes
- Footer ocupa toda a largura, fundo gradiente igual em todas as páginas.
- Visual das tabelas padronizado: zebra stripes, cabeçalho grafite, responsividade, contraste.
- Variáveis CSS para temas claro/escuro, incluindo cor do texto do footer.
- Estrutura de pastas revisada: componentes, hooks, stores, lib, types.
- Endpoints e hooks revisados conforme estado atual.

## Estrutura de Pastas (atual)
- src/app: páginas, layouts, endpoints API
- src/components: DataTable, KPICard, Sidebar, Header, Footer
- src/hooks: useQueries, useAuth, useLastUpdate, usePermissions
- src/lib: excel-service, export-pdf, supabase/client
- src/store: Zustand stores para filtros e estado
- src/types: tipagem global

## Endpoints Principais (atual)
- /api/nao-positivados/clientes: retorna lista de clientes com status e valor por filtro
- /api/nao-positivados/categorias: retorna categorias disponíveis
- /api/last-update: retorna data da última atualização

## Hooks Principais (atual)
- useNaoPositivados: busca clientes não-positivados via API, aplica filtros
- useCategoriasNaoPositivados: busca categorias via API
- useKPIs: busca KPIs via Supabase RPC
- useAuth: autenticação e perfil do usuário

## Fluxo de Dados (atual)
- Excel importado para Supabase Storage
- excel-service.ts lê e processa dados do Excel
- Endpoints API servem dados filtrados para frontend
- React Query faz cache e atualização automática
- Tabela e cards exibem dados filtrados e deduplicados

## Segurança e Monitoramento
- Autenticação por perfil
- Políticas de acesso no Supabase
- Sentry para erros e performance

## Testes
- Scripts de teste e validação (agora movidos para archive)
# Documentação Técnica — Dashboard Blueflow

**Stack:**
- Next.js (React, TypeScript)
- Supabase (backend, storage)
- React Query (cache)
- XLSX (leitura de Excel)
- Tailwind CSS (UI)
- Sentry (monitoramento)

**Estrutura de Pastas:**
- src/app: páginas, layouts, endpoints API
- src/components: componentes visuais (DataTable, KPICard, Sidebar, Header, Footer)
- src/hooks: hooks customizados (useQueries, useAuth, useLastUpdate, usePermissions)
- src/lib: serviços (excel-service, export-pdf, supabase/client)
- src/store: Zustand stores para filtros e estado
- src/types: tipagem global

**Principais Endpoints:**
- /api/nao-positivados/clientes: retorna lista de clientes com status e valor por filtro
- /api/nao-positivados/categorias: retorna categorias disponíveis
- /api/last-update: retorna data da última atualização

**Principais Hooks:**
- useNaoPositivados: busca clientes não-positivados via API, aplica filtros
- useCategoriasNaoPositivados: busca categorias via API
- useKPIs: busca KPIs via Supabase RPC
- useAuth: autenticação e perfil do usuário

**Fluxo de Dados:**
- Excel importado para Supabase Storage
- excel-service.ts lê e processa dados do Excel
- Endpoints API servem dados filtrados para frontend
- React Query faz cache e atualização automática
- Tabela e cards exibem dados filtrados e deduplicados

**Segurança:**
- Autenticação por perfil
- Políticas de acesso no Supabase
- Dados sensíveis protegidos

**Monitoramento:**
- Sentry para erros e performance

**Testes:**
- Scripts de teste e validação (agora movidos para archive)
