import type { PrevisaoSaida } from '../../types/api';
import type { AgregadosProducao, SerieMensal } from '../../types/dados';
import { rankingMunicipios, rankingProcedimentos } from '../../utils/agregados';
import { formatarCompetencia, formatarDescricao, formatarNumero, formatarPercentual, formatarVariacao, nomeMes } from '../../utils/formatacao';
import type { ResumoExecutivo } from '../../utils/resumo';
import { totaisAnuais } from '../../utils/series';

interface Props {
  resumo: ResumoExecutivo;
  previsao: PrevisaoSaida | null;
  serie: SerieMensal | null;
  agregados: AgregadosProducao | null;
  anoRanking: number;
}

const ND = '—';

/** Relatório executivo em formato de folha A4 (visualização em tela e impressão/PDF). */
export function FolhaRelatorio({ resumo, previsao, serie, agregados, anoRanking }: Props) {
  const mes = resumo.mesFinal ? nomeMes(resumo.mesFinal, true) : '';
  const municipios = agregados ? rankingMunicipios(agregados, anoRanking, 'atendimento').slice(0, 10) : [];
  const procedimentos = agregados ? rankingProcedimentos(agregados, anoRanking).filter((r) => r.quantidade > 0).slice(0, 10) : [];
  const anuais = serie ? totaisAnuais(serie.registros) : [];
  const mensal = previsao
    ? previsao.meses.filter((m) => m.ano === previsao.ano).sort((a, b) => a.mes - b.mes)
    : serie
      ? serie.registros.filter((r) => r.ano === resumo.ano).map((r) => ({ ano: r.ano, mes: r.mes, quantidade: r.quantidade, tipo: 'observado' as const }))
      : [];

  const indicadores = [
    { rotulo: `Realizados em ${resumo.ano} (jan–${mes})`, valor: formatarNumero(resumo.totalObservado), nota: resumo.variacao === null ? '' : `${formatarVariacao(resumo.variacao)} vs. mesmo período de ${resumo.ano - 1}` },
    { rotulo: `Projeção (${resumo.faixaPrevista ?? 'meses restantes'})`, valor: resumo.previsto === null ? ND : formatarNumero(resumo.previsto), nota: resumo.projetado === null ? 'API indisponível' : `Total anual projetado: ${formatarNumero(resumo.projetado)}` },
    { rotulo: 'Municípios com procedimentos', valor: formatarNumero(resumo.municipios), nota: `de ${formatarNumero(resumo.totalMunicipios)} municípios de SC` },
    { rotulo: 'Estabelecimentos (CNES)', valor: formatarNumero(resumo.estabelecimentos), nota: 'com procedimentos registrados' },
    { rotulo: 'Tipos de procedimentos', valor: formatarNumero(resumo.tipos), nota: 'códigos SIGTAP distintos' },
  ];

  return (
    <article className="folha" id="relatorio-executivo" aria-label="Relatório executivo">
      <header className="folha__cabecalho">
        <div>
          <h2>SUSPrev SC — Relatório executivo</h2>
          <p>Cirurgias eletivas do SUS em Santa Catarina</p>
        </div>
        <dl>
          <div><dt>Última competência</dt><dd>{resumo.competencia ? formatarCompetencia(resumo.competencia) : ND}</dd></div>
          <div><dt>Ano dos rankings</dt><dd>{anoRanking}{agregados && anoRanking === agregados.ano_corrente ? ` (jan–${mes})` : ''}</dd></div>
          <div><dt>Gerado em</dt><dd>{new Date().toLocaleDateString('pt-BR')}</dd></div>
        </dl>
      </header>

      <section className="folha__secao">
        <h3>Indicadores principais</h3>
        <div className="folha__indicadores">
          {indicadores.map((i) => (
            <div key={i.rotulo} className="folha__indicador">
              <span>{i.rotulo}</span>
              <strong>{i.valor}</strong>
              <small>{i.nota}</small>
            </div>
          ))}
        </div>
      </section>

      <div className="folha__duas">
        <section className="folha__secao">
          <h3>Top 10 municípios ({anoRanking})</h3>
          <table className="folha__tabela">
            <thead><tr><th>#</th><th>Município</th><th className="num">Procedimentos</th><th className="num">% do total</th></tr></thead>
            <tbody>
              {municipios.map((m, i) => (
                <tr key={m.codigo}><td>{i + 1}</td><td>{m.nome}</td><td className="num">{formatarNumero(m.quantidade)}</td><td className="num">{formatarPercentual(m.participacao)}</td></tr>
              ))}
              {!municipios.length && <tr><td colSpan={4}>Dados territoriais indisponíveis.</td></tr>}
            </tbody>
          </table>
          <p className="folha__legenda">Município de atendimento (onde o procedimento foi realizado).</p>
        </section>

        <section className="folha__secao">
          <h3>Principais procedimentos ({anoRanking})</h3>
          <table className="folha__tabela">
            <thead><tr><th>#</th><th>Procedimento (SIGTAP)</th><th className="num">Qtde.</th><th className="num">% do total</th></tr></thead>
            <tbody>
              {procedimentos.map((r, i) => (
                <tr key={r.codigo}><td>{i + 1}</td><td>{formatarDescricao(r.descricao) || `Código ${r.codigo}`}</td><td className="num">{formatarNumero(r.quantidade)}</td><td className="num">{formatarPercentual(r.participacao)}</td></tr>
              ))}
              {!procedimentos.length && <tr><td colSpan={4}>Dados de procedimentos indisponíveis.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>

      <div className="folha__duas">
        <section className="folha__secao">
          <h3>Evolução anual</h3>
          <table className="folha__tabela">
            <thead><tr><th>Ano</th><th className="num">Procedimentos</th><th>Situação</th></tr></thead>
            <tbody>
              {anuais.map((t) => {
                const proj = previsao !== null && previsao.ano === t.ano;
                return (
                  <tr key={t.ano}>
                    <td>{t.ano}</td>
                    <td className="num">{formatarNumero(proj ? previsao.total_anual_projetado : t.total)}</td>
                    <td>{proj ? `Projetado (realizado até ${mes} + previsto)` : t.completo ? 'Realizado' : `Parcial (${t.mesesComDados} meses)`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="folha__secao">
          <h3>Produção mensal de {resumo.ano}</h3>
          <table className="folha__tabela">
            <thead><tr><th>Competência</th><th>Situação</th><th className="num">Procedimentos</th></tr></thead>
            <tbody>
              {mensal.map((m) => (
                <tr key={`${m.ano}-${m.mes}`}>
                  <td>{nomeMes(m.mes)}/{m.ano}</td>
                  <td>{m.tipo === 'observado' ? 'Realizado' : 'Previsto'}</td>
                  <td className="num">{formatarNumero(m.quantidade)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <footer className="folha__notas">
        <h3>Notas</h3>
        <ul>
          <li>Fonte: SIH/SUS (DATASUS), procedimentos cirúrgicos eletivos de SC. Descrições: SIGTAP (Tabela Unificada 202608). Municípios: IBGE.</li>
          <li>“Realizado” é produção registrada. “Previsto” e “projetado” são estimativas do modelo XGBoost e não representam produção realizada; a previsão não traz intervalo de confiança.</li>
          <li>A contagem é de procedimentos (atos cirúrgicos), não de pacientes nem de pessoas em fila de espera.</li>
        </ul>
      </footer>
    </article>
  );
}
