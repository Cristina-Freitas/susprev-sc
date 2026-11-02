import { useMemo, useState } from 'react';
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { dadosDe, useDados } from '../../context/DadosContext';
import { formatarDescricao, formatarNumero, nomeMes } from '../../utils/formatacao';
import { rankingProcedimentos } from '../../utils/agregados';
import { Carregando, EstadoErro } from '../ui/Estados';

interface Ponto {
  ano: number;
  realizado: number | null;
  projecao: number | null;
  parcial: number | null;
}

function TooltipProjecao({ active, payload, mesFinal }: TooltipProps<number, string> & { mesFinal: string }) {
  if (!active || !payload?.length) return null;
  const ponto = payload[0].payload as Ponto;
  return (
    <div className="tooltip-grafico">
      <p className="tooltip-grafico__titulo">{ponto.ano}</p>
      {ponto.realizado !== null && (
        <div className="tooltip-grafico__linha">
          <span>Realizado (ano completo)</span>
          <strong>{formatarNumero(ponto.realizado)}</strong>
        </div>
      )}
      {ponto.parcial !== null && ponto.realizado === null && (
        <div className="tooltip-grafico__linha">
          <span>Realizado até {mesFinal} (ano incompleto)</span>
          <strong>{formatarNumero(ponto.parcial)}</strong>
        </div>
      )}
      {ponto.projecao !== null && ponto.realizado === null && (
        <div className="tooltip-grafico__linha">
          <span>Total anual projetado (realizado + previsto)</span>
          <strong>{formatarNumero(ponto.projecao)}</strong>
        </div>
      )}
      <p className="tooltip-grafico__nota">
        {ponto.projecao !== null && ponto.realizado === null
          ? 'Estimativa do modelo XGBoost (POST /predict) — não é produção realizada.'
          : 'Procedimentos registrados no SIH/SUS (backup CSV versionado).'}
      </p>
    </div>
  );
}

/** Projeção anual: série realizada e, quando a API responde, o total projetado de 2026. */
export function ProjecaoAnual({ idSelect = 'select-procedimento-projecao' }: { idSelect?: string }) {
  const { agregados, previsao, anoInicial } = useDados();
  const ag = dadosDe(agregados);
  const p = dadosDe(previsao);
  const [codigo, setCodigo] = useState<string>('todos');

  const opcoes = useMemo(() => {
    if (!ag) return [];
    return rankingProcedimentos(ag, ag.ano_corrente)
      .filter((l) => l.quantidade > 0)
      .slice(0, 20);
  }, [ag]);

  const dados = useMemo<Ponto[]>(() => {
    if (!ag) return [];
    const total = codigo === 'todos';
    const proc = total ? null : ag.procedimentos.find((x) => x.codigo === codigo);
    return ag.anos
      .map((ano, i) => {
        const completo = ag.totais.meses_por_ano[i] === 12 && ano !== ag.ano_corrente;
        const valor = total ? ag.totais.por_ano[i] : (proc?.anual[i] ?? 0);
        const ehProjetado = ano === ag.ano_corrente;
        return {
          ano,
          realizado: completo ? valor : null,
          projecao: total && ehProjetado && p ? p.total_anual_projetado : null,
          parcial: !completo && ehProjetado && !(total && p) ? valor : null,
        };
      })
      .filter((d) => d.ano >= anoInicial)
      .map((d, i, arr) => {
        // Conecta a linha tracejada ao último ano completo.
        const proximo = arr[i + 1];
        if (d.realizado !== null && proximo) {
          if (proximo.projecao !== null) return { ...d, projecao: d.realizado };
        }
        return d;
      });
  }, [ag, p, codigo, anoInicial]);

  if (agregados.estado === 'carregando') return <Carregando rotulo="Carregando série por procedimento…" />;
  if (agregados.estado === 'erro') return <EstadoErro mensagem={agregados.erro} detalhe={agregados.detalhe} />;
  if (!ag) return null;

  const mesFinal = nomeMes(ag.mes_final_ano_corrente, true);
  const maximo = Math.max(0, ...dados.flatMap((d) => [d.realizado, d.projecao, d.parcial]).map((v) => v ?? 0));
  const passo = maximo > 120000 ? 50000 : maximo > 12000 ? 25000 : maximo > 1200 ? 2500 : 250;
  const topo = Math.max(passo, Math.ceil((maximo * 1.06) / passo) * passo);
  const marcas = Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => i * passo);
  const procedimentoEscolhido = codigo !== 'todos';

  return (
    <>
      <div className="projecao__seletor">
        <label htmlFor={idSelect}>Selecionar procedimento</label>
        <select id={idSelect} value={codigo} onChange={(e) => setCodigo(e.target.value)}>
          <option value="todos">Todos os procedimentos</option>
          {opcoes.map((o) => (
            <option key={o.codigo} value={o.codigo}>
              {formatarDescricao(o.descricao) || `Código ${o.codigo}`}
            </option>
          ))}
        </select>
      </div>

      <div
        className="grafico"
        role="img"
        aria-label={`Série anual de procedimentos${procedimentoEscolhido ? ' do procedimento selecionado' : ''}, de ${dados[0]?.ano ?? ''} a ${dados[dados.length - 1]?.ano ?? ''}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dados} margin={{ top: 8, right: 14, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#e7edf5" />
            <XAxis dataKey="ano" tickLine={false} axisLine={{ stroke: '#cdd7e4' }} tick={{ fill: '#4a5b73', fontSize: 11 }} />
            <YAxis
              width={58}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#4a5b73', fontSize: 10.5 }}
              tickFormatter={(v: number) => formatarNumero(v)}
              domain={[0, topo]}
              ticks={marcas}
            />
            <Tooltip content={<TooltipProjecao mesFinal={mesFinal} />} />
            <Line type="monotone" dataKey="realizado" stroke="#2f7de1" strokeWidth={2} dot={{ r: 3, fill: '#2f7de1' }} connectNulls isAnimationActive={false} />
            <Line
              type="monotone"
              dataKey="projecao"
              stroke="#16a06a"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3, fill: '#16a06a' }}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="parcial"
              stroke="#5b9cf0"
              strokeWidth={2}
              strokeDasharray="2 3"
              dot={{ r: 4, fill: '#fff', stroke: '#5b9cf0', strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="legenda" aria-hidden="true">
        <span className="legenda__item">
          <span className="legenda__amostra legenda__amostra--linha-realizada" /> Realizado
        </span>
        {!procedimentoEscolhido && p && (
          <span className="legenda__item">
            <span className="legenda__amostra legenda__amostra--linha-prevista" /> Projeção
          </span>
        )}
        {(procedimentoEscolhido || !p) && (
          <span className="legenda__item">
            <span className="legenda__amostra legenda__amostra--ponto-parcial" /> Realizado até {mesFinal}
          </span>
        )}
      </div>
      <p className="projecao__nota">
        {procedimentoEscolhido
          ? 'A API projeta apenas o total estadual; por procedimento são exibidos somente valores realizados.'
          : 'Intervalo de confiança não exibido: a API não informa a incerteza da previsão.'}
      </p>
    </>
  );
}
