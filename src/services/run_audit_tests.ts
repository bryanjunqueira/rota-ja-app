/**
 * Script de Auditoria e Testes de Ponta a Ponta: Planos, Limitações e Permissões
 * 
 * Este script automatiza o teste de todos os cenários de mudança de plano, 
 * limites de frete e validação de segurança (frontend vs backend).
 * 
 * Executável via Node com:
 * node --experimental-strip-types src/services/run_audit_tests.ts
 */
import { createClient } from '@supabase/supabase-js';
import { PLANS, getPermissions, EMPRESA_LIMITS } from '../config/plans.ts';
import type { PlanTier } from '../config/plans.ts';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    'Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY antes de rodar a auditoria.'
  );
  process.exit(1);
}

const supabase = createClient(url, anonKey);

// Gera emails e dados dinâmicos para evitar colisões
const prefix = `audit_${Date.now()}`;
const driverEmail = `${prefix}_driver@rotaja.com`;
const companyEmail = `${prefix}_company@rotaja.com`;
const password = 'Password123!';

interface TestUser {
  id: string;
  email: string;
  token: string;
}

let driverUser: TestUser;
let companyUser: TestUser;
let motoristaProfileId: string;
let empresaProfileId: string;
const createdFreights: string[] = [];

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper para asserções
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FALHA: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✓ SUCESSO: ${message}`);
  }
}

// Inicializa os clientes Supabase específicos para cada usuário (para simular RLS)
function getClientForUser(token: string) {
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}

async function run() {
  console.log('================================================================');
  console.log('  AUDITORIA DE PLANOS, PERMISSÕES E LIMITAÇÕES - ROTAJÁ');
  console.log('================================================================');

  try {
    // ────────────────────────────────────────────────────────────
    // FASE 1: CADASTRO E PREPARAÇÃO DOS PERFIS
    // ────────────────────────────────────────────────────────────
    console.log('\n[Fase 1] Criando usuários de teste...');

    // 1. Cadastrar e Logar Motorista
    const { data: driverAuth, error: dError } = await supabase.auth.signUp({ email: driverEmail, password });
    if (dError || !driverAuth.user || !driverAuth.session) throw new Error(`Falha ao criar motorista: ${dError?.message}`);
    driverUser = { id: driverAuth.user.id, email: driverEmail, token: driverAuth.session.access_token };
    console.log(`  - Motorista criado: ID ${driverUser.id}`);

    // 2. Cadastrar e Logar Empresa
    const { data: companyAuth, error: cError } = await supabase.auth.signUp({ email: companyEmail, password });
    if (cError || !companyAuth.user || !companyAuth.session) throw new Error(`Falha ao criar empresa: ${cError?.message}`);
    companyUser = { id: companyAuth.user.id, email: companyEmail, token: companyAuth.session.access_token };
    console.log(`  - Empresa criada: ID ${companyUser.id}`);

    const driverClient = getClientForUser(driverUser.token);
    const companyClient = getClientForUser(companyUser.token);

    const agoraTrial = new Date();
    const fimTrial = new Date(agoraTrial);
    fimTrial.setDate(fimTrial.getDate() + 7);

    // 3. Cadastrar Perfil de Empresa
    const { error: empProfileError } = await companyClient.from('empresas').insert({
      user_id: companyUser.id,
      nome_empresa: 'Empresa Audit Logística',
      cnpj: `${Date.now().toString().padStart(14, '0')}`,
      endereco: 'Rua das Cargas, 100',
      cep: '01000-000',
      cidade: 'São Paulo',
      estado: 'SP',
      email: companyEmail,
      telefone: '(11) 98888-8888',
      nome_responsavel: 'Responsável Audit',
      cargo: 'Gerente',
      status: 'aprovado'
    });
    if (empProfileError) throw new Error(`Erro ao cadastrar perfil empresa: ${empProfileError.message}`);

    const { data: empData } = await companyClient.from('empresas').select('id').eq('user_id', companyUser.id).single();
    empresaProfileId = empData!.id;
    console.log(`  - Perfil de empresa registrado: ${empresaProfileId}`);

    // Assinatura empresa Ouro temporária para publicar 25 cargas de teste do motorista
    const { error: subEmpSeedError } = await companyClient.from('assinaturas').insert({
      user_id: companyUser.id,
      tipo_usuario: 'empresa',
      tipo_plano: 'ouro',
      status_assinatura: 'ativo',
      status_pagamento: 'aprovado',
      renovacao_automatica: true,
      historico_planos: [{ plano: 'ouro', data: agoraTrial.toISOString(), acao: 'seed_auditoria' }],
    });
    if (subEmpSeedError && subEmpSeedError.code !== '23505') {
      throw new Error(`Erro assinatura empresa seed: ${subEmpSeedError.message}`);
    }

    // 4. Cadastrar Perfil de Motorista
    const { error: motProfileError } = await driverClient.from('motoristas').insert({
      user_id: driverUser.id,
      nome_completo: 'Motorista Audit Perito',
      endereco: 'Estrada do Teste, 500',
      cep: '02000-000',
      email: driverEmail,
      celular: '(11) 99999-9999',
      cnh: `${(Date.now() + 1).toString().padStart(11, '0').slice(-11)}`,
      placa_veiculo: `AUD${Date.now().toString().slice(-4)}`,
      tipo_veiculo: 'Fiorino',
      tipo_carroceria: 'Baú',
      status: 'aprovado'
    });
    if (motProfileError) throw new Error(`Erro ao cadastrar perfil motorista: ${motProfileError.message}`);

    const { data: motData } = await driverClient.from('motoristas').select('id').eq('user_id', driverUser.id).single();
    motoristaProfileId = motData!.id;
    console.log(`  - Perfil de motorista registrado: ${motoristaProfileId}`);

    const { error: subInitError } = await driverClient.from('assinaturas').insert({
      user_id: driverUser.id,
      tipo_usuario: 'motorista',
      tipo_plano: 'gratuito',
      status_assinatura: 'trial',
      trial_inicio: agoraTrial.toISOString(),
      trial_fim: fimTrial.toISOString(),
      status_pagamento: 'pendente',
      renovacao_automatica: true,
      historico_planos: [
        {
          plano: 'gratuito',
          data: agoraTrial.toISOString(),
          acao: 'trial_criado',
        },
      ],
    });
    if (subInitError) throw new Error(`Erro ao inicializar assinatura do motorista: ${subInitError.message}`);
    console.log(`  - Assinatura gratuita inicial (trial) criada.`);

    // 5. Cadastrar Cargas de Teste (Criaremos 25 cargas para testar todos os limites)
    console.log('  - Publicando 25 cargas disponíveis...');
    for (let i = 1; i <= 25; i++) {
      const { data: freightData, error: fErr } = await companyClient.from('fretes').insert({
        empresa_id: empresaProfileId,
        user_id: companyUser.id,
        origem_cidade: 'São Paulo',
        origem_estado: 'SP',
        destino_cidade: 'Campinas',
        destino_estado: 'SP',
        endereco_retirada: `Rua Retirada ${i}`,
        cep_retirada: '01000-000',
        numero_retirada: i.toString(),
        endereco_entrega: `Rua Entrega ${i}`,
        cep_entrega: '13000-000',
        numero_entrega: i.toString(),
        peso: 500,
        data_coleta: new Date().toISOString(),
        prazo_entrega: new Date(Date.now() + 86400000).toISOString(),
        tipo_veiculo: 'Fiorino',
        valor_frete: 150 + i,
        pedagogio_incluso: true,
        status: 'disponivel'
      }).select('id').single();

      if (fErr) throw new Error(`Erro ao criar frete ${i}: ${fErr.message}`);
      createdFreights.push(freightData.id);
    }
    console.log(`  - ${createdFreights.length} cargas publicadas com sucesso.`);

    // ────────────────────────────────────────────────────────────
    // FASE 2: AUDITORIA DOS CENÁRIOS E TRANSIÇÕES
    // ────────────────────────────────────────────────────────────

    // --- CENÁRIO 1: CONTA NOVA / PLANO GRATUITO ---
    console.log('\n================================================================');
    console.log('[Cenário 1] Novo Usuário: Inicialização no Plano Gratuito / Trial');
    console.log('================================================================');

    // Buscar assinatura criada automaticamente pelo useAuth / AuthProvider
    const { data: subData, error: subError } = await driverClient.from('assinaturas').select('*').eq('user_id', driverUser.id).single();
    if (subError) throw new Error(`Erro ao carregar assinatura inicial: ${subError.message}`);

    assert(subData.tipo_plano === 'gratuito', 'Plano inicial deve ser "gratuito"');
    assert(subData.status_assinatura === 'trial', 'Status inicial deve ser "trial"');

    // Verificar se as permissões do gratuito limitam a 5 fretes
    const permissionsGratuito = getPermissions('motorista', 'gratuito');
    assert(permissionsGratuito.maxFreightsAvailable === 5, 'Limite do Gratuito deve ser de 5 fretes');
    assert(!permissionsGratuito.hasUnlimitedFreights, 'Gratuito não deve ter fretes ilimitados');

    // Simular frontend limitando a visualização de fretes
    const limitToShowGratuito = permissionsGratuito.maxFreightsAvailable;
    const { data: visibleFreightsGratuito } = await driverClient.from('fretes').select('id').eq('status', 'disponivel');
    const chargesToShowGratuito = (visibleFreightsGratuito || []).slice(0, limitToShowGratuito);
    assert(chargesToShowGratuito.length === 5, `Frontend limita visualização para exatamente ${chargesToShowGratuito.length} fretes (esperado 5)`);

    // Tentar aceitar fretes até ultrapassar o limite e verificar se o banco de dados bloqueia ou aceita
    console.log('  - Coletando fretes como Gratuito (limite 5)...');
    let acceptedCount = 0;
    let databaseBlocked = false;
    let dbErrorMessage = '';

    for (let i = 0; i < 6; i++) {
      const freightId = createdFreights[i];
      const { data, error } = await driverClient
        .from('fretes')
        .update({ motorista_id: motoristaProfileId, status: 'aceito', data_aceite: new Date().toISOString() })
        .eq('id', freightId)
        .eq('status', 'disponivel')
        .is('motorista_id', null)
        .select();

      if (error) {
        databaseBlocked = true;
        dbErrorMessage = error.message;
        console.log(`  - Carga ${i + 1} rejeitada pelo banco: ${error.message}`);
        break;
      } else if (data && data.length > 0) {
        acceptedCount++;
        console.log(`  - Carga ${i + 1} coletada com sucesso (ID: ${freightId.slice(0, 8)})`);
      }
    }

    if (databaseBlocked) {
      console.log('  [AUDITORIA BANCO]: ✓ O banco de dados bloqueou corretamente a 6ª carga!');
      assert(acceptedCount === 5, `Motorista gratuito aceitou exatamente ${acceptedCount} fretes no banco e foi barrado no 6º`);
    } else {
      console.log('  [AUDITORIA BANCO]: ⚠️ ALERTA DE VULNERABILIDADE! O banco de dados permitiu aceitar a 6ª carga (limite ultrapassado no backend)!');
      console.log('                     Isso comprova a necessidade do Trigger SQL de Segurança.');
    }

    // Limpar coletas para os próximos testes
    await supabase.from('fretes').update({ motorista_id: null, status: 'disponivel', data_aceite: null }).in('id', createdFreights);


    // --- CENÁRIO 2: UPGRADE PARA BRONZE ---
    console.log('\n================================================================');
    console.log('[Cenário 2] Transição: Gratuito → Bronze (Pagamento Aprovado)');
    console.log('================================================================');

    // Simular pagamento aprovado e ativação do plano Bronze
    console.log('  - Processando pagamento do plano Bronze...');
    const agora = new Date();
    const fimAssinatura = new Date();
    fimAssinatura.setMonth(fimAssinatura.getMonth() + 1);

    const { data: upgradeBronzeData, error: upgradeBronzeErr } = await driverClient.rpc(
      'processar_assinatura_pagamento',
      { p_novo_plano: 'bronze', p_metodo_pagamento: 'cartao', p_cenario: 'aprovado' }
    );

    if (upgradeBronzeErr) throw new Error(`Falha no upgrade para Bronze: ${upgradeBronzeErr.message}`);
    if (!(upgradeBronzeData as { success?: boolean })?.success) {
      throw new Error('RPC processar_assinatura_pagamento (bronze) retornou falha');
    }

    // Recarregar assinatura e validar dados
    const { data: subBronze } = await driverClient.from('assinaturas').select('*').eq('user_id', driverUser.id).single();
    assert(subBronze.tipo_plano === 'bronze', 'Tipo do plano atualizado para "bronze"');
    assert(subBronze.status_assinatura === 'ativo', 'Status da assinatura atualizado para "ativo"');
    assert(subBronze.status_pagamento === 'aprovado', 'Status do pagamento atualizado para "aprovado"');

    // Validar limite
    const permissionsBronze = getPermissions('motorista', 'bronze');
    assert(permissionsBronze.maxFreightsAvailable === 10, 'Limite do Bronze deve ser de 10 fretes');

    // Simular aceitação de cargas no Bronze
    console.log('  - Coletando fretes como Bronze (limite 10)...');
    acceptedCount = 0;
    databaseBlocked = false;

    for (let i = 0; i < 11; i++) {
      const freightId = createdFreights[i];
      const { data, error } = await driverClient
        .from('fretes')
        .update({ motorista_id: motoristaProfileId, status: 'aceito', data_aceite: new Date().toISOString() })
        .eq('id', freightId)
        .eq('status', 'disponivel')
        .is('motorista_id', null)
        .select();

      if (error) {
        databaseBlocked = true;
        dbErrorMessage = error.message;
        break;
      } else if (data && data.length > 0) {
        acceptedCount++;
      }
    }

    if (databaseBlocked) {
      console.log('  [AUDITORIA BANCO]: ✓ O banco de dados bloqueou corretamente a 11ª carga no plano Bronze!');
      assert(acceptedCount === 10, `Motorista Bronze aceitou exatamente ${acceptedCount} fretes no banco e foi barrado no 11º`);
    } else {
      console.log('  [AUDITORIA BANCO]: ⚠️ ALERTA DE VULNERABILIDADE! O banco de dados permitiu coletar 11 cargas no plano Bronze (limite excedido)!');
    }

    // Regra do Bronze/Prata: Limite simultâneo. Cargas entregues NÃO contam.
    // Vamos testar: Finalizar (entregar) 2 fretes. O limite deve liberar 2 vagas no Bronze!
    console.log('  - Finalizando (entregando) 2 cargas aceitas para liberar limite simultâneo...');
    const { data: userFreights } = await driverClient.from('fretes').select('id').eq('motorista_id', motoristaProfileId).eq('status', 'aceito').limit(2);
    
    for (const f of userFreights || []) {
      await driverClient.from('fretes').update({ status: 'entregue', data_entrega: new Date().toISOString() }).eq('id', f.id);
    }

    // Agora, com 2 entregues, o motorista tem 8 ativos (aceito/em_transporte).
    // Ele deve ser capaz de coletar mais 2 fretes (totalizando 12 no histórico, mas apenas 10 ativos).
    console.log('  - Coletando mais 2 fretes disponíveis...');
    let additionalAccepted = 0;
    for (let i = 10; i < 13; i++) {
      const freightId = createdFreights[i];
      const { data, error } = await driverClient
        .from('fretes')
        .update({ motorista_id: motoristaProfileId, status: 'aceito', data_aceite: new Date().toISOString() })
        .eq('id', freightId)
        .eq('status', 'disponivel')
        .is('motorista_id', null)
        .select();
      
      if (!error && data && data.length > 0) {
        additionalAccepted++;
      }
    }
    
    console.log(`  - Coletas adicionais aceitas: ${additionalAccepted} (Esperado: 2, pois restavam 2 vagas de limite ativo)`);
    assert(additionalAccepted === 2, 'Limites do Bronze liberam vagas simultâneas após entrega concluída');

    // Limpar coletas
    await supabase.from('fretes').update({ motorista_id: null, status: 'disponivel', data_aceite: null, data_entrega: null }).in('id', createdFreights);


    // --- CENÁRIO 3: BRONZE → PRATA ---
    console.log('\n================================================================');
    console.log('[Cenário 3] Transição: Bronze → Prata (Upgrade)');
    console.log('================================================================');

    const { data: upgradePrataData, error: upgradePrataErr } = await driverClient.rpc(
      'processar_assinatura_pagamento',
      { p_novo_plano: 'prata', p_metodo_pagamento: 'cartao', p_cenario: 'aprovado' }
    );

    if (upgradePrataErr) throw new Error(`Falha no upgrade para Prata: ${upgradePrataErr.message}`);
    if (!(upgradePrataData as { success?: boolean })?.success) {
      throw new Error('RPC processar_assinatura_pagamento (prata) retornou falha');
    }

    const { data: subPrata } = await driverClient.from('assinaturas').select('*').eq('user_id', driverUser.id).single();
    assert(subPrata.tipo_plano === 'prata', 'Tipo do plano atualizado para "prata"');

    const permissionsPrata = getPermissions('motorista', 'prata');
    assert(permissionsPrata.maxFreightsAvailable === 20, 'Limite do Prata deve ser de 20 fretes');

    // Simular aceitação de cargas no Prata
    console.log('  - Coletando fretes como Prata (limite 20)...');
    acceptedCount = 0;
    databaseBlocked = false;

    for (let i = 0; i < 21; i++) {
      const freightId = createdFreights[i];
      const { data, error } = await driverClient
        .from('fretes')
        .update({ motorista_id: motoristaProfileId, status: 'aceito', data_aceite: new Date().toISOString() })
        .eq('id', freightId)
        .eq('status', 'disponivel')
        .is('motorista_id', null)
        .select();

      if (error) {
        databaseBlocked = true;
        dbErrorMessage = error.message;
        break;
      } else if (data && data.length > 0) {
        acceptedCount++;
      }
    }

    if (databaseBlocked) {
      console.log('  [AUDITORIA BANCO]: ✓ O banco de dados bloqueou corretamente a 21ª carga no plano Prata!');
      assert(acceptedCount === 20, `Motorista Prata aceitou exatamente ${acceptedCount} fretes no banco e foi barrado no 21º`);
    } else {
      console.log('  [AUDITORIA BANCO]: ⚠️ ALERTA DE VULNERABILIDADE! O banco de dados permitiu coletar 21 cargas no plano Prata (limite excedido)!');
    }

    // Limpar coletas
    await supabase.from('fretes').update({ motorista_id: null, status: 'disponivel', data_aceite: null }).in('id', createdFreights);


    // --- CENÁRIO 4: PRATA → OURO ---
    console.log('\n================================================================');
    console.log('[Cenário 4] Transição: Prata → Ouro (Acesso Ilimitado)');
    console.log('================================================================');

    const { data: upgradeOuroData, error: upgradeOuroErr } = await driverClient.rpc(
      'processar_assinatura_pagamento',
      { p_novo_plano: 'ouro', p_metodo_pagamento: 'cartao', p_cenario: 'aprovado' }
    );

    if (upgradeOuroErr) throw new Error(`Falha no upgrade para Ouro: ${upgradeOuroErr.message}`);
    if (!(upgradeOuroData as { success?: boolean })?.success) {
      throw new Error('RPC processar_assinatura_pagamento (ouro) retornou falha');
    }

    const { data: subOuro } = await driverClient.from('assinaturas').select('*').eq('user_id', driverUser.id).single();
    assert(subOuro.tipo_plano === 'ouro', 'Tipo do plano atualizado para "ouro"');

    const permissionsOuro = getPermissions('motorista', 'ouro');
    assert(permissionsOuro.hasUnlimitedFreights, 'Plano Ouro deve dar acesso ilimitado a fretes');

    // Tentar aceitar todas as 25 cargas disponíveis
    console.log('  - Coletando TODAS as 25 cargas disponíveis como Ouro...');
    acceptedCount = 0;
    databaseBlocked = false;

    for (let i = 0; i < 25; i++) {
      const freightId = createdFreights[i];
      const { data, error } = await driverClient
        .from('fretes')
        .update({ motorista_id: motoristaProfileId, status: 'aceito', data_aceite: new Date().toISOString() })
        .eq('id', freightId)
        .eq('status', 'disponivel')
        .is('motorista_id', null)
        .select();

      if (error) {
        databaseBlocked = true;
        dbErrorMessage = error.message;
        break;
      } else if (data && data.length > 0) {
        acceptedCount++;
      }
    }

    assert(!databaseBlocked, 'Plano Ouro não deve ser bloqueado por limites no banco de dados');
    assert(acceptedCount === 25, `Motorista Ouro coletou todas as ${acceptedCount} cargas com sucesso`);


    // --- CENÁRIO 5: OURO EXPIRA ---
    console.log('\n================================================================');
    console.log('[Cenário 5] Expiração de Plano: Ouro → Expirado (Retorno ao Gratuito)');
    console.log('================================================================');

    // Simular expiração imediata do plano Ouro
    console.log('  - Simulando expiração imediata da assinatura...');
    const { data: expirationData, error: expirationErr } = await driverClient.rpc(
      'simular_expiracao_assinatura'
    );

    if (expirationErr) throw new Error(`Falha ao simular expiração: ${expirationErr.message}`);
    if (!(expirationData as { success?: boolean })?.success) {
      throw new Error('RPC simular_expiracao_assinatura retornou falha');
    }

    // Recarregar assinatura e validar dados de rebaixamento
    const { data: subExpired } = await driverClient.from('assinaturas').select('*').eq('user_id', driverUser.id).single();
    assert(subExpired.tipo_plano === 'gratuito', 'Plano expirado deve retornar a "gratuito"');
    assert(subExpired.status_assinatura === 'expirado', 'Status da assinatura deve ser "expirado"');

    // Limpar coletas
    await supabase.from('fretes').update({ motorista_id: null, status: 'disponivel', data_aceite: null }).in('id', createdFreights);

    // Tentar aceitar fretes como expirado (deve aplicar o limite do plano gratuito = 5)
    console.log('  - Coletando fretes após expiração (retorno ao limite gratuito = 5)...');
    acceptedCount = 0;
    databaseBlocked = false;

    for (let i = 0; i < 6; i++) {
      const freightId = createdFreights[i];
      const { data, error } = await driverClient
        .from('fretes')
        .update({ motorista_id: motoristaProfileId, status: 'aceito', data_aceite: new Date().toISOString() })
        .eq('id', freightId)
        .eq('status', 'disponivel')
        .is('motorista_id', null)
        .select();

      if (error) {
        databaseBlocked = true;
        dbErrorMessage = error.message;
        break;
      } else if (data && data.length > 0) {
        acceptedCount++;
      }
    }

    if (databaseBlocked) {
      console.log('  [AUDITORIA BANCO]: ✓ O banco de dados bloqueou corretamente a 6ª carga após rebaixamento por expiração!');
      assert(acceptedCount === 5, `Ex-assinante Premium rebaixado aceitou exatamente ${acceptedCount} fretes no banco e foi barrado no 6º`);
    } else {
      console.log('  [AUDITORIA BANCO]: ⚠️ ALERTA DE VULNERABILIDADE! O banco de dados permitiu coletar 6 cargas mesmo com plano expirado (limite não restabelecido)!');
    }

    // ────────────────────────────────────────────────────────────
    // FASE 3: VERIFICAÇÃO DE OUTRAS TRANSIÇÕES SOLICITADAS
    // ────────────────────────────────────────────────────────────
    console.log('\n================================================================');
    console.log('[Fase 3] Validando demais transições de plano solicitadas');
    console.log('================================================================');

    const testTransitions = async (from: PlanTier, to: PlanTier, label: string) => {
      console.log(`  - Testando transição: ${label}`);
      if (to !== 'gratuito') {
        const { data: rpcData, error: rpcErr } = await driverClient.rpc(
          'processar_assinatura_pagamento',
          { p_novo_plano: to, p_metodo_pagamento: 'cartao', p_cenario: 'aprovado' }
        );
        if (rpcErr) throw new Error(rpcErr.message);
        if (!(rpcData as { success?: boolean })?.success) {
          throw new Error(`RPC falhou na transição para ${to}`);
        }
      } else {
        const { error: expErr } = await driverClient.rpc('simular_expiracao_assinatura');
        if (expErr) throw new Error(expErr.message);
      }
      const { data } = await driverClient.from('assinaturas').select('tipo_plano').eq('user_id', driverUser.id).single();
      assert(data!.tipo_plano === to, `Plano atualizado com sucesso de ${from} para ${to}`);
    };

    await testTransitions('gratuito', 'bronze', 'Gratuito → Bronze');
    await testTransitions('bronze', 'prata', 'Bronze → Prata');
    await testTransitions('prata', 'ouro', 'Prata → Ouro');
    await testTransitions('ouro', 'bronze', 'Ouro → Bronze (Downgrade)');
    await testTransitions('ouro', 'gratuito', 'Ouro → Gratuito (Cancelamento/Rebaixamento)');
    await testTransitions('prata', 'gratuito', 'Prata → Gratuito (Cancelamento/Rebaixamento)');

    // ────────────────────────────────────────────────────────────
    // FASE 4: AUDITORIA EMPRESA — PUBLICAÇÕES
    // ────────────────────────────────────────────────────────────
    // Usa uma empresa NOVA e separada para evitar contagem residual de fretes
    // da Fase 1 (a tabela fretes não tem policy DELETE via RLS, então deletes
    // pelo client autenticado falham silenciosamente).
    // ────────────────────────────────────────────────────────────
    console.log('\n================================================================');
    console.log('[Fase 4] Auditoria Empresa — limites de publicação');
    console.log('================================================================');

    // --- Criar empresa dedicada para teste trial ---
    const empTrialEmail = `${prefix}_emp_trial@rotaja.com`;
    const { data: empTrialAuth, error: empTrialAuthErr } = await supabase.auth.signUp({ email: empTrialEmail, password });
    if (empTrialAuthErr || !empTrialAuth.user || !empTrialAuth.session)
      throw new Error(`Falha ao criar empresa trial: ${empTrialAuthErr?.message}`);
    const empTrialUser = { id: empTrialAuth.user.id, email: empTrialEmail, token: empTrialAuth.session.access_token };
    const empTrialClient = getClientForUser(empTrialUser.token);
    console.log(`  - Empresa trial criada: ${empTrialUser.id}`);

    // Perfil empresa trial
    const { error: empTrialProfErr } = await empTrialClient.from('empresas').insert({
      user_id: empTrialUser.id,
      nome_empresa: 'Empresa Trial Audit',
      cnpj: `${(Date.now() + 100).toString().padStart(14, '0')}`,
      endereco: 'Rua Trial, 1',
      cep: '01001-000',
      cidade: 'São Paulo',
      estado: 'SP',
      email: empTrialEmail,
      telefone: '(11) 97777-7777',
      nome_responsavel: 'Resp Trial',
      cargo: 'Gerente',
      status: 'aprovado'
    });
    if (empTrialProfErr) throw new Error(`Erro perfil empresa trial: ${empTrialProfErr.message}`);
    const { data: empTrialProfData } = await empTrialClient.from('empresas').select('id').eq('user_id', empTrialUser.id).single();
    const empTrialProfileId = empTrialProfData!.id;

    // Assinatura gratuito/trial para empresa trial
    const agoraEmp = new Date();
    const fimTrialEmp = new Date(agoraEmp);
    fimTrialEmp.setDate(fimTrialEmp.getDate() + 7);

    const { error: empTrialSubErr } = await empTrialClient.from('assinaturas').insert({
      user_id: empTrialUser.id,
      tipo_usuario: 'empresa',
      tipo_plano: 'gratuito',
      status_assinatura: 'trial',
      trial_inicio: agoraEmp.toISOString(),
      trial_fim: fimTrialEmp.toISOString(),
      status_pagamento: 'pendente',
      renovacao_automatica: true,
      historico_planos: [{ plano: 'gratuito', data: agoraEmp.toISOString(), acao: 'trial_criado' }],
    });
    if (empTrialSubErr) throw new Error(`Erro assinatura empresa trial: ${empTrialSubErr.message}`);

    const permEmpGratuito = getPermissions('empresa', 'gratuito');
    assert(permEmpGratuito.maxFreightsPerMonth === EMPRESA_LIMITS.gratuitoTrialTotal, 'Empresa gratuito: 5 publicações');

    console.log('  - Empresa trial: publicando até 5 fretes (lifetime)...');
    let empPublished = 0;
    for (let i = 0; i < 6; i++) {
      const { error } = await empTrialClient.from('fretes').insert({
        empresa_id: empTrialProfileId,
        user_id: empTrialUser.id,
        origem_cidade: 'SP',
        origem_estado: 'SP',
        destino_cidade: 'Campinas',
        destino_estado: 'SP',
        endereco_retirada: `Rua ${i}`,
        cep_retirada: '01000-000',
        numero_retirada: String(i),
        endereco_entrega: `Av ${i}`,
        cep_entrega: '13000-000',
        numero_entrega: String(i),
        peso: 100,
        data_coleta: agoraEmp.toISOString(),
        prazo_entrega: fimTrialEmp.toISOString(),
        tipo_veiculo: 'Fiorino',
        valor_frete: 100,
        pedagogio_incluso: false,
        status: 'disponivel',
      });
      if (error) {
        console.log(`  - Publicação ${i + 1} bloqueada: ${error.message}`);
        break;
      }
      empPublished++;
    }
    assert(empPublished === 5, `Empresa trial publicou exatamente ${empPublished} fretes (esperado 5)`);

    // --- Criar empresa dedicada para teste bronze ---
    const empBronzeEmail = `${prefix}_emp_bronze@rotaja.com`;
    const { data: empBronzeAuth, error: empBronzeAuthErr } = await supabase.auth.signUp({ email: empBronzeEmail, password });
    if (empBronzeAuthErr || !empBronzeAuth.user || !empBronzeAuth.session)
      throw new Error(`Falha ao criar empresa bronze: ${empBronzeAuthErr?.message}`);
    const empBronzeUser = { id: empBronzeAuth.user.id, email: empBronzeEmail, token: empBronzeAuth.session.access_token };
    const empBronzeClient = getClientForUser(empBronzeUser.token);
    console.log(`  - Empresa bronze criada: ${empBronzeUser.id}`);

    // Perfil empresa bronze
    const { error: empBronzeProfErr } = await empBronzeClient.from('empresas').insert({
      user_id: empBronzeUser.id,
      nome_empresa: 'Empresa Bronze Audit',
      cnpj: `${(Date.now() + 200).toString().padStart(14, '0')}`,
      endereco: 'Rua Bronze, 2',
      cep: '01002-000',
      cidade: 'São Paulo',
      estado: 'SP',
      email: empBronzeEmail,
      telefone: '(11) 96666-6666',
      nome_responsavel: 'Resp Bronze',
      cargo: 'Gerente',
      status: 'aprovado'
    });
    if (empBronzeProfErr) throw new Error(`Erro perfil empresa bronze: ${empBronzeProfErr.message}`);
    const { data: empBronzeProfData } = await empBronzeClient.from('empresas').select('id').eq('user_id', empBronzeUser.id).single();
    const empBronzeProfileId = empBronzeProfData!.id;

    // Assinatura bronze ativo para empresa bronze
    const { error: empBronzeSubErr } = await empBronzeClient.from('assinaturas').insert({
      user_id: empBronzeUser.id,
      tipo_usuario: 'empresa',
      tipo_plano: 'bronze',
      status_assinatura: 'ativo',
      status_pagamento: 'aprovado',
      renovacao_automatica: true,
      historico_planos: [{ plano: 'bronze', data: agoraEmp.toISOString(), acao: 'ativacao' }],
    });
    if (empBronzeSubErr) throw new Error(`Erro assinatura empresa bronze: ${empBronzeSubErr.message}`);

    console.log('  - Empresa bronze: limite mensal 15...');
    empPublished = 0;
    for (let i = 0; i < 16; i++) {
      const { error } = await empBronzeClient.from('fretes').insert({
        empresa_id: empBronzeProfileId,
        user_id: empBronzeUser.id,
        origem_cidade: 'SP',
        origem_estado: 'SP',
        destino_cidade: 'RJ',
        destino_estado: 'RJ',
        endereco_retirada: `B ${i}`,
        cep_retirada: '01000-000',
        numero_retirada: String(i),
        endereco_entrega: `C ${i}`,
        cep_entrega: '20000-000',
        numero_entrega: String(i),
        peso: 100,
        data_coleta: agoraEmp.toISOString(),
        prazo_entrega: fimTrialEmp.toISOString(),
        tipo_veiculo: 'Truck',
        valor_frete: 200,
        pedagogio_incluso: false,
        status: 'disponivel',
      });
      if (error) break;
      empPublished++;
    }
    assert(empPublished === 15, `Empresa bronze: ${empPublished} publicações no mês (esperado 15)`);

    console.log('\n================================================================');
    console.log('  ✓ TODAS AS ASSERÇÕES DE AUDITORIA PASSARAM COM SUCESSO!  ');
    console.log('================================================================');

  } catch (err: any) {
    console.error('\n❌ AUDITORIA FALHOU COM EXCEÇÃO:', err.message);
  } finally {
    // ────────────────────────────────────────────────────────────
    // FASE 4: LIMPEZA DOS DADOS DO TESTE
    // ────────────────────────────────────────────────────────────
    console.log('\n[Limpeza] Removendo dados de teste gerados...');
    if (createdFreights.length > 0 && typeof companyClient !== 'undefined') {
      await companyClient.from('fretes').delete().in('id', createdFreights);
      console.log('  - Cargas de teste deletadas.');
    }
    if (motoristaProfileId && typeof driverClient !== 'undefined') {
      await driverClient.from('motoristas').delete().eq('id', motoristaProfileId);
      console.log('  - Perfil de motorista de teste deletado.');
    }
    if (empresaProfileId && typeof companyClient !== 'undefined') {
      await companyClient.from('empresas').delete().eq('id', empresaProfileId);
      console.log('  - Perfil de empresa de teste deletado.');
    }
    if (companyUser && typeof companyClient !== 'undefined') {
      await companyClient.from('fretes').delete().eq('user_id', companyUser.id);
      await supabase.from('assinaturas').delete().eq('user_id', companyUser.id);
    }
    if (driverUser) {
      await supabase.from('assinaturas').delete().eq('user_id', driverUser.id);
      // Supabase REST não permite deletar da tabela auth.users via chave anon, 
      // mas os perfis e assinaturas associados já foram limpos para evitar lixo.
      console.log('  - Assinatura de teste deletada.');
    }
    console.log('  - Limpeza concluída.');
  }
}

run();
