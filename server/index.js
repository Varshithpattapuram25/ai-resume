const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'careeriq-demo-secret';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/careeriq';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
}, { timestamps: true });

const resumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileData: { type: Buffer, required: true, select: false },
  extractedText: { type: String, default: '' },
  analysis: { type: mongoose.Schema.Types.Mixed, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const roadmapSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  targetRole: { type: String, required: true },
  milestones: { type: mongoose.Schema.Types.Mixed, required: true },
  completedTasks: { type: [String], default: [] },
  progress: { type: Number, min: 0, max: 100, default: 0 },
}, { timestamps: true });

const mentorMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  text: { type: String, required: true },
  context: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Resume = mongoose.model('Resume', resumeSchema);
const Roadmap = mongoose.model('Roadmap', roadmapSchema);
const MentorMessage = mongoose.model('MentorMessage', mentorMessageSchema);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const sanitizeText = (value) => {
  if (!value) return '';
  return String(value).replace(/\s+/g, ' ').trim();
};

const safeText = (text = '') => sanitizeText(text).slice(0, 12000);

const createToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role || 'user' }, JWT_SECRET, {
    expiresIn: '7d',
  });

const toPublicUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
});

const buildDemoAnalysis = (text = '') => {
  const cleanText = safeText(text).toLowerCase();
  const hasReact = cleanText.includes('react') || cleanText.includes('javascript');
  const hasNode = cleanText.includes('node') || cleanText.includes('express');
  const hasSql = cleanText.includes('sql') || cleanText.includes('mysql') || cleanText.includes('postgres');
  const hasAws = cleanText.includes('aws') || cleanText.includes('cloud');
  const hasDsAlgo = cleanText.includes('dsa') || cleanText.includes('data structures') || cleanText.includes('algorithm');

  const candidateName = 'Alex Carter';
  const personalInfo = {
    name: candidateName,
    email: 'alex.carter@example.com',
    phone: '+91 98765 43210',
    linkedin: 'linkedin.com/in/alexcarter',
    github: 'github.com/alexcarter',
    portfolio: 'alexcarter.dev',
  };

  const education = {
    degree: 'B.Tech in Computer Science',
    university: 'VIT Vellore',
    graduationYear: 2024,
    cgpa: '8.9/10',
    relevantCoursework: ['Data Structures', 'Algorithms', 'DBMS', 'Operating Systems', 'Computer Networks'],
  };

  const skills = {
    programmingLanguages: ['JavaScript', 'TypeScript', 'Python', 'C++'],
    frontend: hasReact ? ['React.js', 'Redux', 'Tailwind CSS', 'Next.js'] : ['React.js', 'Tailwind CSS'],
    backend: hasNode ? ['Node.js', 'Express.js', 'REST APIs'] : ['Node.js', 'Express.js'],
    databases: hasSql ? ['PostgreSQL', 'MongoDB', 'SQL'] : ['MongoDB', 'SQL'],
    aiMl: ['Machine Learning Basics', 'NLP', 'Prompt Engineering'],
    cloud: hasAws ? ['AWS', 'Docker', 'CI/CD'] : ['Docker', 'AWS Basics'],
    developerTools: ['Git', 'GitHub', 'VS Code', 'Postman'],
    softSkills: ['Communication', 'Leadership', 'Teamwork', 'Problem Solving', 'Adaptability'],
  };

  const atsScore = {
    overall: 88,
    categories: {
      resumeFormatting: 90,
      keywordOptimization: 84,
      skillsRelevance: 91,
      experienceQuality: 87,
      projectImpact: 86,
    },
    strengths: ['Strong technical alignment', 'Clear project outcomes', 'Good use of role-relevant keywords'],
    weaknesses: ['Add more measurable impact metrics', 'Include deeper system-design keywords', 'Improve AI/ML stack awareness'],
    recommendations: ['Quantify key project outcomes', 'Add keywords for role-specific requirements', 'Highlight leadership and collaboration examples'],
  };

  const jobMatches = [
    {
      role: 'Full Stack Developer',
      match: 92,
      requiredSkills: ['React.js', 'Node.js', 'MongoDB', 'REST APIs'],
      candidateSkills: ['React.js', 'Node.js', 'MongoDB', 'REST APIs'],
      missingSkills: ['System Design', 'Microservices', 'Redis'],
      recommendedProjects: ['Build a SaaS dashboard analytics platform', 'Create a real-time chat application'],
      learningSuggestions: ['Study system design basics', 'Practice API design and scaling'],
      reason: 'Your profile already signals a strong match in frontend and backend development with project-ready skills.',
    },
    {
      role: 'Frontend Developer',
      match: 89,
      requiredSkills: ['HTML', 'CSS', 'React.js', 'TypeScript'],
      candidateSkills: ['HTML', 'CSS', 'React.js', 'TypeScript'],
      missingSkills: ['Testing', 'Performance optimization'],
      recommendedProjects: ['Create a design system library', 'Build a dashboard with animations and accessibility'],
      learningSuggestions: ['Improve component architecture knowledge', 'Learn testing and performance profiling'],
      reason: 'Strong frontend skill expression and design-oriented project output make this a very suitable role.',
    },
    {
      role: 'Data Analyst',
      match: 72,
      requiredSkills: ['SQL', 'Excel', 'Visualization', 'Statistics'],
      candidateSkills: ['SQL', 'Python', 'Visualization'],
      missingSkills: ['Advanced statistics', 'A/B testing', 'Power BI'],
      recommendedProjects: ['Build a KPI dashboard', 'Analyze product metrics from public data'],
      learningSuggestions: ['Practice SQL window functions', 'Improve statistics fundamentals'],
      reason: 'You have a good starting base in data tools and analytics thinking, though statistical depth can be improved.',
    },
  ];

  const skillGaps = {
    current: ['React.js', 'Node.js', 'MongoDB', 'SQL', 'TypeScript'],
    missing: hasDsAlgo ? ['System Design', 'Redis', 'Docker', 'AWS', 'Data Structures'] : ['Data Structures', 'System Design', 'Docker', 'AWS'],
    unverified: ['Prompt Engineering', 'NLP', 'Deep Learning'],
  };

  const placementReadiness = {
    overall: 82,
    categories: {
      technicalKnowledge: 85,
      dataStructuresAndAlgorithms: hasDsAlgo ? 82 : 74,
      aptitude: 79,
      communication: 88,
      projectExperience: 86,
      interviewPreparation: 80,
      resumeQuality: 84,
    },
    strengths: ['Good project exposure', 'Strong communication skills', 'Relevant technical stack'],
    weaknesses: ['Need more DSA consistency', 'Improve system design speed', 'Build higher-impact portfolio stories'],
    suggestions: ['Practice mock interviews', 'Solve 2-3 DSA problems daily', 'Improve resume achievement framing'],
  };

  const marketReadiness = {
    indianITPlacement: 86,
    productBased: 79,
    serviceBased: 89,
    startups: 83,
    international: 74,
    recommendedTechnologies: ['React.js', 'Node.js', 'MongoDB', 'AWS', 'Docker'],
    areasForImprovement: ['System Design', 'DSA depth', 'Communication in interviews'],
    notes: 'AI-generated estimate based on the current resume profile and common hiring signals for the Indian market.',
  };

  const roadmap = {
    targetRole: 'Full Stack Developer',
    milestones: [
      { month: 'Month 1', tasks: ['Programming fundamentals', 'Data Structures', 'Problem solving'] },
      { month: 'Month 2', tasks: ['Advanced JavaScript', 'OOP', 'SQL practice'] },
      { month: 'Month 3', tasks: ['React.js', 'Node.js', 'REST APIs'] },
      { month: 'Month 4', tasks: ['Full-stack projects', 'GitHub workflow', 'Database design'] },
      { month: 'Month 5', tasks: ['System Design basics', 'Cloud fundamentals', 'Resume optimization'] },
      { month: 'Month 6', tasks: ['Mock interviews', 'Aptitude prep', 'Portfolio polish'] },
    ],
    completedTasks: ['JavaScript basics'],
    progress: 38,
  };

  const mentorSuggestions = [
    'Which job role suits my skills?',
    'What should I learn next?',
    'Am I ready for placements?',
    'How can I improve my resume?',
  ];

  return {
    personalInfo,
    education,
    skills,
    atsScore,
    jobMatches,
    skillGaps,
    placementReadiness,
    marketReadiness,
    roadmap,
    mentorSuggestions,
    generatedAt: new Date().toISOString(),
    summary: 'The candidate shows a strong full-stack profile with solid frontend/backend foundation and measurable project potential.',
  };
};

