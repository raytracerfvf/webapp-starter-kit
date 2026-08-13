from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .logging import logger
from .routers import health, text
from .security import require_signature
from .utils.responses import ErrorBody, ErrorEnvelope


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None]:
    logger.info("python_service_started")
    yield
    logger.info("python_service_stopped")


async def http_error(_: Request, error: Exception) -> JSONResponse:
    if not isinstance(error, HTTPException):
        return await unexpected_error(_, error)
    envelope = ErrorEnvelope(
        error=ErrorBody(code=f"HTTP_{error.status_code}", message=str(error.detail))
    )
    return JSONResponse(status_code=error.status_code, content=envelope.model_dump())


async def unexpected_error(_: Request, error: Exception) -> JSONResponse:
    logger.exception("unhandled_error", error=error)
    envelope = ErrorEnvelope(
        error=ErrorBody(code="INTERNAL_ERROR", message="An unexpected error occurred")
    )
    return JSONResponse(status_code=500, content=envelope.model_dump())


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Webapp Starter Kit Python Service", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in settings.allowed_origins.split(",")],
        allow_credentials=False,
        allow_methods=["POST"],
        allow_headers=["content-type", "x-signature", "x-timestamp"],
    )
    app.include_router(health.router)
    app.include_router(text.router, dependencies=[Depends(require_signature)])
    app.add_exception_handler(HTTPException, http_error)
    app.add_exception_handler(Exception, unexpected_error)

    return app


app = create_app()
