import type { AgregadosProducao, Dimensao, EstabelecimentoAgregado, ProcedimentoAgregado } from '../types/dados';

/** Posição do ano na série de agregados (-1 se não existir). */
export function indiceAno(ag: AgregadosProducao, ano: number): number {
  return ag.anos.indexOf(ano);
}

export function totalDoAno(ag: AgregadosProducao, ano: number): number {
  const i = indiceAno(ag, ano);
  return i >= 0 ? ag.totais.por_ano[i] : 0;
}

export interface LinhaMunicipio {
  codigo: string;
  nome: string;
  regiaoSaude: string | null;
  quantidade: number;
  /** Percentual (0–100) sobre o total de procedimentos do estado no ano. */
  participacao: number;
}

/**
 * Ranking municipal. A participação usa como denominador o total de
 * procedimentos do estado no ano (mesma base da série e da API).
 */
export function rankingMunicipios(ag: AgregadosProducao, ano: number, dimensao: Dimensao): LinhaMunicipio[] {
  const i = indiceAno(ag, ano);
  if (i < 0) return [];
  const total = ag.totais.por_ano[i];
  return ag.municipios
    .map((m) => ({
      codigo: m.codigo,
      nome: m.nome,
      regiaoSaude: m.regiao_saude,
      quantidade: m[dimensao][i] ?? 0,
      participacao: total > 0 ? ((m[dimensao][i] ?? 0) / total) * 100 : 0,
    }))
    .filter((m) => m.quantidade > 0)
    .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Classes de cor do mapa (percentual do total estadual), da maior para a menor. */
export interface ClasseMapa {
  id: string;
  rotulo: string;
  cor: string;
}

export const CLASSES_MAPA: ClasseMapa[] = [
  { id: 'c5', rotulo: '> 5,0%', cor: '#0b3a78' },
  { id: 'c2', rotulo: '2,0% – 5,0%', cor: '#1f74d6' },
  { id: 'c1', rotulo: '1,0% – 2,0%', cor: '#4cc1e6' },
  { id: 'c01', rotulo: '0,1% – 1,0%', cor: '#b4e6d3' },
  { id: 'c0', rotulo: '< 0,1%', cor: '#dcefe9' },
  { id: 'sem', rotulo: 'Sem registros', cor: '#e4e8ee' },
];

export function classeDoMapa(participacao: number, quantidade: number): ClasseMapa {
  if (quantidade <= 0) return CLASSES_MAPA[5];
  if (participacao > 5) return CLASSES_MAPA[0];
  if (participacao >= 2) return CLASSES_MAPA[1];
  if (participacao >= 1) return CLASSES_MAPA[2];
  if (participacao >= 0.1) return CLASSES_MAPA[3];
  return CLASSES_MAPA[4];
}

export interface LinhaProcedimento {
  codigo: string;
  descricao: string | null;
  subgrupo: string;
  quantidade: number;
  participacao: number;
  /** Quantidade no mesmo período (jan–mês final) do ano anterior. */
  anterior: number;
  variacaoAbsoluta: number;
  variacaoPercentual: number | null;
}

export function rankingProcedimentos(ag: AgregadosProducao, ano: number): LinhaProcedimento[] {
  const i = indiceAno(ag, ano);
  if (i < 0) return [];
  const total = ag.totais.por_ano[i];
  const ehCorrente = ano === ag.ano_corrente;
  return ag.procedimentos
    .map((p: ProcedimentoAgregado) => {
      const quantidade = p.anual[i] ?? 0;
      const anterior = ehCorrente ? p.ate_mes.anterior : (p.anual[i - 1] ?? 0);
      return {
        codigo: p.codigo,
        descricao: p.descricao,
        subgrupo: p.subgrupo,
        quantidade,
        participacao: total > 0 ? (quantidade / total) * 100 : 0,
        anterior,
        variacaoAbsoluta: quantidade - anterior,
        variacaoPercentual: anterior > 0 ? ((quantidade - anterior) / anterior) * 100 : null,
      };
    })
    .filter((p) => p.quantidade > 0 || p.anterior > 0)
    .sort((a, b) => b.quantidade - a.quantidade || a.codigo.localeCompare(b.codigo));
}

export interface LinhaEstabelecimento {
  cnes: string;
  nome: string | null;
  municipio: string | null;
  quantidade: number;
  participacao: number;
}

export function rankingEstabelecimentos(ag: AgregadosProducao, ano: number): LinhaEstabelecimento[] {
  const i = indiceAno(ag, ano);
  if (i < 0) return [];
  const total = ag.totais.por_ano[i];
  return ag.estabelecimentos
    .map((e: EstabelecimentoAgregado) => ({
      cnes: e.cnes,
      nome: e.nome,
      municipio: e.municipio,
      quantidade: e.anual[i] ?? 0,
      participacao: total > 0 ? ((e.anual[i] ?? 0) / total) * 100 : 0,
    }))
    .filter((e) => e.quantidade > 0)
    .sort((a, b) => b.quantidade - a.quantidade || a.cnes.localeCompare(b.cnes));
}

export interface LinhaSubgrupo {
  codigo: string;
  nome: string;
  quantidade: number;
  participacao: number;
}

export function agregarPorSubgrupo(ag: AgregadosProducao, ano: number): LinhaSubgrupo[] {
  const i = indiceAno(ag, ano);
  if (i < 0) return [];
  const total = ag.totais.por_ano[i];
  const nomes = new Map(ag.subgrupos.map((s) => [s.codigo, s.nome]));
  const soma = new Map<string, number>();
  for (const p of ag.procedimentos) soma.set(p.subgrupo, (soma.get(p.subgrupo) ?? 0) + (p.anual[i] ?? 0));
  return [...soma.entries()]
    .filter(([, q]) => q > 0)
    .map(([codigo, quantidade]) => ({
      codigo,
      nome: nomes.get(codigo) ?? `Subgrupo ${codigo}`,
      quantidade,
      participacao: total > 0 ? (quantidade / total) * 100 : 0,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

/** Série anual (ano completo) de um procedimento ou do total; null para ano sem dado. */
export function serieAnualProcedimento(ag: AgregadosProducao, codigo: string | null): (number | null)[] {
  if (codigo === null) return ag.totais.por_ano;
  const p = ag.procedimentos.find((x) => x.codigo === codigo);
  return p ? p.anual : ag.anos.map(() => null);
}
