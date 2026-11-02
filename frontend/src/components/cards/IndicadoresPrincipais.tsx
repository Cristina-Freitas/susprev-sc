import { useMemo } from 'react';
import { Building2, ChartNoAxesColumn, Landmark, Stethoscope, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { dadosDe, useDados } from '../../context/DadosContext';
import { formatarNumero, formatarPercentual, formatarVariacao, nomeMes, variacaoPercentual } from '../../utils/formatacao';
import { lerCompetencia, somaAteMes } from '../../utils/series';
import { AnelPercentual, CartaoIndicador } from './CartaoIndicador';

function Seta({ valor }: { valor: number | null }) {
  if (valor === null) return null;
  const alta = valor >= 0;
  const Icone = alta ? TrendingUp : TrendingDown;
  return (
    <span className={`kpi__variacao kpi__variacao--${alta ? 'alta' : 'baixa'}`}>
      <Icone size={13} aria-hidden="true" />
      {formatarVariacao(valor)}
    </span>
  );
}

/**
 * Cinco indicadores principais, na ordem do mockup.
 *  - Realizado, previsto e projetado: POST /predict (API).
 *  - Comparação com 2025: série mensal versionada (mesma base da API).
 *  - Municípios, estabelecimentos e tipos de procedimentos: agregados do backup
 *    CSV versionado do banco (producao_cirurgica), no mesmo período do realizado.
 */
export function IndicadoresPrincipais() {
  const { previsao, serie, agregados } = useDados();
  const p = dadosDe(previsao);
  const s = dadosDe(serie);
  const ag = dadosDe(agregados);
  const carregandoApi = previsao.estado === 'carregando';
  const apiComErro = previsao.estado === 'erro';

  const calculo = useMemo(() => {
    const competencia = p?.ultima_competencia_observada ?? s?.ultima_competencia ?? null;
    const comp = competencia ? lerCompetencia(competencia) : null;
    if (!comp) return null;
    const previstos = p ? p.meses.filter((m) => m.tipo === 'previsto') : [];
    const totalObservado = p?.total_observado ?? (s ? somaAteMes(s.registros, comp.ano, comp.mes) : null);
    const mesmoPeriodoAnterior = s ? somaAteMes(s.registros, comp.ano - 1, comp.mes) : null;
    const primeiro = previstos[0]?.mes;
    const ultimo = previstos[previstos.length - 1]?.mes;
    return {
      comp,
      totalObservado,
      fonte: p ? 'api' : 'serie',
      mesmoPeriodoAnterior,
      variacao:
        totalObservado !== null && mesmoPeriodoAnterior !== null
          ? variacaoPercentual(totalObservado, mesmoPeriodoAnterior)
          : null,
      faixaPrevista: primeiro && ultimo ? `${nomeMes(primeiro, true)} a ${nomeMes(ultimo, true)}` : null,
    };
  }, [p, s]);

  const ano = calculo?.comp.ano ?? 2026;
  const mesFinal = calculo ? nomeMes(calculo.comp.mes, true) : 'agosto';
  const carregandoAg = agregados.estado === 'carregando';
  const semAg = agregados.estado === 'erro';
  const totalMunicipios = ag?.total_municipios_sc ?? 295;
  const municipios = ag?.distintos.ate_mes.municipios.atual ?? null;
  const percentualMunicipios = municipios !== null ? (municipios / totalMunicipios) * 100 : null;

  const indisponivel = <span aria-label="Indisponível">—</span>;
  const notaSemAg = 'Requer os agregados do backup (npm run dados:agregar).';

  return (
    <div className="vg__kpis" role="group" aria-label="Indicadores principais">
      <CartaoIndicador
        id="kpi-realizado"
        icone={Stethoscope}
        cor="azul"
        carregando={carregandoApi && !calculo}
        rotulo={
          <>
            Total de procedimentos realizados em {ano} <small>(até {mesFinal})</small>
          </>
        }
        valor={formatarNumero(calculo?.totalObservado)}
        nota={
          calculo && calculo.mesmoPeriodoAnterior !== null ? (
            <>
              <Seta valor={calculo.variacao} /> vs. mesmo período de {ano - 1} ({formatarNumero(calculo.mesmoPeriodoAnterior)})
              {calculo.fonte === 'serie' && ' · série versionada'}
            </>
          ) : undefined
        }
        dica="Procedimentos cirúrgicos eletivos registrados no SIH/SUS (valor observado, retornado por POST /predict). A variação compara com o mesmo período do ano anterior."
      />

      <CartaoIndicador
        id="kpi-previsto"
        icone={ChartNoAxesColumn}
        cor="verde"
        carregando={carregandoApi}
        rotulo={
          <>
            Projeção para {ano} <small>({calculo?.faixaPrevista ?? 'setembro a dezembro'})</small>
          </>
        }
        valor={p ? formatarNumero(p.total_previsto) : indisponivel}
        nota={
          apiComErro ? (
            'Requer a API de previsão (POST /predict).'
          ) : p ? (
            <>
              Total estimado em {ano}
              <strong className="kpi__destaque">{formatarNumero(p.total_anual_projetado)}</strong>
            </>
          ) : undefined
        }
        dica="Previsão do modelo XGBoost para os meses ainda não observados. Não é produção realizada."
      />

      <CartaoIndicador
        id="kpi-municipios"
        icone={Landmark}
        cor="roxo"
        carregando={carregandoAg}
        rotulo={<>Municípios que realizam cirurgias eletivas</>}
        valor={municipios !== null ? formatarNumero(municipios) : indisponivel}
        nota={semAg ? notaSemAg : `de ${formatarNumero(totalMunicipios)} municípios de SC`}
        lateral={
          percentualMunicipios !== null ? (
            <AnelPercentual
              percentual={percentualMunicipios}
              rotulo={`${formatarPercentual(percentualMunicipios, 0)} dos municípios de SC realizaram procedimentos`}
            />
          ) : undefined
        }
        dica={`Municípios de atendimento com ao menos um procedimento registrado entre janeiro e ${mesFinal} de ${ano} (backup CSV do SIH/SUS).`}
      />

      <CartaoIndicador
        id="kpi-estabelecimentos"
        icone={Building2}
        cor="vermelho"
        carregando={carregandoAg}
        rotulo={<>Estabelecimentos realizadores</>}
        valor={ag ? formatarNumero(ag.distintos.ate_mes.estabelecimentos.atual) : indisponivel}
        nota={semAg ? notaSemAg : 'estabelecimentos (CNES) com procedimentos registrados'}
        dica={`Códigos CNES distintos com produção registrada entre janeiro e ${mesFinal} de ${ano}.`}
      />

      <CartaoIndicador
        id="kpi-tipos"
        icone={Users}
        cor="laranja"
        carregando={carregandoAg}
        rotulo={
          <>
            Tipos de procedimentos realizados em {ano}
          </>
        }
        valor={ag ? formatarNumero(ag.distintos.ate_mes.procedimentos.atual) : indisponivel}
        nota={semAg ? notaSemAg : 'procedimentos diferentes (códigos SIGTAP)'}
        dica={`Códigos de procedimento (SIGTAP) distintos registrados entre janeiro e ${mesFinal} de ${ano}.`}
      />
    </div>
  );
}
