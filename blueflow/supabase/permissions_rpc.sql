-- Atualizar RPC get_kpis para aceitar filtro de vendedor
-- Observacao: cd_vend_filter e nome legado de parametro mantido por compatibilidade.
CREATE OR REPLACE FUNCTION get_kpis(
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
AS $$
DECLARE
  vendedor_codigo_filter TEXT := cd_vend_filter;
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
      AND (vendedor_codigo_filter IS NULL OR p.cd_vend = vendedor_codigo_filter)
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

-- Atualizar RPC get_top_clients para aceitar filtro de vendedor
-- Observacao: cd_vend_filter e nome legado de parametro mantido por compatibilidade.
CREATE OR REPLACE FUNCTION get_top_clients(
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
AS $$
DECLARE
  vendedor_codigo_filter TEXT := cd_vend_filter;
BEGIN
  RETURN QUERY
  SELECT
    p.nm_clie,
    COUNT(*) AS "totalPurchases",
    SUM(p.total) AS "totalAmount",
    MAX(p.dt_ped::TEXT) AS "lastPurchaseDate"
  FROM ped_vda p
  WHERE (start_date IS NULL OR p.dt_ped >= start_date)
    AND (end_date IS NULL OR p.dt_ped <= end_date)
    AND (vendedor_codigo_filter IS NULL OR p.cd_vend = vendedor_codigo_filter)
  GROUP BY p.nm_clie
  ORDER BY "totalAmount" DESC
  LIMIT 10;
END;
$$;
