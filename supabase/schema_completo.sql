-- ==============================================================================
-- BLUEFLOW - SCHEMA COMPLETO (Supabase projeto bqcyefcndtjhhrcggqad)
-- ==============================================================================
-- Consolida tudo que o app usa: tabelas, indices, RLS, RPCs, grants e bucket.
-- Idempotente: pode ser executado mais de uma vez.
-- Derivado de: src/types/supabase.ts, chamadas .from()/.rpc()/.storage do codigo
-- e dos arquivos legados em supabase/*.sql e sql/supabase-setup.sql.
--
-- MODELO DE ACESSO
--  * O app NAO usa Supabase Auth: o login e proprio (tabela usuarios + cookie).
--    Por isso, no navegador, todas as consultas chegam como role "anon".
--  * As rotas /api/* usam a service_role (ignora RLS).
--  * Tabelas lidas direto no navegador (anon): ped_vda, chamados,
--    chamado_mensagens, notificacoes -> recebem policy de SELECT para anon.
--  * Tabelas sensiveis (usuarios, config, notas_vendedor, page_logs,
--    it_pedv, excel_metadata) ficam com RLS ligado e SEM policy para anon
--    (so a service_role acessa).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. usuarios
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuarios (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario     TEXT NOT NULL UNIQUE,
  senha_hash  TEXT,
  perfil      TEXT NOT NULL CHECK (perfil IN ('vendedor', 'supervisor', 'gerencia', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. config (chave/valor - ex.: ultima_atualizacao)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.config (
  key    TEXT PRIMARY KEY,
  value  TEXT
);
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. ped_vda (faturamento - cabecalho) e it_pedv (faturamento - itens)
--    Populadas por /api/import-local a partir do dados_app.xlsm
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ped_vda (
  nu_ped   BIGINT PRIMARY KEY,
  dt_ped   DATE NOT NULL,
  total    NUMERIC NOT NULL DEFAULT 0,
  cd_vend  TEXT NOT NULL,
  nm_vend  TEXT NOT NULL,
  cd_clie  TEXT NOT NULL,
  nm_clie  TEXT NOT NULL,
  cd_cat   TEXT,
  nm_cat   TEXT,
  cd_cid   TEXT,
  nm_cid   TEXT
);
CREATE INDEX IF NOT EXISTS idx_ped_vda_dt_ped  ON public.ped_vda (dt_ped);
CREATE INDEX IF NOT EXISTS idx_ped_vda_cd_vend ON public.ped_vda (cd_vend);
ALTER TABLE public.ped_vda ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.it_pedv (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nu_ped     BIGINT NOT NULL,
  nu_item    BIGINT NOT NULL,
  qtd        NUMERIC NOT NULL,
  vl_unit    NUMERIC NOT NULL,
  vl_venda   NUMERIC NOT NULL,
  vl_mg_brt  NUMERIC DEFAULT 0,   -- margem bruta + financeiro (coluna "mgbr + fin$")
  cd_prod    TEXT,
  nm_prod    TEXT
);
-- Sem FK para ped_vda de proposito: o import apaga/reinsere ped_vda e it_pedv em lotes.
CREATE INDEX IF NOT EXISTS idx_it_pedv_nu_ped ON public.it_pedv (nu_ped);
ALTER TABLE public.it_pedv ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. chamados e chamado_mensagens
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chamados (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT,
  codigo        TEXT NOT NULL,                 -- usuario que abriu o chamado
  descricao     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'aberto', -- aberto | em andamento | encerrado
  data_criacao  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chamados_status       ON public.chamados (status);
CREATE INDEX IF NOT EXISTS idx_chamados_data_criacao ON public.chamados (data_criacao DESC);
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.chamado_mensagens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id    UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  autor_codigo  TEXT NOT NULL,
  autor_perfil  TEXT NOT NULL,
  mensagem      TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chamado_mensagens_chamado_id ON public.chamado_mensagens (chamado_id);
CREATE INDEX IF NOT EXISTS idx_chamado_mensagens_created_at ON public.chamado_mensagens (created_at);
ALTER TABLE public.chamado_mensagens ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 5. notificacoes (user_id = nome de usuario, nao uuid)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  chamado_id  UUID,
  mensagem    TEXT NOT NULL,
  status      VARCHAR(10) NOT NULL DEFAULT 'nao_lida',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_id    ON public.notificacoes (user_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_chamado_id ON public.notificacoes (chamado_id);
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 6. notas_vendedor (notas pessoais, reset mensal)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notas_vendedor (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_codigo TEXT NOT NULL,
  titulo         TEXT NOT NULL,
  conteudo       TEXT NOT NULL,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mes_criacao    INTEGER NOT NULL DEFAULT EXTRACT(MONTH FROM NOW()),
  ano_criacao    INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())
);
CREATE INDEX IF NOT EXISTS idx_notas_usuario ON public.notas_vendedor (usuario_codigo);
CREATE INDEX IF NOT EXISTS idx_notas_data    ON public.notas_vendedor (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_notas_mes_ano ON public.notas_vendedor (mes_criacao, ano_criacao);
ALTER TABLE public.notas_vendedor ENABLE ROW LEVEL SECURITY;
-- (As policies antigas comparavam usuarios.id com auth.uid(); como o app nao usa
--  Supabase Auth e usuarios.id e numerico, elas nunca funcionariam. O acesso e
--  feito exclusivamente pela API com service_role.)

CREATE OR REPLACE FUNCTION public.atualizar_timestamp_nota()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_nota ON public.notas_vendedor;
CREATE TRIGGER trigger_atualizar_nota
  BEFORE UPDATE ON public.notas_vendedor
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp_nota();

CREATE OR REPLACE FUNCTION public.limpar_notas_mes_anterior()
RETURNS TRIGGER AS $$
DECLARE
  mes_atual INTEGER := EXTRACT(MONTH FROM NOW());
  ano_atual INTEGER := EXTRACT(YEAR FROM NOW());
BEGIN
  DELETE FROM public.notas_vendedor
  WHERE mes_criacao != mes_atual OR ano_criacao != ano_atual;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_limpar_notas_antigas ON public.notas_vendedor;
CREATE TRIGGER trigger_limpar_notas_antigas
  AFTER INSERT ON public.notas_vendedor
  FOR EACH ROW EXECUTE FUNCTION public.limpar_notas_mes_anterior();

-- ------------------------------------------------------------------------------
-- 7. page_logs (rastreamento de paginas; lido/escrito pela API)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.page_logs (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id          TEXT,
  user_email       TEXT,
  page_path        TEXT NOT NULL,
  page_name        TEXT NOT NULL,
  session_id       TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_page_logs_created_at ON public.page_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_logs_page_path  ON public.page_logs (page_path);
CREATE INDEX IF NOT EXISTS idx_page_logs_user_id    ON public.page_logs (user_id);
ALTER TABLE public.page_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 8. excel_metadata (metadata do ultimo upload de Excel)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.excel_metadata (
  id          INTEGER PRIMARY KEY,
  filename    TEXT NOT NULL,
  uploaded_at BIGINT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.excel_metadata ENABLE ROW LEVEL SECURITY;
INSERT INTO public.excel_metadata (id, filename, uploaded_at, updated_at)
VALUES (1, 'dados_app.xlsx', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT, NOW())
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 9. RPCs usadas pelo app (useQueries.ts / import-local)
--    Versao final: margem real via it_pedv.vl_mg_brt + filtro por vendedor.
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_kpis(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_kpis(DATE, DATE, TEXT);
CREATE OR REPLACE FUNCTION public.get_kpis(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  cd_vend_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  "totalRevenue" NUMERIC,
  "totalProfit" NUMERIC,
  "profitMargin" NUMERIC,
  "averageTicket" NUMERIC,
  "totalOrders" BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH pedidos AS (
    SELECT p.nu_ped, p.total
    FROM ped_vda p
    WHERE (start_date IS NULL OR p.dt_ped >= start_date)
      AND (end_date IS NULL OR p.dt_ped <= end_date)
      AND (cd_vend_filter IS NULL OR p.cd_vend = cd_vend_filter)
  ),
  itens AS (
    SELECT COALESCE(SUM(i.vl_mg_brt), 0) AS lucro,
           COALESCE(SUM(i.vl_venda), 0)  AS venda
    FROM it_pedv i
    INNER JOIN pedidos p ON p.nu_ped = i.nu_ped
  )
  SELECT
    COALESCE((SELECT SUM(total) FROM pedidos), 0)::NUMERIC,
    (SELECT lucro FROM itens)::NUMERIC,
    CASE WHEN (SELECT venda FROM itens) > 0
         THEN (SELECT lucro FROM itens) / (SELECT venda FROM itens) * 100
         ELSE 0 END::NUMERIC,
    CASE WHEN (SELECT COUNT(*) FROM pedidos) > 0
         THEN COALESCE((SELECT SUM(total) FROM pedidos), 0) / (SELECT COUNT(*) FROM pedidos)
         ELSE 0 END::NUMERIC,
    (SELECT COUNT(*) FROM pedidos)::BIGINT;
END;
$$;

DROP FUNCTION IF EXISTS public.get_top_clients(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_top_clients(DATE, DATE, TEXT);
CREATE OR REPLACE FUNCTION public.get_top_clients(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  cd_vend_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  "clientName" TEXT,
  "totalPurchases" BIGINT,
  "totalAmount" NUMERIC,
  "lastPurchaseDate" TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.nm_clie::TEXT,
    COUNT(*)::BIGINT,
    COALESCE(SUM(p.total), 0)::NUMERIC,
    MAX(p.dt_ped)::TEXT
  FROM ped_vda p
  WHERE (start_date IS NULL OR p.dt_ped >= start_date)
    AND (end_date IS NULL OR p.dt_ped <= end_date)
    AND (cd_vend_filter IS NULL OR p.cd_vend = cd_vend_filter)
  GROUP BY p.nm_clie
  ORDER BY 3 DESC
  LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_kpis(DATE, DATE, TEXT)        TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_top_clients(DATE, DATE, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 10. Policies para leitura direta pelo navegador (role anon)
--     Replica o comportamento anterior do app. Veja observacao de seguranca no
--     final do arquivo.
-- ------------------------------------------------------------------------------
GRANT SELECT ON public.ped_vda, public.chamados, public.chamado_mensagens, public.notificacoes
  TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_ped_vda" ON public.ped_vda;
CREATE POLICY "anon_select_ped_vda" ON public.ped_vda
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_chamados" ON public.chamados;
CREATE POLICY "anon_select_chamados" ON public.chamados
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_chamado_mensagens" ON public.chamado_mensagens;
CREATE POLICY "anon_select_chamado_mensagens" ON public.chamado_mensagens
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_notificacoes" ON public.notificacoes;
CREATE POLICY "anon_select_notificacoes" ON public.notificacoes
  FOR SELECT TO anon, authenticated USING (true);

-- ------------------------------------------------------------------------------
-- 11. Storage: bucket "excel-files" (privado; acessado via service_role)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('excel-files', 'excel-files', false)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 12. Dados iniciais minimos
--     Os usuarios reais sao importados por scripts/importar_usuarios_excel.js
--     (a partir de usuarios.xlsx). Nenhum usuario com senha fraca e criado aqui.
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- OBSERVACAO DE SEGURANCA
-- ped_vda, chamados, chamado_mensagens e notificacoes ficam legiveis por qualquer
-- portador da publishable/anon key, pois o frontend as consulta direto. Para
-- fechar isso, mover essas leituras para rotas /api (service_role) e remover as
-- policies "anon_*" acima.
-- ==============================================================================

NOTIFY pgrst, 'reload schema';
