#!/usr/bin/env node
/**
 * Sincroniza, para dentro de frontend/public/data, os artefatos estáticos
 * consumidos pelo dashboard. Este script APENAS LÊ arquivos fora de frontend/
 * e grava exclusivamente em frontend/public/data e frontend/dados-fonte.
 *
 * Fontes (somente leitura):
 *  - outputs/reports/01_evolucao_mensal_procedimentos_sp.csv
 *      Série mensal versionada de procedimentos cirúrgicos eletivos (SIH/SP),
 *      jan/2019 a ago/2026 — a mesma tabela (procedimentos_sp) usada pela API.
 *  - outputs/metrics/teste_final.csv e outputs/metrics/validacao_tres_modelos.csv
 *      Métricas versionadas de avaliação dos modelos.
 *  - data/processed/csv_backup/municipios_001.csv
 *      Cadastro de municípios de SC (código IBGE de 6 dígitos, nome, região de saúde).
 *  - Malha municipal oficial do IBGE (API de Malhas v3), salva em
 *    frontend/dados-fonte/ e reutilizada offline. Use --baixar-mapa para atualizá-la.
 *
 * Uso:
 *   npm run dados:sincronizar          (usa a malha já salva, se existir)
 *   npm run dados:sincronizar:mapa     (baixa novamente a malha do IBGE)
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR_FRONTEND = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR_RAIZ = resolve(DIR_FRONTEND, '..');
const DIR_SAIDA = join(DIR_FRONTEND, 'public', 'data');
const DIR_FONTES = join(DIR_FRONTEND, 'dados-fonte');

const URL_MALHA_MUNICIPIOS =
  'https://servicodados.ibge.gov.br/api/v3/malhas/estados/42?formato=application/vnd.geo+json&intrarregiao=municipio&qualidade=minima';
const URL_MALHA_ESTADO =
  'https://servicodados.ibge.gov.br/api/v3/malhas/estados/42?formato=application/vnd.geo+json&qualidade=minima';

const baixarMapa = process.argv.includes('--baixar-mapa');

function caminhoRelativo(caminho) {
  return relative(DIR_RAIZ, caminho).split('\\').join('/');
}

function sha256(conteudo) {
  return createHash('sha256').update(conteudo).digest('hex');
}

function lerCsv(caminho, separador = ',') {
  const bruto = readFileSync(caminho);
  const texto = bruto.toString('utf8').replace(/^\uFEFF/, '');
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim() !== '');
  const cabecalho = linhas[0].split(separador).map((c) => c.trim());
  const registros = linhas.slice(1).map((linha) => {
    const valores = linha.split(separador);
    return Object.fromEntries(cabecalho.map((c, i) => [c, (valores[i] ?? '').trim()]));
  });
  return { registros, cabecalho, sha256: sha256(bruto), caminho: caminhoRelativo(caminho) };
}

function gravarJson(nome, dados) {
  mkdirSync(DIR_SAIDA, { recursive: true });
  const destino = join(DIR_SAIDA, nome);
  writeFileSync(destino, JSON.stringify(dados) + '\n', 'utf8');
  console.log(`✔ ${caminhoRelativo(destino)}`);
}

function falhar(mensagem) {
  console.error(`✖ ${mensagem}`);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 1. Série mensal de procedimentos                                    */
