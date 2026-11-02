/**
 * Contratos da API FastAPI do SUSPrev SC.
 * Espelham exatamente app/schemas/previsao.py e o retorno de GET /health (app/main.py).
 */

/** GET /health */
export interface RespostaSaude {
  status: string;
  modelo_carregado: boolean;
}

/** Corpo de POST /predict — o backend aceita apenas o ano 2026. */
export interface PrevisaoEntrada {
  ano: 2026;
}

export type TipoMes = 'observado' | 'previsto';

/** Item de PrevisaoSaida.meses */
export interface PrevisaoMensal {
  ano: number;
  mes: number;
  quantidade: number;
  tipo: TipoMes;
}

/** Resposta de POST /predict */
export interface PrevisaoSaida {
  ano: number;
  /** Formato "AAAA-MM" */
  ultima_competencia_observada: string;
  modelo: string;
  total_observado: number;
  total_previsto: number;
  total_anual_projetado: number;
  meses: PrevisaoMensal[];
}
