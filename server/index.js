const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'careeriq-demo-secret';

const users = [];
const resumes = [];
const analyses = [];
const roadmaps = [];
const chats = [];

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

const getNextId = (items) => {
  const maxId = items.reduce((max, item) => Math.max(max, Number(item.id || 0)), 0);
  return String(maxId + 1);
};

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

const demoUser = {
  id: '1',
  name: 'Demo User',
  email: 'demo@careeriq.ai',
  role: 'user',
  passwordHash: bcrypt.hashSync('demo123', 10),
};

users.push(demoUser);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'CareerIQ backend is active.' });
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

    const existing = users.find((user) => user.email.toLowerCase() === String(email).toLowerCase());
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      id: getNextId(users),
      name: sanitizeText(name),
      email: sanitizeText(email).toLowerCase(),
      passwordHash,
      role: email.toLowerCase().includes('admin') ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    const token = createToken(newUser);

    return res.status(201).json({
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
      token,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Registration failed.', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = users.find((candidate) => candidate.email.toLowerCase() === String(email).toLowerCase());

    if (!user) {
      if (String(email).toLowerCase() === 'demo@careeriq.ai' && password === 'demo123') {
        const token = createToken(demoUser);
        return res.json({ user: { id: demoUser.id, name: demoUser.name, email: demoUser.email, role: demoUser.role }, token });
      }
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = createToken(user);
    return res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed.', error: error.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const currentUser = users.find((user) => user.id === String(req.user.id));
  if (!currentUser) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.json({
    user: { id: currentUser.id, name: currentUser.name, email: currentUser.email, role: currentUser.role },
  });
});

app.get('/api/dashboard/overview', authMiddleware, (req, res) => {
  const summary = buildDemoAnalysis();
  const overview = {
    latestAtsScore: summary.atsScore.overall,
    resumeQualityScore: 91,
    placementReadiness: summary.placementReadiness.overall,
    totalResumesAnalyzed: 5,
    bestMatchingJobRole: 'Full Stack Developer',
    skillImprovementProgress: 72,
    ATSScoreHistory: [72, 74, 79, 81, 88],
    recentResumes: [
      { name: 'Resume_v3.pdf', score: 88, date: 'Today' },
      { name: 'Resume_v2.pdf', score: 81, date: '2 days ago' },
      { name: 'Resume_v1.pdf', score: 76, date: '1 week ago' },
    ],
    recommendations: summary.atsScore.recommendations,
  };

  res.json(overview);
});

app.get('/api/dashboard/insights', authMiddleware, (req, res) => {
  const summary = buildDemoAnalysis();
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

app.get('/api/resumes', authMiddleware, (req, res) => {
  const userResumes = resumes.filter((resume) => resume.userId === req.user.id);
  res.json({ resumes: userResumes.length ? userResumes : [
    { id: '1', name: 'Resume_v3.pdf', status: 'Analyzed', uploadedAt: '2026-11-11', score: 88 },
    { id: '2', name: 'Resume_v2.docx', status: 'Draft', uploadedAt: '2026-10-15', score: 81 },
  ] });
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
    const entry = {
      id: getNextId(resumes),
      userId: String(req.user.id),
      fileName: file.originalname,
      fileType: ext,
      extractedText: safeText(extractedText),
      uploadedAt: new Date().toISOString(),
      analysis,
    };

    resumes.push(entry);
    analyses.push({ ...entry, userId: entry.userId });

    return res.json({
      message: 'Resume analyzed successfully.',
      analysis,
      resume: { id: entry.id, fileName: entry.fileName, fileType: entry.fileType },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Resume processing failed.' });
  }
});

app.get('/api/roadmap', authMiddleware, (req, res) => {
  const summary = buildDemoAnalysis();
  res.json({ roadmap: summary.roadmap });
});

app.post('/api/roadmap/update', authMiddleware, (req, res) => {
  const { targetRole, completedTasks = [], progress = 0 } = req.body || {};
  const summary = buildDemoAnalysis();
  const roadmapRecord = {
    userId: String(req.user.id),
    targetRole: targetRole || summary.roadmap.targetRole,
    milestones: summary.roadmap.milestones,
    completedTasks,
    progress,
    updatedAt: new Date().toISOString(),
  };
  roadmaps.push(roadmapRecord);
  res.json({ roadmap: roadmapRecord });
});

app.post('/api/chat/mentor', authMiddleware, (req, res) => {
  const { message } = req.body || {};
  const summary = buildDemoAnalysis();
  const lower = String(message || '').toLowerCase();
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

  const session = {
    userId: String(req.user.id),
    role: 'assistant',
    text: reply,
    context: summary.summary,
    createdAt: new Date().toISOString(),
  };
  chats.push(session);

  res.json({ reply, suggestedQuestions: summary.mentorSuggestions });
});

app.get('/api/admin/summary', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access is required.' });
  }

  res.json({
    totalUsers: users.length,
    totalResumesProcessed: analyses.length,
    analysisUsage: 128,
    popularRoles: ['Full Stack Developer', 'Frontend Developer', 'Data Analyst'],
    trends: [42, 56, 64, 68, 72, 81],
  });
});

app.listen(PORT, () => {
  console.log(`CareerIQ API running on http://localhost:${PORT}`);
});
