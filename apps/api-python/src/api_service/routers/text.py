from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..services.text_service import analyze_text
from ..utils.responses import Envelope, ErrorEnvelope

router = APIRouter(prefix="/v1", tags=["text"])


class AnalyzeTextRequest(BaseModel):
    text: str = Field(max_length=20_000)


# 401 (signature) and 500 bodies come from the global handlers as ErrorEnvelope;
# 422 keeps FastAPI's auto-documented HTTPValidationError shape.
@router.post(
    "/analyze",
    response_model=Envelope[dict[str, int]],
    responses={401: {"model": ErrorEnvelope}, 500: {"model": ErrorEnvelope}},
)
async def analyze(request: AnalyzeTextRequest) -> Envelope[dict[str, int]]:
    return Envelope(data=analyze_text(request.text))
