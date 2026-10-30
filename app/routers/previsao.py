from fastapi import APIRouter, HTTPException, Request

from app.schemas.previsao import PrevisaoEntrada, PrevisaoSaida


router = APIRouter(tags=["Previsões"])


@router.post(
    "/predict",
    response_model=PrevisaoSaida,
    summary="Projetar procedimentos cirúrgicos de 2026",
)
def prever_procedimentos(
    entrada: PrevisaoEntrada,
    request: Request,
) -> PrevisaoSaida:
    """Retorna os valores observados e a projeção anual."""

    servico = getattr(
        request.app.state,
        "servico_previsao",
        None,
    )

    if servico is None:
        raise HTTPException(
            status_code=503,
            detail="Serviço de previsão indisponível.",
        )

    try:
        resultado = servico.prever_ano(entrada.ano)

    except ValueError as erro:
        raise HTTPException(
            status_code=400,
            detail=str(erro),
        ) from erro

    except FileNotFoundError as erro:
        raise HTTPException(
            status_code=503,
            detail="Banco de dados indisponível.",
        ) from erro

    return PrevisaoSaida.model_validate(resultado)
