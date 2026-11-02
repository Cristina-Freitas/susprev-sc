import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { formatarCompacto, formatarNumero, formatarVariacao, nomeMes, variacaoPercentual } from '../../utils/formatacao';
import type { PontoMensal } from '../../utils/series';

interface Props {
  dados: PontoMensal[];
  ano: number;
  mostrarAnoAnterior?: boolean;
}

function TooltipMensal({ active, payload, ano }: TooltipProps<number, string> & { ano: number }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as PontoMensal;
  const valor = p.observado ?? p.previsto;
  const variacao = valor !== null && p.anoAnterior !== null ? variacaoPercentual(valor, p.anoAnterior) : null;
  return (
    <div className="tooltip-grafico">
      <p className="tooltip-grafico__titulo">
        {nomeMes(p.mesNumero, true)} de {ano}
      </p>
      {p.observado !== null && (
        <div className="tooltip-grafico__linha">
          <span>
            <i className="tooltip-grafico__marcador" style={{ background: '#2f7de1' }} />
            Realizado
          </span>
          <strong>{formatarNumero(p.observado)}</strong>
        </div>
      )}
      {p.previsto !== null && (
        <div className="tooltip-grafico__linha">
          <span>
            <i className="tooltip-grafico__marcador" style={{ background: '#a8e6c6', outline: '1.5px dashed #23a26a' }} />
            Previsto (XGBoost)
          </span>
          <strong>{formatarNumero(p.previsto)}</strong>
        </div>
      )}
      {p.anoAnterior !== null && (
        <div className="tooltip-grafico__linha">
          <span>
            <i className="tooltip-grafico__marcador" style={{ background: '#94a3b8' }} />
            Realizado em {ano - 1}
          </span>
          <strong>{formatarNumero(p.anoAnterior)}</strong>
        </div>
      )}
      {variacao !== null && (
        <p className="tooltip-grafico__nota">
          Diferença em relação ao mesmo mês de {ano - 1}: {formatarVariacao(variacao)}
          {p.previsto !== null ? ' (comparação entre previsão e realizado).' : '.'}
        </p>
      )}
    </div>
  );
}

/** Produção mensal do ano projetado: realizado (azul) e previsto (verde), com o ano anterior como referência. */
export function GraficoMensalAno({ dados, ano, mostrarAnoAnterior = true }: Props) {
  const descricao = dados
    .map((d) =>
      d.observado !== null
        ? `${nomeMes(d.mesNumero)}: ${formatarNumero(d.observado)} realizados`
        : d.previsto !== null
          ? `${nomeMes(d.mesNumero)}: ${formatarNumero(d.previsto)} previstos`
          : `${nomeMes(d.mesNumero)}: sem dado`,
    )
    .join('; ');

  return (
    <>
      <div className="grafico" role="img" aria-label={`Procedimentos por mês em ${ano}. ${descricao}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dados} margin={{ top: 8, right: 6, bottom: 0, left: 0 }} barCategoryGap="18%">
            <CartesianGrid vertical={false} stroke="#e7edf5" />
            <XAxis
              dataKey="mesNumero"
              tickFormatter={(m: number) => nomeMes(m)}
              tickLine={false}
              axisLine={{ stroke: '#cdd7e4' }}
              tick={{ fill: '#4a5b73', fontSize: 11 }}
              interval={0}
            />
            <YAxis
              width={46}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#66768d', fontSize: 11 }}
              tickFormatter={formatarCompacto}
            />
            <Tooltip content={<TooltipMensal ano={ano} />} cursor={{ fill: 'rgba(47,125,225,0.07)' }} />
            <Bar dataKey="observado" name="Realizado" stackId="m" fill="#2f7de1" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar
              dataKey="previsto"
              name="Previsto"
              stackId="m"
              fill="#a8e6c6"
              stroke="#23a26a"
              strokeWidth={1.3}
              strokeDasharray="4 3"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
            {mostrarAnoAnterior && (
              <Line
                dataKey="anoAnterior"
                name={`Realizado em ${ano - 1}`}
                type="monotone"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="legenda" aria-hidden="true">
        <span className="legenda__item">
          <span className="legenda__amostra legenda__amostra--realizado" /> Realizado {ano}
        </span>
        <span className="legenda__item">
          <span className="legenda__amostra legenda__amostra--previsto" /> Previsto {ano}
        </span>
        {mostrarAnoAnterior && (
          <span className="legenda__item">
            <span className="legenda__amostra legenda__amostra--anterior" /> Realizado {ano - 1}
          </span>
        )}
      </div>
    </>
  );
}
