# Checklist de Validacao por Perfil

## Objetivo

Garantir que os filtros e dados respeitam o escopo de acesso:

1. vendedor ve apenas os proprios dados
2. supervisor ve a propria equipe e vendedores da equipe
3. gerencia e admin veem dados globais com filtros

## Escopo de Rotas e Telas

1. Top 20 Clientes (dados e categorias)
2. Nao Positivados (dados e categorias)
3. Dashboard categorias
4. Tratamento de erro no front para 400/401/403

## Evidencias de Implementacao

1. Top 20 clientes: [src/app/api/top-clientes/clientes/route.ts](src/app/api/top-clientes/clientes/route.ts#L1)
2. Top 20 categorias: [src/app/api/top-clientes/categorias/route.ts](src/app/api/top-clientes/categorias/route.ts#L1)
3. Nao positivados clientes: [src/app/api/nao-positivados/clientes/route.ts](src/app/api/nao-positivados/clientes/route.ts#L1)
4. Nao positivados categorias: [src/app/api/nao-positivados/categorias/route.ts](src/app/api/nao-positivados/categorias/route.ts#L1)
5. Dashboard categorias: [src/app/api/categorias/lista/route.ts](src/app/api/categorias/lista/route.ts#L1)
6. Hook com erro explicito de API: [src/hooks/useQueries.ts](src/hooks/useQueries.ts#L1)
7. Banner de erro Top 20: [src/app/top-clientes/page.tsx](src/app/top-clientes/page.tsx#L90)
8. Banner de erro Nao Positivados: [src/app/dashboard/nao-positivados/page.tsx](src/app/dashboard/nao-positivados/page.tsx#L64)

## Matriz de Cenarios

| ID | Perfil | Acao | Resultado esperado |
|---|---|---|---|
| C01 | Sem sessao | Acessar APIs protegidas | 401 Nao autenticado |
| C02 | vendedor | Enviar filtro vendedor diferente do proprio codigo | API ignora filtro externo e usa usuario da sessao |
| C03 | vendedor | Enviar filtro equipe/gerencia | API limita ao proprio contexto |
| C04 | supervisor | Enviar filtro vendedor da propria equipe | 200 com dados |
| C05 | supervisor | Enviar filtro vendedor fora da equipe | 403 Acesso negado |
| C06 | supervisor | Sem filtro vendedor | API fixa contexto por equipe do supervisor |
| C07 | gerencia | Filtrar por vendedor/equipe/gerencia | 200 com filtros aplicados |
| C08 | admin | Filtrar por vendedor/equipe/gerencia | 200 com filtros aplicados |
| C09 | qualquer autenticado | Enviar vendedor/equipe invalido (nao numerico) | 400 Codigo invalido |
| C10 | perfil autenticado | Receber 400/401/403 de API em Top 20 | Front mostra mensagem de erro, sem falha silenciosa |
| C11 | perfil autenticado | Receber 400/401/403 de API em Nao Positivados | Front mostra mensagem de erro, sem falha silenciosa |

## Roteiro de Execucao Manual

1. Autenticar como vendedor e abrir Top 20 e Nao Positivados.
2. Tentar forcar filtros no query string para vendedor/equipe distintos do usuario.
3. Confirmar que a resposta continua restrita ao proprio usuario.
4. Autenticar como supervisor e selecionar vendedor da propria equipe.
5. Confirmar retorno de dados e categorias.
6. Forcar vendedor de outra equipe no query string e validar 403.
7. Autenticar como gerencia e testar filtros de gerencia, equipe e vendedor.
8. Autenticar como admin e repetir filtros amplos.
9. Em cada tela, provocar erro 400 (codigo invalido) e validar banner de erro visivel.
10. Em sessao expirada, validar 401 e redirecionamento/comportamento esperado no front.

## Criterios de Aprovacao

1. Nenhuma rota protegida aceita acesso sem sessao.
2. Nenhuma rota de vendedor/supervisor permite leitura fora do escopo.
3. Todos os erros 400/401/403 relevantes aparecem no front com mensagem clara.
4. Nao ha fallback para lista vazia em erro de autorizacao ou parametro invalido.

## Status Atual por Inspecao de Codigo

1. C01 a C09: Cobertos por validacoes server-side implementadas.
2. C10 e C11: Cobertos por tratamento de erro em hooks e banner nas paginas.
3. Validacao runtime ponta a ponta: pendente execucao manual com perfis reais e sessao valida.