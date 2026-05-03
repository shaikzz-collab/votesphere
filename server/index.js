import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import xss from 'xss';
import { db, saveDB } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const port = process.env.PORT || 45678;
const JWT_SECRET = process.env.JWT_SECRET || 'votesphere_super_secret_key_demo';

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false // Disabled for demo/local React SPA compatibility
}));
app.use(cors());
app.use(express.json());

// Rate Limiting for Auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests from this IP, please try again later' }
});

app.use('/api/auth', authLimiter);

// Simple In-Memory Cache
let electionCache = { data: null, timestamp: 0 };
const CACHE_TTL = 60 * 1000; // 60 seconds

// Serve Vite production build
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, state, age, fakeAadhaar } = req.body;
  if (!name || !email || !password || !age) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (age < 18) {
    return res.status(400).json({ error: 'Must be 18 or older to register.' });
  }
  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already registered.' });
  }

  const newUser = {
    id: `user_${Date.now()}`,
    name,
    email,
    password, // In a real app, hash this!
    state,
    age,
    fakeAadhaar
  };
  db.users.push(newUser);
  saveDB();

  const token = jwt.sign({ id: newUser.id, name: newUser.name, email: newUser.email }, JWT_SECRET);
  res.json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email, state: newUser.state } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, state: user.state } });
});

// In-memory OTP store (demo — resets on server restart)
const otpStore = {};

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = db.users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: 'No account found with that email address.' });

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = { otp, expires: Date.now() + 10 * 60 * 1000 }; // valid 10 min

  // In a real app you'd email this. For demo, return it in the response.
  res.json({ success: true, otp, message: 'Reset code generated (demo mode).' });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, otp, newPassword } = req.body;
  const record = otpStore[email];

  if (!record) return res.status(400).json({ error: 'No reset request found. Please request a new code.' });
  if (Date.now() > record.expires) { delete otpStore[email]; return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' }); }
  if (record.otp !== otp) return res.status(400).json({ error: 'Incorrect reset code.' });

  const user = db.users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  user.password = newPassword;
  delete otpStore[email];
  saveDB();

  res.json({ success: true, message: 'Password reset successfully.' });
});

// --- ELECTION ROUTES ---
/**
 * @route GET /api/elections
 * @desc Retrieve all elections (Uses In-Memory TTL Cache for Efficiency)
 */
app.get('/api/elections', (req, res) => {
  if (electionCache.data && (Date.now() - electionCache.timestamp < CACHE_TTL)) {
    return res.json(electionCache.data);
  }
  electionCache = { data: db.elections, timestamp: Date.now() };
  res.json(db.elections);
});

app.get('/api/elections/:id', (req, res) => {
  const election = db.elections.find(e => e.id === req.params.id);
  if (!election) return res.status(404).json({ error: 'Election not found' });
  res.json(election);
});

app.get('/api/elections/:id/candidates', (req, res) => {
  const candidates = db.candidates.filter(c => c.electionId === req.params.id);
  res.json(candidates);
});

// --- VOTING ROUTES ---
app.post('/api/votes', authenticateToken, (req, res) => {
  const { electionId, candidateId } = req.body;
  const userId = req.user.id;

  // Check if user already voted in this election
  const alreadyVoted = db.votes.find(v => v.userId === userId && v.electionId === electionId);
  if (alreadyVoted) {
    return res.status(400).json({ error: 'You have already voted in this election.' });
  }

  // Record vote
  const vote = {
    id: `vote_${Date.now()}`,
    userId,
    electionId,
    candidateId,
    timestamp: new Date().toISOString()
  };
  db.votes.push(vote);

  // Increment candidate vote count
  const candidate = db.candidates.find(c => c.id === candidateId);
  if (candidate) {
    candidate.votes += 1;
  }
  
  saveDB();

  res.json({ success: true, message: 'Vote recorded successfully.' });
});

app.get('/api/users/:userId/votes', authenticateToken, (req, res) => {
  if (req.user.id !== req.params.userId) return res.sendStatus(403);
  const userVotes = db.votes.filter(v => v.userId === req.params.userId);
  res.json(userVotes);
});

