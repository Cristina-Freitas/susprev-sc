import { dadosDe, useDados } from '../../context/DadosContext';

/**
 * Marca do SUSPrev SC: contorno oficial de Santa Catarina (malha do IBGE) com
 * a cruz da saúde. Enquanto a malha não carrega, exibe apenas a cruz.
 */
export function Logo({ className }: { className?: string }) {
  const { mapa } = useDados();
  const m = dadosDe(mapa);

  return (
    <svg className={className} viewBox="0 0 120 80" role="img" aria-label="Logotipo SUSPrev SC">
      <defs>
        <linearGradient id="logo-sc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7ed6a4" />
          <stop offset="1" stopColor="#3f9bd8" />
        </linearGradient>
        <linearGradient id="logo-cruz" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5fb0ff" />
          <stop offset="1" stopColor="#1f63bd" />
        </linearGradient>
      </defs>
      {m?.contorno_estado && (
        <svg x="0" y="6" width="104" height="72" viewBox={`0 0 ${m.largura} ${m.altura}`} preserveAspectRatio="xMidYMid meet">
          <path d={m.contorno_estado} fill="url(#logo-sc)" stroke="rgba(255,255,255,0.55)" strokeWidth="6" />
        </svg>
      )}
      <path d="M85 4h12v12h12v12H97v12H85V28H73V16h12z" fill="url(#logo-cruz)" stroke="#0b2447" strokeWidth="1.2" />
    </svg>
  );
}

/** Marca textual do SUS (cruz + nome) usada no rodapé do menu. */
export function LogoSUS({ className }: { className?: string }) {
  return (
    <div className={className} aria-label="SUS — Sistema Único de Saúde" role="img">
      <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true">
        <path d="M14 2h12v12h12v12H26v12H14V26H2V14h12z" fill="#fff" />
      </svg>
      <div>
        <strong>SUS</strong>
        <span>Sistema Único<br />de Saúde</span>
      </div>
    </div>
  );
}
