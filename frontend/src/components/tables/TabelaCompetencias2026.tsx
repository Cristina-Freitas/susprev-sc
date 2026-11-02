import { useMemo } from 'react';
import { dadosDe, useDados } from '../../context/DadosContext';
import { formatarNumero, formatarVariacao, nomeMes, variacaoPercentual } from '../../utils/formatacao';
import { quantidadeMes } from '../../utils/series';
import { Carregando, EstadoErro } from '../ui/Estados';

/**
 * Tabela compacta das 12 competências de 2026 (jan a dez).
 * Mostra a divisão exata entre observado (jan-ago) e previsto (set-dez),
 * a quantidade de procedimentos e a comparação com 2025.
 */
export function TabelaCompetencias2026() {
  const { previsao, serie, recarregarApi, atualizandoApi } = useDados();
  const p = dadosDe(previsao);
  const s = dadosDe(serie);

  const linhas = useMemo(() => {
    if (!p) return [];
    return p.meses.map((m) => {
      const valor2025 = s ? quantidadeMes(s.registros, p.ano - 1, m.mes) : null;
      const variacao = valor2025 !== null ? variacaoPercentual(m.quantidade, valor2025) : null;
      const participacao = p.total_anual_projetado > 0 ? (m.quantidade / p.total_anual_projetado) * 100 : null;
      return {
        mes: m.mes,
        tipo: m.tipo,
        quantidade: m.quantidade,
        participacao,
        valor2025,
        variacao,
      };
    });
  }, [p, s]);

  if (previsao.estado === 'carregando') {
    return <Carregando rotulo="Carregando competências de 2026…" />;
  }

  if (previsao.estado === 'erro') {
    return (
      <EstadoErro
        titulo="Competências de 2026 indisponíveis"
        mensagem={previsao.erro}
        detalhe={previsao.detalhe}
        aoTentarNovamente={recarregarApi}
        tentando={atualizandoApi}
      />
    );
  }

  if (!p || linhas.length === 0) {
    return null;
  }

  return (
    <div className="tabela-container">
      <table className="tabela tabela--compacta" aria-label="Competências mensais de 2026: realizado e previsto">
        <thead>
          <tr>
            <th scope="col">Competência</th>
            <th scope="col">Status</th>
            <th scope="col" className="num">
              Procedimentos
            </th>
            <th scope="col" className="num">
              Part. %
            </th>
            <th scope="col" className="num">
              vs. 2025
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.mes}>
              <td>
                <strong>{nomeMes(l.mes)}</strong>/2026
              </td>
              <td>
                <span
                  className={`marcador-tipo marcador-tipo--${l.tipo}`}
                  title={l.tipo === 'observado' ? 'Dado registrado no SIH/SUS' : 'Projeção estatística XGBoost'}
                >
                  {l.tipo === 'observado' ? 'Realizado' : 'Previsto'}
                </span>
              </td>
              <td className="num font-mono">{formatarNumero(l.quantidade)}</td>
              <td className="num">{l.participacao !== null ? `${l.participacao.toFixed(1)}%` : '—'}</td>
              <td className="num">
                {l.variacao !== null ? (
                  <span className={l.variacao >= 0 ? 'texto-alta' : 'texto-baixa'}>
                    {formatarVariacao(l.variacao)}
                  </span>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="tabela__destaque">
            <th scope="row">Total projetado</th>
            <td>12 meses</td>
            <td className="num font-mono">{formatarNumero(p.total_anual_projetado)}</td>
            <td className="num">100%</td>
            <td className="num">
              {s ? (
                <span className="texto-alta">
                  {formatarVariacao(
                    variacaoPercentual(
                      p.total_anual_projetado,
                      s.registros.filter((r) => r.ano === 2025).reduce((acc, r) => acc + r.quantidade, 0),
                    ),
                  )}
                </span>
              ) : (
                '—'
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
