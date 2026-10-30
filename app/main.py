from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routers.previsao import router as previsao_router
from app.services.previsao import ServicoPrevisao


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Carrega o modelo uma única vez na inicialização."""
    app.state.servico_previsao = ServicoPrevisao()

    yield

    app.state.servico_previsao = None


app = FastAPI(
    title="SUSPrev SC",
    description=(
        "API de análise preditiva dos procedimentos "
        "cirúrgicos eletivos do SUS em Santa Catarina."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health", tags=["Monitoramento"])
def verificar_saude():
    """Verifica se o serviço de previsão está disponível."""
    return {
        "status": "ok",
        "modelo_carregado": app.state.servico_previsao is not None,
    }


app.include_router(previsao_router)
