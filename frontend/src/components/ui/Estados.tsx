import type { ReactNode } from 'react';
import { AlertTriangle, DatabaseZap, RefreshCw } from 'lucide-react';

interface EstadoVazioProps {
  titulo: string;
  children?: ReactNode;
  icone?: ReactNode;
}

/** Indisponibilidade de dados (não é erro): nunca substituída por valores fictícios. */
export function EstadoVazio({ titulo, children, icone }: EstadoVazioProps) {
  return (
    <div className="estado estado--vazio" role="status">
      <span className="estado__icone" aria-hidden="true">
        {icone ?? <DatabaseZap size={20} />}
      </span>
      <p className="estado__titulo">{titulo}</p>
      {children && <div className="estado__texto">{children}</div>}
    </div>
  );
}

interface EstadoErroProps {
  titulo?: string;
  mensagem: string;
  detalhe?: string;
  aoTentarNovamente?: () => void;
  tentando?: boolean;
}

export function EstadoErro({
  titulo = 'Não foi possível carregar os dados',
  mensagem,
  detalhe,
  aoTentarNovamente,
  tentando = false,
}: EstadoErroProps) {
  return (
    <div className="estado estado--erro" role="alert">
      <span className="estado__icone" aria-hidden="true">
        <AlertTriangle size={20} />
      </span>
      <p className="estado__titulo">{titulo}</p>
      <p className="estado__texto">{mensagem}</p>
      {detalhe && <p className="estado__texto"><code>{detalhe}</code></p>}
      {aoTentarNovamente && (
        <button type="button" className="botao" onClick={aoTentarNovamente} disabled={tentando}>
          <RefreshCw size={15} className={tentando ? 'girando' : undefined} aria-hidden="true" />
          {tentando ? 'Tentando…' : 'Tentar novamente'}
        </button>
      )}
    </div>
  );
}

/** Esqueleto de carregamento para gráficos e tabelas. */
export function Carregando({ rotulo = 'Carregando dados…' }: { rotulo?: string }) {
  return (
    <div className="estado" role="status" aria-live="polite" style={{ alignItems: 'stretch' }}>
      <span className="esqueleto" style={{ height: '58%', minHeight: 60 }} />
      <span className="esqueleto" style={{ height: 12, width: '60%', alignSelf: 'center' }} />
      <span className="visualmente-oculto">{rotulo}</span>
    </div>
  );
}
