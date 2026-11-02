import type { PrevisaoMensal, PrevisaoSaida, RespostaSaude } from '../types/api';

/**
 * Cliente HTTP da API FastAPI do SUSPrev SC.
 *
 * O navegador chama sempre o prefixo VITE_API_PREFIX (padrão "/api"), que o
 * servidor do Vite encaminha para VITE_API_BASE_URL. Isso evita depender de
 * CORS no backend, que não deve ser modificado.
 */
export const PREFIXO_API = (import.meta.env.VITE_API_PREFIX || '/api').replace(/\/+$/, '');
export const URL_BACKEND = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const TEMPO_LIMITE_MS = 20_000;

export type TipoErroApi = 'rede' | 'tempo' | 'http' | 'formato';

export class ErroApi extends Error {
  readonly tipo: TipoErroApi;
  readonly status?: number;
  readonly detalhe?: string;

  constructor(tipo: TipoErroApi, mensagem: string, status?: number, detalhe?: string) {
    super(mensagem);
    this.name = 'ErroApi';
    this.tipo = tipo;
    this.status = status;
    this.detalhe = detalhe;
  }
}

const MENSAGEM_OFFLINE =
  'Não foi possível conectar à API do SUSPrev SC. Verifique se o backend FastAPI está em execução.';

function mensagemPorStatus(status: number, detalhe?: string): string {
  switch (status) {
    case 400:
      return detalhe ? `A API recusou a solicitação: ${detalhe}` : 'A API recusou a solicitação.';
    case 404:
      return 'Endpoint não encontrado na API. Confira a versão do backend.';
    case 422:
      return 'A API considerou os dados enviados inválidos (HTTP 422).';
    case 500:
      return 'A API encontrou um erro interno ao processar a previsão (HTTP 500).';
    case 503:
      return detalhe
        ? `Serviço temporariamente indisponível: ${detalhe}`
        : 'Serviço de previsão temporariamente indisponível (HTTP 503).';
    default:
      return `A API respondeu com erro HTTP ${status}.`;
  }
}

async function extrairDetalhe(resposta: Response): Promise<string | undefined> {
  try {
    const corpo: unknown = await resposta.json();
    if (corpo && typeof corpo === 'object' && 'detail' in corpo) {
      const detalhe = (corpo as { detail: unknown }).detail;
      if (typeof detalhe === 'string') return detalhe;
      return JSON.stringify(detalhe);
    }
  } catch {
    /* corpo vazio ou não-JSON */
  }
  return undefined;
}

