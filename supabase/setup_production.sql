-- ======================================================================
-- BLUEFLOW - SETUP PARA PRODUÇÃO
-- Usa sincronização n8n: SQL Server → Supabase
-- Limpa dados de teste e configura RPCs com cálculos REAIS
-- ======================================================================

-- 0. LIMPAR DADOS DE TESTE (opcional - descomente se necessário)
-- DELETE FROM it_pedv;
-- DELETE FROM ped_vda;

-- 1. Criar/atualizar usuários
-- Usuário demo (gerência)
INSERT INTO usuarios (usuario, senha_hash, perfil)
VALUES ('demo', 'demo123', 'gerencia')
ON CONFLICT (usuario) DO UPDATE SET
  senha_hash = 'demo123',
  perfil = 'gerencia';

-- Usuário admin (acesso total para importação)
INSERT INTO usuarios (usuario, senha_hash, perfil)
VALUES ('admin', 'admin123', 'admin')
ON CONFLICT (usuario) DO UPDATE SET
  senha_hash = 'admin123',
  perfil = 'admin';

-- 2. KPIs Gerais - COM MARGEM CORRETA
-- Margem = (vl_venda - vl_venda_av + vl_mg_brt_cmp) / vl_venda
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_kpis(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
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
AS $$
BEGIN
  RETURN QUERY
  WITH pedidos_filtrados AS (
    SELECT 
      p.total,
      COALESCE(SUM(i.vl_venda - COALESCE(i.vl_venda_av, 0) + COALESCE(i.vl_mg_brt_cmp, 0)), 0) AS lucro_total
    FROM ped_vda p
    LEFT JOIN it_pedv i ON p.nu_ped = i.nu_ped
    WHERE (start_date IS NULL OR p.dt_ped >= start_date)
      AND (end_date IS NULL OR p.dt_ped <= end_date)
    GROUP BY p.nu_ped, p.total
  )
  SELECT
    COALESCE(SUM(total), 0) AS "totalRevenue",
    COALESCE(SUM(lucro_total), 0) AS "totalProfit",
    CASE 
      WHEN SUM(total) > 0 THEN ROUND((COALESCE(SUM(lucro_total), 0) / SUM(total)) * 100, 2)
      ELSE 0
    END AS "profitMargin",
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND(SUM(total) / COUNT(*), 2)
      ELSE 0
    END AS "averageTicket",
    COUNT(*) AS "totalOrders"
  FROM pedidos_filtrados;
END;
$$;

-- 3. Vendas ao Longo do Tempo com Lucro REAL
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_sales_over_time(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  date TEXT,
  revenue NUMERIC,
  profit NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(p.dt_ped, 'YYYY-MM-DD') AS date,
    COALESCE(SUM(p.total), 0) AS revenue,
    COALESCE(SUM(i.vl_venda - COALESCE(i.vl_venda_av, 0) + COALESCE(i.vl_mg_brt_cmp, 0)), 0) AS profit
  FROM ped_vda p
  LEFT JOIN it_pedv i ON p.nu_ped = i.nu_ped
  WHERE (start_date IS NULL OR p.dt_ped >= start_date)
    AND (end_date IS NULL OR p.dt_ped <= end_date)
  GROUP BY p.dt_ped
  ORDER BY p.dt_ped ASC
  LIMIT 365;
END;
$$;

-- 4. Top 10 Produtos (Por Receita)
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_top_products(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  "productName" TEXT,
  quantity BIGINT,
  revenue NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'Item ' || i.nu_item::TEXT AS "productName",
    SUM(i.qtd)::BIGINT AS quantity,
    COALESCE(SUM(i.vl_venda * i.qtd), 0) AS revenue
  FROM it_pedv i
  INNER JOIN ped_vda p ON i.nu_ped = p.nu_ped
  WHERE (start_date IS NULL OR p.dt_ped >= start_date)
    AND (end_date IS NULL OR p.dt_ped <= end_date)
  GROUP BY i.nu_item
  ORDER BY revenue DESC
  LIMIT 10;
END;
$$;

-- 5. Vendas por Categoria
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_sales_by_category(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  label TEXT,
  value NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.nm_cat AS label,
    COALESCE(SUM(p.total), 0) AS value
  FROM ped_vda p
  WHERE (start_date IS NULL OR p.dt_ped >= start_date)
    AND (end_date IS NULL OR p.dt_ped <= end_date)
  GROUP BY p.nm_cat
  ORDER BY value DESC;
END;
$$;

-- 6. Performance dos Vendedores
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_seller_performance(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  label TEXT,
  value NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.nm_vend AS label,
    COALESCE(SUM(p.total), 0) AS value
  FROM ped_vda p
  WHERE (start_date IS NULL OR p.dt_ped >= start_date)
    AND (end_date IS NULL OR p.dt_ped <= end_date)
  GROUP BY p.nm_vend
  ORDER BY value DESC;
END;
$$;

-- 7. Top Clientes
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_top_clients(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  "clientName" TEXT,
  "totalPurchases" BIGINT,
  "totalAmount" NUMERIC,
  "lastPurchaseDate" TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.nm_clie AS "clientName",
    COUNT(p.nu_ped)::BIGINT AS "totalPurchases",
    COALESCE(SUM(p.total), 0) AS "totalAmount",
    TO_CHAR(MAX(p.dt_ped), 'YYYY-MM-DD') AS "lastPurchaseDate"
  FROM ped_vda p
  WHERE (start_date IS NULL OR p.dt_ped >= start_date)
    AND (end_date IS NULL OR p.dt_ped <= end_date)
  GROUP BY p.nm_clie
  ORDER BY "totalAmount" DESC
  LIMIT 10;
END;
$$;

-- 8. Instruções para n8n sincronização
-- ==============================================================================
-- O n8n deve sincronizar os seguintes campos do SQL Server para Supabase:
--
-- TABELA: ped_vda
--   - nu_ped (BIGINT, PK)
--   - dt_ped (DATE)
--   - total (NUMERIC)
--   - cd_vend (TEXT)
--   - nm_vend (TEXT)
--   - cd_clie (BIGINT)
--   - nm_clie (TEXT)
--   - cd_cid (BIGINT)
--   - nm_cid (TEXT)
--   - cd_cat (TEXT)
--   - nm_cat (TEXT)
--
-- TABELA: it_pedv
--   - id (BIGSERIAL, PK - gerado automaticamente)
--   - nu_ped (BIGINT, FK referencia ped_vda.nu_ped)
--   - nu_item (BIGINT)
--   - qtd (NUMERIC)
--   - vl_unit (NUMERIC - vl_unit_vda do SQL Server)
--   - vl_venda (NUMERIC)
--   ★ vl_venda_av (NUMERIC - desconto, IMPORTANTE para margem!)
--   ★ vl_mg_brt_cmp (NUMERIC - margem bruta compra, IMPORTANTE para lucro!)
--   - cd_prod (TEXT)
--   - nm_prod (TEXT)
--
-- FÓRMULAS USADAS PELAS RPCs:
--   Lucro do item = vl_venda - vl_venda_av + vl_mg_brt_cmp
--   Margem % = (Lucro / vl_venda) * 100
--
-- Verificar dados inseridos:
SELECT COUNT(*) as total_pedidos, SUM(total) as total_vendas FROM ped_vda;
SELECT COUNT(*) as total_itens FROM it_pedv;
