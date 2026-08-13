from pydantic import BaseModel


class ErrorBody(BaseModel):
    code: str
    message: str


class Envelope[T](BaseModel):
    data: T | None = None
    error: ErrorBody | None = None


# Error responses declare this concrete shape (error required, never data) so
# the generated TS client types non-2xx bodies honestly.
class ErrorEnvelope(BaseModel):
    data: None = None
    error: ErrorBody
