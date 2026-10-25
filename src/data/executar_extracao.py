
from ftplib import FTP
from pathlib import Path


def main():
    servidor = "ftp.datasus.gov.br"
    pasta_remota = "/dissemin/publicos/SIHSUS/200801_/Dados"
    nome_arquivo = "SPSC2401.dbc"

    destino = Path("data/raw") / nome_arquivo
    destino.parent.mkdir(parents=True, exist_ok=True)

    if destino.is_file() and destino.stat().st_size > 0:
        print(f"Arquivo já disponível: {destino}")
        return

    print(f"Baixando {nome_arquivo} do DATASUS...")

    with FTP(servidor, timeout=120) as ftp:
        ftp.login()
        ftp.cwd(pasta_remota)

        with destino.open("wb") as arquivo:
            ftp.retrbinary(
                f"RETR {nome_arquivo}",
                arquivo.write,
            )

    print(f"Download concluído: {destino}")
    print(f"Tamanho: {destino.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()

