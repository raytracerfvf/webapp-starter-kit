def summarize_text(value: str) -> dict[str, int]:
    return {"characters": len(value), "words": len(value.split())}
