# BlueFlow - Dashboard de Vendas

Aplicacao web para analise comercial com foco em acompanhamento de vendedores, supervisores, gerencias e administracao operacional.

## Stack atual

- Next.js 16 (App Router)
- React 19
- TypeScript (strict)
- Supabase (Database + Storage)
- TanStack Query
- Zustand
- Tailwind CSS 4
- Sentry para observabilidade

## Requisitos

- Node.js 20+
- npm 10+
- Projeto Supabase com tabelas/funcoes esperadas pelo app

## Variaveis de ambiente

Crie um arquivo .env.local na raiz do projeto:

```bash
NEXT_PUBLIC_SUPABASE_URL=<url-do-projeto-supabase>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Obrigatorio em producao para assinatura da sessao (cookie)
# Em desenvolvimento, se ausente, o app usa fallback para SUPABASE_SERVICE_ROLE_KEY.
AUTH_SESSION_SECRET=<segredo-aleatorio-forte>

# Opcional (Sentry)
SENTRY_AUTH_TOKEN=<token-sentry>
```

## Como rodar localmente

```bash
npm install
npm run dev
```

Aplicacao disponivel em http://localhost:3000

## Scripts disponiveis

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run import:usuarios
```

## Modulos principais

- Autenticacao com sessao em cookie assinado (blueflow_session)
- Dashboard por perfil (vendedor, supervisor, gerencia, admin)
- Top clientes
- Nao positivados
- Notas por usuario
- Upload de planilhas para o Supabase Storage
- Importacao de dados e atualizacao de timestamp
- Logs de navegacao (page logs)
- Painel administrativo de usuarios e notificacoes

## Estrutura resumida

```text
src/
    app/
        api/
        admin/
        dashboard/
        top-clientes/
        login/
    components/
    contexts/
    hooks/
    lib/
    store/
    types/
```

## Estado atual do projeto

- O projeto esta funcional e em uso com fluxo de login e sessao.
- Parte das rotas de API ja esta protegida por sessao server-side.
- Existem rotas legadas que ainda precisam convergir para o mesmo padrao de autorizacao.

## Pontos de atencao conhecidos

- Ha inconsistencias de protecao entre rotas novas e legadas de API.
- O hash de senha atual e simples e deve ser migrado para algoritmo dedicado (argon2/bcrypt).
- O comando de lint atualmente acusa erros em arquivos de backup e alguns pontos do app.

## Banco de dados (alto nivel)

Entidades usadas no projeto:

- usuarios
- notificacoes
- notas_vendedor
- page_logs
- config
- dados comerciais de pedidos/itens/clientes/vendedores

Observacao de nomenclatura:

- As tabelas `ped_vda` e `it_pedv` sao nomes legados no banco.
- No fluxo atual, elas armazenam dados derivados da importacao da planilha `dados_app`.
- `nao_positivados` e `top_20_clientes` seguem o fluxo proprio via parser/servicos de planilha.

Scripts SQL de suporte estao em:

- sql/
- supabase/

## Documentacao complementar

- docs/DOCUMENTACAO_TECNICA.md
- docs/EXECUTAR_SQL_SUPABASE.md
- docs/PLANO_TESTE_SUPERVISOR.md
- archive/README_OFFICIAL.md

## Licenca

Privado - Grupo Arantes
