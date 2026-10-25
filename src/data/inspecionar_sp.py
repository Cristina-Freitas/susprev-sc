from pathlib import Path

from src.data.conversao_sih import converter_dbc


def main():
    arquivo = Path("data/raw/SPSC2401.dbc")

    print("Convertendo SP — Santa Catarina, janeiro/2024...")

    dados = converter_dbc(arquivo)

    print("\n=== RESUMO DO ARQUIVO ===")
    print(f"Total de registros: {len(dados):,}")
    print(f"Total de colunas: {len(dados.columns)}")

    print("\n=== COLUNAS DISPONÍVEIS ===")
    for coluna in dados.columns:
        print(coluna)

    print("\n=== CAMPOS RELACIONADOS A PROCEDIMENTOS ===")

    palavras_chave = (
        "PROC",
        "QTD",
        "QT_",
        "CNES",
        "MUNIC",
        "AIH",
        "COMP",
        "SEQ",
    )

    colunas_relevantes = [
        coluna
        for coluna in dados.columns
        if any(
            palavra in coluna.upper()
            for palavra in palavras_chave
        )
    ]

    if colunas_relevantes:
        print(dados[colunas_relevantes].head(10).to_string(index=False))
    else:
        print("Nenhuma coluna correspondente encontrada.")


if __name__ == "__main__":
    main()
