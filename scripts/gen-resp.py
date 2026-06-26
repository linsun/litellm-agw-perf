# /// script
# dependencies = [
#   "lorem-text",
# ]
# ///

from lorem_text import lorem
import json
import sys

want = int(sys.argv[1])

print(
    json.dumps(
        {
            "id": "chatcmpl-456",
            "model": "gpt-3.5-turbo",
            "object": "chat.completion",
            "created": 123456,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": lorem.words(want // 3)[:want],
                    },
                    "finish_reason": "stop",
                }
            ],
            "usage": {"prompt_tokens": 9, "completion_tokens": 12, "total_tokens": 21},
        }
    )
)
