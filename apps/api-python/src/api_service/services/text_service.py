from ..lib.text import summarize_text


def analyze_text(value: str) -> dict[str, int]:
    return summarize_text(value)
