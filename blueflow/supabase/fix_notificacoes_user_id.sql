-- Corrigir campo user_id para texto
ALTER TABLE notificacoes ALTER COLUMN user_id TYPE TEXT;
-- Remover referência ao users(id)
-- (Se houver constraint, remova)
ALTER TABLE notificacoes DROP CONSTRAINT IF EXISTS notificacoes_user_id_fkey;
-- Pronto para uso com nomes de usuário
