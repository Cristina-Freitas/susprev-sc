/**
 * Gerador mínimo de planilhas .xlsx (Office Open XML) sem dependências.
 * Cada aba tem cabeçalho em negrito com fundo, primeira linha congelada e
 * larguras de coluna automáticas. Números são gravados como números.
 */
export type CelulaXlsx = string | number | null | undefined;

export interface AbaXlsx {
  nome: string;
  cabecalho: string[];
  linhas: CelulaXlsx[][];
  /** Larguras fixas opcionais (em caracteres), por coluna. */
  larguras?: number[];
}

const codificador = new TextEncoder();

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(dados: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < dados.length; i++) c = TABELA_CRC[(c ^ dados[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function escaparXml(texto: string): string {
  // Remove caracteres de controle inválidos em XML 1.0.
  // eslint-disable-next-line no-control-regex
  return texto.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function letraColuna(indice: number): string {
  let n = indice + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function nomeAbaValido(nome: string, usados: Set<string>): string {
  let base = nome.replace(/[\[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Aba';
  let candidato = base;
  let i = 2;
  while (usados.has(candidato.toLowerCase())) {
    const sufixo = ` (${i++})`;
    candidato = base.slice(0, 31 - sufixo.length) + sufixo;
  }
  usados.add(candidato.toLowerCase());
  return candidato;
}

function celula(valor: CelulaXlsx, coluna: number, linha: number, estilo: number): string {
  const ref = `${letraColuna(coluna)}${linha}`;
  if (valor === null || valor === undefined || valor === '') return estilo ? `<c r="${ref}" s="${estilo}"/>` : '';
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return `<c r="${ref}"${estilo ? ` s="${estilo}"` : ''}><v>${valor}</v></c>`;
  }
  return `<c r="${ref}"${estilo ? ` s="${estilo}"` : ''} t="inlineStr"><is><t xml:space="preserve">${escaparXml(String(valor))}</t></is></c>`;
}

function xmlAba(aba: AbaXlsx): string {
  const todas: CelulaXlsx[][] = [aba.cabecalho, ...aba.linhas];
  const colunas = aba.cabecalho.length;
  const larguras = Array.from({ length: colunas }, (_, c) => {
    if (aba.larguras?.[c]) return aba.larguras[c];
    const maior = todas.reduce((m, l) => Math.max(m, String(l[c] ?? '').length), 0);
    return Math.min(60, Math.max(10, maior + 2));
  });
  const cols = larguras.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  const linhas = todas
    .map((l, i) => {
      const estilo = i === 0 ? 1 : 0;
      const cels = Array.from({ length: colunas }, (_, c) => celula(l[c], c, i + 1, estilo)).join('');
      return `<row r="${i + 1}">${cels}</row>`;
    })
    .join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${cols}</cols><sheetData>${linhas}</sheetData></worksheet>`
  );
}

interface EntradaZip {
  nome: string;
  conteudo: Uint8Array;
}

function empacotarZip(entradas: EntradaZip[]): Uint8Array {
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let deslocamento = 0;
  const agora = new Date();
  const hora = (agora.getHours() << 11) | (agora.getMinutes() << 5) | (agora.getSeconds() >> 1);
  const data = ((agora.getFullYear() - 1980) << 9) | ((agora.getMonth() + 1) << 5) | agora.getDate();

  for (const e of entradas) {
    const nome = codificador.encode(e.nome);
    const crc = crc32(e.conteudo);
    const local = new Uint8Array(30 + nome.length);
    const v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x0800, true);
    v.setUint16(8, 0, true);
    v.setUint16(10, hora, true);
    v.setUint16(12, data, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, e.conteudo.length, true);
    v.setUint32(22, e.conteudo.length, true);
    v.setUint16(26, nome.length, true);
    v.setUint16(28, 0, true);
    local.set(nome, 30);
    partes.push(local, e.conteudo);

    const reg = new Uint8Array(46 + nome.length);
    const c = new DataView(reg.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, hora, true);
    c.setUint16(14, data, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, e.conteudo.length, true);
    c.setUint32(24, e.conteudo.length, true);
    c.setUint16(28, nome.length, true);
    c.setUint32(42, deslocamento, true);
    reg.set(nome, 46);
    central.push(reg);
    deslocamento += local.length + e.conteudo.length;
  }

  const tamanhoCentral = central.reduce((s, r) => s + r.length, 0);
  const fim = new Uint8Array(22);
  const f = new DataView(fim.buffer);
  f.setUint32(0, 0x06054b50, true);
  f.setUint16(8, entradas.length, true);
  f.setUint16(10, entradas.length, true);
  f.setUint32(12, tamanhoCentral, true);
  f.setUint32(16, deslocamento, true);

  const todos = [...partes, ...central, fim];
  const total = todos.reduce((s, p) => s + p.length, 0);
  const saida = new Uint8Array(total);
  let pos = 0;
  for (const p of todos) {
    saida.set(p, pos);
    pos += p.length;
  }
  return saida;
}

const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Monta o arquivo .xlsx em memória. */
export function criarXlsx(abas: AbaXlsx[]): Uint8Array {
  const usados = new Set<string>();
  const nomes = abas.map((a) => nomeAbaValido(a.nome, usados));
  const txt = (s: string): Uint8Array => codificador.encode(s);
  const cab = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

  const entradas: EntradaZip[] = [
    {
      nome: '[Content_Types].xml',
      conteudo: txt(
        `${cab}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
          abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
          '</Types>',
      ),
    },
    {
      nome: '_rels/.rels',
      conteudo: txt(
        `${cab}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      ),
    },
    {
      nome: 'xl/workbook.xml',
      conteudo: txt(
        `${cab}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
          nomes.map((n, i) => `<sheet name="${escaparXml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
          '</sheets></workbook>',
      ),
    },
    {
      nome: 'xl/_rels/workbook.xml.rels',
      conteudo: txt(
        `${cab}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
          `<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      ),
    },
    {
      nome: 'xl/styles.xml',
      conteudo: txt(
        `${cab}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
          '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
          '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
          '<fill><patternFill patternType="solid"><fgColor rgb="FF1F4E8C"/><bgColor indexed="64"/></patternFill></fill></fills>' +
          '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
          '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
          '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
          '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>' +
          '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
      ),
    },
    ...abas.map((a, i) => ({ nome: `xl/worksheets/sheet${i + 1}.xml`, conteudo: txt(xmlAba(a)) })),
  ];
  return empacotarZip(entradas);
}

export function baixarXlsx(nomeArquivo: string, abas: AbaXlsx[]): void {
  const bytes = criarXlsx(abas);
  const blob = new Blob([bytes as BlobPart], { type: TIPO_XLSX });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
