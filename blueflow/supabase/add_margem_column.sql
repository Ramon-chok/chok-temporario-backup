-- ==============================================================================
-- Adicionar coluna de margem bruta na tabela it_pedv
-- ==============================================================================

-- Adicionar coluna vl_mg_brt (margem bruta + financeiro)
ALTER TABLE it_pedv ADD COLUMN IF NOT EXISTS vl_mg_brt NUMERIC DEFAULT 0;

-- Comentário explicativo
COMMENT ON COLUMN it_pedv.vl_mg_brt IS 'Margem bruta + financeiro (coluna mgbr + fin$ do Excel)';

-- Verificar estrutura atualizada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'it_pedv'
ORDER BY ordinal_position;
