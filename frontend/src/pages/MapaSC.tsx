import { useState } from 'react';
import { DistribuicaoMunicipal } from '../components/map/DistribuicaoMunicipal';
import { Carregando } from '../components/ui/Estados';
import { Painel } from '../components/ui/Painel';
import { Segmentado } from '../components/ui/Segmentado';
import { SeletorAno } from '../components/ui/SeletorAno';
import { dadosDe, useDados } from '../context/DadosContext';
import { nomeMes } from '../utils/formatacao';
import type { Dimensao } from '../types/dados';

export function PaginaMapa() {
  const { agregados } = useDados();
  const ag = dadosDe(agregados);
  const [ano, setAno] = useState<number | null>(null);
  const [dimensao, setDimensao] = useState<Dimensao>('atendimento');
  const [selecionado, setSelecionado] = useState<string | null>(null);

  if (!ag) return <div className="pagina">{agregados.estado === 'carregando' ? <Carregando /> : null}</div>;
  const anoAtual = ano ?? ag.ano_corrente;

  return (
    <div className="pagina">
      <div className="pagina__topo">
        <div>
          <h2 className="pagina__titulo">Mapa de Santa Catarina</h2>
          <p className="pagina__descricao">Percentual da produção cirúrgica estadual em cada um dos {ag.total_municipios_sc} municípios.</p>
        </div>
        <div className="pagina__filtros">
          <SeletorAno id="ano-mapa" anos={ag.anos} valor={anoAtual} aoMudar={setAno} anoCorrente={ag.ano_corrente} mesFinal={nomeMes(ag.mes_final_ano_corrente)} />
          <Segmentado
            rotulo="Dimensão territorial"
            valor={dimensao}
            aoMudar={setDimensao}
            opcoes={[
              { valor: 'atendimento', rotulo: 'Atendimento' },
              { valor: 'residencia', rotulo: 'Residência' },
            ]}
          />
        </div>
      </div>
      <Painel
        className="painel--mapa-grande"
        id="painel-mapa-grande"
        titulo={`Distribuição por município de ${dimensao === 'atendimento' ? 'atendimento' : 'residência'} (${anoAtual})`}
        subtitulo="Malha municipal oficial do IBGE. Passe o mouse ou clique para ver os valores."
        rodape="Fonte: SIH/SUS (DATASUS), backup CSV versionado; malha: IBGE."
      >
        <DistribuicaoMunicipal ano={anoAtual} dimensao={dimensao} selecionado={selecionado} aoSelecionar={setSelecionado} />
      </Painel>
    </div>
  );
}
