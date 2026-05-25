-- ═══════════════════════════════════════════════════════════
-- LEGADO: use migration_security_plans.sql (versão consolidada)
-- ═══════════════════════════════════════════════════════════
-- Este arquivo foi substituído por:
--   src/config/migration_security_plans.sql
-- (triggers de motorista + empresa + RPCs + proteção de assinatura)
-- Mantido apenas como referência. Não execute os dois scripts duplicados.
-- ═══════════════════════════════════════════════════════════

-- 1. Criar a função trigger de validação de limites
CREATE OR REPLACE FUNCTION check_motorista_freight_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_tipo_plano TEXT;
  v_status_assinatura TEXT;
  v_limite INTEGER;
  v_total_fretes INTEGER;
  v_nome_motorista TEXT;
BEGIN
  -- Só verifica quando o motorista está aceitando a carga (motorista_id definido e status mudando para 'aceito')
  IF NEW.motorista_id IS NOT NULL AND (OLD.motorista_id IS NULL OR OLD.status != 'aceito') AND NEW.status = 'aceito' THEN
    
    -- Obter o user_id e nome do motorista
    SELECT user_id, nome_completo INTO v_user_id, v_nome_motorista 
    FROM motoristas 
    WHERE id = NEW.motorista_id;
    
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Motorista não encontrado.';
    END IF;

    -- Obter os dados da assinatura do usuário
    SELECT tipo_plano, status_assinatura INTO v_tipo_plano, v_status_assinatura
    FROM assinaturas
    WHERE user_id = v_user_id;

    -- Se não possuir assinatura cadastrada ou se estiver inativa (expirada, cancelada, inadimplente), reverte para 'gratuito'
    IF v_tipo_plano IS NULL OR v_status_assinatura NOT IN ('trial', 'ativo') THEN
      v_tipo_plano := 'gratuito';
    END IF;

    -- ── REGRA DO PLANO GRATUITO ──
    IF v_tipo_plano = 'gratuito' THEN
      -- Gratuito: limite lifetime de 5 fretes (todas as cargas do histórico contam, inclusive finalizadas)
      SELECT COUNT(*) INTO v_total_fretes
      FROM fretes
      WHERE motorista_id = NEW.motorista_id;
      
      v_limite := 5;
      
      IF v_total_fretes >= v_limite THEN
        RAISE EXCEPTION 'Limite de fretes excedido para o plano Gratuito (Máximo: %). Por favor, assine um plano premium para continuar coletando fretes.', v_limite;
      END IF;

    -- ── REGRA DO PLANO BRONZE ──
    ELSIF v_tipo_plano = 'bronze' THEN
      -- Bronze: limite de 10 fretes ativos simultâneos (apenas status 'aceito' ou 'em_transporte')
      SELECT COUNT(*) INTO v_total_fretes
      FROM fretes
      WHERE motorista_id = NEW.motorista_id AND status IN ('aceito', 'em_transporte');
      
      v_limite := 10;
      
      IF v_total_fretes >= v_limite THEN
        RAISE EXCEPTION 'Limite de fretes ativos excedido para o plano Bronze (Máximo: % ativos simultâneos). Conclua suas entregas ou faça o upgrade do plano.', v_limite;
      END IF;

    -- ── REGRA DO PLANO PRATA ──
    ELSIF v_tipo_plano = 'prata' THEN
      -- Prata: limite de 20 fretes ativos simultâneos (apenas status 'aceito' ou 'em_transporte')
      SELECT COUNT(*) INTO v_total_fretes
      FROM fretes
      WHERE motorista_id = NEW.motorista_id AND status IN ('aceito', 'em_transporte');
      
      v_limite := 20;
      
      IF v_total_fretes >= v_limite THEN
        RAISE EXCEPTION 'Limite de fretes ativos excedido para o plano Prata (Máximo: % ativos simultâneos). Conclua suas entregas ou faça o upgrade para o plano Ouro.', v_limite;
      END IF;

    -- ── REGRA DO PLANO OURO ──
    -- Ouro tem fretes ilimitados, nenhuma verificação necessária
    END IF;

  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar o trigger na tabela fretes
DROP TRIGGER IF EXISTS trigger_check_freight_limit ON fretes;
CREATE TRIGGER trigger_check_freight_limit
  BEFORE UPDATE ON fretes
  FOR EACH ROW
  EXECUTE FUNCTION check_motorista_freight_limit();

COMMENT ON FUNCTION check_motorista_freight_limit IS 'Valida os limites de frete por plano do motorista antes de permitir aceitar a carga';
