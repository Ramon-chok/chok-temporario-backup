-- Tabela de notificações para chamados
CREATE TABLE notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    chamado_id UUID REFERENCES chamados(id),
    mensagem TEXT NOT NULL,
    status VARCHAR(10) DEFAULT 'nao_lida',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para busca rápida por usuário
CREATE INDEX idx_notificacoes_user_id ON notificacoes(user_id);

-- Índice para busca rápida por chamado
CREATE INDEX idx_notificacoes_chamado_id ON notificacoes(chamado_id);