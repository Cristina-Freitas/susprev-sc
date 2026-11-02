interface Opcao<T extends string> {
  valor: T;
  rotulo: string;
}

interface Props<T extends string> {
  rotulo: string;
  valor: T;
  opcoes: Opcao<T>[];
  aoMudar: (valor: T) => void;
  variante?: 'azul' | 'verde';
}

/** Controle de abas em formato de botões (grupo de alternância acessível). */
export function Segmentado<T extends string>({ rotulo, valor, opcoes, aoMudar, variante = 'azul' }: Props<T>) {
  return (
    <div className={`abas abas--${variante}`} role="group" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button key={o.valor} type="button" aria-pressed={valor === o.valor} onClick={() => aoMudar(o.valor)}>
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
