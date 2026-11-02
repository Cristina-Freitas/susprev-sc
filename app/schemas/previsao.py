from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class PrevisaoEntrada(BaseModel):
    """Solicitação de projeção anual."""

    model_config = ConfigDict(extra="forbid")

    ano: Literal[2026] = Field(
        default=2026,
        description="Ano para projeção do fechamento anual",
    )


class PrevisaoMensal(BaseModel):
    """Quantidade mensal observada ou prevista."""

    ano: int
    mes: int = Field(ge=1, le=12)
    quantidade: int = Field(ge=0)
    tipo: Literal["observado", "previsto"]


class PrevisaoSaida(BaseModel):
    """Resultado da projeção anual de procedimentos."""

    ano: int
    ultima_competencia_observada: str
    modelo: str
    total_observado: int = Field(ge=0)
    total_previsto: int = Field(ge=0)
    total_anual_projetado: int = Field(ge=0)
    meses: list[PrevisaoMensal]

