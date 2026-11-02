import {
  BarChart3,
  BookOpenText,
  Building2,
  ClipboardList,
  Cpu,
  Database,
  FileText,
  Info,
  LayoutDashboard,
  Map as IconeMapa,
  MapPinned,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { IdPagina } from '../../hooks/useRotaHash';
import { Logo, LogoSUS } from '../ui/Logo';

export interface ItemMenu {
  id: IdPagina;
  rotulo: string;
  icone: LucideIcon;
}

/** Mesma ordem do mockup, com "Metodologia" mantida antes de "Sobre o Projeto". */
export const ITENS_MENU: ItemMenu[] = [
  { id: 'visao-geral', rotulo: 'Visão Geral', icone: LayoutDashboard },
  { id: 'evolucao-anual', rotulo: 'Evolução', icone: BarChart3 },
  { id: 'procedimentos', rotulo: 'Procedimentos', icone: ClipboardList },
  { id: 'municipios', rotulo: 'Municípios', icone: MapPinned },
  { id: 'estabelecimentos', rotulo: 'Estabelecimentos', icone: Building2 },
  { id: 'mapa', rotulo: 'Mapa de SC', icone: IconeMapa },
  { id: 'projecoes', rotulo: 'Projeções (IA)', icone: Cpu },
  { id: 'relatorios', rotulo: 'Relatórios', icone: FileText },
  { id: 'dados-abertos', rotulo: 'Dados Abertos', icone: Database },
  { id: 'metodologia', rotulo: 'Metodologia', icone: BookOpenText },
  { id: 'sobre', rotulo: 'Sobre o Projeto', icone: Info },
];

interface MenuLateralProps {
  paginaAtual: IdPagina;
  aoNavegar: (pagina: IdPagina) => void;
  aberto: boolean;
  aoFechar: () => void;
}

export function MenuLateral({ paginaAtual, aoNavegar, aberto, aoFechar }: MenuLateralProps) {
  return (
    <aside id="menu-principal" className={`menu${aberto ? ' menu--aberto' : ''}`} aria-label="Menu principal">
      <div className="menu__marca">
        <Logo className="menu__logo" />
        <button type="button" className="menu__fechar" onClick={aoFechar} aria-label="Fechar menu">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <nav className="menu__nav" aria-label="Seções do painel">
        <ul className="menu__lista">
          {ITENS_MENU.map(({ id, rotulo, icone: Icone }) => (
            <li key={id}>
              <a
                id={`menu-${id}`}
                href={`#/${id}`}
                className="menu__item"
                aria-current={paginaAtual === id ? 'page' : undefined}
                title={rotulo}
                onClick={(evento) => {
                  evento.preventDefault();
                  aoNavegar(id);
                }}
              >
                <Icone size={19} aria-hidden="true" />
                <span className="menu__item-texto">{rotulo}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="menu__rodape">
        <LogoSUS className="menu__sus" />
        <hr />
        <strong>Santa Catarina</strong>
        <ul>
          <li>Transparência</li>
          <li>Planejamento</li>
          <li>Acesso à Saúde</li>
        </ul>
      </div>
    </aside>
  );
}
