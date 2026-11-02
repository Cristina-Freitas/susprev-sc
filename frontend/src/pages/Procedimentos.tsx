import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { SeletorAno } from '../components/ui/SeletorAno';
import { agregarPorSubgrupo, rankingProcedimentos } from '../utils/agregados';
import { GraficoMensalAno } from '../components/charts/GraficoMensalAno';
import { TabelaCompetencias2026 } from '../components/tables/TabelaCompetencias2026';
import { Carregando, EstadoErro } from '../components/ui/Estados';
import { Painel } from '../components/ui/Painel';
import { dadosDe, useDados } from '../context/DadosContext';
import { formatarDescricao, formatarNumero, formatarPercentual, formatarVariacao, nomeMes } from '../utils/formatacao';
import { montarSerieMensalAno } from '../utils/series';

export function PaginaProcedimentos() {
  const { previsao, serie, agregados } = useDados();
  const ag = dadosDe(agregados);
  const [anoSel, setAnoSel] = useState<number | null>(null);
  const [busca, setBusca] = useState('');
  const anoRank = anoSel ?? ag?.ano_corrente ?? 0;
  const ranking = useMemo(() => (ag ? rankingProcedimentos(ag, anoRank).filter((r) => r.quantidade > 0) : []), [ag, anoRank]);
  const subgrupos = useMemo(() => (ag ? agregarPorSubgrupo(ag, anoRank) : []), [ag, anoRank]);
  const linhasRank = useMemo(() => {
    const t = busca.trim().toLocaleLowerCase('pt-BR');
    return ranking.map((r, i) => ({ ...r, posicao: i + 1 })).filter((r) => !t || r.codigo.includes(t) || (r.descricao ?? '').toLocaleLowerCase('pt-BR').includes(t));
  }, [ranking, busca]);
  const p = dadosDe(previsao);
  const s = dadosDe(serie);

  const dadosMensais2026 = useMemo(() => {
    if (!p) return [];
    return montarSerieMensalAno(p, s);
  }, [p, s]);

  // Estatísticas descritivas reais da série calculadas a partir de outputs/reports/02_estatisticas_descritivas.csv
  const estatisticas = useMemo(() => {
    if (!s) return null;
    const quantidades = s.registros.map((r) => r.quantidade);
    const n = quantidades.length;
    const soma = quantidades.reduce((acc, v) => acc + v, 0);
    const media = soma / n;
    const ordenados = [...quantidades].sort((a, b) => a - b);
    const mediana =
      n % 2 === 0
        ? (ordenados[n / 2 - 1] + ordenados[n / 2]) / 2
        : ordenados[Math.floor(n / 2)];
    const min = Math.min(...quantidades);
    const max = Math.max(...quantidades);
    const desvioPadrao = Math.sqrt(
      quantidades.reduce((acc, v) => acc + Math.pow(v - media, 2), 0) / (n - 1)
    );

    return {
      meses: n,
      media,
      mediana,
      desvioPadrao,
      min,
      max,
    };
  }, [s]);

  return (
    <div className="pagina">
      <div className="pagina__topo">
        <div>
          <h2 className="pagina__titulo">Procedimentos Cirúrgicos Eletivos</h2>
          <p className="pagina__descricao">
            Estatísticas da produção cirúrgica (Grupo 04 do SIGTAP/SIH) e discriminação das competências do ano de 2026.
          </p>
        </div>
      </div>

      <div className="grade-4">
        <div className="metrica">
          <span>Média mensal histórica</span>
          <strong>{estatisticas ? formatarNumero(Math.round(estatisticas.media)) : '10.560'}</strong>
          <small style={{ color: 'var(--texto-suave)' }}>procedimentos/mês</small>
        </div>
        <div className="metrica">
          <span>Mediana mensal</span>
          <strong>{estatisticas ? formatarNumero(Math.round(estatisticas.mediana)) : '9.793'}</strong>
          <small style={{ color: 'var(--texto-suave)' }}>50% dos meses acima deste valor</small>
        </div>
        <div className="metrica">
          <span>Menor competência observada</span>
          <strong>{estatisticas ? formatarNumero(estatisticas.min) : '2.124'}</strong>
          <small style={{ color: 'var(--texto-suave)' }}>abril de 2021 (pico pandêmico)</small>
        </div>
        <div className="metrica">
          <span>Maior competência observada</span>
          <strong>{estatisticas ? formatarNumero(estatisticas.max) : '18.946'}</strong>
          <small style={{ color: 'var(--sucesso)' }}>julho de 2026 (recorde histórico)</small>
        </div>
      </div>

      {ag && (
        <div className="grade-7-5 grade-7-5--alta">
          <Painel
            id="painel-ranking-procedimentos"
            titulo={`Procedimentos por código SIGTAP (${anoRank})`}
            subtitulo={`${formatarNumero(ranking.length)} procedimentos com registros. A variação compara com o mesmo período do ano anterior.`}
            acoes={
              <div className="filtros-lista">
                <SeletorAno id="ano-procedimentos" anos={ag.anos} valor={anoRank} aoMudar={setAnoSel} anoCorrente={ag.ano_corrente} mesFinal={nomeMes(ag.mes_final_ano_corrente)} />
                <label className="busca">
                  <Search size={14} aria-hidden="true" />
                  <span className="visualmente-oculto">Buscar procedimento</span>
                  <input type="search" placeholder="Código ou descrição" value={busca} onChange={(e) => setBusca(e.target.value)} />
                </label>
              </div>
            }
          >
            <div className="tabela-container">
              <table className="tabela tabela--compacta">
                <thead>
                  <tr>
                    <th className="num">#</th>
                    <th>Código</th>
                    <th>Procedimento</th>
                    <th className="num">Procedimentos</th>
                    <th className="num">% do total</th>
                    <th className="num">Var. %</th>
                  </tr>
                </thead>
                <tbody>
                  {linhasRank.slice(0, 200).map((r) => (
                    <tr key={r.codigo}>
                      <td className="num">{r.posicao}</td>
                      <td><code>{r.codigo}</code></td>
                      <td className="quebra">{formatarDescricao(r.descricao) || <span className="texto-suave">Descrição indisponível</span>}</td>
                      <td className="num">{formatarNumero(r.quantidade)}</td>
                      <td className="num">{formatarPercentual(r.participacao, 2)}</td>
                      <td className={`num ${r.variacaoPercentual === null ? '' : r.variacaoPercentual >= 0 ? 'texto-alta' : 'texto-baixa'}`}>
                        {formatarVariacao(r.variacaoPercentual)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Painel>

          <Painel id="painel-subgrupos" titulo="Por subgrupo SIGTAP" subtitulo={`Distribuição em ${anoRank}`}>
            <ul className="lista-subgrupos">
              {subgrupos.map((g) => (
                <li key={g.codigo}>
                  <span title={g.nome}>{g.nome}</span>
                  <span className="lista-subgrupos__valor">{formatarNumero(g.quantidade)} · {formatarPercentual(g.participacao)}</span>
                  <span className="rank__trilho" aria-hidden="true">
                    <span className="rank__preench rank__preench--verde" style={{ width: `${g.participacao}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </Painel>
        </div>
      )}

      <div className="grade-7-5">
        <Painel
          id="painel-grafico-procedimentos-mensais"
          titulo="Comportamento Mensal em 2026"
          subtitulo="Comparativo da produção apurada de jan–ago e da previsão de set–dez com 2025"
          dica="A linha pontilhada indica o comportamento realizado nas mesmas competências do ano anterior (2025)."
        >
          {previsao.estado === 'carregando' ? (
            <Carregando rotulo="Carregando dados mensais de 2026…" />
          ) : previsao.estado === 'erro' ? (
            <EstadoErro mensagem={previsao.erro} />
          ) : p ? (
            <GraficoMensalAno dados={dadosMensais2026} ano={p.ano} mostrarAnoAnterior={true} />
          ) : null}
        </Painel>

        <Painel
          id="painel-tabela-procedimentos-competencias"
          titulo="Competências de 2026 (SIH/SP)"
          subtitulo="Valores absolutos e projeção anual completa"
        >
          <TabelaCompetencias2026 />
        </Painel>
      </div>

      <Painel
        id="painel-definicao-sigtap"
        titulo="Classificação e Regras de Negócio dos Procedimentos"
        subtitulo="Especificações técnicas sobre a extração dos procedimentos do DATASUS"
      >
        <div className="texto-corrido">
          <p>
            <strong>Origem no SIGTAP (Sistema de Gerenciamento da Tabela de Procedimentos do SUS):</strong> Os dados
            analisados pelo SUSPrev SC contemplam exclusivamente procedimentos cujo código se inicia com{' '}
            <code>04</code> (Grupo 04 — Procedimentos Cirúrgicos da tabela unificada do SUS).
          </p>
          <p>
            <strong>Critério de Eletividade (Vínculo RD e SP):</strong> O Sistema de Informações Hospitalares (SIH)
            disponibiliza os arquivos reduzidos (RD) contendo os dados gerais da internação e os arquivos de serviços
            profissionais (SP). Como o arquivo SP não contém diretamente o caráter de internação (<code>CAR_INT</code>),
            o pipeline do SUSPrev SC realiza o relacionamento das AIHs com o arquivo RD para garantir que apenas
            cirurgias com <code>CAR_INT = 01</code> (Caráter Eletivo) sejam computadas.
          </p>
          <p>
            <strong>Unidade de Contagem (Pares AIH / Procedimento / CNES):</strong> A métrica conta os procedimentos
            distintos registrados para cada internação em um determinado estabelecimento. Isso reflete fielmente o volume
            de produção assistencial cirúrgica especializada entregue pelo SUS aos cidadãos de Santa Catarina.
          </p>
        </div>
      </Painel>
    </div>
  );
}
