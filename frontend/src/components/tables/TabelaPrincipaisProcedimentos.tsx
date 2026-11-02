import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { dadosDe, useDados } from '../../context/DadosContext';
import { rankingProcedimentos } from '../../utils/agregados';
import { formatarDescricao, formatarNumero, formatarPercentual, formatarVariacao } from '../../utils/formatacao';
import { linhasQueCabem, useTamanho } from '../../hooks/useTamanho';
import { Carregando, EstadoErro } from '../ui/Estados';
import { Segmentado } from '../ui/Segmentado';

interface Props {
  ano: number;
  limite?: number;
  aoVerTodos?: () => void;
}

type Modo = 'quantidade' | 'variacao';

/** Principais procedimentos por quantidade ou por variação em relação ao mesmo período do ano anterior. */
export function TabelaPrincipaisProcedimentos({ ano, limite = 10, aoVerTodos }: Props) {
  const { agregados } = useDados();
  const ag = dadosDe(agregados);
  const [modo, setModo] = useState<Modo>('quantidade');

  const ranking = useMemo(() => (ag ? rankingProcedimentos(ag, ano) : []), [ag, ano]);
  const [refTabela, { altura }] = useTamanho<HTMLDivElement>();
  const capacidade = linhasQueCabem(altura, limite, 16, 20);

  const linhas = useMemo(() => {
    if (modo === 'quantidade') {
      const principais = ranking.filter((r) => r.quantidade > 0).slice(0, capacidade - 1);
      const restantes = ranking.filter((r) => r.quantidade > 0).slice(capacidade - 1);
      const qtdOutros = restantes.reduce((s, r) => s + r.quantidade, 0);
      const pctOutros = restantes.reduce((s, r) => s + r.participacao, 0);
      return [
        ...principais.map((r) => ({
          chave: r.codigo,
          nome: formatarDescricao(r.descricao) || `Código ${r.codigo}`,
          detalhe: r.descricao ? `${r.codigo} — ${formatarDescricao(r.descricao)}` : `Código SIGTAP ${r.codigo} (descrição indisponível)`,
          valor: r.quantidade,
          rotuloValor: formatarNumero(r.quantidade),
          rotuloColuna: formatarPercentual(r.participacao),
          tom: 'verde' as const,
        })),
        ...(restantes.length
          ? [
              {
                chave: 'outros',
                nome: 'Outros procedimentos',
                detalhe: `${formatarNumero(restantes.length)} procedimentos agrupados`,
                valor: qtdOutros,
                rotuloValor: formatarNumero(qtdOutros),
                rotuloColuna: formatarPercentual(pctOutros),
                tom: 'verde' as const,
              },
            ]
          : []),
      ];
    }
    return [...ranking]
      .filter((r) => r.anterior > 0 || r.quantidade > 0)
      .sort((a, b) => Math.abs(b.variacaoAbsoluta) - Math.abs(a.variacaoAbsoluta))
      .slice(0, capacidade)
      .map((r) => ({
        chave: r.codigo,
        nome: formatarDescricao(r.descricao) || `Código ${r.codigo}`,
        detalhe: `${r.codigo} — ${formatarDescricao(r.descricao) || 'descrição indisponível'}: ${formatarNumero(r.anterior)} → ${formatarNumero(r.quantidade)}`,
        valor: Math.abs(r.variacaoAbsoluta),
        rotuloValor: `${r.variacaoAbsoluta > 0 ? '+' : r.variacaoAbsoluta < 0 ? '−' : ''}${formatarNumero(Math.abs(r.variacaoAbsoluta))}`,
        rotuloColuna: r.variacaoPercentual === null ? 'novo' : formatarVariacao(r.variacaoPercentual),
        tom: (r.variacaoAbsoluta >= 0 ? 'verde' : 'laranja') as 'verde' | 'laranja',
      }));
  }, [ranking, modo, capacidade]);

  const maximo = Math.max(1, ...linhas.filter((l) => l.chave !== 'outros').map((l) => l.valor));
  const totalProcedimentos = ranking.filter((r) => r.quantidade > 0).length;

  if (agregados.estado === 'carregando') return <Carregando rotulo="Carregando ranking de procedimentos…" />;
  if (agregados.estado === 'erro') return <EstadoErro mensagem={agregados.erro} detalhe={agregados.detalhe} />;

  return (
    <>
      <div className="rank__abas">
        <Segmentado
          rotulo="Critério do ranking de procedimentos"
          valor={modo}
          aoMudar={setModo}
          variante="verde"
          opcoes={[
            { valor: 'quantidade', rotulo: 'Por quantidade' },
            { valor: 'variacao', rotulo: 'Por variação' },
          ]}
        />
      </div>
      <div className="rank__tabela" ref={refTabela}>
        <table className="rank rank--proc">
          <caption className="visualmente-oculto">
            {modo === 'quantidade'
              ? `Principais procedimentos de ${ano} por quantidade.`
              : `Procedimentos com maior variação absoluta em ${ano}, em relação ao mesmo período de ${ano - 1}.`}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="rank__col-pos">#</th>
              <th scope="col">Procedimento</th>
              <th scope="col">{modo === 'quantidade' ? 'Procedimentos' : `Δ vs. ${ano - 1}`}</th>
              <th scope="col" className="num">{modo === 'quantidade' ? '% do total' : 'Var. %'}</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={l.chave}>
                <td className="rank__col-pos">{l.chave === 'outros' ? linhas.length : i + 1}</td>
                <td className="rank__nome" title={l.detalhe}>{l.nome}</td>
                <td>
                  <div className="rank__barra">
                    <span className="rank__valor">{l.rotuloValor}</span>
                    <span className="rank__trilho" aria-hidden="true">
                      <span
                        className={`rank__preench rank__preench--${l.tom}`}
                        style={{ width: `${(Math.min(1, l.valor / maximo) * 100).toFixed(1)}%` }}
                      />
                    </span>
                  </div>
                </td>
                <td className="num">{l.rotuloColuna}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {aoVerTodos && (
        <button type="button" className="botao botao--link rank__ver-todos" onClick={aoVerTodos}>
          Ver todos os procedimentos ({formatarNumero(totalProcedimentos)}) <ArrowRight size={14} aria-hidden="true" />
        </button>
      )}
    </>
  );
}
