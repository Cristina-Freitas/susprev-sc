import { useMemo } from 'react';
import { CalendarRange, ChevronDown, Info, MapPin, Menu, RefreshCw } from 'lucide-react';
import { dadosDe, useDados } from '../../context/DadosContext';
import { formatarCompetencia } from '../../utils/formatacao';
import { totaisAnuais } from '../../utils/series';
import { StatusApi } from '../ui/StatusApi';

interface CabecalhoProps {
  aoAbrirMenu: () => void;
  menuAberto: boolean;
  aoAbrirMetodologia: () => void;
}

export function Cabecalho({ aoAbrirMenu, menuAberto, aoAbrirMetodologia }: CabecalhoProps) {
  const { previsao, serie, anoInicial, definirAnoInicial, recarregarApi, atualizandoApi, consultadoEm } = useDados();
  const dadosPrevisao = dadosDe(previsao);
  const dadosSerie = dadosDe(serie);

  const competencia = dadosPrevisao?.ultima_competencia_observada ?? dadosSerie?.ultima_competencia ?? null;

  const anos = useMemo(() => (dadosSerie ? totaisAnuais(dadosSerie.registros).map((t) => t.ano) : []), [dadosSerie]);
  const anoFinal = anos.length ? anos[anos.length - 1] : null;
  const opcoesPeriodo = useMemo(() => anos.filter((a) => anoFinal !== null && anoFinal - a >= 1), [anos, anoFinal]);

  return (
    <header className="cabecalho">
      <div className="cabecalho__inicio">
        <button
          type="button"
          className="botao-menu"
          onClick={aoAbrirMenu}
          aria-label="Abrir menu"
          aria-expanded={menuAberto}
          aria-controls="menu-principal"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <div className="cabecalho__titulo">
          <h1>SUSPrev SC</h1>
          <div className="cabecalho__subtitulo">
            <strong>Cirurgias Eletivas em Santa Catarina</strong>
            <span>Dados para planejar. Resultados para a população.</span>
          </div>
        </div>
      </div>

      <div className="cabecalho__acoes">
        {competencia && (
          <div
            className="cabecalho__atualizacao"
            title={consultadoEm ? `API consultada em ${consultadoEm.toLocaleString('pt-BR')}` : undefined}
          >
            <small>Última competência observada</small>
            <strong className="num">{formatarCompetencia(competencia)}</strong>
          </div>
        )}
        <button
          type="button"
          className="cabecalho__info"
          onClick={aoAbrirMetodologia}
          aria-label="Entender a origem e a atualização dos dados (Metodologia)"
          title="Entender a origem e a atualização dos dados"
        >
          <Info size={15} aria-hidden="true" />
        </button>

        <span className="chip-fixo" title="Recorte territorial fixo da análise">
          <MapPin size={15} aria-hidden="true" />
          Santa Catarina
        </span>

        {opcoesPeriodo.length > 0 && anoFinal !== null && (
          <label className="campo-selecao">
            <span className="visualmente-oculto">Período exibido nos gráficos históricos</span>
            <CalendarRange size={15} aria-hidden="true" />
            <select id="filtro-periodo" value={anoInicial} onChange={(e) => definirAnoInicial(Number(e.target.value))}>
              {opcoesPeriodo.map((ano) => (
                <option key={ano} value={ano}>
                  {ano} - {anoFinal}
                </option>
              ))}
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </label>
        )}

        <StatusApi />

        <button
          type="button"
          id="botao-atualizar"
          className="botao botao--icone"
          onClick={recarregarApi}
          disabled={atualizandoApi}
          aria-label="Atualizar dados da API"
          title="Atualizar dados da API"
        >
          <RefreshCw size={16} className={atualizandoApi ? 'girando' : undefined} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
