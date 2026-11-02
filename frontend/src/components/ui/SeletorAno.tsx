interface Props {
  id: string;
  anos: number[];
  valor: number;
  aoMudar: (ano: number) => void;
  anoCorrente: number;
  mesFinal: string;
}

/** Seleciona o ano de referência de rankings e mapas (ano corrente marcado como parcial). */
export function SeletorAno({ id, anos, valor, aoMudar, anoCorrente, mesFinal }: Props) {
  return (
    <label className="seletor" htmlFor={id}>
      <span>Ano</span>
      <select id={id} value={valor} onChange={(e) => aoMudar(Number(e.target.value))}>
        {[...anos].reverse().map((a) => (
          <option key={a} value={a}>
            {a}
            {a === anoCorrente ? ` (jan–${mesFinal})` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
