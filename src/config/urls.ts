/**
 * Configuração centralizada de URLs e deep links.
 * 
 * No mobile, URLs de redirecionamento usam o scheme
 * configurado no app.json (rotaja://).
 */

const SCHEME = 'rotaja';

export const APP_URLS = {
  /** Scheme base do app */
  SCHEME,

  /** URLs de redirecionamento pós-autenticação (deep links) */
  AUTH_REDIRECT: {
    DASHBOARD_MOTORISTA: `${SCHEME}://dashboard-motorista`,
    PERFIL_EMPRESA: `${SCHEME}://perfil-empresa`,
    LOGIN: `${SCHEME}://login`,
    REDEFINIR_SENHA: `${SCHEME}://redefinir-senha`,
  },
} as const;
