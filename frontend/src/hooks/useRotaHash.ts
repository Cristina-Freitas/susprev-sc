import { useCallback, useEffect, useState } from 'react';

export type IdPagina =
  | 'visao-geral'
  | 'evolucao-anual'
  | 'municipios'
  | 'procedimentos'
  | 'estabelecimentos'
  | 'mapa'
  | 'projecoes'
  | 'relatorios'
  | 'dados-abertos'
  | 'metodologia'
  | 'sobre';

export const PAGINAS: IdPagina[] = [
  'visao-geral',
  'evolucao-anual',
  'municipios',
  'procedimentos',
  'estabelecimentos',
  'mapa',
  'projecoes',
  'relatorios',
  'dados-abertos',
  'metodologia',
  'sobre',
];

function lerHash(): IdPagina {
  const valor = window.location.hash.replace(/^#\/?/, '') as IdPagina;
  return PAGINAS.includes(valor) ? valor : 'visao-geral';
}

/** Navegação simples baseada em hash (#/pagina), com suporte ao botão Voltar. */
export function useRotaHash(): [IdPagina, (pagina: IdPagina) => void] {
  const [pagina, setPagina] = useState<IdPagina>(lerHash);

  useEffect(() => {
    const aoMudar = () => setPagina(lerHash());
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);

  const navegar = useCallback((destino: IdPagina) => {
    if (lerHash() === destino) return;
    window.location.hash = `/${destino}`;
  }, []);

  return [pagina, navegar];
}
