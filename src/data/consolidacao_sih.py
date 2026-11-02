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


# Indicador SP separado do indicador de internações RD.
COLUNAS_OBRIGATORIAS_SP = {
    "SP_NAIH", "SP_PROC_REA", "SP_QT_PROC", "SP_CNES"
}

COLUNAS_RESULTADO_SP = [
    "ano", "mes", "municipio_atendimento", "cnes",
    "procedimento", "quantidade"
]


def consolidar_sp(dados: pd.DataFrame, ano: int, mes: int) -> pd.DataFrame:
    """Conta pares distintos AIH/procedimento cirúrgico/CNES no SP.

    Não representa necessariamente o total de cirurgias individuais.
    O SP registra serviços profissionais, que podem ter múltiplas linhas
    para o mesmo procedimento de uma AIH.
    """
    if not isinstance(dados, pd.DataFrame):
        raise TypeError("Os dados devem ser um DataFrame.")
    if not isinstance(ano, int) or not 2008 <= ano <= 2100:
        raise ValueError("Ano inválido.")
    if not isinstance(mes, int) or not 1 <= mes <= 12:
        raise ValueError("Mês inválido.")

    ausentes = COLUNAS_OBRIGATORIAS_SP - set(dados.columns)
    if ausentes:
        raise ValueError(f"Colunas obrigatórias ausentes: {sorted(ausentes)}")

    colunas = list(COLUNAS_OBRIGATORIAS_SP)
    if "SP_MUN" in dados.columns:
        colunas.append("SP_MUN")
    registros = dados[colunas].copy()

    for coluna in ("SP_NAIH", "SP_PROC_REA", "SP_CNES"):
        registros[coluna] = registros[coluna].astype("string").str.strip().fillna("")

    registros = registros.loc[
        registros["SP_PROC_REA"].str.startswith("04", na=False)
        & registros["SP_NAIH"].ne("")
        & registros["SP_CNES"].ne("")
    ].copy()
    if registros.empty:
        return pd.DataFrame(columns=COLUNAS_RESULTADO_SP)

    registros = registros.drop_duplicates(
        subset=["SP_NAIH", "SP_PROC_REA", "SP_CNES"]
    )
    registros["municipio_atendimento"] = (
        registros["SP_MUN"].astype("string").str.strip().fillna("")
        if "SP_MUN" in registros.columns else ""
    )

    agrupamento = (
        registros.groupby(
            ["municipio_atendimento", "SP_CNES", "SP_PROC_REA"],
            dropna=False
        ).size().reset_index(name="quantidade")
    ).rename(columns={"SP_CNES": "cnes", "SP_PROC_REA": "procedimento"})
    agrupamento.insert(0, "ano", ano)
    agrupamento.insert(1, "mes", mes)
    agrupamento["quantidade"] = agrupamento["quantidade"].astype(int)
    return agrupamento[COLUNAS_RESULTADO_SP]
