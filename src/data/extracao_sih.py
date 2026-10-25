from ftplib import FTP
from pathlib import Path


SERVIDOR_DATASUS = "ftp.datasus.gov.br"
DIRETORIO_DATASUS = "/dissemin/publicos/SIHSUS/200801_/Dados"


def extrair_sih(
    ano: int,
    mes: int,
    uf: str = "SC",
    tipo: str = "RD",
    diretorio: str | Path = "data/raw",
) -> Path:
    """
    Baixa um arquivo mensal do SIH/SUS diretamente do DATASUS.

    Tipos:
        RD: AIH reduzida.
        SP: Serviços profissionais.

    Retorna o caminho do arquivo DBC baixado.
    """

    if not isinstance(ano, int) or not 2008 <= ano <= 2100:
        raise ValueError("O ano deve estar entre 2008 e 2100.")

    if not isinstance(mes, int) or not 1 <= mes <= 12:
        raise ValueError("O mês deve estar entre 1 e 12.")

    uf = uf.upper()
    tipo = tipo.upper()

    if len(uf) != 2 or not uf.isalpha():
        raise ValueError("A UF deve conter duas letras.")

    if tipo not in {"RD", "SP"}:
        raise ValueError("O tipo deve ser RD ou SP.")

    nome_arquivo = f"{tipo}{uf}{ano % 100:02d}{mes:02d}.dbc"

    pasta_destino = Path(diretorio)
    pasta_destino.mkdir(parents=True, exist_ok=True)

    destino = pasta_destino / nome_arquivo

    if destino.is_file() and destino.stat().st_size > 0:
        print(f"Arquivo já disponível: {destino}")
        return destino

    print(f"Baixando {nome_arquivo} do DATASUS...")

    arquivo_temporario = destino.with_suffix(".dbc.part")

    try:
        with FTP(SERVIDOR_DATASUS, timeout=120) as ftp:
            ftp.login()
            ftp.cwd(DIRETORIO_DATASUS)

            with arquivo_temporario.open("wb") as arquivo:
                ftp.retrbinary(
                    f"RETR {nome_arquivo}",
                    arquivo.write,
                )

        if arquivo_temporario.stat().st_size == 0:
            raise RuntimeError(
                f"O arquivo {nome_arquivo} foi baixado vazio."
            )

        arquivo_temporario.replace(destino)

    except Exception:
        arquivo_temporario.unlink(missing_ok=True)
        raise

    print(f"Download concluído: {destino}")
    print(f"Tamanho: {destino.stat().st_size:,} bytes")

    return destino


