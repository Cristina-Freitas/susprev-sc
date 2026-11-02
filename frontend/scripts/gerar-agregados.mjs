#!/usr/bin/env node
/**
 * Gera frontend/public/data/agregados_producao.json a partir dos CSVs
 * versionados do backup do banco (somente leitura) e das tabelas de
 * referência SIGTAP guardadas em frontend/dados-fonte/.
 *
 * Fontes (somente leitura):
 *  - <raiz>/data/processed/csv_backup/producao_cirurgica_*.csv
 *      Produção cirúrgica eletiva (SIH/SUS) por competência, município de
 *      atendimento, município de residência, CNES e procedimento.
 *  - <raiz>/data/processed/csv_backup/municipios_001.csv
 *      Cadastro de municípios de SC (código IBGE de 6 dígitos, nome, região).
 *  - frontend/dados-fonte/sigtap_202608_procedimentos.csv e _subgrupos.csv
 *      Descrições oficiais SIGTAP (Tabela Unificada, competência 202608).
 *  - <raiz>/data/processed/csv_backup/estabelecimentos_*.csv
 *      Nomes dos estabelecimentos, quando a tabela do banco estiver preenchida.
 *  - frontend/dados-fonte/estabelecimentos_cnes.csv (OPCIONAL, "cnes;nome")
 *      Nomes manuais; têm prioridade sobre o backup. Sem nenhum dos dois, a interface mostra o código.
 *
 * O script NÃO altera nada fora de frontend/public/data.
 *
 * Uso (dentro de frontend/):
 *   npm run dados:agregar
 *   node scripts/gerar-agregados.mjs --backend /caminho/para/susprev-sc
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR_FRONTEND = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argumento = (nome) => {
  const i = process.argv.indexOf(nome);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const DIR_RAIZ = resolve(argumento('--backend') ?? join(DIR_FRONTEND, '..'));
const DIR_CSV = join(DIR_RAIZ, 'data', 'processed', 'csv_backup');
const DIR_FONTES = join(DIR_FRONTEND, 'dados-fonte');
const DIR_SAIDA = join(DIR_FRONTEND, 'public', 'data');

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const rel = (p) => relative(DIR_RAIZ, p).split('\\').join('/');

function lerTexto(caminho) {
  const bruto = readFileSync(caminho);
  return { texto: bruto.toString('utf8').replace(/^\uFEFF/, ''), sha: sha256(bruto) };
}

/** CSV simples (sem aspas) com separador configurável; ignora linhas iniciadas por "#". */
function lerTabela(caminho, sep = ',') {
  const { texto, sha } = lerTexto(caminho);
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim() !== '' && !l.startsWith('#'));
  const cab = linhas[0].split(sep).map((c) => c.trim());
  return { cab, linhas: linhas.slice(1), sha };
}

if (!existsSync(DIR_CSV)) {
  console.error(`Pasta não encontrada: ${DIR_CSV}\nInforme o repositório com --backend <caminho>.`);
  process.exit(1);
}

// ----------------------------- Referências ------------------------------
const municipiosRef = new Map();
{
  const { cab, linhas } = lerTabela(join(DIR_CSV, 'municipios_001.csv'));
  const iCod = cab.indexOf('codigo');
  const iNome = cab.indexOf('nome');
  const iReg = cab.indexOf('regiao_saude');
  for (const l of linhas) {
    const c = l.split(',');
    municipiosRef.set(c[iCod], { nome: c[iNome], regiao: c[iReg] || null });
  }
}

