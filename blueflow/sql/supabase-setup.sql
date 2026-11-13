-- Script SQL para configurar a tabela de metadata do Excel no Supabase
-- Execute este script no SQL Editor do Supabase Dashboard

-- Criar tabela para armazenar metadata do arquivo Excel
CREATE TABLE IF NOT EXISTS excel_metadata (
  id INTEGER PRIMARY KEY,
  filename TEXT NOT NULL,
  uploaded_at BIGINT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir registro inicial (opcional, será criado automaticamente no primeiro upload)
INSERT INTO excel_metadata (id, filename, uploaded_at, updated_at)
VALUES (1, 'dados_app.xlsx', EXTRACT(EPOCH FROM NOW()) * 1000, NOW())
ON CONFLICT (id) DO NOTHING;

-- Habilitar Row Level Security (RLS)
ALTER TABLE excel_metadata ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura por todos (autenticados)
CREATE POLICY "Permitir leitura para todos" ON excel_metadata
  FOR SELECT
  USING (true);

-- Política para permitir inserção/atualização apenas para service_role
-- (o service_role_key já tem acesso total, mas é bom documentar)
CREATE POLICY "Permitir escrita para admin" ON excel_metadata
  FOR ALL
  USING (true);

-- Comentários explicativos
COMMENT ON TABLE excel_metadata IS 'Armazena informações sobre o último upload do arquivo Excel';
COMMENT ON COLUMN excel_metadata.id IS 'ID fixo (sempre 1 para o arquivo principal)';
COMMENT ON COLUMN excel_metadata.filename IS 'Nome do arquivo';
COMMENT ON COLUMN excel_metadata.uploaded_at IS 'Timestamp em millisegundos (Unix Epoch) do upload';
COMMENT ON COLUMN excel_metadata.updated_at IS 'Data/hora da última atualização';
