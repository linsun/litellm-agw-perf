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
            "model": "openai/gpt-3.5-turbo",
            "messages": [{"role": "user", "content": lorem.words(want // 3)[:want]}],
        }
    )
)