const sigtapProc = new Map();
{
  const caminho = join(DIR_FONTES, 'sigtap_202608_procedimentos.csv');
  if (existsSync(caminho)) {
    const { linhas } = lerTabela(caminho, ';');
    for (const l of linhas) {
      const [cod, ...resto] = l.split(';');
      sigtapProc.set(cod, resto.join(';').trim());
    }
  }
}
const sigtapSub = new Map();
{
  const caminho = join(DIR_FONTES, 'sigtap_202608_subgrupos.csv');
  if (existsSync(caminho)) {
    const { linhas } = lerTabela(caminho, ';');
    for (const l of linhas) {
      const [cod, ...resto] = l.split(';');
      sigtapSub.set(cod, resto.join(';').trim());
    }
  }
}
const nomesCnes = new Map();
const origemNomesCnes = [];
{
  // 1) Backup CSV do banco (tabela estabelecimentos, quando preenchida): cnes,nome,municipio_codigo
  for (const arquivo of existsSync(DIR_CSV) ? readdirSync(DIR_CSV).filter((n) => /^estabelecimentos_\d+\.csv$/.test(n)).sort() : []) {
    const { cab, linhas } = lerTabela(join(DIR_CSV, arquivo));
    const iCnes = cab.indexOf('cnes');
    const iNome = cab.indexOf('nome');
    let lidos = 0;
    for (const l of linhas) {
      const c = l.split(',');
      const nome = (c[iNome] ?? '').trim();
      if (iCnes >= 0 && iNome >= 0 && nome) {
        nomesCnes.set((c[iCnes] ?? '').trim().padStart(7, '0'), nome);
        lidos += 1;
      }
    }
    if (lidos) origemNomesCnes.push(`data/processed/csv_backup/${arquivo}`);
  }
  // 2) Arquivo manual em dados-fonte (cnes;nome): tem prioridade sobre o backup.
  const caminho = join(DIR_FONTES, 'estabelecimentos_cnes.csv');
  if (existsSync(caminho)) {
    const { linhas } = lerTabela(caminho, ';');
    for (const l of linhas) {
      const [cnes, ...resto] = l.split(';');
      const nome = resto.join(';').trim();
      if (nome) nomesCnes.set(cnes.trim().padStart(7, '0'), nome);
    }
    origemNomesCnes.push('dados-fonte/estabelecimentos_cnes.csv');
  }
}

// ------------------------------- Produção -------------------------------
const arquivos = readdirSync(DIR_CSV)
  .filter((n) => /^producao_cirurgica_\d+\.csv$/.test(n))
  .sort();
if (!arquivos.length) {
  console.error('Nenhum producao_cirurgica_*.csv encontrado em', DIR_CSV);
  process.exit(1);
}

const registrosFonte = [];
const linhasBrutas = [];
let cabecalho = null;
for (const nome of arquivos) {
  const t = lerTabela(join(DIR_CSV, nome));
  cabecalho ??= t.cab;
  registrosFonte.push({ arquivo: `data/processed/csv_backup/${nome}`, sha256: t.sha, linhas: t.linhas.length });
  linhasBrutas.push(t.linhas);
}
const col = Object.fromEntries(cabecalho.map((c, i) => [c, i]));

const porMunAtend = new Map(); // codigo -> Map(ano -> qtd)
const porMunResid = new Map();
const porProc = new Map();
const porCnes = new Map();
const cnesMunicipio = new Map(); // cnes -> Map(municipio -> qtd)
const totalAno = new Map();
const mesMax = new Map(); // ano -> maior mês presente
const distMunAtend = new Map(); // ano -> Set
const distMunResid = new Map();
const distCnes = new Map();
const distProc = new Map();
const ateMes = new Map(); // `${ano}` -> mês final comparável; preenchido depois
let foraSC = new Map(); // residência fora de SC / não identificada: ano -> qtd
let atendNaoIdent = 0;

const somar = (mapa, chave, ano, qtd) => {
  let sub = mapa.get(chave);
  if (!sub) mapa.set(chave, (sub = new Map()));
  sub.set(ano, (sub.get(ano) ?? 0) + qtd);
};
const conjunto = (mapa, ano) => {
  let s = mapa.get(ano);
  if (!s) mapa.set(ano, (s = new Set()));
  return s;
};

// Primeira passada: descobre o último mês do ano mais recente.
let anoCorrente = 0;
for (const lote of linhasBrutas)
  for (const l of lote) {
    const c = l.split(',');
    const ano = +c[col.ano];
    if (ano > anoCorrente) anoCorrente = ano;
  }
let mesFinal = 0;
for (const lote of linhasBrutas)
  for (const l of lote) {
    const c = l.split(',');
    if (+c[col.ano] === anoCorrente && +c[col.mes] > mesFinal) mesFinal = +c[col.mes];
  }

