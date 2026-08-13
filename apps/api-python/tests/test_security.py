import time

from fastapi.testclient import TestClient

from api_service.config import get_settings
from api_service.main import app
from api_service.security import signature_for

client = TestClient(app)
body = b'{"text":"hello world"}'


def signed_headers(timestamp: int | None = None, body_value: bytes = body) -> dict[str, str]:
    value = str(timestamp or int(time.time()))
    return {
        "content-type": "application/json",
        "x-timestamp": value,
        "x-signature": signature_for(
            get_settings().python_service_signing_secret, value, body_value
        ),
    }


def test_unsigned_request_is_rejected() -> None:
    response = client.post("/v1/analyze", content=body)
    assert response.status_code == 401
    payload = response.json()
    assert payload["data"] is None
    assert payload["error"] == {"code": "HTTP_401", "message": "Missing signature"}


def test_bad_signature_is_rejected() -> None:
    headers = signed_headers()
    headers["x-signature"] = "bad"
    assert client.post("/v1/analyze", content=body, headers=headers).status_code == 401


def test_expired_signature_is_rejected() -> None:
    response = client.post(
        "/v1/analyze",
        content=body,
        headers=signed_headers(int(time.time()) - 301),
    )
    assert response.status_code == 401


def test_valid_signature_is_accepted() -> None:
    response = client.post("/v1/analyze", content=body, headers=signed_headers())
    assert response.status_code == 200
    assert response.json()["data"] == {"characters": 11, "words": 2}
