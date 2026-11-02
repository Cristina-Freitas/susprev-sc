import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { consultarPrevisao, consultarSaude, ErroApi } from '../services/api';
import { carregarAgregados, carregarMapa, carregarMetricas, carregarSerieMensal } from '../services/dadosEstaticos';
import type { PrevisaoSaida, RespostaSaude } from '../types/api';
import type { AgregadosProducao, MapaSC, MetricasModelo, Recurso, SerieMensal } from '../types/dados';

interface ValorContexto {
  saude: Recurso<RespostaSaude>;
  previsao: Recurso<PrevisaoSaida>;
  serie: Recurso<SerieMensal>;
  metricas: Recurso<MetricasModelo>;
  mapa: Recurso<MapaSC>;
  /** Agregados territoriais e por procedimento (CSV versionado do backend). */
  agregados: Recurso<AgregadosProducao>;
  /** Data/hora da última consulta bem-sucedida à API. */
  consultadoEm: Date | null;
  atualizandoApi: boolean;
  recarregarApi: () => void;
  /** Filtro de período (ano inicial) aplicado aos gráficos históricos. */
  anoInicial: number;
  definirAnoInicial: (ano: number) => void;
}

const Contexto = createContext<ValorContexto | null>(null);

function paraErro<T>(erro: unknown): Recurso<T> {
  if (erro instanceof ErroApi) return { estado: 'erro', erro: erro.message, detalhe: erro.detalhe };
  if (erro instanceof Error) return { estado: 'erro', erro: erro.message };
  return { estado: 'erro', erro: 'Erro inesperado ao carregar os dados.' };
}

function useRecursoEstatico<T>(carregar: () => Promise<T>): Recurso<T> {
  const [recurso, setRecurso] = useState<Recurso<T>>({ estado: 'carregando' });
  useEffect(() => {
    let ativo = true;
    carregar()
      .then((dados) => ativo && setRecurso({ estado: 'sucesso', dados }))
      .catch((erro) => ativo && setRecurso(paraErro<T>(erro)));
    return () => {
      ativo = false;
    };
  }, [carregar]);
  return recurso;
}

export function DadosProvider({ children }: { children: ReactNode }) {
  const [saude, setSaude] = useState<Recurso<RespostaSaude>>({ estado: 'carregando' });
  const [previsao, setPrevisao] = useState<Recurso<PrevisaoSaida>>({ estado: 'carregando' });
  const [consultadoEm, setConsultadoEm] = useState<Date | null>(null);
  const [atualizandoApi, setAtualizandoApi] = useState(false);
  const [anoInicial, definirAnoInicial] = useState(2019);
  const controladorRef = useRef<AbortController | null>(null);

  const serie = useRecursoEstatico(carregarSerieMensal);
  const metricas = useRecursoEstatico(carregarMetricas);
  const mapa = useRecursoEstatico(carregarMapa);
  const agregados = useRecursoEstatico(carregarAgregados);

  const recarregarApi = useCallback(() => {
    controladorRef.current?.abort();
    const controlador = new AbortController();
    controladorRef.current = controlador;
    setAtualizandoApi(true);

    // Mantém os dados anteriores visíveis durante a atualização,
    // exibindo o estado de carregamento apenas na primeira consulta.
    setSaude((atual) => (atual.estado === 'sucesso' ? atual : { estado: 'carregando' }));
    setPrevisao((atual) => (atual.estado === 'sucesso' ? atual : { estado: 'carregando' }));

    const pedidoSaude = consultarSaude(controlador.signal)
      .then((dados) => {
        if (!controlador.signal.aborted) setSaude({ estado: 'sucesso', dados });
      })
      .catch((erro) => {
        if (!controlador.signal.aborted) setSaude(paraErro(erro));
      });

    const pedidoPrevisao = consultarPrevisao(2026, controlador.signal)
      .then((dados) => {
        if (!controlador.signal.aborted) {
          setPrevisao({ estado: 'sucesso', dados });
          setConsultadoEm(new Date());
        }
      })
      .catch((erro) => {
        if (!controlador.signal.aborted) setPrevisao(paraErro(erro));
      });

    Promise.allSettled([pedidoSaude, pedidoPrevisao]).then(() => {
      if (!controlador.signal.aborted) setAtualizandoApi(false);
    });
  }, []);

  useEffect(() => {
    recarregarApi();
    return () => controladorRef.current?.abort();
  }, [recarregarApi]);

  const valor = useMemo<ValorContexto>(
    () => ({
      saude,
      previsao,
      serie,
      metricas,
      mapa,
      agregados,
      consultadoEm,
      atualizandoApi,
      recarregarApi,
      anoInicial,
      definirAnoInicial,
    }),
    [saude, previsao, serie, metricas, mapa, agregados, consultadoEm, atualizandoApi, recarregarApi, anoInicial],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useDados(): ValorContexto {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useDados deve ser usado dentro de <DadosProvider>.');
  return contexto;
}

/** Atalho: retorna os dados quando o recurso foi carregado, ou null. */
export function dadosDe<T>(recurso: Recurso<T>): T | null {
  return recurso.estado === 'sucesso' ? recurso.dados : null;
}
