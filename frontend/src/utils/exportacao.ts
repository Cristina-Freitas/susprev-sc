/** Geração de arquivos CSV no navegador: separador ";", UTF-8 com BOM (abre direto no Excel pt-BR). */
export type Celula = string | number | null | undefined;

function escapar(c: Celula): string {
  if (c === null || c === undefined) return '';
  const t = String(c);
  return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export function baixarCsv(nomeArquivo: string, cabecalho: string[], linhas: Celula[][]): void {
  const corpo = [cabecalho, ...linhas].map((l) => l.map(escapar).join(';')).join('\r\n');
  const blob = new Blob(['\uFEFF', corpo, '\r\n'], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
