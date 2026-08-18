from groq import Groq
import os, json
from dotenv import load_dotenv
load_dotenv()

client = Groq(api_key=os.environ['GROQ_API_KEY'])
r = client.chat.completions.create(
    messages=[
        {'role': 'system', 'content': 'Respond ONLY with valid JSON. No markdown, no extra text.'},
        {'role': 'user', 'content': 'Return a JSON object with a key "status" set to "ok" and key "model" set to "working".'}
    ],
    model='openai/gpt-oss-120b',
    response_format={'type': 'json_object'},
    temperature=0.3
)
result = json.loads(r.choices[0].message.content)
print('SUCCESS:', result)
