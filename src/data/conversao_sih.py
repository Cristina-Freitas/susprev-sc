
from pathlib import Path
from tempfile import TemporaryDirectory
from shutil import copy2

import pandas as pd
from dbfread import DBF
from pyreaddbc import dbc2dbf


def converter_dbc(caminho: str | Path) -> pd.DataFrame:
    """Converte DBC para DataFrame usando caminhos temporários sem acentos."""

    caminho = Path(caminho)

    if not caminho.is_file():
        raise FileNotFoundError(f"Arquivo DBC não encontrado: {caminho}")

    with TemporaryDirectory(prefix="susprev_") as pasta:
        pasta_temp = Path(pasta)

        # Evita problemas com acentos no caminho original do Windows.
        dbc_temporario = pasta_temp / "entrada.dbc"
        dbf_temporario = pasta_temp / "saida.dbf"

        copy2(caminho, dbc_temporario)

        dbc2dbf(str(dbc_temporario), str(dbf_temporario))

        if not dbf_temporario.is_file():
            raise RuntimeError(
                "A conversão DBC para DBF falhou. "
                "Verifique o caminho e a integridade do arquivo."
            )

        tabela = DBF(
            str(dbf_temporario),
            encoding="latin1",
            char_decode_errors="ignore",
        )

        dados = pd.DataFrame(iter(tabela))

    return dados

