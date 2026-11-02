import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { useTamanho } from '../../hooks/useTamanho';
import { formatarNumero, nomeMes } from '../../utils/formatacao';
import type { PontoAnual } from '../../utils/series';

const COR_REALIZADO = '#2f7de1';
const COR_PARCIAL = '#5b9cf0';
const COR_PREVISTO = '#bdecd3';
const COR_PREVISTO_BORDA = '#23a26a';

interface Props {
  dados: PontoAnual[];
  /** Mostra os valores sobre as barras (desativar em telas muito pequenas). */
  rotulos?: boolean;
  previsaoIndisponivel?: boolean;
}

function TooltipAnual({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const ponto = payload[0].payload as PontoAnual;

  if (ponto.realizado !== null) {
    return (
      <div className="tooltip-grafico">
        <p className="tooltip-grafico__titulo">{ponto.ano}</p>
        <div className="tooltip-grafico__linha">
          <span>
            <i className="tooltip-grafico__marcador" style={{ background: COR_REALIZADO }} />
            Realizado (jan–dez)
          </span>
          <strong>{formatarNumero(ponto.realizado)}</strong>
        </div>
        <p className="tooltip-grafico__nota">
          Procedimentos efetivamente registrados no SIH/SUS (12 competências). Fonte: série mensal versionada do
          SUSPrev SC.
        </p>
      </div>
    );
  }

  const faixa = `jan–${nomeMes(ponto.mesesObservados)}`;
  return (
    <div className="tooltip-grafico">
      <p className="tooltip-grafico__titulo">{ponto.ano}</p>
      <div className="tooltip-grafico__linha">
        <span>
          <i className="tooltip-grafico__marcador" style={{ background: COR_PARCIAL }} />
          Realizado ({faixa})
        </span>
        <strong>{formatarNumero(ponto.observadoParcial)}</strong>
      </div>
      {ponto.temPrevisao && ponto.previsto !== null && (
        <>
          <div className="tooltip-grafico__linha">
            <span>
              <i
                className="tooltip-grafico__marcador"
                style={{ background: COR_PREVISTO, outline: `1.5px dashed ${COR_PREVISTO_BORDA}` }}
              />
              Previsto ({nomeMes(ponto.mesesObservados + 1)}–dez)
            </span>
            <strong>{formatarNumero(ponto.previsto)}</strong>
          </div>
          <div className="tooltip-grafico__linha tooltip-grafico__total">
            <span>Total anual projetado</span>
            <strong>{formatarNumero(ponto.totalRotulo)}</strong>
          </div>
        </>
      )}
      <p className="tooltip-grafico__nota">
        {ponto.temPrevisao
          ? 'Realizado: dados observados (API /predict, SIH/SUS). Previsto: estimativa do modelo XGBoost — não é produção realizada.'
          : `Ano incompleto: apenas ${ponto.mesesObservados} competências observadas. Previsão indisponível no momento.`}
      </p>
    </div>
  );
}

/** Gráfico de barras 2019–2026: azul = realizado; verde-claro = previsto (somente no ano projetado). */
export function GraficoEvolucaoAnual({ dados, rotulos = true, previsaoIndisponivel = false }: Props) {
  const [refGrafico, { altura: alturaGrafico }] = useTamanho<HTMLDivElement>();
  const mostrarTituloEixo = alturaGrafico === 0 || alturaGrafico >= 150;
  const maximo = useMemo(() => Math.max(0, ...dados.map((d) => d.totalRotulo)), [dados]);
  const passo = maximo > 120000 ? 50000 : 25000;
  const topo = Math.max(passo, Math.ceil((maximo * 1.06) / passo) * passo);
  const marcas = useMemo(() => Array.from({ length: topo / passo + 1 }, (_, i) => i * passo), [topo, passo]);
  const anoParcial = dados.find((d) => d.realizado === null);
  const rotuloParcial = anoParcial ? `Realizado até ${nomeMes(anoParcial.mesesObservados, true)}` : null;
  const rotuloPrevisto =
    anoParcial && anoParcial.temPrevisao
      ? `Projeção (${nomeMes(anoParcial.mesesObservados + 1, true)} a dezembro)`
      : null;

  const descricao = useMemo(
    () =>
      dados
        .map((d) =>
          d.realizado !== null
            ? `${d.ano}: ${formatarNumero(d.realizado)} realizados`
            : `${d.ano}: ${formatarNumero(d.observadoParcial)} realizados até ${nomeMes(d.mesesObservados, true)}` +
              (d.temPrevisao && d.previsto !== null
                ? ` e ${formatarNumero(d.previsto)} previstos, total projetado ${formatarNumero(d.totalRotulo)}`
                : ''),
        )
        .join('; '),
    [dados],
  );

  return (
    <>
      <div className="grafico" ref={refGrafico} role="img" aria-label={`Evolução anual dos procedimentos cirúrgicos eletivos. ${descricao}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 24, right: 8, bottom: 0, left: 0 }} barCategoryGap="16%">
            <defs>
              <linearGradient id="grad-realizado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82ec" />
                <stop offset="100%" stopColor="#2a6fd9" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e7edf5" />
            <XAxis
              dataKey="ano"
              tickLine={false}
              axisLine={{ stroke: '#cdd7e4' }}
              tick={{ fill: '#4a5b73', fontSize: 12, fontWeight: 600 }}
            />
            <YAxis
              width={66}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#4a5b73', fontSize: 11 }}
              tickFormatter={(v: number) => formatarNumero(v)}
              domain={[0, topo]}
              ticks={marcas}
              label={
                mostrarTituloEixo
                  ? {
                      value: 'Número de procedimentos',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 8,
                      style: { textAnchor: 'middle', fill: '#4a5b73', fontSize: 11 },
                    }
                  : undefined
              }
            />
            <Tooltip content={<TooltipAnual />} cursor={{ fill: 'rgba(47,125,225,0.07)' }} />
            <Bar dataKey="realizado" name="Realizado" stackId="ano" fill="url(#grad-realizado)" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {rotulos && (
                <LabelList
                  dataKey="realizado"
                  position="top"
                  formatter={(v: number | null) => (v ? formatarNumero(v) : '')}
                  style={{ fill: '#0f2747', fontSize: 11, fontWeight: 700 }}
                />
              )}
            </Bar>
            <Bar
              dataKey="observadoParcial"
              name="Realizado (parcial)"
              stackId="ano"
              fill={COR_PARCIAL}
              radius={previsaoIndisponivel ? [6, 6, 0, 0] : [0, 0, 0, 0]}
              isAnimationActive={false}
            >
              {rotulos && (
                <LabelList
                  dataKey="observadoParcial"
                  position="center"
                  formatter={(v: number | null) => (v ? formatarNumero(v) : '')}
                  style={{ fill: '#ffffff', fontSize: 11, fontWeight: 700 }}
                />
              )}
            </Bar>
            <Bar
              dataKey="previsto"
              name="Previsto"
              stackId="ano"
              fill={COR_PREVISTO}
              stroke={COR_PREVISTO_BORDA}
              strokeWidth={1.5}
              strokeDasharray="5 3"
              radius={[6, 6, 0, 0]}
              isAnimationActive={false}
            >
              {rotulos && (
                <LabelList
                  dataKey="previsto"
                  position="center"
                  formatter={(v: number | null) => (v ? formatarNumero(v) : '')}
                  style={{ fill: '#0c5c37', fontSize: 11, fontWeight: 700 }}
                />
              )}
              {rotulos && (
                <LabelList
                  dataKey="totalRotulo"
                  position="top"
                  formatter={(v: number) => formatarNumero(v)}
                  content={(props) => {
                    const { x, y, width, index } = props as { x: number; y: number; width: number; index: number };
                    const ponto = dados[index];
                    if (!ponto || !ponto.temPrevisao) return null;
                    return (
                      <text x={x + width / 2} y={y - 7} textAnchor="middle" fill="#0b2447" fontSize={12} fontWeight={800}>
                        {formatarNumero(ponto.totalRotulo)}
                      </text>
                    );
                  }}
                />
              )}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="legenda" aria-hidden="true">
        <span className="legenda__item">
          <span className="legenda__amostra legenda__amostra--realizado" /> Realizado (ano completo)
        </span>
        {rotuloParcial && (
          <span className="legenda__item">
            <span className="legenda__amostra legenda__amostra--parcial" /> {rotuloParcial}
          </span>
        )}
        {rotuloPrevisto && (
          <span className="legenda__item">
            <span className="legenda__amostra legenda__amostra--previsto" /> {rotuloPrevisto}
          </span>
        )}
      </div>
    </>
  );
}
