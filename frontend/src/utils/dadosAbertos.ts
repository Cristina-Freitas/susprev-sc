import type { PrevisaoSaida } from '../types/api';
import type { AgregadosProducao, MetricasModelo, SerieMensal } from '../types/dados';
import { nomeMes } from './formatacao';
import type { Celula } from './exportacao';

export interface ConjuntoDados {
  id: string;
  arquivo: string;
  titulo: string;
  descricao: string;
  cabecalho: string[];
  linhas: Celula[][];
  /** false quando a fonte do conjunto ainda não foi carregada. */
  disponivel: boolean;
}

export interface CampoDicionario {
  arquivo: string;
  campo: string;
  descricao: string;
}

const decimal = (v: number): string => String(v).replace('.', ',');

/** Conjuntos de dados abertos em formato tabular (uma linha por registro, sem vetores). */
export function montarConjuntos(
  s: SerieMensal | null,
  p: PrevisaoSaida | null,
  m: MetricasModelo | null,
  ag: AgregadosProducao | null,
): ConjuntoDados[] {
  const serie: Celula[][] = [];
  if (s) {
    for (const r of s.registros) serie.push([r.ano, r.mes, `${r.ano}-${String(r.mes).padStart(2, '0')}`, r.quantidade, 'observado']);
  }
  if (p) {
    for (const x of p.meses) {
      if (x.tipo === 'previsto') serie.push([x.ano, x.mes, `${x.ano}-${String(x.mes).padStart(2, '0')}`, x.quantidade, 'previsto']);
    }
  }

  const municipioAno: Celula[][] = [];
  const procedimentoAno: Celula[][] = [];
  const estabelecimentoAno: Celula[][] = [];
  const cadastro: Celula[][] = [];
  if (ag) {
    const subgrupos = new Map(ag.subgrupos.map((g) => [g.codigo, g.nome]));
    ag.anos.forEach((ano, i) => {
      for (const x of ag.municipios) {
        const at = x.atendimento[i] ?? 0;
        const re = x.residencia[i] ?? 0;
        if (at > 0 || re > 0) municipioAno.push([ano, x.codigo, x.nome, x.regiao_saude, at, re]);
      }
      for (const x of ag.procedimentos) {
        const q = x.anual[i] ?? 0;
        if (q > 0) procedimentoAno.push([ano, x.codigo, x.subgrupo, subgrupos.get(x.subgrupo) ?? '', x.descricao ?? '', q]);
      }
      for (const x of ag.estabelecimentos) {
        const q = x.anual[i] ?? 0;
        if (q > 0) estabelecimentoAno.push([ano, x.cnes, x.nome ?? '', x.municipio_codigo ?? '', x.municipio ?? '', q]);
      }
    });
    for (const x of [...ag.municipios].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))) {
      cadastro.push([x.codigo, x.nome, x.regiao_saude ?? '']);
    }
  }

  const metricas: Celula[][] = [];
  if (m) {
    for (const [conjunto, regs] of [['teste_final', m.teste_final.registros], ['validacao', m.validacao.registros]] as const) {
      for (const r of regs) metricas.push([conjunto, r.modelo, decimal(Number(r.mae.toFixed(2))), decimal(Number(r.rmse.toFixed(2))), decimal(Number(r.r2.toFixed(4)))]);
    }
  }

  return [
    {
      id: 'serie',
      arquivo: 'serie_mensal_procedimentos.csv',
      titulo: 'Série mensal de procedimentos',
      descricao: `Procedimentos cirúrgicos eletivos por competência, de jan/2019 a ${s ? `${nomeMes(s.registros[s.registros.length - 1].mes)}/${s.registros[s.registros.length - 1].ano}` : 'a última competência'}. Quando a API responde, inclui os meses previstos, marcados como "previsto".`,
      cabecalho: ['ano', 'mes', 'competencia', 'quantidade', 'tipo'],
      linhas: serie,
      disponivel: !!s,
    },
    {
      id: 'municipio',
      arquivo: 'producao_por_municipio_ano.csv',
      titulo: 'Produção por município e ano',
      descricao: 'Procedimentos por município de atendimento (onde foram realizados) e de residência (onde o paciente mora), por ano. O ano mais recente é parcial.',
      cabecalho: ['ano', 'codigo_ibge6', 'municipio', 'regiao_saude', 'procedimentos_atendimento', 'procedimentos_residencia'],
      linhas: municipioAno,
      disponivel: !!ag,
    },
    {
      id: 'procedimento',
      arquivo: 'producao_por_procedimento_ano.csv',
      titulo: 'Produção por procedimento e ano',
      descricao: 'Procedimentos por código SIGTAP, com subgrupo e descrição oficial (Tabela Unificada 202608), por ano. Códigos sem descrição no SIGTAP ficam com o campo vazio.',
      cabecalho: ['ano', 'codigo_sigtap', 'codigo_subgrupo', 'subgrupo', 'descricao', 'quantidade'],
      linhas: procedimentoAno,
      disponivel: !!ag,
    },
    {
      id: 'estabelecimento',
      arquivo: 'producao_por_estabelecimento_ano.csv',
      titulo: 'Produção por estabelecimento e ano',
      descricao: 'Procedimentos por estabelecimento (código CNES) e município de atendimento, por ano. O nome fica vazio quando o cadastro de nomes não foi carregado.',
      cabecalho: ['ano', 'cnes', 'nome', 'codigo_municipio', 'municipio', 'quantidade'],
      linhas: estabelecimentoAno,
      disponivel: !!ag,
    },
    {
      id: 'cadastro',
      arquivo: 'municipios_sc.csv',
      titulo: 'Cadastro de municípios de Santa Catarina',
      descricao: 'Tabela de referência com os 295 municípios: código IBGE de 6 dígitos, nome e região de saúde. Serve para cruzar com as demais tabelas.',
      cabecalho: ['codigo_ibge6', 'municipio', 'regiao_saude'],
      linhas: cadastro,
      disponivel: !!ag,
    },
    {
      id: 'metricas',
      arquivo: 'metricas_modelo.csv',
      titulo: 'Métricas de avaliação do modelo',
      descricao: 'Erro dos modelos comparados (MAE e RMSE em procedimentos por mês, e R²) na validação e no teste final. Decimais com vírgula.',
      cabecalho: ['conjunto', 'modelo', 'mae', 'rmse', 'r2'],
      linhas: metricas,
      disponivel: !!m,
    },
  ];
}