/* ------------------------------------------------------------------ */
function sincronizarSerieMensal() {
  const arquivo = join(DIR_RAIZ, 'outputs', 'reports', '01_evolucao_mensal_procedimentos_sp.csv');
  if (!existsSync(arquivo)) falhar(`Arquivo não encontrado: ${caminhoRelativo(arquivo)}`);

  const csv = lerCsv(arquivo);
  const registros = csv.registros.map((r) => ({
    ano: Number(r.ano),
    mes: Number(r.mes),
    quantidade: Number(r.quantidade),
  }));

  for (const r of registros) {
    const valido =
      Number.isInteger(r.ano) &&
      Number.isInteger(r.mes) &&
      r.mes >= 1 &&
      r.mes <= 12 &&
      Number.isInteger(r.quantidade) &&
      r.quantidade >= 0;
    if (!valido) falhar(`Registro inválido na série mensal: ${JSON.stringify(r)}`);
  }

  const chaves = new Set(registros.map((r) => `${r.ano}-${r.mes}`));
  if (chaves.size !== registros.length) falhar('Competências duplicadas na série mensal.');

  registros.sort((a, b) => a.ano - b.ano || a.mes - b.mes);
  const primeiro = registros[0];
  const ultimo = registros[registros.length - 1];

  gravarJson('serie_mensal_procedimentos.json', {
    descricao:
      'Quantidade mensal de procedimentos cirúrgicos eletivos (pares AIH/procedimento/CNES do SIH/SP, ' +
      'grupo SIGTAP 04, AIH de caráter eletivo) registrados em Santa Catarina.',
    fonte: 'SIH/SUS — DATASUS, processado pelo pipeline do SUSPrev SC',
    arquivo_origem: csv.caminho,
    sha256_origem: csv.sha256,
    primeira_competencia: `${primeiro.ano}-${String(primeiro.mes).padStart(2, '0')}`,
    ultima_competencia: `${ultimo.ano}-${String(ultimo.mes).padStart(2, '0')}`,
    total_competencias: registros.length,
    gerado_em: new Date().toISOString(),
    registros,
  });
}

/* ------------------------------------------------------------------ */
/* 2. Métricas do modelo                                                */
/* ------------------------------------------------------------------ */
function sincronizarMetricas() {
  const arqTeste = join(DIR_RAIZ, 'outputs', 'metrics', 'teste_final.csv');
  const arqValidacao = join(DIR_RAIZ, 'outputs', 'metrics', 'validacao_tres_modelos.csv');
  if (!existsSync(arqTeste) || !existsSync(arqValidacao)) {
    console.warn('⚠ Métricas não encontradas; metricas_modelo.json não será gerado.');
    return;
  }

  const converter = (csv, campoModelo) =>
    csv.registros.map((r) => ({
      modelo: r[campoModelo],
      mae: Number(r.MAE),
      rmse: Number(r.RMSE),
      r2: Number(r.R2),
    }));

  const teste = lerCsv(arqTeste);
  const validacao = lerCsv(arqValidacao);

  gravarJson('metricas_modelo.json', {
    descricao: 'Métricas versionadas de avaliação dos modelos do SUSPrev SC.',
    teste_final: {
      arquivo_origem: teste.caminho,
      sha256_origem: teste.sha256,
      registros: converter(teste, 'Modelo'),
    },
    validacao: {
      arquivo_origem: validacao.caminho,
      sha256_origem: validacao.sha256,
      registros: converter(validacao, 'modelo'),
    },
    gerado_em: new Date().toISOString(),
  });
}

/* ------------------------------------------------------------------ */
/* 3. Mapa de Santa Catarina (malha oficial do IBGE)                    */
/* ------------------------------------------------------------------ */
async function obterGeojson(url, nomeArquivo) {
  const destino = join(DIR_FONTES, nomeArquivo);
  if (!baixarMapa && existsSync(destino)) {
    return JSON.parse(readFileSync(destino, 'utf8'));
  }
  console.log(`↓ Baixando ${url}`);
  const resposta = await fetch(url, { headers: { Accept: 'application/vnd.geo+json' } });
  if (!resposta.ok) falhar(`IBGE respondeu HTTP ${resposta.status} para ${url}`);
  const texto = await resposta.text();
  mkdirSync(DIR_FONTES, { recursive: true });
  writeFileSync(destino, texto, 'utf8');
  return JSON.parse(texto);
}

function aneisDaGeometria(geometria) {
  if (!geometria) return [];
  if (geometria.type === 'Polygon') return geometria.coordinates;
  if (geometria.type === 'MultiPolygon') return geometria.coordinates.flat();
  return [];
}

