# /// script
# dependencies = [
#   "lorem-text",
# ]
# ///

"""Generate mock LLM request JSON of a target character size.

Usage:
  gen-req.py <size> [openai|anthropic]

Formats:
  openai     OpenAI chat.completions request (default; original harness)
  anthropic  Anthropic Messages API request (for LiteLLM rust: true /v1/messages)
"""

from lorem_text import lorem
import json
import sys


def content(want: int) -> str:
    return lorem.words(want // 3)[:want]


def openai_req(want: int) -> dict:
    return {
        "model": "openai/gpt-3.5-turbo",
        "messages": [{"role": "user", "content": content(want)}],
    }


def anthropic_req(want: int) -> dict:
    return {
        "model": "claude-mock",
        "max_tokens": 128,
        "messages": [{"role": "user", "content": content(want)}],
    }


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: gen-req.py <size> [openai|anthropic]", file=sys.stderr)
        sys.exit(1)

    want = int(sys.argv[1])
    fmt = (sys.argv[2] if len(sys.argv) > 2 else "openai").lower()

    if fmt in ("openai", "chat", "chat.completion"):
        payload = openai_req(want)
    elif fmt in ("anthropic", "messages", "claude"):
        payload = anthropic_req(want)
    else:
        print(f"unknown format: {fmt} (expected openai|anthropic)", file=sys.stderr)
        sys.exit(1)

    print(json.dumps(payload))


if __name__ == "__main__":
    main()
