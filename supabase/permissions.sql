-- ==============================================================================
-- PERMISSOES PARA RPCs
-- ==============================================================================
-- Execute este arquivo para garantir que as funcoes possam ser chamadas
-- pelo frontend atraves do Supabase anon key
-- ==============================================================================

-- Conceder permissao de execucao para usuario autenticado
GRANT EXECUTE ON FUNCTION get_kpis(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_over_time(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_products(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_by_category(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_seller_performance(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_clients(DATE, DATE) TO authenticated;

-- Conceder permissao de execucao para usuario anonimo (importante!)
GRANT EXECUTE ON FUNCTION get_kpis(DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION get_sales_over_time(DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION get_top_products(DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION get_sales_by_category(DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION get_seller_performance(DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION get_top_clients(DATE, DATE) TO anon;

-- Verificar permissoes criadas
SELECT 
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_name LIKE 'get_%'
  AND routine_schema = 'public'
ORDER BY routine_name, grantee;
