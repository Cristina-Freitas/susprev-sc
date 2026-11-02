import type { AgregadosProducao, MapaSC, MetricasModelo, SerieMensal } from '../types/dados';

/**
 * Carrega os artefatos estáticos publicados em /data (frontend/public/data),
 * gerados a partir de arquivos versionados do repositório por
 * scripts/sincronizar-dados.mjs. Nenhum dado é acessado diretamente no SQLite.
 */
async function carregarJson<T>(arquivo: string, validar: (dados: unknown) => boolean): Promise<T> {
  const resposta = await fetch(`${import.meta.env.BASE_URL}data/${arquivo}`, {
    headers: { Accept: 'application/json' },
  });
  if (!resposta.ok) {
    throw new Error(`Arquivo de dados ${arquivo} indisponível (HTTP ${resposta.status}).`);
  }
  const dados: unknown = await resposta.json();
  if (!validar(dados)) {
    throw new Error(`Arquivo de dados ${arquivo} com formato inesperado.`);
  }
  return dados as T;
}

const ehObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function carregarSerieMensal(): Promise<SerieMensal> {
  return carregarJson<SerieMensal>('serie_mensal_procedimentos.json', (d) => {
    if (!ehObjeto(d) || !Array.isArray(d.registros)) return false;
    return d.registros.every(
      (r) =>
        ehObjeto(r) &&
        Number.isInteger(r.ano) &&
        Number.isInteger(r.mes) &&
        (r.mes as number) >= 1 &&
        (r.mes as number) <= 12 &&
        Number.isInteger(r.quantidade) &&
        (r.quantidade as number) >= 0,
    );
  });
}

export function carregarMetricas(): Promise<MetricasModelo> {
  return carregarJson<MetricasModelo>(
    'metricas_modelo.json',
    (d) => ehObjeto(d) && ehObjeto(d.teste_final) && ehObjeto(d.validacao),
  );
}

export function carregarMapa(): Promise<MapaSC> {
  return carregarJson<MapaSC>(
    'mapa_sc.json',
    (d) => ehObjeto(d) && Array.isArray(d.municipios) && typeof d.largura === 'number',
  );
}

export function carregarAgregados(): Promise<AgregadosProducao> {
  return carregarJson<AgregadosProducao>(
    'agregados_producao.json',
    (d) =>
      ehObjeto(d) &&
      Array.isArray(d.anos) &&
      Array.isArray(d.municipios) &&
      Array.isArray(d.procedimentos) &&
      Array.isArray(d.estabelecimentos) &&
      ehObjeto(d.totais) &&
      ehObjeto(d.distintos),
  );
}