// Segunda passada: totais por ano e totais comparáveis (jan..mesFinal) do ano corrente e do anterior.
const parcial = { atual: { total: 0 }, anterior: { total: 0 } };
const parcialDist = {
  atual: { mun: new Set(), cnes: new Set(), proc: new Set() },
  anterior: { mun: new Set(), cnes: new Set(), proc: new Set() },
};
const procParcial = new Map(); // codigo -> {atual, anterior}

for (const lote of linhasBrutas) {
  for (const l of lote) {
    const c = l.split(',');
    const ano = +c[col.ano];
    const mes = +c[col.mes];
    const qtd = +c[col.quantidade];
    const mAt = c[col.municipio_atendimento];
    const mRe = c[col.municipio_residencia];
    const cnes = c[col.cnes].padStart(7, '0');
    const proc = c[col.procedimento].padStart(10, '0');

    totalAno.set(ano, (totalAno.get(ano) ?? 0) + qtd);
    mesMax.set(ano, Math.max(mesMax.get(ano) ?? 0, mes));

    if (municipiosRef.has(mAt)) {
      somar(porMunAtend, mAt, ano, qtd);
      conjunto(distMunAtend, ano).add(mAt);
    } else {
      atendNaoIdent += qtd;
    }
    if (municipiosRef.has(mRe)) {
      somar(porMunResid, mRe, ano, qtd);
      conjunto(distMunResid, ano).add(mRe);
    } else {
      foraSC.set(ano, (foraSC.get(ano) ?? 0) + qtd);
    }
    somar(porProc, proc, ano, qtd);
    somar(porCnes, cnes, ano, qtd);
    somar(cnesMunicipio, cnes, mAt, qtd);
    conjunto(distCnes, ano).add(cnes);
    conjunto(distProc, ano).add(proc);

    const janela = ano === anoCorrente ? 'atual' : ano === anoCorrente - 1 ? 'anterior' : null;
    if (janela && mes <= mesFinal) {
      parcial[janela].total += qtd;
      if (municipiosRef.has(mAt)) parcialDist[janela].mun.add(mAt);
      parcialDist[janela].cnes.add(cnes);
      parcialDist[janela].proc.add(proc);
      let p = procParcial.get(proc);
      if (!p) procParcial.set(proc, (p = { atual: 0, anterior: 0 }));
      p[janela] += qtd;
    }
  }
}

const anos = [...totalAno.keys()].sort((a, b) => a - b);
const serieAnos = (mapa, chave) => anos.map((a) => mapa.get(chave)?.get(a) ?? 0);

// Conferência com a série mensal versionada (mesma base da API).
let conferencia = { disponivel: false };
const arquivoSerie = join(DIR_SAIDA, 'serie_mensal_procedimentos.json');
if (existsSync(arquivoSerie)) {
  const serie = JSON.parse(readFileSync(arquivoSerie, 'utf8'));
  const somaSerie = new Map();
  for (const r of serie.registros) somaSerie.set(r.ano, (somaSerie.get(r.ano) ?? 0) + r.quantidade);
  const divergencias = anos.filter((a) => (somaSerie.get(a) ?? null) !== totalAno.get(a));
  conferencia = { disponivel: true, consistente: divergencias.length === 0, anos_divergentes: divergencias };
}

// --------------------------- Montagem do JSON ---------------------------
const municipios = [...municipiosRef.entries()]
  .map(([codigo, ref]) => ({
    codigo,
    nome: ref.nome,
    regiao_saude: ref.regiao,
    atendimento: serieAnos(porMunAtend, codigo),
    residencia: serieAnos(porMunResid, codigo),
  }))
  .filter((m) => m.atendimento.some((v) => v > 0) || m.residencia.some((v) => v > 0));

const procedimentos = [...porProc.keys()]
  .sort()
  .map((codigo) => ({
    codigo,
    descricao: sigtapProc.get(codigo) ?? null,
    subgrupo: codigo.slice(0, 4),
    anual: serieAnos(porProc, codigo),
    ate_mes: procParcial.get(codigo) ?? { atual: 0, anterior: 0 },
  }));

const estabelecimentos = [...porCnes.keys()].sort().map((cnes) => {
  const munis = [...(cnesMunicipio.get(cnes)?.entries() ?? [])].sort((a, b) => b[1] - a[1]);
  const codMun = munis[0]?.[0] ?? null;
  return {
    cnes,
    nome: nomesCnes.get(cnes) ?? null,
    municipio_codigo: codMun,
    municipio: codMun ? (municipiosRef.get(codMun)?.nome ?? null) : null,
    anual: serieAnos(porCnes, cnes),
  };
});

