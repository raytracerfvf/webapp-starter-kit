import hashlib
import hmac
import time
from typing import Annotated

from fastapi import Header, HTTPException, Request, status

from .config import get_settings

REPLAY_WINDOW_SECONDS = 300


def signature_for(secret: str, timestamp: str, body: bytes) -> str:
    payload = timestamp.encode() + b"." + body
    return hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


async def require_signature(
    request: Request,
    x_signature: Annotated[str | None, Header()] = None,
    x_timestamp: Annotated[str | None, Header()] = None,
) -> None:
    if not x_signature or not x_timestamp:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing signature")
    try:
        request_time = int(x_timestamp)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid timestamp",
        ) from error
    if abs(int(time.time()) - request_time) > REPLAY_WINDOW_SECONDS:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired signature")
    expected = signature_for(
        get_settings().python_service_signing_secret,
        x_timestamp,
        await request.body(),
    )
    if not hmac.compare_digest(expected, x_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")
