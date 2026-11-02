import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type CorIcone = 'azul' | 'verde' | 'roxo' | 'laranja' | 'vermelho';

interface CartaoIndicadorProps {
  id: string;
  icone: LucideIcon;
  cor: CorIcone;
  rotulo: ReactNode;
  valor: ReactNode;
  carregando?: boolean;
  /** Texto de apoio abaixo do valor. */
  nota?: ReactNode;
  /** Conteúdo à direita (ex.: anel de percentual). */
  lateral?: ReactNode;
  /** Explicação completa mostrada ao passar o mouse. */
  dica?: string;
}

/** Cartão de indicador principal (KPI), seguindo o mockup do dashboard. */
export function CartaoIndicador({ id, icone: Icone, cor, rotulo, valor, carregando = false, nota, lateral, dica }: CartaoIndicadorProps) {
  return (
    <article className="painel kpi" aria-labelledby={`${id}-rotulo`} aria-busy={carregando} title={dica}>
      <span className={`kpi__icone kpi__icone--${cor}`} aria-hidden="true">
        <Icone size={22} />
      </span>
      <div className="kpi__corpo">
        <h2 className="kpi__rotulo" id={`${id}-rotulo`}>
          {rotulo}
        </h2>
        <div className="kpi__linha">
          {carregando ? (
            <span className="esqueleto kpi__esqueleto" aria-label="Carregando" />
          ) : (
            <p className="kpi__valor" id={id}>
              {valor}
            </p>
          )}
          {lateral}
        </div>
        {nota && <div className="kpi__nota">{nota}</div>}
      </div>
    </article>
  );
}

/** Anel de percentual (donut) em SVG. */
export function AnelPercentual({ percentual, rotulo }: { percentual: number; rotulo: string }) {
  const raio = 17;
  const circunferencia = 2 * Math.PI * raio;
  const preenchido = Math.max(0, Math.min(100, percentual));
  return (
    <svg className="anel" viewBox="0 0 44 44" role="img" aria-label={rotulo}>
      <circle cx="22" cy="22" r={raio} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <circle
        cx="22"
        cy="22"
        r={raio}
        fill="none"
        stroke="#0f8f63"
        strokeWidth="6"
        strokeLinecap="butt"
        strokeDasharray={`${(preenchido / 100) * circunferencia} ${circunferencia}`}
        transform="rotate(-90 22 22)"
      />
      <text x="22" y="26" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0b2447">
        {Math.round(preenchido)}%
      </text>
    </svg>
  );
}
