import { useMemo } from 'react';
import { FaixaInformativa } from '../components/cards/FaixaInformativa';
import { IndicadoresPrincipais } from '../components/cards/IndicadoresPrincipais';
import { GraficoEvolucaoAnual } from '../components/charts/GraficoEvolucaoAnual';
import { ProjecaoAnual } from '../components/charts/ProjecaoAnual';
import { DistribuicaoMunicipal } from '../components/map/DistribuicaoMunicipal';
import { TabelaPrincipaisProcedimentos } from '../components/tables/TabelaPrincipaisProcedimentos';
import { TabelaTopMunicipios } from '../components/tables/TabelaTopMunicipios';
import { Carregando, EstadoErro } from '../components/ui/Estados';
import { Painel } from '../components/ui/Painel';
import { dadosDe, useDados } from '../context/DadosContext';
import type { IdPagina } from '../hooks/useRotaHash';
import { montarSerieAnual } from '../utils/series';

interface Props {
  aoNavegar: (pagina: IdPagina) => void;
}

/**
 * Visão Geral — composição do mockup: cinco indicadores, evolução anual, mapa,
 * rankings (municípios e procedimentos), projeção e faixa de atalhos.
 * Cada Painel é filho direto da grade, para que a altura seja repartida
 * corretamente entre as linhas (sem rolagem da página em 1366 × 768).
 */
export function PaginaVisaoGeral({ aoNavegar }: Props) {
  const { previsao, serie, agregados, anoInicial } = useDados();
  const p = dadosDe(previsao);
  const s = dadosDe(serie);
  const ag = dadosDe(agregados);
  const ano = ag?.ano_corrente ?? p?.ano ?? 2026;

  const dadosAnuais = useMemo(() => {
    if (!s) return [];
    return montarSerieAnual(s, p).filter((item) => item.anoNumero >= anoInicial);
  }, [s, p, anoInicial]);

  return (
    <div className="pagina pagina--vg">
      <div className="vg">
        <IndicadoresPrincipais />

        <Painel
          className="vg__anual"
          id="painel-evolucao-anual"
          titulo="Evolução anual das cirurgias eletivas em Santa Catarina"
          dica="Barras azuis: procedimentos realizados e registrados no SIH/SUS. Em 2026, a barra empilha a produção observada (azul) e a previsão do modelo XGBoost para os meses restantes (verde tracejado)."
        >
          {serie.estado === 'carregando' ? (
            <Carregando rotulo="Carregando série anual…" />
          ) : serie.estado === 'erro' ? (
            <EstadoErro mensagem={serie.erro} detalhe={serie.detalhe} />
          ) : (
            <GraficoEvolucaoAnual dados={dadosAnuais} previsaoIndisponivel={previsao.estado === 'erro'} />
          )}
        </Painel>

        <Painel
          className="vg__mapa"
          id="painel-mapa-sc"
          titulo={`Distribuição das cirurgias por município (${ano})`}
          dica="Percentual da produção estadual por município de atendimento (onde o procedimento foi realizado), calculado sobre o total de procedimentos do estado no ano. Fonte: backup CSV do SIH/SUS."
        >
          <DistribuicaoMunicipal ano={ano} />
        </Painel>

        <Painel
          className="vg__top"
          id="painel-top-municipios"
          titulo={`Top 10 municípios por número de procedimentos (${ano})`}
          dica="Município de atendimento: onde o procedimento foi realizado, não onde o paciente mora. A participação é calculada sobre o total de procedimentos do estado."
        >
          <TabelaTopMunicipios ano={ano} aoVerTodos={() => aoNavegar('municipios')} />
        </Painel>

        <Painel
          className="vg__proc"
          id="painel-principais-procedimentos"
          titulo={`Principais procedimentos em ${ano}`}
          dica="Procedimentos agrupados pelo código SIGTAP, com as descrições oficiais da Tabela Unificada. A variação compara janeiro até o último mês observado com o mesmo período do ano anterior."
        >
          <TabelaPrincipaisProcedimentos ano={ano} aoVerTodos={() => aoNavegar('procedimentos')} />
        </Painel>

        <Painel
          className="vg__proj"
          id="painel-projecao-anual"
          titulo="Projeção anual (IA)"
          dica="Realizado: ano completo (SIH/SUS). Projeção: total anual de 2026 devolvido por POST /predict (realizado + previsto pelo modelo XGBoost)."
        >
          <ProjecaoAnual />
        </Painel>

        <FaixaInformativa aoNavegar={aoNavegar} />
      </div>
    </div>
  );
}
