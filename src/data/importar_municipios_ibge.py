"""Importa os municípios de Santa Catarina do serviço oficial de localidades do IBGE.

Executar na raiz do projeto:
    python -m src.data.importar_municipios_ibge
"""

import gzip
import json
from urllib.request import Request, urlopen

import pandas as pd

from src.data.banco_sih import criar_tabelas_referencia, importar_referencia

URL_IBGE = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/42/municipios"


def main():
    requisicao = Request(
        URL_IBGE,
        headers={"User-Agent": "SUSPrev-SC/1.0", "Accept-Encoding": "identity"},
    )
    with urlopen(requisicao, timeout=45) as resposta:
        conteudo = resposta.read()

    # Alguns servidores retornam GZIP mesmo sem solicitação de compactação.
    if conteudo.startswith(b"\x1f\x8b"):
        conteudo = gzip.decompress(conteudo)

    municipios = json.loads(conteudo.decode("utf-8-sig"))

    if not isinstance(municipios, list) or len(municipios) != 295:
        raise RuntimeError(
            f"IBGE retornou {len(municipios) if isinstance(municipios, list) else 'formato inesperado'} "
            "municípios; esperado: 295. Importação interrompida."
        )

    registros = []
    codigos = set()
    for municipio in municipios:
        codigo_ibge = str(municipio["id"])
        if len(codigo_ibge) != 7 or not codigo_ibge.startswith("42"):
            raise ValueError(f"Código IBGE inesperado: {codigo_ibge}")
        codigo_sih = codigo_ibge[:6]
        if codigo_sih in codigos:
            raise ValueError(f"Código municipal de 6 dígitos duplicado: {codigo_sih}")
        codigos.add(codigo_sih)
        registros.append({
            "codigo": codigo_sih,
            "nome": municipio["nome"],
            "uf": "SC",
            "regiao_saude": None,
        })

    dados = pd.DataFrame(registros)
    criar_tabelas_referencia()
    quantidade = importar_referencia("municipios", dados)
    print(f"Municípios de Santa Catarina importados: {quantidade}")
    print("Fonte: IBGE — API de Localidades")
    print("Códigos adaptados para 6 dígitos, compatíveis com MUNIC_MOV/MUNIC_RES do SIH.")
    print("Regiões de saúde: ainda não importadas.")


if __name__ == "__main__":
    main()
