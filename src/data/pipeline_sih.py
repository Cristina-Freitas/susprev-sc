from pathlib import Path
import gc

from src.data.extracao_sih import extrair_sih
from src.data.conversao_sih import converter_dbc
from src.data.consolidacao_sih import (
    TIPO_INDICADOR,
    consolidar_rd,
)
from src.data.banco_sih import (
    CAMINHO_BANCO,
    criar_tabelas,
    competencia_processada,
    salvar_producao,
)


def processar_competencia(
    ano: int,
    mes: int,
    caminho_banco: str | Path = CAMINHO_BANCO,
    diretorio_raw: str | Path = "data/raw",
    forcar: bool = False,
    remover_dbc: bool = False,
) -> dict:
    """Processa e consolida uma competência RD do SIH/SUS."""

    criar_tabelas(caminho_banco)

    if not forcar and competencia_processada(
        ano, mes, TIPO_INDICADOR, caminho=caminho_banco
    ):
        print(f"{ano}-{mes:02d}: já processada. Ignorando.")
        return {
            "ano": ano,
            "mes": mes,
            "status": "ignorada",
        }

    print(f"\n=== Processando {ano}-{mes:02d} ===", flush=True)

    caminho_dbc = extrair_sih(
        ano=ano,
        mes=mes,
        uf="SC",
        tipo="RD",
        diretorio=diretorio_raw,
    )

    dados_rd = converter_dbc(caminho_dbc)
    total_registros = len(dados_rd)

    consolidado = consolidar_rd(dados_rd, ano, mes)
    total_eletivas = int(consolidado["quantidade"].sum())
    total_grupos = len(consolidado)

    salvar_producao(
        dados=consolidado,
        ano=ano,
        mes=mes,
        tipo_indicador=TIPO_INDICADOR,
        caminho=caminho_banco,
    )

    del dados_rd, consolidado
    gc.collect()

    if remover_dbc:
        Path(caminho_dbc).unlink(missing_ok=True)

    print(
        f"{ano}-{mes:02d}: "
        f"{total_registros:,} registros RD | "
        f"{total_eletivas:,} internações eletivas | "
        f"{total_grupos:,} grupos consolidados",
        flush=True,
    )

    return {
        "ano": ano,
        "mes": mes,
        "status": "processada",
        "registros_rd": total_registros,
        "internacoes_cirurgicas_eletivas": total_eletivas,
        "grupos_consolidados": total_grupos,
    }


def processar_historico(
    ano_inicial: int = 2019,
    ano_final: int = 2026,
):
    """Processa o histórico RD, uma competência por vez."""

    total_processadas = 0
    total_ignoradas = 0
    falhas = []

    for ano in range(ano_inicial, ano_final + 1):
        for mes in range(1, 13):
            try:
                resultado = processar_competencia(
                    ano=ano,
                    mes=mes,
                    remover_dbc=True,
                )

                if resultado["status"] == "processada":
                    total_processadas += 1
                else:
                    total_ignoradas += 1

            except Exception as erro:
                print(
                    f"ERRO em {ano}-{mes:02d}: {erro}",
                    flush=True,
                )
                falhas.append(f"{ano}-{mes:02d}")

    print("\n=== RESUMO DO PROCESSAMENTO ===")
    print(f"Competências processadas: {total_processadas}")
    print(f"Competências já existentes: {total_ignoradas}")
    print(f"Falhas: {len(falhas)}")

    if falhas:
        print("Competências com falha:", ", ".join(falhas))


if __name__ == "__main__":
    processar_historico()

