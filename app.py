import os
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
        return jsonify({"error": "Groq API Key is not configured. Please check your environment variables."}), 500
        
    try:
        data = request.get_json() or {}
        topic = data.get("topic", "").strip()
        num_questions = int(data.get("num_questions", 5))
        
        if not topic:
            return jsonify({"error": "Topic cannot be empty. Please enter a valid topic."}), 400
            
        if num_questions < 1 or num_questions > 20:
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
        
        # Call Groq API using JSON mode
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        
        response_content = chat_completion.choices[0].message.content
        quiz_data = json.loads(response_content)
        
        # Basic validation of the response structure
        if "title" not in quiz_data or "questions" not in quiz_data:
            raise ValueError("Invalid quiz format returned by AI.")
            
        # Standardize questions ID and verify shapes
        for index, q in enumerate(quiz_data["questions"]):
            q["id"] = index + 1
            if "options" not in q or "answer" not in q or "question" not in q or "explanation" not in q:
                raise ValueError("Incomplete question object returned by AI.")
            if q["answer"] not in q["options"]:
                # Ensure the correct answer is indeed in options
                q["options"].append(q["answer"])
                    
        return jsonify(quiz_data)
        
    except Exception as e:
        logger.error(f"Error generating quiz: {str(e)}")
        return jsonify({"error": f"Failed to generate quiz: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
