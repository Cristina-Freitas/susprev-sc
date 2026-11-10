import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Carregando, EstadoErro } from '../components/ui/Estados';
import { Painel } from '../components/ui/Painel';
import { SeletorAno } from '../components/ui/SeletorAno';
import { dadosDe, useDados } from '../context/DadosContext';
import { rankingEstabelecimentos } from '../utils/agregados';
import { formatarNumero, formatarPercentual, nomeMes } from '../utils/formatacao';

export function PaginaEstabelecimentos() {
  const { agregados } = useDados();
  const ag = dadosDe(agregados);
  const [ano, setAno] = useState<number | null>(null);
  const [busca, setBusca] = useState('');

  const anoAtual = ano ?? ag?.ano_corrente ?? 0;
  const ranking = useMemo(() => (ag ? rankingEstabelecimentos(ag, anoAtual) : []), [ag, anoAtual]);
  const linhas = useMemo(() => {
    const t = busca.trim().toLocaleLowerCase('pt-BR');
    return ranking
      .map((r, i) => ({ ...r, posicao: i + 1 }))
      .filter((r) => !t || r.cnes.includes(t) || (r.municipio ?? '').toLocaleLowerCase('pt-BR').includes(t) || (r.nome ?? '').toLocaleLowerCase('pt-BR').includes(t));
  }, [ranking, busca]);

  if (agregados.estado === 'carregando') return <div className="pagina"><Carregando /></div>;
  if (!ag) return <div className="pagina"><EstadoErro mensagem={agregados.estado === 'erro' ? agregados.erro : 'Dados indisponíveis.'} /></div>;

  // TODO: usar quando os nomes dos estabelecimentos forem preenchidos
  //const totalEstab = ag.estabelecimentos.length;
  //const semNome = ag.qualidade.estabelecimentos_sem_nome;
  //const todosSemNome = semNome >= totalEstab && totalEstab > 0;

  return (
    <div className="pagina">
      <div className="pagina__topo">
        <div>
          <h2 className="pagina__titulo">Estabelecimentos de saúde</h2>
          <p className="pagina__descricao">
            {formatarNumero(ranking.length)} estabelecimentos (CNES) com procedimentos registrados em {anoAtual}.
          </p>
        </div>
        <div className="pagina__filtros">
          <SeletorAno id="ano-estab" anos={ag.anos} valor={anoAtual} aoMudar={setAno} anoCorrente={ag.ano_corrente} mesFinal={nomeMes(ag.mes_final_ano_corrente)} />
        </div>
      </div>



      <Painel
        id="painel-lista-estabelecimentos"
        titulo="Ranking de estabelecimentos"
        subtitulo="Procedimentos realizados no ano selecionado"
        acoes={
          <label className="busca">
            <Search size={14} aria-hidden="true" />
            <span className="visualmente-oculto">Buscar estabelecimento</span>
            <input type="search" placeholder="CNES, nome ou município" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </label>
        }
      >
        <div className="tabela-container">
          <table className="tabela tabela--compacta">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>CNES</th>
                <th>Estabelecimento</th>
                <th>Município</th>
                <th className="num">Procedimentos</th>
                <th className="num">% do total</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.cnes}>
                  <td className="num">{l.posicao}</td>
                  <td><code>{l.cnes}</code></td>
                  <td className="quebra">{l.nome ?? <span className="texto-suave">Nome não disponível</span>}</td>
                  <td>{l.municipio ?? '—'}</td>
                  <td className="num">{formatarNumero(l.quantidade)}</td>
                  <td className="num">{formatarPercentual(l.participacao, 2)}</td>
                </tr>
              ))}
              {!linhas.length && (
                <tr><td colSpan={6}>Nenhum estabelecimento encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Painel>
    </div>
  );
}