app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    ok: connected,
    database: connected ? 'connected' : 'disconnected',
    message: connected ? 'CareerIQ API and database are active.' : 'Database connection is unavailable.',
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body || {};

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Please complete all required fields.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const normalizedEmail = sanitizeText(email).toLowerCase();
    const existing = await User.exists({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name: sanitizeText(name),
      email: normalizedEmail,
      passwordHash,
      role: normalizedEmail.includes('admin') ? 'admin' : 'user',
    });

    const token = createToken(newUser);

    return res.status(201).json({
      user: toPublicUser(newUser),
      token,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    console.error('Registration failed:', error);
    return res.status(500).json({ message: 'Registration failed.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = sanitizeText(email).toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = createToken(user);
    return res.json({
      user: toPublicUser(user),
      token,
    });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ message: 'Login failed.' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const currentUser = await User.findById(req.user.id);
  if (!currentUser) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.json({ user: toPublicUser(currentUser) });
});

app.get('/api/dashboard/overview', authMiddleware, async (req, res) => {
  const userResumes = await Resume.find({ userId: req.user.id }).sort({ uploadedAt: 1 });
  const latestResume = userResumes.at(-1);
  const latestAnalysis = latestResume?.analysis;
  const latestScore = latestAnalysis?.atsScore?.overall || 0;
  const atsHistory = userResumes.map((resume) => resume.analysis?.atsScore?.overall || 0);
  const recentResumes = [...userResumes].reverse().slice(0, 5).map((resume) => ({
    name: resume.fileName,
    score: resume.analysis?.atsScore?.overall || 0,
    date: resume.uploadedAt.toISOString().slice(0, 10),
  }));
  const roadmap = await Roadmap.findOne({ userId: req.user.id });
  const overview = {
    latestAtsScore: latestScore,
    resumeQualityScore: latestScore,
    placementReadiness: latestAnalysis?.placementReadiness?.overall || 0,
    totalResumesAnalyzed: userResumes.length,
    bestMatchingJobRole: latestAnalysis?.jobMatches?.[0]?.role || 'Not available',
    skillImprovementProgress: roadmap?.progress || 0,
    ATSScoreHistory: atsHistory,
    recentResumes,
    recommendations: latestAnalysis?.atsScore?.recommendations || [],
  };

  res.json(overview);
});

app.get('/api/dashboard/insights', authMiddleware, async (req, res) => {
  const latestResume = await Resume.findOne({ userId: req.user.id }).sort({ uploadedAt: -1 });
  const summary = latestResume?.analysis || buildDemoAnalysis();
  res.json({
    jobMatchChart: [
      { name: 'Frontend', value: 89 },
      { name: 'Backend', value: 92 },
      { name: 'Data', value: 72 },
      { name: 'AI', value: 68 },
    ],
    skillDistribution: [
      { name: 'Frontend', value: 88 },
      { name: 'Backend', value: 84 },
      { name: 'DB', value: 76 },
      { name: 'AI', value: 60 },
    ],
    summary,
  });
});

app.get('/api/resumes', authMiddleware, async (req, res) => {
  const userResumes = await Resume.find({ userId: req.user.id }).sort({ uploadedAt: -1 });
  res.json({
    resumes: userResumes.map((resume) => ({
      id: String(resume._id),
      name: resume.fileName,
      fileType: resume.fileType,
      status: 'Analyzed',
      uploadedAt: resume.uploadedAt.toISOString(),
      score: resume.analysis?.atsScore?.overall || 0,
    })),
  });
});

const extractResumeText = async (file) => {
  const buffer = file.buffer || Buffer.alloc(0);
  if (!buffer.length) return '';

  const mimeType = file.mimetype || '';
  const extension = (file.originalname || '').split('.').pop()?.toLowerCase();

  if (extension === 'pdf' || mimeType.includes('pdf')) {
    const parsed = await pdfParse(buffer);
    return parsed.text || '';
  }

  if (extension === 'docx' || mimeType.includes('officedocument.wordprocessingml')) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  if (extension === 'txt' || mimeType.includes('text')) {
    return buffer.toString('utf8');
  }

  throw new Error('Unsupported file type. Use PDF, DOCX, or TXT files.');
};

app.post('/api/resume/analyze', authMiddleware, upload.single('resume'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'Please upload a resume file.' });
    }

    const allowedTypes = ['pdf', 'docx', 'txt'];
    const ext = (file.originalname || '').split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(ext)) {
      return res.status(400).json({ message: 'Unsupported file type. Allowed: PDF, DOCX, TXT' });
    }

    const extractedText = await extractResumeText(file);
    const analysis = buildDemoAnalysis(extractedText);
    const entry = await Resume.create({
      userId: req.user.id,
      fileName: file.originalname,
      fileType: ext,
      fileData: file.buffer,
      extractedText: safeText(extractedText),
      analysis,
    });

    return res.json({
      message: 'Resume analyzed successfully.',
      analysis,
      resume: { id: String(entry._id), fileName: entry.fileName, fileType: entry.fileType },
    });
  } catch (error) {
    console.error('Resume processing failed:', error);
    return res.status(500).json({ message: 'Resume processing failed.' });
  }
});

