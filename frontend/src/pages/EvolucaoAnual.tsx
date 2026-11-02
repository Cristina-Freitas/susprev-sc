import { useMemo } from 'react';
import { GraficoEvolucaoAnual } from '../components/charts/GraficoEvolucaoAnual';
import { GraficoSerieMensal } from '../components/charts/GraficoSerieMensal';
import { Carregando, EstadoErro } from '../components/ui/Estados';
import { Painel } from '../components/ui/Painel';
import { dadosDe, useDados } from '../context/DadosContext';
import { formatarNumero, formatarVariacao, variacaoPercentual } from '../utils/formatacao';
import { montarHistoricoMensal, montarSerieAnual, totaisAnuais } from '../utils/series';

export function PaginaEvolucaoAnual() {
  const { previsao, serie, anoInicial, definirAnoInicial } = useDados();

  const p = dadosDe(previsao);
  const s = dadosDe(serie);

  const dadosAnuais = useMemo(() => {
    if (!s) return [];
    const todos = montarSerieAnual(s, p);
    return todos.filter((item) => item.anoNumero >= anoInicial);
  }, [s, p, anoInicial]);

  const dadosHistoricoMensal = useMemo(() => {
    if (!s) return [];
    return montarHistoricoMensal(s, p);
  }, [s, p]);

  const tabelaAnual = useMemo(() => {
    if (!s) return [];
    const totais = totaisAnuais(s.registros);
    return totais.map((t, idx) => {
      const anterior = idx > 0 ? totais[idx - 1] : null;
      const eh2026 = t.ano === 2026;
      const valorFinal = eh2026 && p ? p.total_anual_projetado : t.total;
      const varAnterior =
        anterior && anterior.completo ? variacaoPercentual(valorFinal, anterior.total) : null;
      const mediaMensal = t.mesesComDados > 0 ? t.total / t.mesesComDados : null;

      return {
        ano: t.ano,
        realizado: t.total,
        meses: t.mesesComDados,
        completo: t.completo,
        projetado: eh2026 && p ? p.total_anual_projetado : null,
        previsto: eh2026 && p ? p.total_previsto : null,
        varAnterior,
        mediaMensal,
      };
    });
  }, [s, p]);

  return (
    <div className="pagina">
      <div className="pagina__topo">
        <div>
          <h2 className="pagina__titulo">Evolução Anual da Produção Cirúrgica Eletiva</h2>
          <p className="pagina__descricao">
            Acompanhamento histórico da produção do SUS em Santa Catarina (2019–2026) e projeção de fechamento anual com XGBoost.
          </p>
        </div>
        <div className="segmentado" role="group" aria-label="Filtrar ano inicial">
          <button
            type="button"
            aria-pressed={anoInicial === 2019}
            onClick={() => definirAnoInicial(2019)}
          >
            Desde 2019
          </button>
          <button
            type="button"
            aria-pressed={anoInicial === 2021}
            onClick={() => definirAnoInicial(2021)}
          >
            Pós-pandemia (2021+)
          </button>
        </div>
      </div>

      <div className="grade-7-5">
        <Painel
          id="painel-grafico-anual-completo"
          titulo="Produção anual acumulada (procedimentos)"
          subtitulo="Comparação entre anos com discriminação de valores realizados e previstos"
          dica="Para os anos de 2019 a 2025, os valores refletem as 12 competências do ano. Em 2026, a barra divide a produção apurada de jan-ago (azul) e a estimativa de set-dez (verde)."
        >
          {serie.estado === 'carregando' ? (
            <Carregando rotulo="Carregando dados da série anual…" />
          ) : serie.estado === 'erro' ? (
            <EstadoErro mensagem={serie.erro} />
          ) : (
            <GraficoEvolucaoAnual
              dados={dadosAnuais}
              previsaoIndisponivel={previsao.estado === 'erro'}
            />
          )}
        </Painel>

        <Painel
          id="painel-tabela-historico-anual"
          titulo="Síntese histórica por ano"
          subtitulo="Indicadores anuais consolidados e variações"
        >
          <div className="tabela-container">
            <table className="tabela" aria-label="Tabela de totais anuais de cirurgias eletivas">
              <thead>
                <tr>
                  <th scope="col">Ano</th>
                  <th scope="col" className="num">Realizado</th>
                  <th scope="col">Competências</th>
                  <th scope="col" className="num">Média/Mês</th>
                  <th scope="col" className="num">Variação anual</th>
                </tr>
              </thead>
              <tbody>
                {tabelaAnual.map((linha) => (
                  <tr key={linha.ano} className={linha.ano === 2026 ? 'tabela__destaque' : undefined}>
                    <td><strong>{linha.ano}</strong></td>
                    <td className="num font-mono">
                      {linha.ano === 2026 && linha.projetado ? (
                        <span title={`Realizado até ago: ${formatarNumero(linha.realizado)} | Previsto: ${formatarNumero(linha.previsto)}`}>
                          {formatarNumero(linha.projetado)} <small className="kpi__selo kpi__selo--projetado">proj.</small>
                        </span>
                      ) : (
                        formatarNumero(linha.realizado)
                      )}
                    </td>
                    <td>{linha.completo ? '12 meses' : `${linha.meses} meses (jan–ago)`}</td>
                    <td className="num font-mono">
                      {linha.mediaMensal ? formatarNumero(Math.round(linha.mediaMensal)) : '—'}
                    </td>
                    <td className="num">
                      {linha.varAnterior !== null ? (
                        <span className={linha.varAnterior >= 0 ? 'texto-alta' : 'texto-baixa'}>
                          {formatarVariacao(linha.varAnterior)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Painel>
      </div>

      <Painel
        id="painel-serie-temporal-continua"
        titulo="Série Temporal Mensal Contínua (2019 a 2026)"
        subtitulo="Visão longitudinal dos 92 meses observados e dos 4 meses projetados"
        dica="Permite identificar o impacto de períodos atípicos (como as restrições cirúrgicas durante a pandemia em 2020/2021) e o ritmo de aceleração da produção a partir de 2022."
      >
        {serie.estado === 'carregando' ? (
          <Carregando rotulo="Carregando série mensal contínua…" />
        ) : serie.estado === 'erro' ? (
          <EstadoErro mensagem={serie.erro} />
        ) : (
          <GraficoSerieMensal
            dados={dadosHistoricoMensal}
            ultimaCompetencia={p?.ultima_competencia_observada ?? s?.ultima_competencia ?? '2026-08'}
          />
        )}
      </Painel>

      <Painel
        id="painel-contexto-historico"
        titulo="Compreensão dos períodos históricos"
        subtitulo="Fatos assistenciais e contextuais que influenciaram a produção do SUS em SC"
      >
        <div className="texto-corrido">
          <p>
            <strong>2019 (Pré-pandemia):</strong> Produção estável de 96.014 procedimentos cirúrgicos eletivos registrados no SIH/SP, com média mensal em torno de 8.000 procedimentos.
          </p>
          <p>
            <strong>2020–2021 (Impacto da Pandemia de COVID-19):</strong> Forte redução nas cirurgias eletivas em razão da priorização de leitos hospitalares e UTIs para atendimentos emergenciais respiratórios (57.032 procedimentos em 2020 e 58.263 em 2021). O ponto de menor produção da série histórica foi registrado em abril de 2021 (2.124 procedimentos).
          </p>
          <p>
            <strong>2022–2024 (Retomada e Programas de Cirurgias Eletivas):</strong> Aceleração acentuada da realização de procedimentos com a implementação de programas estaduais e nacionais de redução de filas cirúrgicas no pós-pandemia, atingindo 106.460 procedimentos em 2022, 135.291 em 2023 e 181.923 em 2024.
          </p>
          <p>
            <strong>2025–2026 (Consolidação em Patamar Elevado):</strong> O ano de 2025 alcançou 200.091 procedimentos. Em 2026, de janeiro a agosto já foram contabilizados 136.405 procedimentos, tendo sido registrado em julho de 2026 o recorde absoluto de produção mensal de toda a série histórica (18.946 procedimentos). O modelo preditivo XGBoost projeta um fechamento de 201.170 procedimentos para 2026.
          </p>
        </div>
      </Painel>
    </div>
  );
}
