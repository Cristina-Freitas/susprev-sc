const formatoInteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const formatoDecimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatoCompacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 0 });

export const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MESES_EXTENSO = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export function formatarNumero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
  return formatoInteiro.format(valor);
}

export function formatarCompacto(valor: number): string {
  if (!Number.isFinite(valor)) return '';
  if (Math.abs(valor) < 1000) return formatoInteiro.format(valor);
  return `${formatoInteiro.format(Math.round(valor / 1000))} mil`;
}

/** Formata um número decimal com uma casa (ex.: 4,9). */
export function formatarDecimal(valor: number, casas = 1): string {
  if (!Number.isFinite(valor)) return '—';
  if (casas === 1) return formatoDecimal.format(valor);
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(valor);
}

/** Formata variação percentual com sinal (ex.: +4,9%). */
export function formatarVariacao(percentual: number | null): string {
  if (percentual === null || !Number.isFinite(percentual)) return '—';
  const sinal = percentual > 0 ? '+' : percentual < 0 ? '−' : '';
  return `${sinal}${formatoDecimal.format(Math.abs(percentual))}%`;
}

export function variacaoPercentual(atual: number, anterior: number): number | null {
  if (!Number.isFinite(atual) || !Number.isFinite(anterior) || anterior === 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

/** "2026-08" → "ago/2026" */
export function formatarCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split('-').map(Number);
  if (!ano || !mes || mes < 1 || mes > 12) return competencia;
  return `${MESES_ABREV[mes - 1]}/${ano}`;
}

/** "2026-08" → "agosto de 2026" */
export function formatarCompetenciaExtenso(competencia: string): string {
  const [ano, mes] = competencia.split('-').map(Number);
  if (!ano || !mes || mes < 1 || mes > 12) return competencia;
  return `${MESES_EXTENSO[mes - 1]} de ${ano}`;
}

export function nomeMes(mes: number, extenso = false): string {
  const lista = extenso ? MESES_EXTENSO : MESES_ABREV;
  return lista[mes - 1] ?? String(mes);
}

/** Formata um percentual já em escala 0–100 (ex.: 9,4%). */
export function formatarPercentual(valor: number | null | undefined, casas = 1): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
  return `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(valor)}%`;
}

const SIGLAS = new Set(['AIH', 'DIU', 'TC', 'UTI', 'SUS', 'RM', 'PTC', 'CPRE', 'EDA', 'ECG', 'EEG', 'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XI', 'XII']);

/**
 * Converte descrições SIGTAP (em CAIXA ALTA) para o formato de frase,
 * preservando siglas e algarismos romanos conhecidos.
 */
export function formatarDescricao(texto: string | null | undefined): string {
  if (!texto) return '';
  const palavras = texto.toLocaleLowerCase('pt-BR').split(/(\s+)/);
  const convertidas = palavras.map((p) => (SIGLAS.has(p.toLocaleUpperCase('pt-BR')) ? p.toLocaleUpperCase('pt-BR') : p));
  const frase = convertidas.join('');
  return frase.charAt(0).toLocaleUpperCase('pt-BR') + frase.slice(1);
}

export { formatoCompacto };
