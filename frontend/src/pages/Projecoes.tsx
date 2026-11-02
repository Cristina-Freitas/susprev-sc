import { useMemo } from 'react';
import { GraficoMensalAno } from '../components/charts/GraficoMensalAno';
import { IndicadoresPrincipais } from '../components/cards/IndicadoresPrincipais';
import { TabelaCompetencias2026 } from '../components/tables/TabelaCompetencias2026';
import { Carregando, EstadoErro } from '../components/ui/Estados';
import { Painel } from '../components/ui/Painel';
import { dadosDe, useDados } from '../context/DadosContext';
import { formatarDecimal, formatarNumero } from '../utils/formatacao';
import { montarSerieMensalAno } from '../utils/series';

export function PaginaProjecoes() {
  const { previsao, serie, metricas, recarregarApi, atualizandoApi } = useDados();
  const p = dadosDe(previsao);
  const s = dadosDe(serie);
  const m = dadosDe(metricas);
  const dadosMensais = useMemo(() => (p ? montarSerieMensalAno(p, s) : []), [p, s]);

  return (
    <div className="pagina">
      <div className="pagina__topo">
        <div>
          <h2 className="pagina__titulo">Projeções (IA)</h2>
          <p className="pagina__descricao">
            Previsão mensal de procedimentos cirúrgicos eletivos pelo modelo {p?.modelo ?? 'XGBoost'}, consultada na API (POST /predict).
          </p>
        </div>
      </div>

      <div className="projecoes__kpis"><IndicadoresPrincipais /></div>

      <div className="grade-7-5">
        <Painel
          id="painel-projecao-mensal"
          titulo="Observado e previsto por competência"
          subtitulo="Linha pontilhada: mesmas competências do ano anterior"
        >
          {previsao.estado === 'carregando' ? (
            <Carregando rotulo="Consultando a API…" />
          ) : previsao.estado === 'erro' ? (
            <EstadoErro mensagem={previsao.erro} detalhe={previsao.detalhe} aoTentarNovamente={recarregarApi} tentando={atualizandoApi} />
          ) : p ? (
            <GraficoMensalAno dados={dadosMensais} ano={p.ano} mostrarAnoAnterior />
          ) : null}
        </Painel>
        <Painel id="painel-competencias-projecao" titulo={`Competências de ${p?.ano ?? 2026}`} subtitulo="Valores observados e projetados">
          <TabelaCompetencias2026 />
        </Painel>
      </div>

      <Painel
        id="painel-metricas-modelo"
        titulo="Desempenho do modelo"
        subtitulo="Métricas versionadas do repositório (erro em procedimentos por mês); o intervalo de confiança não é fornecido pela API."
      >
        {m ? (
          <div className="tabela-container">
            <table className="tabela tabela--compacta">
              <thead>
                <tr>
                  <th>Conjunto</th>
                  <th>Modelo</th>
                  <th className="num">MAE</th>
                  <th className="num">RMSE</th>
                  <th className="num">R²</th>
                </tr>
              </thead>
              <tbody>
                {[['Teste final', m.teste_final.registros] as const, ['Validação', m.validacao.registros] as const].flatMap(([nome, regs]) =>
                  regs.map((r) => (
                    <tr key={`${nome}-${r.modelo}`}>
                      <td>{nome}</td>
                      <td>{r.modelo}</td>
                      <td className="num">{formatarNumero(Math.round(r.mae))}</td>
                      <td className="num">{formatarNumero(Math.round(r.rmse))}</td>
                      <td className="num">{formatarDecimal(r.r2, 2)}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <Carregando rotulo="Carregando métricas…" />
        )}
      </Painel>
    </div>
  );
}
