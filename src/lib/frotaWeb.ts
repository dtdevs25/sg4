import { isAbastecimentoWebBloqueadoParaTecnicos } from '@/app/actions/configuracao'

export const MSG_FROTA_WEB_BLOQUEADA =
  'O módulo de Quilometragem (KM, Abastecimento e Manutenção) está desabilitado no sistema web para técnicos. Utilize exclusivamente o aplicativo SG4 Mobile.'

/**
 * Retorna true quando o módulo de Frota/Quilometragem deve ser bloqueado no WEB
 * para o usuário informado (apenas técnicos TST, quando o flag do admin está ativo).
 * Admin e Master nunca são bloqueados.
 */
export async function frotaWebBloqueadaParaRole(role?: string | null): Promise<boolean> {
  if (role !== 'TST') return false
  return isAbastecimentoWebBloqueadoParaTecnicos()
}
