from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

LOCAL_SIGNING_SECRET = "local-python-service-secret-change-me-now"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../../.env", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"
    python_service_signing_secret: str = Field(default=LOCAL_SIGNING_SECRET, min_length=32)
    allowed_origins: str = "http://localhost:3000"

    @field_validator("python_service_signing_secret")
    @classmethod
    def validate_signing_secret(cls, secret: str) -> str:
        if secret != secret.strip():
            raise ValueError("must not have surrounding whitespace")
        return secret

    @field_validator("allowed_origins")
    @classmethod
    def validate_allowed_origins(cls, value: str) -> str:
        origins = [origin.strip() for origin in value.split(",") if origin.strip()]
        if not origins:
            raise ValueError("at least one origin is required")
        normalized: list[str] = []
        for origin in origins:
            parsed = urlsplit(origin)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.hostname
                or parsed.username
                or parsed.password
                or parsed.path not in {"", "/"}
                or parsed.query
                or parsed.fragment
            ):
                raise ValueError("origins must be HTTP(S) origins without credentials or paths")
            _ = parsed.port
            normalized.append(f"{parsed.scheme}://{parsed.netloc}")
        return ",".join(normalized)

    @model_validator(mode="after")
    def require_production_secret(self) -> "Settings":
        if (
            self.environment == "production"
            and self.python_service_signing_secret == LOCAL_SIGNING_SECRET
        ):
            raise ValueError("PYTHON_SERVICE_SIGNING_SECRET must be replaced in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
