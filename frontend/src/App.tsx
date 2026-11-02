import { useState } from 'react';
import { Cabecalho } from './components/layout/Cabecalho';
import { MenuLateral } from './components/layout/MenuLateral';
import { DadosProvider } from './context/DadosContext';
import { useRotaHash } from './hooks/useRotaHash';
import { PaginaDadosAbertos } from './pages/DadosAbertos';
import { PaginaEstabelecimentos } from './pages/Estabelecimentos';
import { PaginaEvolucaoAnual } from './pages/EvolucaoAnual';
import { PaginaMapa } from './pages/MapaSC';
import { PaginaMetodologia } from './pages/Metodologia';
import { PaginaMunicipios } from './pages/Municipios';
import { PaginaProcedimentos } from './pages/Procedimentos';
import { PaginaProjecoes } from './pages/Projecoes';
import { PaginaRelatorios } from './pages/Relatorios';
import { PaginaSobreProjeto } from './pages/SobreProjeto';
import { PaginaVisaoGeral } from './pages/VisaoGeral';

function ConteudoAplicacao() {
  const [pagina, navegar] = useRotaHash();
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="app">
      <a href="#conteudo-principal" className="pular-conteudo">
        Pular para o conteúdo principal
      </a>

      {menuAberto && (
        <div
          className="fundo-menu"
          onClick={() => setMenuAberto(false)}
          aria-hidden="true"
        />
      )}

      <MenuLateral
        paginaAtual={pagina}
        aoNavegar={(destino) => {
          navegar(destino);
          setMenuAberto(false);
        }}
        aberto={menuAberto}
        aoFechar={() => setMenuAberto(false)}
      />

      <div className="principal">
        <Cabecalho
          aoAbrirMenu={() => setMenuAberto((v) => !v)}
          menuAberto={menuAberto}
          aoAbrirMetodologia={() => navegar('metodologia')}
        />

        <main
          id="conteudo-principal"
          tabIndex={-1}
          className={pagina === 'visao-geral' ? 'conteudo conteudo--ajustado' : 'conteudo'}
        >
          {pagina === 'visao-geral' && (
            <PaginaVisaoGeral aoNavegar={navegar} />
          )}
          {pagina === 'evolucao-anual' && <PaginaEvolucaoAnual />}
          {pagina === 'municipios' && <PaginaMunicipios />}
          {pagina === 'procedimentos' && <PaginaProcedimentos />}
          {pagina === 'estabelecimentos' && <PaginaEstabelecimentos />}
          {pagina === 'mapa' && <PaginaMapa />}
          {pagina === 'projecoes' && <PaginaProjecoes />}
          {pagina === 'relatorios' && <PaginaRelatorios />}
          {pagina === 'dados-abertos' && <PaginaDadosAbertos />}
          {pagina === 'metodologia' && <PaginaMetodologia />}
          {pagina === 'sobre' && <PaginaSobreProjeto />}
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <DadosProvider>
      <ConteudoAplicacao />
    </DadosProvider>
  );
}

export default App;