async function requisitar<T>(
  caminho: string,
  init: RequestInit,
  validar: (dados: unknown) => T,
  sinalExterno?: AbortSignal,
): Promise<T> {
  const controlador = new AbortController();
  const cronometro = window.setTimeout(() => controlador.abort('tempo'), TEMPO_LIMITE_MS);
  const abortarExterno = () => controlador.abort('externo');
  sinalExterno?.addEventListener('abort', abortarExterno);

  let resposta: Response;
  try {
    resposta = await fetch(`${PREFIXO_API}${caminho}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init.headers ?? {}) },
      signal: controlador.signal,
    });
  } catch (erro) {
    if (controlador.signal.aborted && controlador.signal.reason === 'tempo') {
      throw new ErroApi('tempo', 'A API demorou demais para responder. Tente novamente em instantes.');
    }
    if (controlador.signal.aborted) throw erro;
    throw new ErroApi('rede', MENSAGEM_OFFLINE);
  } finally {
    window.clearTimeout(cronometro);
    sinalExterno?.removeEventListener('abort', abortarExterno);
  }

  if (!resposta.ok) {
    const detalhe = await extrairDetalhe(resposta);
    // 502/504 vêm do proxy do Vite quando o FastAPI está desligado.
    if (resposta.status === 502 || resposta.status === 504 || detalhe === 'backend_indisponivel') {
      throw new ErroApi('rede', MENSAGEM_OFFLINE, resposta.status);
    }
    throw new ErroApi('http', mensagemPorStatus(resposta.status, detalhe), resposta.status, detalhe);
  }

  let corpo: unknown;
  try {
    corpo = await resposta.json();
  } catch {
    throw new ErroApi('formato', 'A API retornou uma resposta que não está em formato JSON.');
  }
  return validar(corpo);
}

/* ------------------------------------------------------------------ */
/* Validação defensiva das respostas                                    */
/* ------------------------------------------------------------------ */

const ehObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const ehInteiroNaoNegativo = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0;

function formatoInvalido(campo: string): never {
  throw new ErroApi(
    'formato',
    'A resposta da API não está no formato esperado. Os dados não serão exibidos para evitar informações incorretas.',
    undefined,
    `Campo inválido ou ausente: ${campo}`,
  );
}

function validarSaude(dados: unknown): RespostaSaude {
  if (!ehObjeto(dados)) formatoInvalido('corpo');
  if (typeof dados.status !== 'string') formatoInvalido('status');
  if (typeof dados.modelo_carregado !== 'boolean') formatoInvalido('modelo_carregado');
  return { status: dados.status, modelo_carregado: dados.modelo_carregado };
}

function validarMes(item: unknown, indice: number): PrevisaoMensal {
  if (!ehObjeto(item)) formatoInvalido(`meses[${indice}]`);
  const { ano, mes, quantidade, tipo } = item;
  if (!ehInteiroNaoNegativo(ano)) formatoInvalido(`meses[${indice}].ano`);
  if (!ehInteiroNaoNegativo(mes) || mes < 1 || mes > 12) formatoInvalido(`meses[${indice}].mes`);
  if (!ehInteiroNaoNegativo(quantidade)) formatoInvalido(`meses[${indice}].quantidade`);
  if (tipo !== 'observado' && tipo !== 'previsto') formatoInvalido(`meses[${indice}].tipo`);
  return { ano, mes, quantidade, tipo };
}

function validarPrevisao(dados: unknown): PrevisaoSaida {
  if (!ehObjeto(dados)) formatoInvalido('corpo');
  const d = dados;
  if (!ehInteiroNaoNegativo(d.ano)) formatoInvalido('ano');
  if (typeof d.ultima_competencia_observada !== 'string' || !/^\d{4}-\d{2}$/.test(d.ultima_competencia_observada)) {
    formatoInvalido('ultima_competencia_observada');
  }
  if (typeof d.modelo !== 'string') formatoInvalido('modelo');
  if (!ehInteiroNaoNegativo(d.total_observado)) formatoInvalido('total_observado');
  if (!ehInteiroNaoNegativo(d.total_previsto)) formatoInvalido('total_previsto');
  if (!ehInteiroNaoNegativo(d.total_anual_projetado)) formatoInvalido('total_anual_projetado');
  if (!Array.isArray(d.meses)) formatoInvalido('meses');

  const meses = d.meses.map(validarMes).sort((a, b) => a.ano - b.ano || a.mes - b.mes);

  return {
    ano: d.ano,
    ultima_competencia_observada: d.ultima_competencia_observada as string,
    modelo: d.modelo,
    total_observado: d.total_observado,
    total_previsto: d.total_previsto,
    total_anual_projetado: d.total_anual_projetado,
    meses,
  };
}

/* ------------------------------------------------------------------ */
/* Endpoints                                                            */
/* ------------------------------------------------------------------ */

export function consultarSaude(sinal?: AbortSignal): Promise<RespostaSaude> {
  return requisitar('/health', { method: 'GET' }, validarSaude, sinal);
}

export function consultarPrevisao(ano: 2026 = 2026, sinal?: AbortSignal): Promise<PrevisaoSaida> {
  return requisitar(
    '/predict',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ano }),
    },
    validarPrevisao,
    sinal,
  );
}
