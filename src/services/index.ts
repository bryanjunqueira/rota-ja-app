/**
 * Services — Barrel export
 */
export { AuthService } from './auth.service';
export { MotoristasService } from './motoristas.service';
export { EmpresasService } from './empresas.service';
export { FretesService } from './fretes.service';
export { NotificacoesService } from './notificacoes.service';

export type { LoginResult, SignUpResult, EmpresaStatusResult } from './auth.service';
export type { CadastroMotoristaData, MotoristaData } from './motoristas.service';
export type { CadastroEmpresaData, EmpresaData } from './empresas.service';
export type { CriarFreteData, FreteData } from './fretes.service';
export type { Notificacao } from './notificacoes.service';
