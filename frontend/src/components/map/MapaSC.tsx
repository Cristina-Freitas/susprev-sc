import { memo, useMemo, type MouseEvent } from 'react';
import { classeDoMapa } from '../../utils/agregados';
import type { MapaSC as DadosMapa } from '../../types/dados';

export interface ValorMunicipio {
  quantidade: number;
  participacao: number;
}

interface Props {
  mapa: DadosMapa;
  /** Código de 6 dígitos → valores. Sem este mapa, o desenho fica em estado neutro. */
  valores?: Map<string, ValorMunicipio> | null;
  selecionado?: string | null;
  /** Descrição acessível do que está colorido. */
  descricao: string;
  aoPassar?: (codigo: string | null) => void;
  aoSelecionar?: (codigo: string | null) => void;
}

/**
 * Mapa coroplético de Santa Catarina (malha municipal oficial do IBGE).
 * A cor de cada município vem do percentual da produção no total estadual.
 */
function MapaSCBase({ mapa, valores, selecionado = null, descricao, aoPassar, aoSelecionar }: Props) {
  const caminhos = useMemo(
    () =>
      mapa.municipios.map((m) => {
        const v = valores?.get(m.codigo);
        const cor = valores ? classeDoMapa(v?.participacao ?? 0, v?.quantidade ?? 0).cor : undefined;
        return (
          <path
            key={m.codigo_ibge}
            d={m.d}
            data-c={m.codigo}
            className={`mapa__municipio${selecionado === m.codigo ? ' mapa__municipio--selecionado' : ''}`}
            style={cor ? { fill: cor } : undefined}
          >
            <title>{m.nome ?? m.codigo_ibge}</title>
          </path>
        );
      }),
    [mapa, valores, selecionado],
  );

  const codigoDoEvento = (e: MouseEvent<SVGGElement>): string | null => {
    const alvo = e.target as SVGElement;
    return alvo.getAttribute?.('data-c') ?? null;
  };

  return (
    <svg
      className="mapa__svg"
      viewBox={`-6 -6 ${mapa.largura + 12} ${mapa.altura + 12}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={descricao}
    >
      <g
        onMouseOver={(e) => aoPassar?.(codigoDoEvento(e))}
        onMouseLeave={() => aoPassar?.(null)}
        onClick={(e) => {
          const c = codigoDoEvento(e);
          aoSelecionar?.(c === selecionado ? null : c);
        }}
      >
        {caminhos}
      </g>
      {mapa.contorno_estado && <path d={mapa.contorno_estado} className="mapa__contorno" />}
    </svg>
  );
}

export const MapaSC = memo(MapaSCBase);
