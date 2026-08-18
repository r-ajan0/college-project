from groq import Groq
import os
import json
from dotenv import load_dotenv
load_dotenv()

client = Groq(api_key=os.environ.get('GROQ_API_KEY'))

topic = "Quantum Mechanics"
num_questions = 5

prompt = f"""
You are a highly educational AI Quiz Generator.
Generate a quiz on the topic: "{topic}".
The quiz must contain exactly {num_questions} multiple-choice questions.

Ensure that the quiz is interesting, accurate, and educational.
Each question option must be unique, and the options should be well-structured.
Provide a concise, helpful explanation explaining why the correct choice is indeed correct for each question.

You MUST respond in JSON format matching the schema below:
{{
  "title": "A short, engaging title for this quiz",
  "questions": [
    {{
      "id": 1,
      "question": "The question text, clear and concise.",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A", 
      "explanation": "This is a detailed explanation of why Option A is correct."
    }}
  ]
}}
Note: The 'answer' field must exactly match one of the items inside the 'options' array.
"""

try:
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        model="allam-2-7b",
        response_format={"type": "json_object"},
        temperature=0.7,
    )
    print("Response:")
    print(chat_completion.choices[0].message.content)
except Exception as e:
    import traceback
    traceback.print_exc()
