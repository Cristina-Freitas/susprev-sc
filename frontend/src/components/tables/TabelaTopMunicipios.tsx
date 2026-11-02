import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { dadosDe, useDados } from '../../context/DadosContext';
import { rankingMunicipios } from '../../utils/agregados';
import { formatarNumero, formatarPercentual } from '../../utils/formatacao';
import type { Dimensao } from '../../types/dados';
import { linhasQueCabem, useTamanho } from '../../hooks/useTamanho';
import { Carregando, EstadoErro } from '../ui/Estados';
import { Segmentado } from '../ui/Segmentado';

interface Props {
  ano: number;
  dimensao?: Dimensao;
  limite?: number;
  aoVerTodos?: () => void;
}

type Modo = 'numero' | 'percentual';

/** Top municípios por procedimentos realizados (município de atendimento por padrão). */
export function TabelaTopMunicipios({ ano, dimensao = 'atendimento', limite = 10, aoVerTodos }: Props) {
  const { agregados } = useDados();
  const ag = dadosDe(agregados);
  const [modo, setModo] = useState<Modo>('numero');

  const ranking = useMemo(() => (ag ? rankingMunicipios(ag, ano, dimensao) : []), [ag, ano, dimensao]);
  const [refTabela, { altura }] = useTamanho<HTMLDivElement>();
  const linhas = ranking.slice(0, linhasQueCabem(altura, limite, 16, 20));
  const maximo = linhas[0]?.quantidade ?? 1;
  const maximoPct = linhas[0]?.participacao ?? 1;

  if (agregados.estado === 'carregando') return <Carregando rotulo="Carregando ranking municipal…" />;
  if (agregados.estado === 'erro') return <EstadoErro mensagem={agregados.erro} detalhe={agregados.detalhe} />;

  return (
    <>
      <div className="rank__abas">
        <Segmentado
          rotulo="Métrica do ranking de municípios"
          valor={modo}
          aoMudar={setModo}
          opcoes={[
            { valor: 'numero', rotulo: 'Número' },
            { valor: 'percentual', rotulo: 'Percentual' },
          ]}
        />
      </div>
      <div className="rank__tabela" ref={refTabela}>
        <table className="rank">
          <caption className="visualmente-oculto">
            Municípios com mais procedimentos em {ano} (município de {dimensao === 'atendimento' ? 'atendimento' : 'residência'}).
          </caption>
          <thead>
            <tr>
              <th scope="col" className="rank__col-pos">#</th>
              <th scope="col">Município</th>
              <th scope="col">{modo === 'numero' ? 'Procedimentos' : '% do total'}</th>
              <th scope="col" className="num">{modo === 'numero' ? '% do total' : 'Procedimentos'}</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={l.codigo}>
                <td className="rank__col-pos">{i + 1}</td>
                <td className="rank__nome" title={l.nome}>{l.nome}</td>
                <td>
                  <div className="rank__barra">
                    <span className="rank__valor">
                      {modo === 'numero' ? formatarNumero(l.quantidade) : formatarPercentual(l.participacao)}
                    </span>
                    <span className="rank__trilho" aria-hidden="true">
                      <span
                        className="rank__preench rank__preench--azul"
                        style={{ width: `${((modo === 'numero' ? l.quantidade / maximo : l.participacao / maximoPct) * 100).toFixed(1)}%` }}
                      />
                    </span>
                  </div>
                </td>
                <td className="num">{modo === 'numero' ? formatarPercentual(l.participacao) : formatarNumero(l.quantidade)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {aoVerTodos && (
        <button type="button" className="botao botao--link rank__ver-todos" onClick={aoVerTodos}>
          Ver todos os municípios ({formatarNumero(ranking.length)}) <ArrowRight size={14} aria-hidden="true" />
        </button>
      )}
    </>
  );
}
