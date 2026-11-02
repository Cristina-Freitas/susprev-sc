import { useId, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';

interface DicaProps {
  texto: ReactNode;
  rotulo?: string;
  alinharDireita?: boolean;
}

/** Botão "i" com balão explicativo acessível por mouse, teclado e toque. */
export function Dica({ texto, rotulo = 'Mais informações', alinharDireita = false }: DicaProps) {
  const [aberta, setAberta] = useState(false);
  const id = useId();

  return (
    <span
      className={`dica${alinharDireita ? ' dica--direita' : ''}`}
      onMouseEnter={() => setAberta(true)}
      onMouseLeave={() => setAberta(false)}
    >
      <button
        type="button"
        className="dica__botao"
        aria-label={rotulo}
        aria-expanded={aberta}
        aria-describedby={aberta ? id : undefined}
        onClick={() => setAberta((v) => !v)}
        onFocus={() => setAberta(true)}
        onBlur={() => setAberta(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setAberta(false);
        }}
      >
        <Info size={15} aria-hidden="true" />
      </button>
      {aberta && (
        <span role="tooltip" id={id} className="dica__balao">
          {texto}
        </span>
      )}
    </span>
  );
}
