# /// script
# dependencies = [
#   "lorem-text",
# ]
# ///

"""Generate mock LLM response JSON of a target character size.

Usage:
  gen-resp.py <size> [openai|anthropic]

Formats:
  openai     OpenAI chat.completion (default; original harness)
  anthropic  Anthropic Messages API (for LiteLLM rust: true /v1/messages)
"""

from lorem_text import lorem
import json
import sys


def content(want: int) -> str:
    return lorem.words(want // 3)[:want]


def openai_resp(want: int) -> dict:
    return {
        "id": "chatcmpl-456",
        "model": "gpt-3.5-turbo",
        "object": "chat.completion",
        "created": 123456,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": content(want),
                },
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 9, "completion_tokens": 12, "total_tokens": 21},
    }


def anthropic_resp(want: int) -> dict:
    # Shape required by LiteLLM's Rust Anthropic Messages bridge (needs `type`).
    return {
        "id": "msg_mock_123",
        "type": "message",
        "role": "assistant",
        "model": "claude-3-5-haiku-20241022",
        "content": [
            {
                "type": "text",
                "text": content(want),
            }
        ],
        "stop_reason": "end_turn",
        "stop_sequence": None,
        "usage": {"input_tokens": 9, "output_tokens": 12},
    }


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: gen-resp.py <size> [openai|anthropic]", file=sys.stderr)
        sys.exit(1)

    want = int(sys.argv[1])
    fmt = (sys.argv[2] if len(sys.argv) > 2 else "openai").lower()

    if fmt in ("openai", "chat", "chat.completion"):
        payload = openai_resp(want)
    elif fmt in ("anthropic", "messages", "claude"):
        payload = anthropic_resp(want)
    else:
        print(f"unknown format: {fmt} (expected openai|anthropic)", file=sys.stderr)
        sys.exit(1)

    print(json.dumps(payload))


if __name__ == "__main__":
    main()