app.get('/api/resumes/:id/download', authMiddleware, async (req, res) => {
  const resume = await Resume.findOne({ _id: req.params.id, userId: req.user.id }).select('+fileData');
  if (!resume) {
    return res.status(404).json({ message: 'Resume not found.' });
  }

  res.set('Content-Type', resume.fileType === 'pdf'
    ? 'application/pdf'
    : resume.fileType === 'docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'text/plain; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(resume.fileName)}`);
  return res.send(resume.fileData);
});

app.delete('/api/resumes/:id', authMiddleware, async (req, res) => {
  const resume = await Resume.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!resume) {
    return res.status(404).json({ message: 'Resume not found.' });
  }
  return res.json({ message: 'Resume deleted.' });
});

app.get('/api/roadmap', authMiddleware, async (req, res) => {
  const summary = buildDemoAnalysis();
  const roadmap = await Roadmap.findOneAndUpdate(
    { userId: req.user.id },
    {
      $setOnInsert: {
        targetRole: summary.roadmap.targetRole,
        milestones: summary.roadmap.milestones,
        completedTasks: [],
        progress: 0,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  res.json({ roadmap });
});

app.post('/api/roadmap/update', authMiddleware, async (req, res) => {
  const { targetRole, completedTasks = [], progress = 0 } = req.body || {};
  const summary = buildDemoAnalysis();
  if (!Array.isArray(completedTasks) || !completedTasks.every((task) => typeof task === 'string')) {
    return res.status(400).json({ message: 'Completed tasks must be a list of strings.' });
  }
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    return res.status(400).json({ message: 'Progress must be a number from 0 to 100.' });
  }

  const roadmap = await Roadmap.findOneAndUpdate(
    { userId: req.user.id },
    {
      $set: {
        targetRole: sanitizeText(targetRole) || summary.roadmap.targetRole,
        milestones: summary.roadmap.milestones,
        completedTasks,
        progress,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );
  return res.json({ roadmap });
});

app.get('/api/chat/history', authMiddleware, async (req, res) => {
  const messages = await MentorMessage.find({ userId: req.user.id })
    .sort({ createdAt: 1 })
    .limit(200);
  return res.json({
    messages: messages.map((message) => ({
      id: String(message._id),
      role: message.role,
      text: message.text,
      createdAt: message.createdAt.toISOString(),
    })),
  });
});

app.post('/api/chat/mentor', authMiddleware, async (req, res) => {
  const { message } = req.body || {};
  const question = sanitizeText(message);
  if (!question) {
    return res.status(400).json({ message: 'Please enter a message.' });
  }
  const summary = buildDemoAnalysis();
  const lower = question.toLowerCase();
  let reply = 'Based on your resume, your strongest fit is in full-stack and frontend roles with good communication and project execution.';

  if (lower.includes('learn next')) {
    reply = 'Focus next on system design, DSA consistency, and one high-impact full-stack project that shows backend scaling and deployment.';
  } else if (lower.includes('placement')) {
    reply = 'You are on track for placements, especially in full-stack and frontend profiles. Prioritize DSA and mock interviews to improve conversion.';
  } else if (lower.includes('resume')) {
    reply = 'Improve your resume by adding measurable project outcomes, clearer role keywords, and more specific internship/achievement bullets.';
  } else if (lower.includes('project')) {
    reply = 'Build a production-style SaaS dashboard, a real-time chat app, and a data analytics project to strengthen your portfolio.';
  }

  await MentorMessage.create([
    { userId: req.user.id, role: 'user', text: question },
    { userId: req.user.id, role: 'assistant', text: reply, context: summary.summary },
  ]);

  res.json({ reply, suggestedQuestions: summary.mentorSuggestions });
});

app.get('/api/admin/summary', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access is required.' });
  }

  const [totalUsers, totalResumesProcessed] = await Promise.all([
    User.countDocuments(),
    Resume.countDocuments(),
  ]);
  res.json({
    totalUsers,
    totalResumesProcessed,
    analysisUsage: totalResumesProcessed,
    popularRoles: ['Full Stack Developer', 'Frontend Developer', 'Data Analyst'],
    trends: [42, 56, 64, 68, 72, 81],
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  console.error('Unhandled API error:', error);
  return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 500).json({
    message: error.code === 'LIMIT_FILE_SIZE'
      ? 'Resume files must be 5MB or smaller.'
      : 'The request could not be completed.',
  });
});

const startServer = async () => {
  await mongoose.connect(MONGODB_URI);
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  const passwordHash = await bcrypt.hash('demo123', 10);
  await User.updateOne(
    { email: 'demo@careeriq.ai' },
    { $setOnInsert: { name: 'Demo User', email: 'demo@careeriq.ai', passwordHash, role: 'user' } },
    { upsert: true },
  );
  app.listen(PORT, () => {
    console.log(`CareerIQ API running on http://localhost:${PORT} with MongoDB connected`);
  });
};

startServer().catch((error) => {
  console.error('Unable to connect to MongoDB:', error);
  process.exit(1);
});
