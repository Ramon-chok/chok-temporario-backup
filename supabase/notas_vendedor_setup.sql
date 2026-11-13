-- ============================================
-- TABELA NOTAS_VENDEDOR
-- Sistema de notas pessoais com reset mensal
-- ============================================

-- Criar tabela de notas
CREATE TABLE IF NOT EXISTS notas_vendedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_codigo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mes_criacao INTEGER NOT NULL DEFAULT EXTRACT(MONTH FROM NOW()),
  ano_criacao INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())
);

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_notas_usuario ON notas_vendedor(usuario_codigo);
CREATE INDEX IF NOT EXISTS idx_notas_data ON notas_vendedor(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_notas_mes_ano ON notas_vendedor(mes_criacao, ano_criacao);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE notas_vendedor ENABLE ROW LEVEL SECURITY;

-- Política: Vendedor só vê suas próprias notas
CREATE POLICY "Vendedor vê suas próprias notas"
  ON notas_vendedor
  FOR SELECT
  USING (
    usuario_codigo = (
      SELECT usuario 
      FROM usuarios 
      WHERE id = auth.uid()
    )
  );

-- Política: Vendedor só cria suas próprias notas
CREATE POLICY "Vendedor cria suas próprias notas"
  ON notas_vendedor
  FOR INSERT
  WITH CHECK (
    usuario_codigo = (
      SELECT usuario 
      FROM usuarios 
      WHERE id = auth.uid()
    )
  );

-- Política: Vendedor só atualiza suas próprias notas
CREATE POLICY "Vendedor atualiza suas próprias notas"
  ON notas_vendedor
  FOR UPDATE
  USING (
    usuario_codigo = (
      SELECT usuario 
      FROM usuarios 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    usuario_codigo = (
      SELECT usuario 
      FROM usuarios 
      WHERE id = auth.uid()
    )
  );

-- Política: Vendedor só deleta suas próprias notas
CREATE POLICY "Vendedor deleta suas próprias notas"
  ON notas_vendedor
  FOR DELETE
  USING (
    usuario_codigo = (
      SELECT usuario 
      FROM usuarios 
      WHERE id = auth.uid()
    )
  );

-- ============================================
-- TRIGGER PARA ATUALIZAR atualizado_em
-- ============================================

CREATE OR REPLACE FUNCTION atualizar_timestamp_nota()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_nota
  BEFORE UPDATE ON notas_vendedor
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_timestamp_nota();

-- ============================================
-- LIMPEZA MENSAL AUTOMÁTICA
-- Trigger que deleta notas do mês anterior no dia 1
-- ============================================

CREATE OR REPLACE FUNCTION limpar_notas_mes_anterior()
RETURNS TRIGGER AS $$
DECLARE
  mes_atual INTEGER := EXTRACT(MONTH FROM NOW());
  ano_atual INTEGER := EXTRACT(YEAR FROM NOW());
BEGIN
  -- Deleta notas que NÃO são do mês/ano atual
  DELETE FROM notas_vendedor
  WHERE 
    mes_criacao != mes_atual 
    OR ano_criacao != ano_atual;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger executado APÓS inserção de qualquer nota
-- Verifica se estamos em um novo mês e limpa dados antigos
CREATE TRIGGER trigger_limpar_notas_antigas
  AFTER INSERT ON notas_vendedor
  FOR EACH ROW
  EXECUTE FUNCTION limpar_notas_mes_anterior();

-- ============================================
-- FUNÇÃO RPC PARA CONTAR NOTAS DO USUÁRIO
-- Usado para validar limite de 20 notas
-- ============================================

CREATE OR REPLACE FUNCTION contar_notas_usuario()
RETURNS INTEGER AS $$
DECLARE
  user_codigo TEXT;
  total_notas INTEGER;
BEGIN
  -- Buscar código do usuário autenticado
  SELECT usuario INTO user_codigo
  FROM usuarios
  WHERE id = auth.uid();
  
  -- Contar notas do mês atual
  SELECT COUNT(*) INTO total_notas
  FROM notas_vendedor
  WHERE 
    usuario_codigo = user_codigo
    AND mes_criacao = EXTRACT(MONTH FROM NOW())
    AND ano_criacao = EXTRACT(YEAR FROM NOW());
  
  RETURN total_notas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTÁRIOS DA TABELA
-- ============================================

COMMENT ON TABLE notas_vendedor IS 'Notas pessoais dos vendedores com reset automático mensal';
COMMENT ON COLUMN notas_vendedor.usuario_codigo IS 'Código do vendedor (campo usuario da tabela usuarios)';
COMMENT ON COLUMN notas_vendedor.titulo IS 'Título da nota (máx 100 caracteres)';
COMMENT ON COLUMN notas_vendedor.conteudo IS 'Conteúdo/corpo da nota (máx 500 caracteres)';
COMMENT ON COLUMN notas_vendedor.mes_criacao IS 'Mês de criação da nota (1-12)';
COMMENT ON COLUMN notas_vendedor.ano_criacao IS 'Ano de criação da nota (ex: 2026)';

-- ============================================
-- TESTE RÁPIDO (OPCIONAL)
-- ============================================

-- Verificar se tabela foi criada
-- SELECT * FROM notas_vendedor LIMIT 1;

-- Verificar políticas RLS
-- SELECT * FROM pg_policies WHERE tablename = 'notas_vendedor';

-- Testar função de contagem
-- SELECT contar_notas_usuario();