const saida = {
  descricao:
    'Agregados da produção cirúrgica eletiva de Santa Catarina (SIH/SUS — DATASUS), gerados a partir do backup CSV versionado do banco do SUSPrev SC.',
  fonte: 'SIH/SUS — DATASUS; referências: IBGE (municípios) e SIGTAP competência 202608 (procedimentos).',
  gerado_em: new Date().toISOString(),
  dimensao_territorial_principal: 'atendimento',
  anos,
  ano_corrente: anoCorrente,
  mes_final_ano_corrente: mesFinal,
  origem: {
    arquivos: registrosFonte,
    municipios_sha256: lerTexto(join(DIR_CSV, 'municipios_001.csv')).sha,
    sigtap: existsSync(join(DIR_FONTES, 'sigtap_202608_procedimentos.csv')) ? 'dados-fonte/sigtap_202608_procedimentos.csv' : null,
    nomes_estabelecimentos: nomesCnes.size > 0 ? origemNomesCnes.join(' + ') : null,
  },
  conferencia_serie_mensal: conferencia,
  qualidade: {
    municipio_atendimento_nao_identificado: atendNaoIdent,
    residencia_fora_de_sc_ou_ignorada_por_ano: anos.map((a) => foraSC.get(a) ?? 0),
    procedimentos_sem_descricao: procedimentos.filter((p) => !p.descricao).length,
    estabelecimentos_sem_nome: estabelecimentos.filter((e) => !e.nome).length,
  },
  total_municipios_sc: municipiosRef.size,
  totais: {
    por_ano: anos.map((a) => totalAno.get(a) ?? 0),
    meses_por_ano: anos.map((a) => mesMax.get(a) ?? 0),
    ate_mes: { atual: parcial.atual.total, anterior: parcial.anterior.total },
  },
  distintos: {
    municipios_atendimento: anos.map((a) => distMunAtend.get(a)?.size ?? 0),
    municipios_residencia_sc: anos.map((a) => distMunResid.get(a)?.size ?? 0),
    estabelecimentos: anos.map((a) => distCnes.get(a)?.size ?? 0),
    procedimentos: anos.map((a) => distProc.get(a)?.size ?? 0),
    ate_mes: {
      municipios: { atual: parcialDist.atual.mun.size, anterior: parcialDist.anterior.mun.size },
      estabelecimentos: { atual: parcialDist.atual.cnes.size, anterior: parcialDist.anterior.cnes.size },
      procedimentos: { atual: parcialDist.atual.proc.size, anterior: parcialDist.anterior.proc.size },
    },
  },
  subgrupos: [...sigtapSub.entries()].map(([codigo, nome]) => ({ codigo, nome })),
  municipios,
  procedimentos,
  estabelecimentos,
};

mkdirSync(DIR_SAIDA, { recursive: true });
const texto = JSON.stringify(saida);
writeFileSync(join(DIR_SAIDA, 'agregados_producao.json'), texto);

console.log(`agregados_producao.json gravado (${(texto.length / 1024).toFixed(0)} KiB)`);
console.log(`  anos: ${anos.join(', ')} | ano corrente ${anoCorrente} até o mês ${mesFinal}`);
console.log(`  total ${anoCorrente}: ${totalAno.get(anoCorrente)} | municípios (atendimento): ${distMunAtend.get(anoCorrente)?.size} | CNES: ${distCnes.get(anoCorrente)?.size} | procedimentos: ${distProc.get(anoCorrente)?.size}`);
console.log(`  conferência com a série mensal: ${JSON.stringify(conferencia)}`);
if (saida.qualidade.procedimentos_sem_descricao) console.log(`  aviso: ${saida.qualidade.procedimentos_sem_descricao} procedimento(s) sem descrição SIGTAP`);
if (!nomesCnes.size) console.log('  aviso: nomes de estabelecimentos indisponíveis (tabela estabelecimentos do backup vazia e dados-fonte/estabelecimentos_cnes.csv ausente)');
else console.log(`  nomes de estabelecimentos: ${nomesCnes.size} (${origemNomesCnes.join(' + ')})`);