export const DICIONARIO: CampoDicionario[] = [
  { arquivo: 'serie_mensal_procedimentos.csv', campo: 'ano, mes, competencia', descricao: 'Período da competência (competencia no formato AAAA-MM).' },
  { arquivo: 'serie_mensal_procedimentos.csv', campo: 'quantidade', descricao: 'Número de procedimentos cirúrgicos eletivos (pares AIH/procedimento/CNES, grupo 04 do SIGTAP).' },
  { arquivo: 'serie_mensal_procedimentos.csv', campo: 'tipo', descricao: '"observado" é produção registrada; "previsto" é estimativa do modelo XGBoost e não representa produção realizada.' },
  { arquivo: 'producao_por_municipio_ano.csv', campo: 'codigo_ibge6', descricao: 'Código IBGE do município com 6 dígitos (sem o dígito verificador).' },
  { arquivo: 'producao_por_municipio_ano.csv', campo: 'procedimentos_atendimento', descricao: 'Procedimentos realizados em estabelecimentos do município.' },
  { arquivo: 'producao_por_municipio_ano.csv', campo: 'procedimentos_residencia', descricao: 'Procedimentos de pacientes residentes no município. Residentes de outros estados não entram.' },
  { arquivo: 'producao_por_procedimento_ano.csv', campo: 'codigo_sigtap, subgrupo', descricao: 'Código do procedimento (10 dígitos); os 4 primeiros indicam o subgrupo.' },
  { arquivo: 'producao_por_estabelecimento_ano.csv', campo: 'cnes', descricao: 'Código do estabelecimento no Cadastro Nacional (CNES), 7 dígitos.' },
  { arquivo: 'producao_por_estabelecimento_ano.csv', campo: 'codigo_municipio, municipio', descricao: 'Município de atendimento registrado para o estabelecimento na produção.' },
  { arquivo: 'metricas_modelo.csv', campo: 'mae, rmse, r2', descricao: 'Erro absoluto médio e raiz do erro quadrático médio (em procedimentos por mês) e coeficiente de determinação.' },
];

export const CABECALHO_DICIONARIO = ['arquivo', 'campo', 'descricao'];
