-- ==============================================================================
-- FIX: Atualizar get_kpis para funcionar sem vl_venda_av e vl_mg_brt_cmp
-- ==============================================================================
-- Execute este SQL no Supabase SQL Editor para corrigir a função
-- ==============================================================================

-- Remover função antiga (se existir)
DROP FUNCTION IF EXISTS get_kpis(DATE, DATE);

-- Criar função corrigida (sem referências a colunas que não existem)
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
    -- Receita total: soma de todos os pedidos
    COALESCE(SUM(p.total), 0) AS "totalRevenue",
    
    -- Lucro estimado: 30% da receita (ajustar conforme regra de negócio)
    COALESCE(SUM(p.total * 0.30), 0) AS "totalProfit",
    
    -- Margem de lucro: sempre 30% (ou 0 se sem receita)
    CASE 
      WHEN SUM(p.total) > 0 THEN 30.0
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
