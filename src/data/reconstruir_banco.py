"""Reconstrói/valida o SQLite SUSPrev SC usando os módulos existentes.

Executar da raiz: python -m src.data.reconstruir_banco
Pré-requisitos: dependências instaladas; conexão DATASUS/IBGE;
ZIPs de regiões de saúde e SIGTAP 202608 em data/raw/referencias/.

Não remove nem sobrescreve o banco; o pipeline ignora competências concluídas.
"""

import argparse
import sqlite3
from pathlib import Path

from src.data.banco_sih import CAMINHO_BANCO, criar_tabelas, criar_tabelas_referencia
from src.data.pipeline_sih import processar_historico

INICIO = (2019, 1)
FIM = (2026, 8)
TOTAL_COMPETENCIAS = 92


def validar_arquivos_referencia() -> None:
    pasta = Path("data/raw/referencias")
    regiao = pasta / "macroregiao_de_saude_csv.zip"
    sigtap = list(pasta.glob("TabelaUnificada_202608*.zip"))
    pendencias = []
    if not regiao.is_file():
        pendencias.append(str(regiao))
    if len(sigtap) != 1:
        pendencias.append(f"exatamente um arquivo {pasta}/TabelaUnificada_202608*.zip")
    if pendencias:
        raise FileNotFoundError(
            "Referências oficiais ainda não estão disponíveis: "
            + "; ".join(pendencias)
            + ". Coloque os ZIPs nesses caminhos antes da reconstrução completa."
        )


def validar_competencias() -> None:
    esperadas = {
        (ano, mes)
        for ano in range(INICIO[0], FIM[0] + 1)
        for mes in range(1, (FIM[1] if ano == FIM[0] else 12) + 1)
    }
    assert len(esperadas) == TOTAL_COMPETENCIAS
    with sqlite3.connect(CAMINHO_BANCO) as conexao:
        rd = set(conexao.execute(
            "SELECT ano, mes FROM competencias_processadas"
        ).fetchall())
        sp = set(conexao.execute(
            "SELECT ano, mes FROM competencias_sp"
        ).fetchall())
        for nome, presentes in (("RD", rd), ("SP", sp)):
            faltantes = sorted(esperadas - presentes)
            if faltantes:
                raise RuntimeError(f"{nome}: {len(faltantes)} competências ausentes: {faltantes}")
        meses_sp = set(conexao.execute(
            "SELECT ano, mes FROM procedimentos_sp GROUP BY ano, mes"
        ).fetchall())
        sem_dados = sorted(esperadas - meses_sp)
        if sem_dados:
            raise RuntimeError(f"SP: competências sem registros consolidados: {sem_dados}")
        total_sp = conexao.execute(
            "SELECT COALESCE(SUM(quantidade), 0) FROM procedimentos_sp "
            "WHERE (ano > 2019 OR (ano = 2019 AND mes >= 1)) "
            "AND (ano < 2026 OR (ano = 2026 AND mes <= 8))"
        ).fetchone()[0]
    print(f"Validação OK: {TOTAL_COMPETENCIAS} competências RD e SP; "
          f"{total_sp:,} procedimentos SP consolidados.")


def reconstruir(incluir_referencias: bool = True) -> None:
    if incluir_referencias:
        validar_arquivos_referencia()  # falhar cedo, antes de downloads longos
    criar_tabelas()
    criar_tabelas_referencia()
    for tipo in ("RD", "SP"):
        resultado = processar_historico(
            ano_inicial=INICIO[0], ano_final=FIM[0], mes_final=FIM[1],
            tipo=tipo, remover_dbc=True,
        )
        if resultado["falhas"]:
            raise RuntimeError(f"Falhas no histórico {tipo}: {resultado['falhas']}")
    validar_competencias()
    if incluir_referencias:
        from src.data.importar_municipios_ibge import main as importar_ibge
        from src.data.importar_regioes_saude import main as importar_regioes
        from src.data.importar_estabelecimentos_cnes import main as importar_cnes
        from src.data.importar_procedimentos_sigtap import main as importar_sigtap
        importar_ibge()
        importar_regioes()
        importar_cnes()
        importar_sigtap()
    print("Reconstrução concluída. Banco:", CAMINHO_BANCO)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--sem-referencias", action="store_true",
        help="Reconstrói e valida RD/SP sem importar IBGE, regiões, CNES e SIGTAP.",
    )
    parser.add_argument(
        "--validar", action="store_true",
        help="Apenas valida as competências existentes; não baixa nem altera dados.",
    )
    args = parser.parse_args()
    if args.validar:
        validar_competencias()
    else:
        reconstruir(incluir_referencias=not args.sem_referencias)


if __name__ == "__main__":
    main()
