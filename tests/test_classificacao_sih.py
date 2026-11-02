
import pandas as pd

from src.data.classificacao_sih import filtrar_cirurgias_eletivas


def test_filtrar_cirurgias_eletivas():
    dados = pd.DataFrame({
        "CAR_INT": ["01", "02", "01", "01", "02"],
        "PROC_REA": [
            "0401010015",
            "0401010015",
            "0301010010",
            "0402010010",
            "0301010010",
        ],
    })

    resultado = filtrar_cirurgias_eletivas(dados)

    assert len(resultado) == 2
    assert resultado["CAR_INT"].eq("01").all()
    assert resultado["PROC_REA"].str.startswith("04").all()