async function sincronizarMapa() {
  const municipiosCsv = join(DIR_RAIZ, 'data', 'processed', 'csv_backup', 'municipios_001.csv');
  if (!existsSync(municipiosCsv)) falhar(`Arquivo não encontrado: ${caminhoRelativo(municipiosCsv)}`);
  const cadastro = lerCsv(municipiosCsv);
  const porCodigo = new Map(cadastro.registros.map((r) => [r.codigo, r]));

  let malhaMunicipios;
  let malhaEstado;
  try {
    malhaMunicipios = await obterGeojson(URL_MALHA_MUNICIPIOS, 'ibge_malha_sc_municipios.geojson');
    malhaEstado = await obterGeojson(URL_MALHA_ESTADO, 'ibge_malha_sc_estado.geojson');
  } catch (erro) {
    console.warn(`⚠ Não foi possível obter a malha do IBGE (${erro.message}). Mapa não atualizado.`);
    return;
  }

  const feicoes = malhaMunicipios.features ?? [];
  if (feicoes.length === 0) falhar('Malha municipal do IBGE sem feições.');

  // Projeção equiretangular com correção do cosseno da latitude média:
  // adequada para a pequena extensão territorial de Santa Catarina.
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const f of feicoes) {
    for (const anel of aneisDaGeometria(f.geometry)) {
      for (const [lon, lat] of anel) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  const latMedia = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const kx = Math.cos(latMedia);
  const LARGURA = 1000;
  const escala = LARGURA / ((maxLon - minLon) * kx);
  const ALTURA = Math.ceil((maxLat - minLat) * escala);

  const projetar = ([lon, lat]) => [
    Math.round((lon - minLon) * kx * escala * 10) / 10,
    Math.round((maxLat - lat) * escala * 10) / 10,
  ];

  const caminho = (geometria) =>
    aneisDaGeometria(geometria)
      .map((anel) => {
        const pontos = anel.map(projetar);
        const filtrados = pontos.filter(
          (p, i) => i === 0 || p[0] !== pontos[i - 1][0] || p[1] !== pontos[i - 1][1],
        );
        return 'M' + filtrados.map((p) => `${p[0]} ${p[1]}`).join('L') + 'Z';
      })
      .join('');

  const semCadastro = [];
  const municipios = feicoes
    .map((f) => {
      const codigo7 = String(f.properties?.codarea ?? '');
      const codigo6 = codigo7.slice(0, 6);
      const registro = porCodigo.get(codigo6);
      if (!registro) semCadastro.push(codigo7);
      return {
        codigo_ibge: codigo7,
        codigo: codigo6,
        nome: registro?.nome ?? null,
        regiao_saude: registro?.regiao_saude || null,
        d: caminho(f.geometry),
      };
    })
    .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR'));

  if (semCadastro.length) {
    console.warn(`⚠ ${semCadastro.length} feições sem correspondência no cadastro: ${semCadastro.join(', ')}`);
  }

  const contorno = (malhaEstado.features ?? []).map((f) => caminho(f.geometry)).join('');

  gravarJson('mapa_sc.json', {
    descricao:
      'Geometria municipal de Santa Catarina para exibição. Não contém indicadores de produção.',
    fonte_geometria: 'IBGE — API de Malhas Territoriais v3 (qualidade mínima)',
    url_geometria: URL_MALHA_MUNICIPIOS,
    fonte_nomes: cadastro.caminho,
    sha256_nomes: cadastro.sha256,
    largura: LARGURA,
    altura: ALTURA,
    total_municipios: municipios.length,
    gerado_em: new Date().toISOString(),
    contorno_estado: contorno,
    municipios,
  });
}

/* ------------------------------------------------------------------ */
async function principal() {
  console.log('SUSPrev SC — sincronização de dados estáticos do frontend');
  sincronizarSerieMensal();
  sincronizarMetricas();
  await sincronizarMapa();
  console.log('Concluído.');
}

principal().catch((erro) => falhar(erro?.stack ?? String(erro)));
