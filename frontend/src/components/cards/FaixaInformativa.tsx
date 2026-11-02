import { BarChart3, FileText, Target, Users, type LucideIcon } from 'lucide-react';
import type { IdPagina } from '../../hooks/useRotaHash';

interface Item {
  id: IdPagina;
  icone: LucideIcon;
  cor: 'azul' | 'verde';
  titulo: string;
  texto: string;
}

const ITENS: Item[] = [
  {
    id: 'evolucao-anual',
    icone: BarChart3,
    cor: 'azul',
    titulo: 'Acompanhamento da produção',
    texto: 'Monitora a realização das cirurgias eletivas e mostra a evolução ao longo dos anos.',
  },
  {
    id: 'municipios',
    icone: Target,
    cor: 'verde',
    titulo: 'Planejamento de recursos',
    texto: 'Apoia gestores na leitura da produção por município e por procedimento.',
  },
  {
    id: 'metodologia',
    icone: Users,
    cor: 'azul',
    titulo: 'Transparência para a população',
    texto: 'Mostra que procedimentos estão sendo realizados e facilita o acompanhamento dos resultados.',
  },
  {
    id: 'relatorios',
    icone: FileText,
    cor: 'azul',
    titulo: 'Relatórios e dados abertos',
    texto: 'Gere relatórios e planilhas para análise detalhada.',
  },
];

/** Faixa inferior do mockup; cada item leva à seção correspondente. */
export function FaixaInformativa({ aoNavegar }: { aoNavegar: (pagina: IdPagina) => void }) {
  return (
    <nav className="faixa" aria-label="Atalhos para outras seções">
      {ITENS.map(({ id, icone: Icone, cor, titulo, texto }) => (
        <a
          key={titulo}
          href={`#/${id}`}
          className="faixa__item"
          onClick={(e) => {
            e.preventDefault();
            aoNavegar(id);
          }}
        >
          <span className={`faixa__icone faixa__icone--${cor}`} aria-hidden="true">
            <Icone size={22} />
          </span>
          <span className="faixa__texto">
            <strong>{titulo}</strong>
            <span>{texto}</span>
          </span>
        </a>
      ))}
    </nav>
  );
}
