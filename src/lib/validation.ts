/**
 * Utilitários de Validação e Formatação de Documentos/Dados Brasileiros
 */

/**
 * Aplica máscara de telefone em tempo real.
 * Suporta formatos: (XX) XXXX-XXXX (10 dígitos) e (XX) XXXXX-XXXX (11 dígitos).
 */
export function formatPhone(val: string): string {
  const cleaned = val.replace(/\D/g, '');
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 2) return `(${cleaned}`;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  if (cleaned.length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
}

/**
 * Aplica máscara de CEP em tempo real.
 * Formato: XXXXX-XXX (8 dígitos).
 */
export function formatCep(val: string): string {
  const cleaned = val.replace(/\D/g, '').slice(0, 8);
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 5) return cleaned;
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
}

/**
 * Validação matemática dos dígitos verificadores (DV1 e DV2) da CNH brasileira (Módulo 11).
 */
export function validarCNH(cnh: string): boolean {
  const cleaned = cnh.replace(/\D/g, '');

  // CNH deve ter exatamente 11 dígitos numéricos
  if (cleaned.length !== 11) return false;

  // Rejeita sequências conhecidas de dígitos iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;

  let v1 = 0;
  let v2 = 0;
  let dsc = 0;

  // Cálculo do primeiro dígito verificador
  for (let i = 0, j = 9; i < 9; ++i, --j) {
    v1 += parseInt(cleaned.charAt(i)) * j;
  }

  let x = v1 % 11;
  let cnhV1 = (x >= 10) ? 0 : x;
  if (x >= 10) dsc = 2;

  // Cálculo do segundo dígito verificador
  for (let i = 0, j = 1; i < 9; ++i, ++j) {
    v2 += parseInt(cleaned.charAt(i)) * j;
  }

  x = (v2 % 11) - dsc;
  let cnhV2 = (x < 0 || x >= 10) ? (x < 0 ? x + 11 : 0) : x;

  return cleaned.substring(9, 11) === `${cnhV1}${cnhV2}`;
}
