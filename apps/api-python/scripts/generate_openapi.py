import json
from pathlib import Path

from api_service.main import app

Path("openapi.json").write_text(json.dumps(app.openapi(), indent=2) + "\n")
