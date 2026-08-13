import pytest
from pydantic import ValidationError
from pydantic_settings import SettingsConfigDict

from api_service.config import Settings


class IsolatedSettings(Settings):
    model_config = SettingsConfigDict(env_file=None, extra="ignore")


def load_settings() -> Settings:
    return IsolatedSettings()


def test_local_defaults() -> None:
    settings = load_settings()

    assert settings.environment == "development"
    assert settings.allowed_origins == "http://localhost:3000"


def test_comma_separated_origins_are_normalized(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "ALLOWED_ORIGINS",
        "https://app.example.com/, https://admin.example.com",
    )

    assert load_settings().allowed_origins == ("https://app.example.com,https://admin.example.com")


def test_invalid_origin_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://example.com/path")

    with pytest.raises(ValidationError):
        load_settings()


def test_production_requires_a_non_default_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    with pytest.raises(ValidationError, match="must be replaced in production"):
        load_settings()

    monkeypatch.setenv(
        "PYTHON_SERVICE_SIGNING_SECRET",
        "a-production-only-signing-secret-with-32-characters",
    )
    assert load_settings().environment == "production"
