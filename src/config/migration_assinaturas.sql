-- ═══════════════════════════════════════════════════════════
-- MIGRAÇÃO: Sistema de Assinaturas RotaJá
-- ═══════════════════════════════════════════════════════════
-- Execute este script no Supabase Dashboard > SQL Editor
-- Data: 2026-05-20
--
-- Em seguida execute: src/config/migration_security_plans.sql
-- (RPCs seguras, triggers de limite e proteção contra auto-upgrade)
-- ═══════════════════════════════════════════════════════════

-- 1. Limpar tabela legada se existir e criar nova estrutura
DROP TABLE IF EXISTS assinaturas CASCADE;

CREATE TABLE assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Vínculo com o usuário
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tipo do usuário (motorista ou empresa)
  tipo_usuario TEXT NOT NULL CHECK (tipo_usuario IN ('motorista', 'empresa')),
  
  -- Plano atual
  tipo_plano TEXT NOT NULL DEFAULT 'gratuito' 
    CHECK (tipo_plano IN ('gratuito', 'bronze', 'prata', 'ouro')),
  
  -- Status da assinatura
  status_assinatura TEXT NOT NULL DEFAULT 'trial' 
    CHECK (status_assinatura IN ('trial', 'ativo', 'expirado', 'cancelado', 'inadimplente')),
  
  -- Período de trial
  trial_inicio TIMESTAMPTZ,
  trial_fim TIMESTAMPTZ,
  
  -- Período da assinatura paga
  assinatura_inicio TIMESTAMPTZ,
  assinatura_fim TIMESTAMPTZ,
  
  -- Pagamento
  status_pagamento TEXT DEFAULT 'pendente' 
    CHECK (status_pagamento IN ('pendente', 'aprovado', 'recusado', 'cancelado', 'reembolsado')),
  metodo_pagamento TEXT 
    CHECK (metodo_pagamento IS NULL OR metodo_pagamento IN ('cartao', 'pix', 'boleto')),
  
  -- Renovação
  renovacao_automatica BOOLEAN DEFAULT true,
  
  -- Stripe (para integração futura)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  -- Datas de pagamento
  ultimo_pagamento TIMESTAMPTZ,
  proximo_pagamento TIMESTAMPTZ,
  
  -- Histórico de mudanças de plano (JSONB array)
  historico_planos JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Cada user_id só pode ter uma assinatura
  UNIQUE(user_id)
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_assinaturas_user_id ON assinaturas(user_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON assinaturas(status_assinatura);
CREATE INDEX IF NOT EXISTS idx_assinaturas_tipo_plano ON assinaturas(tipo_plano);
CREATE INDEX IF NOT EXISTS idx_assinaturas_trial_fim ON assinaturas(trial_fim);
CREATE INDEX IF NOT EXISTS idx_assinaturas_assinatura_fim ON assinaturas(assinatura_fim);

-- 3. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_assinaturas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assinaturas_updated_at ON assinaturas;
CREATE TRIGGER trigger_assinaturas_updated_at
  BEFORE UPDATE ON assinaturas
  FOR EACH ROW
  EXECUTE FUNCTION update_assinaturas_updated_at();

-- 4. RLS (Row Level Security)
ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;

-- Política: usuário pode ler sua própria assinatura
CREATE POLICY "Usuarios podem ler propria assinatura"
  ON assinaturas FOR SELECT
  USING (auth.uid() = user_id);

-- Política: usuário pode inserir sua própria assinatura
CREATE POLICY "Usuarios podem criar propria assinatura"
  ON assinaturas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: usuário pode atualizar sua própria assinatura
CREATE POLICY "Usuarios podem atualizar propria assinatura"
  ON assinaturas FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Comentários na tabela
COMMENT ON TABLE assinaturas IS 'Gerencia assinaturas, planos e permissões dos usuários do RotaJá';
COMMENT ON COLUMN assinaturas.tipo_plano IS 'Tier do plano: gratuito, bronze, prata, ouro';
COMMENT ON COLUMN assinaturas.status_assinatura IS 'Status: trial, ativo, expirado, cancelado, inadimplente';
COMMENT ON COLUMN assinaturas.historico_planos IS 'Array JSON com histórico de mudanças: [{plano, data, acao}]';
