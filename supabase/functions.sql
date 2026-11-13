-- ==============================================================================
-- BLUEFLOW - RPCs (Remote Procedure Calls) para Dashboard
-- ==============================================================================
-- Execute este arquivo no Supabase SQL Editor para criar todas as funcoes
-- necessarias para o dashboard funcionar com dados reais.
-- Todas as funcoes aceitam parametros de data (opcional) para filtros.
-- ==============================================================================

-- 1. KPIs Gerais (Receita, Lucro, Margem, Ticket Medio, Total de Pedidos)
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
  SELECT
    COALESCE(SUM(p.total), 0) AS "totalRevenue",
    COALESCE(SUM(p.total * 0.30), 0) AS "totalProfit",
    CASE 
      WHEN SUM(p.total) > 0 THEN 30.0
      ELSE 0
    END AS "profitMargin",
    CASE 
      WHEN COUNT(p.nu_ped) > 0 THEN COALESCE(SUM(p.total) / COUNT(p.nu_ped), 0)
      ELSE 0
    END AS "averageTicket",
    COUNT(p.nu_ped) AS "totalOrders"
  FROM ped_vda p
  WHERE (start_date IS NULL OR p.dt_ped >= start_date)
    AND (end_date IS NULL OR p.dt_ped <= end_date);
END;
$$;

-- 2. Vendas ao Longo do Tempo (Receita e Lucro por Dia)
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
    COALESCE(SUM(p.total * 0.30), 0) AS profit
  FROM ped_vda p
  WHERE (start_date IS NULL OR p.dt_ped >= start_date)
    AND (end_date IS NULL OR p.dt_ped <= end_date)
  GROUP BY p.dt_ped
  ORDER BY p.dt_ped ASC
  LIMIT 365;
END;
$$;

-- 3. Top 10 Produtos (Por Receita)
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

-- 4. Vendas por Categoria (Agrupamento por Faixa de Valor)
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
    CASE 
      WHEN i.vl_venda >= 1000 THEN 'Premium'
      WHEN i.vl_venda >= 500 THEN 'Intermediário'
      WHEN i.vl_venda >= 100 THEN 'Básico'
      ELSE 'Econômico'
    END AS label,
    COALESCE(SUM(i.vl_venda * i.qtd), 0) AS value
  FROM it_pedv i
  INNER JOIN ped_vda p ON i.nu_ped = p.nu_ped
  WHERE (start_date IS NULL OR p.dt_ped >= start_date)
    AND (end_date IS NULL OR p.dt_ped <= end_date)
  GROUP BY label
  ORDER BY value DESC;
END;
$$;

-- 5. Performance por Vendedor (Top Vendedores por Receita)
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
    COALESCE(v.nome_gue, 'Vendedor ' || p.cd_vend) AS label,
    COALESCE(SUM(p.total), 0) AS value
  FROM ped_vda p
  LEFT JOIN vendedor v ON p.cd_vend = v.cd_vend
  WHERE (start_date IS NULL OR p.dt_ped >= start_date)
    AND (end_date IS NULL OR p.dt_ped <= end_date)
  GROUP BY v.nome_gue, p.cd_vend
  ORDER BY value DESC
  LIMIT 10;
END;
$$;

-- 6. Top 10 Clientes (Por Total Gasto)
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
    COALESCE(c.nome, 'Cliente ' || p.cd_clien) AS "clientName",
    COUNT(p.nu_ped) AS "totalPurchases",
    COALESCE(SUM(p.total), 0) AS "totalAmount",
    TO_CHAR(MAX(p.dt_ped), 'YYYY-MM-DD') AS "lastPurchaseDate"
  FROM ped_vda p
  LEFT JOIN cliente c ON p.cd_clien = c.cd_clien
  WHERE (start_date IS NULL OR p.dt_ped >= start_date)
    AND (end_date IS NULL OR p.dt_ped <= end_date)
  GROUP BY c.nome, p.cd_clien
  ORDER BY "totalAmount" DESC
  LIMIT 10;
END;
$$;

-- ==============================================================================
-- TESTE DAS FUNCOES (Opcional - Execute para validar)
-- ==============================================================================

-- Testar KPIs sem filtro de data
-- SELECT * FROM get_kpis(NULL, NULL);

-- Testar vendas ao longo do tempo (ultimos 30 dias)
-- SELECT * FROM get_sales_over_time(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE);

-- Testar top produtos
-- SELECT * FROM get_top_products(NULL, NULL);

-- Testar vendas por categoria
-- SELECT * FROM get_sales_by_category(NULL, NULL);

-- Testar performance de vendedores
-- SELECT * FROM get_seller_performance(NULL, NULL);

-- Testar top clientes
-- SELECT * FROM get_top_clients(NULL, NULL);

-- ==============================================================================
-- PERMISSOES (Importante para seguranca)
-- ==============================================================================
-- As funcoes precisam ser acessiveis pelo usuario autenticado.
-- Execute estas permissoes se necessario:

-- GRANT EXECUTE ON FUNCTION get_kpis TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_sales_over_time TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_top_products TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_sales_by_category TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_seller_performance TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_top_clients TO authenticated;
