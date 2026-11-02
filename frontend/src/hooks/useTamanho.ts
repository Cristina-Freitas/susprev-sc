import { useCallback, useEffect, useRef, useState } from 'react';

/** Mede largura e altura de um elemento e acompanha redimensionamentos. */
export function useTamanho<T extends HTMLElement>(): [(no: T | null) => void, { largura: number; altura: number }] {
  const observador = useRef<ResizeObserver | null>(null);
  const [tamanho, setTamanho] = useState({ largura: 0, altura: 0 });

  const referencia = useCallback((no: T | null) => {
    observador.current?.disconnect();
    observador.current = null;
    if (!no) return;
    const atualizar = () => setTamanho({ largura: Math.round(no.clientWidth), altura: Math.round(no.clientHeight) });
    atualizar();
    if (typeof ResizeObserver !== 'undefined') {
      observador.current = new ResizeObserver(atualizar);
      observador.current.observe(no);
    }
  }, []);

  useEffect(() => () => observador.current?.disconnect(), []);
  return [referencia, tamanho];
}

/**
 * Quantas linhas de tabela cabem na altura medida, para exibir apenas linhas
 * completas (sem cortar a última). Sem medida (0), usa o máximo.
 */
export function linhasQueCabem(alturaDisponivel: number, maximo: number, alturaLinha = 15, alturaCabecalho = 18): number {
  if (alturaDisponivel <= 0) return maximo;
  return Math.max(3, Math.min(maximo, Math.floor((alturaDisponivel - alturaCabecalho) / alturaLinha)));
}
