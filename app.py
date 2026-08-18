import os
import re
import json
import logging
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from groq import Groq

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "super-secret-quiz-key")

# Initialize Groq client
api_key = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=api_key) if api_key else None

if not client:
    logger.warning("GROQ_API_KEY is not defined in environment variables.")


def strip_thinking_tags(text: str) -> str:
    """Remove <think>...</think> reasoning blocks that some models emit."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/quiz')
def quiz():
    return render_template('quiz.html')

@app.route('/results')
def results():
    return render_template('results.html')


@app.route('/generate_quiz', methods=['POST'])
def generate_quiz():
    if not client:
        return jsonify({"error": "Groq API Key is not configured."}), 500

    try:
        data = request.get_json() or {}
        topic = data.get("topic", "").strip()
        num_questions = int(data.get("num_questions", 5))

        if not topic:
            return jsonify({"error": "Topic cannot be empty."}), 400

        if num_questions < 1 or num_questions > 20:
            num_questions = 5

        # Explicit, example-driven prompt so the model follows the schema
        prompt = f"""You are an expert educational quiz generator.

Generate a multiple-choice quiz about: "{topic}"
Number of questions: {num_questions}

STRICT RULES:
1. The "question" field must contain ONLY the question sentence — no options embedded inside it.
2. The "options" field must be a JSON array of exactly 4 FULL answer strings (not just letters like "A", "B").
3. The "answer" field must be copied exactly from one of the 4 options strings.
4. The "clue" field must be a SHORT one-sentence hint that helps the user without revealing the answer directly.
5. The "explanation" field must explain why the correct answer is right.
6. Output ONLY valid JSON. No markdown, no extra text.

Return this exact JSON structure:
{{
  "title": "Short engaging quiz title",
  "questions": [
    {{
      "id": 1,
      "question": "What is the capital of France?",
      "options": ["Berlin", "Madrid", "Paris", "Rome"],
      "answer": "Paris",
      "clue": "This city is famous for the Eiffel Tower.",
      "explanation": "Paris is the capital and largest city of France, situated on the River Seine."
    }}
  ]
}}"""

        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert quiz generator. "
                        "You respond ONLY with valid JSON matching the schema the user provides. "
                        "Never include markdown fences, explanations, or any text outside the JSON object."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            model="openai/gpt-oss-120b",
            response_format={"type": "json_object"},
            temperature=0.6,
        )

        raw = chat_completion.choices[0].message.content
        # Strip any <think>…</think> blocks the model may emit
        cleaned = strip_thinking_tags(raw)
        quiz_data = json.loads(cleaned)

        # Validate top-level keys
        if "title" not in quiz_data or "questions" not in quiz_data:
            raise ValueError("AI returned an invalid quiz structure.")

        # Validate and normalise each question
        for i, q in enumerate(quiz_data["questions"]):
            q["id"] = i + 1
            for key in ("question", "options", "answer", "explanation"):
                if key not in q:
                    raise ValueError(f"Question {i+1} is missing the '{key}' field.")

            # Make sure options are real strings, not single letters
            if all(len(str(o).strip()) <= 1 for o in q["options"]):
                raise ValueError(
                    f"Question {i+1} options appear to be single letters. "
                    "The model did not follow the schema."
                )

            # Ensure the answer is actually in the options list
            if q["answer"] not in q["options"]:
                q["options"].append(q["answer"])

            # Add empty clue if the model skipped it
            if "clue" not in q:
                q["clue"] = "Think carefully about the topic before choosing."

        return jsonify(quiz_data)

    except Exception as e:
        logger.error(f"Error generating quiz: {e}")
        return jsonify({"error": f"Failed to generate quiz: {e}"}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
