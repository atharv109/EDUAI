const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // Added for MongoDB

const app = express();

// Enable CORS so requests from Canvas or your extension are allowed
app.use(cors());

// Parse incoming JSON bodies
app.use(express.json());

// Connect to MongoDB (for local development)
mongoose.connect('mongodb://mittalatharv5:<db_password>@undefined/?replicaSet=atlas-iojhsh-shard-0&ssl=true&authSource=admin', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB!'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define a Mongoose schema for quiz logs
const quizLogSchema = new mongoose.Schema({
  quizId: String,
  timeSpent: Number,
  timestamp: Number,
  questions: [{
    questionId: String,
    questionText: String,
    answerValue: String
  }]
});

// Create a model from the schema
const QuizLog = mongoose.model('QuizLog', quizLogSchema);

// Route for receiving quiz log data from the Chrome extension
app.post('/api/quiz-logs', async (req, res) => {
  try {
    const quizData = req.body; // Contains quizId, timeSpent, timestamp, questions, etc.
    
    // Create a new document using the QuizLog model
    const newLog = new QuizLog(quizData);
    await newLog.save(); // Save the document to MongoDB

    console.log('Saved quiz data:', newLog);
    return res.status(200).json({ message: 'Quiz data saved successfully' });
  } catch (err) {
    console.error('Error saving quiz data:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * New Route: Fetch Assignments from Canvas
 * Expects query parameters:
 *  - courseId: the Canvas course ID
 *  - accessToken: the Canvas API access token
 */
app.get('/api/canvas/assignments', async (req, res) => {
  const { courseId, accessToken } = req.query;
  if (!courseId || !accessToken) {
    return res.status(400).json({ error: 'Missing courseId or accessToken' });
  }
  try {
    const url = `https://psu.instructure.com/api/v1/courses/${courseId}/assignments?access_token=${accessToken}`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Error fetching assignments from Canvas' });
    }
    const assignments = await response.json();
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * New Route: Fetch Quizzes from Canvas
 * Expects query parameters: courseId and accessToken.
 */
app.get('/api/canvas/quizzes', async (req, res) => {
  const { courseId, accessToken } = req.query;
  if (!courseId || !accessToken) {
    return res.status(400).json({ error: 'Missing courseId or accessToken' });
  }
  try {
    const url = `https://psu.instructure.com/api/v1/courses/${courseId}/quizzes?access_token=${accessToken}`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Error fetching quizzes from Canvas' });
    }
    const quizzes = await response.json();
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * New Route: Fetch Grades/Submissions from Canvas
 * Expects query parameters: courseId and accessToken.
 * This example uses the endpoint for student submissions.
 */
app.get('/api/canvas/grades', async (req, res) => {
  const { courseId, accessToken } = req.query;
  if (!courseId || !accessToken) {
    return res.status(400).json({ error: 'Missing courseId or accessToken' });
  }
  try {
    const url = `https://psu.instructure.com/api/v1/courses/${courseId}/students/submissions?access_token=${accessToken}`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Error fetching grades from Canvas' });
    }
    const grades = await response.json();
    res.json(grades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the server on port 3000 (or use process.env.PORT for production)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
