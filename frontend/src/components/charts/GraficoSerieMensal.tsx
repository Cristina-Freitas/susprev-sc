import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { formatarCompacto, formatarNumero, nomeMes } from '../../utils/formatacao';
import type { PontoHistorico } from '../../utils/series';

interface Props {
  dados: PontoHistorico[];
  ultimaCompetencia: string | null;
}

function TooltipHistorico({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as PontoHistorico;
  const ehPrevisto = p.observado === null;
  return (
    <div className="tooltip-grafico">
      <p className="tooltip-grafico__titulo">
        {nomeMes(p.mes, true)} de {p.ano}
      </p>
      <div className="tooltip-grafico__linha">
        <span>
          <i
            className="tooltip-grafico__marcador"
            style={ehPrevisto ? { background: '#a8e6c6', outline: '1.5px dashed #23a26a' } : { background: '#2f7de1' }}
          />
          {ehPrevisto ? 'Previsto (XGBoost)' : 'Realizado'}
        </span>
        <strong>{formatarNumero(ehPrevisto ? p.previsto : p.observado)}</strong>
      </div>
      <p className="tooltip-grafico__nota">
        {ehPrevisto
          ? 'Estimativa do modelo para competência ainda não observada.'
          : 'Procedimentos registrados no SIH/SUS nesta competência.'}
      </p>
    </div>
  );
}

/** Série mensal completa: histórico observado e previsão dos meses restantes. */
export function GraficoSerieMensal({ dados, ultimaCompetencia }: Props) {
  const primeiro = dados[0];
  const ultimo = dados[dados.length - 1];
  return (
    <>
      <div
        className="grafico"
        role="img"
        aria-label={
          primeiro && ultimo
            ? `Série mensal de procedimentos de ${nomeMes(primeiro.mes)}/${primeiro.ano} a ${nomeMes(ultimo.mes)}/${ultimo.ano}, com linha azul para dados realizados e linha verde tracejada para previsões.`
            : 'Série mensal de procedimentos.'
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dados} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#e7edf5" />
            <XAxis
              dataKey="chave"
              tickLine={false}
              axisLine={{ stroke: '#cdd7e4' }}
              tick={{ fill: '#4a5b73', fontSize: 11 }}
              tickFormatter={(chave: string) => chave.slice(0, 4)}
              ticks={dados.filter((d) => d.mes === 1).map((d) => d.chave)}
            />
            <YAxis width={46} tickLine={false} axisLine={false} tick={{ fill: '#66768d', fontSize: 11 }} tickFormatter={formatarCompacto} />
            <Tooltip content={<TooltipHistorico />} />
            {ultimaCompetencia && (
              <ReferenceLine
                x={ultimaCompetencia}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                label={{ value: 'última competência observada', position: 'insideTopRight', fill: '#66768d', fontSize: 10 }}
              />
            )}
            <Line dataKey="observado" type="monotone" stroke="#2f7de1" strokeWidth={2.2} dot={false} isAnimationActive={false} />
            <Line
              dataKey="previsto"
              type="monotone"
              stroke="#23a26a"
              strokeWidth={2.4}
              strokeDasharray="6 4"
              dot={{ r: 3, fill: '#a8e6c6', stroke: '#23a26a' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="legenda" aria-hidden="true">
        <span className="legenda__item">
          <span className="legenda__amostra legenda__amostra--linha-realizada" /> Realizado
        </span>
        <span className="legenda__item">
          <span className="legenda__amostra legenda__amostra--linha-prevista" /> Previsto (XGBoost)
        </span>
      </div>
    </>
  );
}