// --- COMMENTS ROUTES ---
app.get('/api/elections/:id/comments', (req, res) => {
  const comments = db.comments.filter(c => c.electionId === req.params.id);
  // Sort by newest first
  res.json(comments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
});

app.post('/api/elections/:id/comments', authenticateToken, (req, res) => {
  const { text } = req.body;
  const electionId = req.params.id;
  
  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Comment text is required.' });
  }

  // Prevent Cross-Site Scripting (XSS)
  const sanitizedText = xss(text.trim());

  const comment = {
    id: `comment_${Date.now()}`,
    electionId,
    userId: req.user.id,
    userName: req.user.name,
    text: sanitizedText,
    timestamp: new Date().toISOString()
  };

  db.comments.push(comment);
  saveDB();

  res.json({ success: true, comment });
});

app.delete('/api/comments/:commentId', authenticateToken, (req, res) => {
  const commentIndex = db.comments.findIndex(c => c.id === req.params.commentId);
  if (commentIndex === -1) {
    return res.status(404).json({ error: 'Comment not found.' });
  }

  const comment = db.comments[commentIndex];
  if (comment.userId !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own comments.' });
  }

  db.comments.splice(commentIndex, 1);
  saveDB();

  res.json({ success: true });
});

// --- ASSISTANT ROUTE ---
app.post('/api/assistant', (req, res) => {
  const { message } = req.body;
  const lowerMsg = (message || '').toLowerCase();
  
  let reply = "I'm the VoteSphere built-in assistant! I can help you with voting process, election dates, and general information. How can I help you today?";

  if (lowerMsg.includes('how to vote') || lowerMsg.includes('how do i vote') || lowerMsg.includes('vote process')) {
    reply = "To vote, follow these steps: 1. Ensure you are registered and logged in. 2. Go to the active election page. 3. Review the candidates and their manifestos. 4. Click 'Cast Vote' on your chosen candidate. 5. Confirm your vote. Remember, your vote is secure and final!";
  } else if (lowerMsg.includes('who is winning') || lowerMsg.includes('leaderboard') || lowerMsg.includes('results') || lowerMsg.includes('leading')) {
    reply = "You can view real-time election results on the Leaderboard page from the main navigation. It updates every few seconds as votes come in.";
  } else if (lowerMsg.includes('election') && lowerMsg.includes('date')) {
    reply = "You can find specific election dates on the Dashboard. For example, the Lok Sabha General Elections 2026 are currently active.";
  } else if (lowerMsg.includes('evm') || lowerMsg.includes('electronic voting machine')) {
    reply = "EVM stands for Electronic Voting Machine. In VoteSphere, we use a secure digital equivalent with end-to-end encryption to ensure your vote is accurately recorded and tamper-proof.";
  } else if (lowerMsg.includes('manifesto')) {
    reply = "A manifesto is a published declaration of the intentions, motives, or views of the candidate or party. You can read each candidate's manifesto on the specific election's page before casting your vote.";
  } else if (lowerMsg.includes('hello') || lowerMsg.includes('hi ') || lowerMsg.trim() === 'hi') {
    reply = "Hello! Welcome to VoteSphere. I'm your election assistant. Do you have any questions about the voting process or candidates?";
  }

  // Simulate network delay for a more natural feel
  setTimeout(() => {
    res.json({ reply });
  }, 600);
});

// --- ANALYTICS & LEADERBOARD ---
app.get('/api/leaderboard', (req, res) => {
  // Sort all candidates by votes globally, take top 100
  const sorted = [...db.candidates].sort((a, b) => b.votes - a.votes).slice(0, 100);
  
  // Attach election title for context
  const enriched = sorted.map(c => {
    const election = db.elections.find(e => e.id === c.electionId);
    return { ...c, electionTitle: election?.title || 'Unknown' };
  });

  res.json(enriched);
});

app.get('/api/analytics', (req, res) => {
  // Overall vote distribution across top parties
  const partyVotes = {};
  db.candidates.forEach(c => {
    partyVotes[c.party] = (partyVotes[c.party] || 0) + c.votes;
  });

  const partyPerformance = Object.keys(partyVotes).map(party => ({
    party,
    votes: partyVotes[party]
  })).sort((a, b) => b.votes - a.votes).slice(0, 5); // Top 5 parties

  // Votes per election
  const electionParticipation = db.elections.map(e => {
    const candidates = db.candidates.filter(c => c.electionId === e.id);
    const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
    return { name: e.title, totalVotes };
  });

  res.json({ partyPerformance, electionParticipation });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// SPA fallback — always return index.html for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`VoteSphere API server listening at http://localhost:${port}`);
});
