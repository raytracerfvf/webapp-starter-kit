from fastapi.testclient import TestClient

from api_service.main import app


def test_health_is_unsigned() -> None:
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
