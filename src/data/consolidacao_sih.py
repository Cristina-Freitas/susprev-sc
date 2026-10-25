
import pandas as pd

from src.data.classificacao_sih import filtrar_cirurgias_eletivas


TIPO_INDICADOR = "internacoes_cirurgicas_eletivas"

COLUNAS_OBRIGATORIAS = {
    "CAR_INT",
    "PROC_REA",
    "MUNIC_MOV",
    "MUNIC_RES",
    "CNES",
}


def consolidar_rd(
    dados: pd.DataFrame,
    ano: int,
    mes: int,
) -> pd.DataFrame:
    """
    Consolida internações cirúrgicas eletivas do SIH/SUS.

    Cada registro RD filtrado representa uma AIH na base
    reduzida, utilizada aqui como indicador de internação.

    Não representa necessariamente a quantidade de
    procedimentos cirúrgicos individuais.
    """

    if not isinstance(dados, pd.DataFrame):
        raise TypeError("Os dados devem ser um DataFrame.")

    if not isinstance(ano, int) or not 2008 <= ano <= 2100:
        raise ValueError("Ano inválido.")

    if not isinstance(mes, int) or not 1 <= mes <= 12:
        raise ValueError("Mês inválido.")

    ausentes = COLUNAS_OBRIGATORIAS - set(dados.columns)

    if ausentes:
        raise ValueError(
            f"Colunas obrigatórias ausentes: {sorted(ausentes)}"
        )

    cirurgias = filtrar_cirurgias_eletivas(dados)

    colunas_resultado = [
        "ano",
        "mes",
        "tipo_indicador",
        "municipio_atendimento",
        "municipio_residencia",
        "cnes",
        "procedimento",
        "quantidade",
    ]

    if cirurgias.empty:
        return pd.DataFrame(columns=colunas_resultado)

    # Mantém códigos como texto, preservando zeros à esquerda.
    colunas_origem = [
        "MUNIC_MOV",
        "MUNIC_RES",
        "CNES",
        "PROC_REA",
    ]

    for coluna in colunas_origem:
        cirurgias[coluna] = (
            cirurgias[coluna]
            .astype("string")
            .str.strip()
            .fillna("")
        )

    agrupamento = (
        cirurgias.groupby(
            colunas_origem,
            dropna=False,
        )
        .size()
        .reset_index(name="quantidade")
    )

    agrupamento = agrupamento.rename(
        columns={
            "MUNIC_MOV": "municipio_atendimento",
            "MUNIC_RES": "municipio_residencia",
            "CNES": "cnes",
            "PROC_REA": "procedimento",
        }
    )

    agrupamento.insert(0, "ano", ano)
    agrupamento.insert(1, "mes", mes)
    agrupamento.insert(2, "tipo_indicador", TIPO_INDICADOR)

    agrupamento["quantidade"] = (
        agrupamento["quantidade"].astype(int)
    )

    return agrupamento[colunas_resultado]
