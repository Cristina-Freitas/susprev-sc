from src.data.banco_sih import consultar_procedimentos_mensais
from datetime import date
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


CAMINHO_MODELO = (
    Path(__file__).resolve().parents[2]
    / "models"
    / "susprev_sp.joblib"
)


class ServicoPrevisao:
    """Serviço de inferência dos procedimentos cirúrgicos."""

    def __init__(self, caminho_modelo: Path = CAMINHO_MODELO):
        artefato = joblib.load(caminho_modelo)

        self.modelo = artefato["modelo"]
        self.atributos = artefato["atributos"]
        self.historico = list(artefato["historico_quantidade"])
        self.ultima_competencia = pd.Timestamp(
            artefato["ultima_competencia"]
        )
        self.horizonte_meses = artefato["horizonte_meses"]

        if self.horizonte_meses != 1:
            raise ValueError(
                "O modelo deve ter horizonte de um mês."
            )

        if len(self.historico) < 12:
            raise ValueError(
                "Histórico insuficiente para gerar os atributos."
            )

    def _criar_atributos(
        self,
        historico: list[int],
        competencia: date,
    ) -> pd.DataFrame:
        """Cria os atributos na ordem esperada pelo modelo."""

        mes = competencia.month

        valores = {
            "lag_1": historico[-1],
            "lag_2": historico[-2],
            "lag_3": historico[-3],
            "lag_6": historico[-6],
            "lag_12": historico[-12],
            "media_3": float(np.mean(historico[-3:])),
            "mes_sin": float(
                np.sin(2 * np.pi * mes / 12)
            ),
            "mes_cos": float(
                np.cos(2 * np.pi * mes / 12)
            ),
        }

        return pd.DataFrame(
            [valores],
            columns=self.atributos,
        )

    def prever_meses_restantes(
        self,
        ano: int = 2026,
    ) -> list[dict]:
        """Projeta os meses posteriores à última competência."""

        if ano != 2026:
            raise ValueError(
                "A projeção anual está disponível para 2026."
            )

        historico = self.historico.copy()
        previsoes = []

        competencia = (
            self.ultima_competencia
            + pd.DateOffset(months=1)
        )

        while competencia.year == ano:
            atributos = self._criar_atributos(
                historico,
                competencia.date(),
            )

            resultado = float(
                self.modelo.predict(atributos)[0]
            )

            quantidade = max(0, round(resultado))

            previsoes.append(
                {
                    "ano": competencia.year,
                    "mes": competencia.month,
                    "quantidade": quantidade,
                    "tipo": "previsto",
                }
            )

            historico.append(quantidade)
            competencia += pd.DateOffset(months=1)

        return previsoes

    
    def prever_ano(self, ano: int = 2026) -> dict:
        """Combina dados observados e previstos para o ano."""

        if ano != 2026:
            raise ValueError(
                "A projeção anual está disponível apenas para 2026."
            )

        observados = consultar_procedimentos_mensais(ano)

        # O histórico observado deve terminar em agosto de 2026.
        meses_observados = {
            registro["mes"] for registro in observados
        }

        if meses_observados != set(range(1, 9)):
            raise ValueError(
                "O banco deve conter os meses de janeiro "
                "a agosto de 2026, sem competências ausentes."
            )

        previsoes = self.prever_meses_restantes(ano)

        total_observado = sum(
            int(registro["quantidade"])
            for registro in observados
        )

        total_previsto = sum(
            int(registro["quantidade"])
            for registro in previsoes
        )

        return {
            "ano": ano,
            "ultima_competencia_observada": (
                self.ultima_competencia.strftime("%Y-%m")
            ),
            "modelo": "XGBoost",
            "total_observado": total_observado,
            "total_previsto": total_previsto,
            "total_anual_projetado": (
                total_observado + total_previsto
            ),
            "meses": observados + previsoes,
        }

