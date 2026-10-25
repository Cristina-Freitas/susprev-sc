
import pandas as pd


def filtrar_cirurgias_eletivas(dados: pd.DataFrame) -> pd.DataFrame:
    """
    Filtra internações eletivas com procedimentos do grupo cirúrgico.

    CAR_INT = '01'  -> Internação eletiva
    PROC_REA = '04' -> Grupo de procedimentos cirúrgicos
    """

    colunas_obrigatorias = {"CAR_INT", "PROC_REA"}

    colunas_ausentes = colunas_obrigatorias - set(dados.columns)

    if colunas_ausentes:
        raise ValueError(
            f"Colunas obrigatórias ausentes: {sorted(colunas_ausentes)}"
        )

    carater = dados["CAR_INT"].astype("string").str.strip()
    procedimento = dados["PROC_REA"].astype("string").str.strip()

    filtro = (
        carater.eq("01")
        & procedimento.str.startswith("04", na=False)
    )

    return dados.loc[filtro.fillna(False)].copy()
