CREATE TABLE IF NOT EXISTS chamado_mensagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chamado_id UUID NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
    autor_codigo TEXT NOT NULL,
    autor_perfil TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chamado_mensagens_chamado_id
    ON chamado_mensagens(chamado_id);

CREATE INDEX IF NOT EXISTS idx_chamado_mensagens_created_at
    ON chamado_mensagens(created_at);
