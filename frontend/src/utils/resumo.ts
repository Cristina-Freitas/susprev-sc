import type { PrevisaoSaida } from '../types/api';
import type { AgregadosProducao, SerieMensal } from '../types/dados';
import { nomeMes, variacaoPercentual } from './formatacao';
import { lerCompetencia, somaAteMes } from './series';

export interface ResumoExecutivo {
  ano: number;
  competencia: string | null;
  mesFinal: number;
  apiDisponivel: boolean;
  totalObservado: number | null;
  mesmoPeriodoAnterior: number | null;
  variacao: number | null;
  previsto: number | null;
  projetado: number | null;
  faixaPrevista: string | null;
  municipios: number | null;
  totalMunicipios: number;
  estabelecimentos: number | null;
  tipos: number | null;
}

/** Consolida os indicadores principais com a mesma origem usada na Visão Geral. */
export function montarResumo(p: PrevisaoSaida | null, s: SerieMensal | null, ag: AgregadosProducao | null): ResumoExecutivo {
  const competencia = p?.ultima_competencia_observada ?? s?.ultima_competencia ?? null;
  const comp = competencia ? lerCompetencia(competencia) : null;
  const ano = comp?.ano ?? ag?.ano_corrente ?? 2026;
  const mesFinal = comp?.mes ?? ag?.mes_final_ano_corrente ?? 0;
  const previstos = p ? p.meses.filter((m) => m.tipo === 'previsto') : [];
  const totalObservado = p?.total_observado ?? (s && comp ? somaAteMes(s.registros, comp.ano, comp.mes) : null);
  const anterior = s && comp ? somaAteMes(s.registros, comp.ano - 1, comp.mes) : null;
  return {
    ano,
    competencia,
    mesFinal,
    apiDisponivel: !!p,
    totalObservado,
    mesmoPeriodoAnterior: anterior,
    variacao: totalObservado !== null && anterior !== null ? variacaoPercentual(totalObservado, anterior) : null,
    previsto: p ? p.total_previsto : null,
    projetado: p ? p.total_anual_projetado : null,
    faixaPrevista: previstos.length ? `${nomeMes(previstos[0].mes, true)} a ${nomeMes(previstos[previstos.length - 1].mes, true)}` : null,
    municipios: ag ? ag.distintos.ate_mes.municipios.atual : null,
    totalMunicipios: ag?.total_municipios_sc ?? 295,
    estabelecimentos: ag ? ag.distintos.ate_mes.estabelecimentos.atual : null,
    tipos: ag ? ag.distintos.ate_mes.procedimentos.atual : null,
  };
}
