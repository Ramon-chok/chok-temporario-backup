-- ==============================================================================
-- Atualizar get_kpis com cálculo CORRETO de margem
-- ==============================================================================
-- Margem = (mgbr + fin$) / vl_venda * 100
-- ==============================================================================

DROP FUNCTION IF EXISTS get_kpis(DATE, DATE);

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
    -- Receita total: soma dos totais dos pedidos
    COALESCE(SUM(p.total), 0) AS "totalRevenue",
    
    -- Lucro total: soma da margem bruta de todos os itens
    COALESCE(
      (SELECT SUM(i.vl_mg_brt) 
       FROM it_pedv i 
       INNER JOIN ped_vda p2 ON i.nu_ped = p2.nu_ped
       WHERE (start_date IS NULL OR p2.dt_ped >= start_date)
         AND (end_date IS NULL OR p2.dt_ped <= end_date)
      ), 0
    ) AS "totalProfit",
    
    -- Margem de lucro: (soma vl_mg_brt / soma vl_venda) * 100
    CASE 
      WHEN (SELECT SUM(i.vl_venda) 
            FROM it_pedv i 
            INNER JOIN ped_vda p2 ON i.nu_ped = p2.nu_ped
            WHERE (start_date IS NULL OR p2.dt_ped >= start_date)
              AND (end_date IS NULL OR p2.dt_ped <= end_date)
           ) > 0 
      THEN (
        (SELECT SUM(i.vl_mg_brt) 
         FROM it_pedv i 
         INNER JOIN ped_vda p2 ON i.nu_ped = p2.nu_ped
         WHERE (start_date IS NULL OR p2.dt_ped >= start_date)
           AND (end_date IS NULL OR p2.dt_ped <= end_date)
        ) / 
        (SELECT SUM(i.vl_venda) 
         FROM it_pedv i 
         INNER JOIN ped_vda p2 ON i.nu_ped = p2.nu_ped
         WHERE (start_date IS NULL OR p2.dt_ped >= start_date)
           AND (end_date IS NULL OR p2.dt_ped <= end_date)
        ) * 100
      )
      ELSE 0
    END AS "profitMargin",
    
    -- Ticket médio: receita total / número de pedidos
    CASE 
      WHEN COUNT(p.nu_ped) > 0 THEN COALESCE(SUM(p.total) / COUNT(p.nu_ped), 0)
      ELSE 0
    END AS "averageTicket",
    
    -- Total de pedidos
    COUNT(p.nu_ped) AS "totalOrders"
    
  FROM ped_vda p
  WHERE (start_date IS NULL OR p.dt_ped >= start_date)
    AND (end_date IS NULL OR p.dt_ped <= end_date);
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION get_kpis(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_kpis(DATE, DATE) TO anon;

-- Testar a função
SELECT * FROM get_kpis(NULL, NULL);
