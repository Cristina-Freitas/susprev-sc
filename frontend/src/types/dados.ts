/** Tipos dos artefatos estáticos gerados por scripts/sincronizar-dados.mjs */

export interface RegistroMensal {
  ano: number;
  mes: number;
  quantidade: number;
}

export interface SerieMensal {
  descricao: string;
  fonte: string;
  arquivo_origem: string;
  sha256_origem: string;
  primeira_competencia: string;
  ultima_competencia: string;
  total_competencias: number;
  gerado_em: string;
  registros: RegistroMensal[];
}

export interface MetricaModelo {
  modelo: string;
  mae: number;
  rmse: number;
  r2: number;
}

export interface MetricasModelo {
  descricao: string;
  teste_final: { arquivo_origem: string; sha256_origem: string; registros: MetricaModelo[] };
  validacao: { arquivo_origem: string; sha256_origem: string; registros: MetricaModelo[] };
  gerado_em: string;
}

export interface MunicipioMapa {
  codigo_ibge: string;
  codigo: string;
  nome: string | null;
  regiao_saude: string | null;
  d: string;
}

export interface MapaSC {
  descricao: string;
  fonte_geometria: string;
  url_geometria: string;
  fonte_nomes: string;
  largura: number;
  altura: number;
  total_municipios: number;
  gerado_em: string;
  contorno_estado: string;
  municipios: MunicipioMapa[];
}

/** Dimensão territorial da produção: onde foi realizado ou onde o paciente reside. */
export type Dimensao = 'atendimento' | 'residencia';

/** Valores indexados por ano, na mesma ordem de AgregadosProducao.anos. */
export type PorAno = number[];

export interface ComparacaoPeriodo {
  atual: number;
  anterior: number;
}

export interface MunicipioAgregado {
  codigo: string;
  nome: string;
  regiao_saude: string | null;
  atendimento: PorAno;
  residencia: PorAno;
}

export interface ProcedimentoAgregado {
  codigo: string;
  descricao: string | null;
  /** Quatro primeiros dígitos do código SIGTAP (grupo + subgrupo). */
  subgrupo: string;
  anual: PorAno;
  ate_mes: ComparacaoPeriodo;
}

export interface EstabelecimentoAgregado {
  cnes: string;
  nome: string | null;
  municipio_codigo: string | null;
  municipio: string | null;
  anual: PorAno;
}

/** Artefato gerado por scripts/gerar-agregados.mjs (public/data/agregados_producao.json). */
export interface AgregadosProducao {
  descricao: string;
  fonte: string;
  gerado_em: string;
  dimensao_territorial_principal: Dimensao;
  anos: number[];
  ano_corrente: number;
  mes_final_ano_corrente: number;
  origem: {
    arquivos: { arquivo: string; sha256: string; linhas: number }[];
    municipios_sha256: string;
    sigtap: string | null;
    nomes_estabelecimentos: string | null;
  };
  conferencia_serie_mensal: { disponivel: boolean; consistente?: boolean; anos_divergentes?: number[] };
  qualidade: {
    municipio_atendimento_nao_identificado: number;
    residencia_fora_de_sc_ou_ignorada_por_ano: PorAno;
    procedimentos_sem_descricao: number;
    estabelecimentos_sem_nome: number;
  };
  total_municipios_sc: number;
  totais: { por_ano: PorAno; meses_por_ano: PorAno; ate_mes: ComparacaoPeriodo };
  distintos: {
    municipios_atendimento: PorAno;
    municipios_residencia_sc: PorAno;
    estabelecimentos: PorAno;
    procedimentos: PorAno;
    ate_mes: {
      municipios: ComparacaoPeriodo;
      estabelecimentos: ComparacaoPeriodo;
      procedimentos: ComparacaoPeriodo;
    };
  };
  subgrupos: { codigo: string; nome: string }[];
  municipios: MunicipioAgregado[];
  procedimentos: ProcedimentoAgregado[];
  estabelecimentos: EstabelecimentoAgregado[];
}

/** Estado genérico de um recurso assíncrono. */
export type Recurso<T> =
  | { estado: 'carregando' }
  | { estado: 'sucesso'; dados: T }
  | { estado: 'erro'; erro: string; detalhe?: string };
