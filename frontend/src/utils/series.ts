import type { PrevisaoSaida } from '../types/api';
import type { RegistroMensal, SerieMensal } from '../types/dados';

export interface TotalAnual {
  ano: number;
  total: number;
  mesesComDados: number;
  completo: boolean;
}

/** Soma a série mensal por ano, indicando se o ano possui as 12 competências. */
export function totaisAnuais(registros: RegistroMensal[]): TotalAnual[] {
  const mapa = new Map<number, { total: number; meses: Set<number> }>();
  for (const r of registros) {
    const atual = mapa.get(r.ano) ?? { total: 0, meses: new Set<number>() };
    atual.total += r.quantidade;
    atual.meses.add(r.mes);
    mapa.set(r.ano, atual);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ano, { total, meses }]) => ({
      ano,
      total,
      mesesComDados: meses.size,
      completo: meses.size === 12,
    }));
}

/** Soma as competências de um ano entre jan e o mês informado (inclusive). */
export function somaAteMes(registros: RegistroMensal[], ano: number, mesFinal: number): number | null {
  const selecionados = registros.filter((r) => r.ano === ano && r.mes <= mesFinal);
  if (selecionados.length !== mesFinal) return null;
  return selecionados.reduce((s, r) => s + r.quantidade, 0);
}

export function quantidadeMes(registros: RegistroMensal[], ano: number, mes: number): number | null {
  return registros.find((r) => r.ano === ano && r.mes === mes)?.quantidade ?? null;
}

/** Converte "AAAA-MM" em { ano, mes }. */
export function lerCompetencia(competencia: string): { ano: number; mes: number } | null {
  const [ano, mes] = competencia.split('-').map(Number);
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12) return null;
  return { ano, mes };
}

export interface ResultadoConferencia {
  /** Quantidade de meses observados comparados. */
  comparados: number;
  /** Quantidade de meses com valores idênticos. */
  identicos: number;
  divergencias: { mes: number; api: number; serie: number | null }[];
  consistente: boolean;
}

/**
 * Confere os meses observados devolvidos pela API com a série versionada.
 * Garante rastreabilidade: o histórico usado no gráfico anual vem da mesma
 * base que alimenta a API.
 */
export function conferirSerieComApi(serie: SerieMensal, previsao: PrevisaoSaida): ResultadoConferencia {
  const observados = previsao.meses.filter((m) => m.tipo === 'observado');
  const divergencias: ResultadoConferencia['divergencias'] = [];
  let identicos = 0;
  for (const m of observados) {
    const valorSerie = quantidadeMes(serie.registros, m.ano, m.mes);
    if (valorSerie === m.quantidade) identicos += 1;
    else divergencias.push({ mes: m.mes, api: m.quantidade, serie: valorSerie });
  }
  return {
    comparados: observados.length,
    identicos,
    divergencias,
    consistente: observados.length > 0 && divergencias.length === 0,
  };
}

/** Linha do gráfico de evolução anual. */
export interface PontoAnual {
  ano: string;
  anoNumero: number;
  /** Ano completo realizado (12 competências). */
  realizado: number | null;
  /** Parte observada de um ano incompleto (ex.: jan–ago/2026). */
  observadoParcial: number | null;
  /** Previsão do modelo para os meses restantes do ano incompleto. */
  previsto: number | null;
  /** Total exibido no topo da barra. */
  totalRotulo: number;
  mesesObservados: number;
  fonteObservado: 'api' | 'serie';
  temPrevisao: boolean;
}

export function montarSerieAnual(serie: SerieMensal, previsao: PrevisaoSaida | null): PontoAnual[] {
  return totaisAnuais(serie.registros).map((t) => {
    const ehAnoPrevisao = previsao !== null && previsao.ano === t.ano;
    if (t.completo && !ehAnoPrevisao) {
      return {
        ano: String(t.ano),
        anoNumero: t.ano,
        realizado: t.total,
        observadoParcial: null,
        previsto: null,
        totalRotulo: t.total,
        mesesObservados: 12,
        fonteObservado: 'serie' as const,
        temPrevisao: false,
      };
    }
    const observado = ehAnoPrevisao ? previsao.total_observado : t.total;
    const previsto = ehAnoPrevisao ? previsao.total_previsto : null;
    return {
      ano: String(t.ano),
      anoNumero: t.ano,
      realizado: null,
      observadoParcial: observado,
      previsto,
      totalRotulo: ehAnoPrevisao ? previsao.total_anual_projetado : observado,
      mesesObservados: ehAnoPrevisao
        ? previsao.meses.filter((m) => m.tipo === 'observado').length
        : t.mesesComDados,
      fonteObservado: ehAnoPrevisao ? ('api' as const) : ('serie' as const),
      temPrevisao: ehAnoPrevisao,
    };
  });
}

/** Ponto mensal do ano corrente (observado/previsto) com o mesmo mês do ano anterior. */
export interface PontoMensal {
  mes: string;
  mesNumero: number;
  observado: number | null;
  previsto: number | null;
  anoAnterior: number | null;
}

export function montarSerieMensalAno(
  previsao: PrevisaoSaida,
  serie: SerieMensal | null,
): PontoMensal[] {
  return Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    const item = previsao.meses.find((m) => m.ano === previsao.ano && m.mes === mes);
    return {
      mes: String(mes),
      mesNumero: mes,
      observado: item?.tipo === 'observado' ? item.quantidade : null,
      previsto: item?.tipo === 'previsto' ? item.quantidade : null,
      anoAnterior: serie ? quantidadeMes(serie.registros, previsao.ano - 1, mes) : null,
    };
  });
}

/** Série mensal completa (histórico + previsão) para gráfico de linha. */
export interface PontoHistorico {
  chave: string;
  ano: number;
  mes: number;
  observado: number | null;
  previsto: number | null;
}

export function montarHistoricoMensal(serie: SerieMensal, previsao: PrevisaoSaida | null): PontoHistorico[] {
  const pontos: PontoHistorico[] = serie.registros.map((r) => ({
    chave: `${r.ano}-${String(r.mes).padStart(2, '0')}`,
    ano: r.ano,
    mes: r.mes,
    observado: r.quantidade,
    previsto: null,
  }));
  if (previsao) {
    const previstos = previsao.meses.filter((m) => m.tipo === 'previsto');
    if (previstos.length && pontos.length) {
      // Conecta visualmente a linha prevista ao último mês observado.
      const ultimo = pontos[pontos.length - 1];
      ultimo.previsto = ultimo.observado;
    }
    for (const m of previstos) {
      pontos.push({
        chave: `${m.ano}-${String(m.mes).padStart(2, '0')}`,
        ano: m.ano,
        mes: m.mes,
        observado: null,
        previsto: m.quantidade,
      });
    }
  }
  return pontos;
}
