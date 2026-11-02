import type { ReactNode } from 'react';
import { Dica } from './Dica';

interface PainelProps {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  dica?: ReactNode;
  acoes?: ReactNode;
  rodape?: ReactNode;
  className?: string;
  children: ReactNode;
  /** Nível do título (padrão h2). */
  nivel?: 2 | 3;
  id?: string;
}

/** Cartão padrão do dashboard, com título, ações e rodapé de fonte. */
export function Painel({
  titulo,
  subtitulo,
  dica,
  acoes,
  rodape,
  className = '',
  children,
  nivel = 2,
  id,
}: PainelProps) {
  const Titulo = nivel === 2 ? 'h2' : 'h3';
  const idTitulo = id ? `${id}-titulo` : undefined;
  return (
    <section className={`painel ${className}`} aria-labelledby={idTitulo} id={id}>
      <div className="painel__topo">
        <div className="painel__titulos">
          <Titulo className="painel__titulo" id={idTitulo}>
            {titulo}
            {dica && <Dica texto={dica} />}
          </Titulo>
          {subtitulo && <p className="painel__subtitulo">{subtitulo}</p>}
        </div>
        {acoes && <div className="painel__acoes">{acoes}</div>}
      </div>
      <div className="painel__corpo">{children}</div>
      {rodape && <div className="painel__rodape">{rodape}</div>}
    </section>
  );
}
