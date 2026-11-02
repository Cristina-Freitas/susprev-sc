import { useMemo, useState } from 'react';
import { dadosDe, useDados } from '../../context/DadosContext';
import { CLASSES_MAPA, rankingMunicipios } from '../../utils/agregados';
import { formatarNumero, formatarPercentual } from '../../utils/formatacao';
import type { Dimensao } from '../../types/dados';
import { Carregando, EstadoErro } from '../ui/Estados';
import { MapaSC, type ValorMunicipio } from './MapaSC';

interface Props {
  ano: number;
  dimensao?: Dimensao;
  /** Município fixado por clique (opcional, controlado pelo pai). */
  selecionado?: string | null;
  aoSelecionar?: (codigo: string | null) => void;
}

const ROTULO_DIMENSAO: Record<Dimensao, string> = {
  atendimento: 'município de atendimento',
  residencia: 'município de residência',
};

/** Mapa + legenda + cartão do município (mockup: "Distribuição das cirurgias por município"). */
export function DistribuicaoMunicipal({ ano, dimensao = 'atendimento', selecionado = null, aoSelecionar }: Props) {
  const { mapa, agregados } = useDados();
  const m = dadosDe(mapa);
  const ag = dadosDe(agregados);
  const [passando, setPassando] = useState<string | null>(null);

  const ranking = useMemo(() => (ag ? rankingMunicipios(ag, ano, dimensao) : []), [ag, ano, dimensao]);
  const valores = useMemo(() => {
    const mapaValores = new Map<string, ValorMunicipio>();
    for (const l of ranking) mapaValores.set(l.codigo, { quantidade: l.quantidade, participacao: l.participacao });
    return mapaValores;
  }, [ranking]);

  if (mapa.estado === 'carregando' || agregados.estado === 'carregando') {
    return <Carregando rotulo="Carregando a malha de Santa Catarina…" />;
  }
  if (mapa.estado === 'erro') return <EstadoErro mensagem={mapa.erro} detalhe={mapa.detalhe} />;
  if (agregados.estado === 'erro') return <EstadoErro mensagem={agregados.erro} detalhe={agregados.detalhe} />;
  if (!m || !ag) return null;

  const codigoAtivo = passando ?? selecionado ?? ranking[0]?.codigo ?? null;
  const linhaAtiva = ranking.find((l) => l.codigo === codigoAtivo);
  const nomeAtivo = m.municipios.find((x) => x.codigo === codigoAtivo)?.nome ?? null;
  const posicao = linhaAtiva ? ranking.indexOf(linhaAtiva) + 1 : null;
  const ehResidencia = dimensao === 'residencia';

  return (
    <div className="dist">
      <div className="dist__mapa">
        <MapaSC
          mapa={m}
          valores={valores}
          selecionado={selecionado}
          aoPassar={setPassando}
          aoSelecionar={aoSelecionar}
          descricao={`Mapa de Santa Catarina colorido pelo percentual de procedimentos de ${ano} por ${ROTULO_DIMENSAO[dimensao]}. ${ranking.length} dos ${m.total_municipios} municípios têm registros.`}
        />
        <div className="cartao-municipio" aria-live="polite">
          {nomeAtivo ? (
            <>
              <strong>{nomeAtivo}</strong>
              {linhaAtiva ? (
                <>
                  <span>
                    {formatarNumero(linhaAtiva.quantidade)} procedimentos
                    {ehResidencia ? ' (residentes)' : ''}
                  </span>
                  <span>{formatarPercentual(linhaAtiva.participacao)} do total do estado</span>
                  {posicao !== null && <span className="cartao-municipio__pos">{posicao}º no ranking</span>}
                </>
              ) : (
                <span>Sem registros em {ano}</span>
              )}
            </>
          ) : (
            <span>Passe o mouse sobre um município.</span>
          )}
        </div>
      </div>

      <div className="dist__lateral">
        <div className="legenda-mapa">
          <p className="legenda-mapa__titulo">
            Percentual de procedimentos no estado ({ano})
          </p>
          <ul>
            {CLASSES_MAPA.map((c) => (
              <li key={c.id}>
                <span className="legenda-mapa__cor" style={{ background: c.cor }} aria-hidden="true" />
                {c.rotulo}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}
