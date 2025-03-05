from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
CORS(app)

# Configure SQLAlchemy to use SQLite (a simple file-based database)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///quizlogs.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Define a model to store quiz logs
class QuizLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.String(50))
    time_spent = db.Column(db.Integer)  # time in milliseconds
    timestamp = db.Column(db.Integer)   # epoch time when quiz ended
    questions = db.Column(db.JSON)      # store list of questions as JSON

    def __init__(self, quiz_id, time_spent, timestamp, questions):
        self.quiz_id = quiz_id
        self.time_spent = time_spent
        self.timestamp = timestamp
        self.questions = questions

# Route to receive quiz log data from your extension
@app.route('/api/quiz-logs', methods=['POST'])
def receive_quiz_logs():
    data = request.get_json()
    try:
        quiz_log = QuizLog(
            quiz_id=data.get('quizId'),
            time_spent=data.get('timeSpent'),
            timestamp=data.get('timestamp'),
            questions=data.get('questions')
        )
        db.session.add(quiz_log)
        db.session.commit()
        print("Saved quiz data:", quiz_log.__dict__)
        return jsonify({"message": "Quiz data saved successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print("Error saving quiz data:", str(e))
        return jsonify({"error": str(e)}), 500

# (Optional) Route to view all saved quiz logs
@app.route('/api/quiz-logs', methods=['GET'])
def get_quiz_logs():
    logs = QuizLog.query.all()
    output = []
    for log in logs:
        output.append({
            "quizId": log.quiz_id,
            "timeSpent": log.time_spent,
            "timestamp": log.timestamp,
            "questions": log.questions
        })
    return jsonify(output), 200

@app.route('/api/schedule', methods=['GET'])
def generate_schedule():
    """
    Example endpoint to generate a naive schedule or insights based on quiz data.
    In a real scenario, you'd integrate ML or more complex logic.
    """
    try:
        # 1. Fetch all quiz logs
        logs = QuizLog.query.all()

        # 2. Simple example: compute average timeSpent across all quizzes
        if not logs:
            return jsonify({
                "message": "No quiz logs found",
                "schedule": []
            }), 200

        total_time = 0
        for log in logs:
            total_time += log.time_spent if log.time_spent else 0
        avg_time = total_time / len(logs)

        # 3. Return a naive "schedule" (e.g., placeholder data)
        # In a real system, you'd figure out which assignments/quizzes are upcoming
        # and how to distribute the user’s study time.
        schedule = [
            {
                "assignmentId": "assignment1",
                "estimatedTime": avg_time,  # naive guess
                "dueDate": "2025-03-15T12:00:00Z"
            },
            {
                "assignmentId": "assignment2",
                "estimatedTime": avg_time * 1.2,  # add 20% for a "harder" assignment
                "dueDate": "2025-03-20T12:00:00Z"
            }
        ]

        return jsonify({
            "message": "Schedule generated",
            "averageTimeSpent": avg_time,
            "schedule": schedule
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    # Create tables within the Flask app context
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=True)
