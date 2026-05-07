/**
 * Design System do Rota Já Mobile
 * 
 * Cores convertidas diretamente do CSS do web (index.css).
 * Todas as cores mantêm paridade com o design system web.
 * 
 * Web HSL → Mobile HEX:
 * --primary:    hsl(207, 90%, 54%)  → #2094F3
 * --accent:     hsl(39, 100%, 57%)  → #FFB224
 * --background: hsl(210, 20%, 98%)  → #F7F8FA
 * --foreground: hsl(215, 25%, 27%)  → #344256
 * --muted-fg:   hsl(215, 16%, 47%)  → #64748B
 * --border:     hsl(214, 32%, 91%)  → #E2E8F0
 * --destructive: hsl(0, 84%, 60%)   → #EF4444
 */

export const COLORS = {
  // ─── Primárias (azul vibrante do web) ───
  primary: '#2094F3',       // hsl(207, 90%, 54%) — cor principal do web
  primaryLight: '#4DA9F5',  // variação clara
  primaryDark: '#1976D2',   // variação escura
  primaryFaded: 'rgba(32, 148, 243, 0.1)', // fundo sutil

  // ─── Accent (laranja/dourado do web) ───
  accent: '#FFB224',        // hsl(39, 100%, 57%) — cor de destaque do web
  accentLight: '#FFC55C',   // variação clara
  accentDark: '#E89D1E',    // variação escura
  accentFaded: 'rgba(255, 178, 36, 0.1)', // fundo sutil

  // ─── Gradiente (identidade visual principal) ───
  gradientStart: '#2094F3', // primary (azul)
  gradientEnd: '#FFB224',   // accent (laranja)

  // ─── Status ───
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',         // hsl(0, 84%, 60%) — destructive do web
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // ─── Neutros ───
  white: '#FFFFFF',
  background: '#F7F8FA',    // hsl(210, 20%, 98%)
  surface: '#FFFFFF',       // hsl(0, 0%, 100%) — card
  surfaceVariant: '#F1F5F9',
  border: '#E2E8F0',        // hsl(214, 32%, 91%)
  borderLight: '#F1F5F9',
  input: '#E2E8F0',         // hsl(214, 32%, 91%) — input border do web

  // ─── Textos ───
  textPrimary: '#344256',   // hsl(215, 25%, 27%) — foreground do web
  textSecondary: '#64748B', // hsl(215, 16%, 47%) — muted-foreground do web
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',

  // ─── Status Badges (cores do web) ───
  statusAprovado: '#10B981',
  statusAprovadoBg: '#D1FAE5',
  statusPendente: '#F59E0B',
  statusPendenteBg: '#FEF3C7',
  statusRejeitado: '#EF4444',
  statusRejeitadoBg: '#FEE2E2',
  statusDisponivel: '#10B981',
  statusDisponivelBg: '#D1FAE5',
  statusAceito: '#3B82F6',
  statusAceitoBg: '#DBEAFE',
  statusEmTransporte: '#F59E0B',
  statusEmTransporteBg: '#FEF3C7',
  statusEntregue: '#6B7280',
  statusEntregueBg: '#F3F4F6',

  // ─── Dark mode (equivalente ao web .dark) ───
  dark: {
    background: '#0F172A',   // hsl(222, 84%, 5%)
    surface: '#1E293B',
    surfaceVariant: '#334155',
    border: '#334155',       // hsl(217, 33%, 18%)
    textPrimary: '#F1F5F9',  // hsl(210, 40%, 98%)
    textSecondary: '#94A3B8',
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  title: 34,
} as const;

export const FONT_WEIGHTS = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const BORDER_RADIUS = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

/**
 * Helpers para cores de status (usados nos badges e cards)
 */
export function getStatusColor(status: string): { text: string; bg: string; border: string } {
  switch (status) {
    case 'aprovado':
      return { text: COLORS.statusAprovado, bg: COLORS.statusAprovadoBg, border: COLORS.statusAprovado };
    case 'pendente':
      return { text: COLORS.statusPendente, bg: COLORS.statusPendenteBg, border: COLORS.statusPendente };
    case 'rejeitado':
    case 'rejeitada':
    case 'reprovado':
    case 'bloqueada':
    case 'bloqueado':
      return { text: COLORS.statusRejeitado, bg: COLORS.statusRejeitadoBg, border: COLORS.statusRejeitado };
    case 'disponivel':
      return { text: COLORS.statusDisponivel, bg: COLORS.statusDisponivelBg, border: COLORS.statusDisponivel };
    case 'aceito':
      return { text: COLORS.statusAceito, bg: COLORS.statusAceitoBg, border: COLORS.statusAceito };
    case 'em_transporte':
      return { text: COLORS.statusEmTransporte, bg: COLORS.statusEmTransporteBg, border: COLORS.statusEmTransporte };
    case 'entregue':
      return { text: COLORS.statusEntregue, bg: COLORS.statusEntregueBg, border: COLORS.statusEntregue };
    default:
      return { text: COLORS.textSecondary, bg: COLORS.surfaceVariant, border: COLORS.border };
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'aprovado': return 'Aprovado';
    case 'pendente': return 'Em Análise';
    case 'rejeitado':
    case 'rejeitada':
    case 'reprovado': return 'Reprovado';
    case 'bloqueada':
    case 'bloqueado': return 'Bloqueado';
    case 'disponivel': return 'Aguardando Motorista';
    case 'aceito': return 'Aceito';
    case 'em_transporte': return 'Em Transporte';
    case 'entregue': return 'Entregue';
    default: return status;
  }
}
