import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import axios from 'axios'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BarChart3,
  BrainCircuit,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  FileText,
  Gauge,
  LayoutDashboard,
  LogOut,
  MoonStar,
  MoveRight,
  Search,
  Settings,
  SunMedium,
  Target,
  Upload,
  UserRound,
  Wand2,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'

const features = [
  { title: 'AI Resume Analysis', description: 'Unlock actionable insights from your resume, skills, and experience.', icon: Wand2 },
  { title: 'ATS Score Checker', description: 'Measure your resume’s compatibility with modern hiring systems.', icon: Gauge },
  { title: 'Job Role Matching', description: 'Find roles that align with your profile and growth trajectory.', icon: Target },
  { title: 'Skill Gap Detection', description: 'Spot missing strengths and prioritized learning paths.', icon: Search },
  { title: 'Career Roadmap', description: 'Turn your profile into a measurable six-month preparation plan.', icon: CheckCircle2 },
  { title: 'Placement Readiness', description: 'See how ready you are for interviews and recruiter screens.', icon: Briefcase },
  { title: 'Market Demand Insights', description: 'Get employer-market-aware suggestions and role fit guidance.', icon: BarChart3 },
  { title: 'AI Career Mentor', description: 'Ask role-specific questions and improve each stage of your job search.', icon: BrainCircuit },
]

const processSteps = [
  { title: 'Upload your resume', description: 'Choose a PDF, DOCX, or TXT file and tell CareerIQ what kind of role you are targeting.' },
  { title: 'Get a clear analysis', description: 'Review a sample-based ATS score, role matches, strengths, and the skills to focus on next.' },
  { title: 'Build your next-step plan', description: 'Use your personalized roadmap to prepare for interviews and strengthen your profile.' },
]

const dashboardItems = [
  { label: 'Overview', path: 'overview', icon: LayoutDashboard },
  { label: 'Resume Analyzer', path: 'resume-analyzer', icon: Upload },
  { label: 'My Resumes', path: 'my-resumes', icon: FileText },
  { label: 'ATS Score', path: 'ats-score', icon: Gauge },
  { label: 'Job Matches', path: 'job-matches', icon: Briefcase },
  { label: 'Skills Analysis', path: 'skills-analysis', icon: Search },
  { label: 'Career Roadmap', path: 'career-roadmap', icon: Target },
  { label: 'Placement Preparation', path: 'placement-preparation', icon: CheckCircle2 },
  { label: 'AI Career Mentor', path: 'mentor', icon: BrainCircuit },
  { label: 'Settings', path: 'settings', icon: Settings },
]

const sampleScenario = {
  latestAtsScore: 88,
  resumeQualityScore: 91,
  placementReadiness: 82,
  totalResumesAnalyzed: 5,
  bestMatchingJobRole: 'Full Stack Developer',
  skillImprovementProgress: 72,
  atsHistory: [72, 74, 79, 81, 88],
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
  recentResumes: [
    { name: 'Resume_v3.pdf', score: 88, date: 'Today' },
    { name: 'Resume_v2.docx', score: 81, date: '2 days ago' },
    { name: 'Resume_v1.pdf', score: 76, date: '1 week ago' },
  ],
  strengths: ['Strong project outcomes', 'Good relevant tools', 'Clear technical signal'],
  weaknesses: ['Need more DSA depth', 'System design practice', 'Add metrics to portfolio'],
  roadmap: [
    { month: 'Month 1', tasks: ['Programming fundamentals', 'Data Structures', 'Problem Solving'] },
    { month: 'Month 2', tasks: ['Advanced JavaScript', 'OOP', 'SQL practice'] },
    { month: 'Month 3', tasks: ['React.js', 'Node.js', 'REST APIs'] },
    { month: 'Month 4', tasks: ['Full-stack projects', 'GitHub workflow', 'Database design'] },
    { month: 'Month 5', tasks: ['System Design basics', 'Cloud fundamentals', 'Resume optimization'] },
    { month: 'Month 6', tasks: ['Mock interviews', 'Aptitude prep', 'Portfolio polish'] },
  ],
  mentorSuggestions: ['Which job role suits my skills?', 'What should I learn next?', 'Am I ready for placements?', 'How can I improve my resume?'],
}

type User = {
  id: string
  name: string
  email: string
  role: string
}

type ResumeItem = {
  id: string
  name: string
  status: string
  uploadedAt: string
  score: number
}

const getStoredUser = () => {
  const raw = localStorage.getItem('careeriq-user')
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const getStoredToken = () => localStorage.getItem('careeriq-token') || ''

async function apiRequest<T>(path: string, method: 'GET' | 'POST' = 'GET', body?: Record<string, unknown> | FormData, token?: string): Promise<T> {
  const headers: Record<string, string> = {}
  const isFormData = body instanceof FormData

  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await axios({
    url: `${API_BASE}${path}`,
    method,
    data: body,
    headers,
  })

  return response.data as T
}

function App() {
  const [user, setUser] = useState<User | null>(getStoredUser())
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    document.body.classList.toggle('light-theme', theme === 'light')
  }, [theme])

  return (
    <BrowserRouter>
      <div className={`app-shell ${theme}`}>
        <Routes>
          <Route path="/" element={<LandingPage theme={theme} setTheme={setTheme} user={user} />} />
          <Route path="/login" element={<AuthPage mode="login" setUser={setUser} theme={theme} setTheme={setTheme} />} />
          <Route path="/register" element={<AuthPage mode="register" setUser={setUser} theme={theme} setTheme={setTheme} />} />
          <Route path="/dashboard/*" element={<ProtectedRoute user={user}><DashboardPage user={user} theme={theme} setTheme={setTheme} setUser={setUser} /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute user={user}><AdminPage user={user} theme={theme} setTheme={setTheme} setUser={setUser} /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

function ProtectedRoute({ user, children }: { user: User | null; children: ReactNode }) {
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function LandingPage({ theme, setTheme, user }: { theme: 'light' | 'dark'; setTheme: (value: 'light' | 'dark') => void; user: User | null }) {
  const navigate = useNavigate()

  return (
    <div className="page-bg min-h-screen text-slate-100">
      <header className="nav-shell">
        <div className="container mx-auto flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3 font-semibold text-lg">
            <div className="nav-logo">C</div>
            <span>CareerIQ</span>
          </div>

          <nav aria-label="Main navigation" className="landing-nav hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#home">Home</a>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#about">About</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              className="icon-button"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? <MoonStar size={16} /> : <SunMedium size={16} />}
            </button>
            {user ? (
              <button className="primary-button landing-dashboard" onClick={() => navigate('/dashboard/overview')}>Open dashboard</button>
            ) : (
              <>
                <button className="secondary-button landing-login" onClick={() => navigate('/login')}>Log in</button>
                <button className="primary-button landing-signup" onClick={() => navigate('/register')}>Get started</button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="home">
        <section className="landing-hero container mx-auto grid items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
          <motion.div className="hero-copy" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="badge"><Wand2 size={14} /> Career clarity, powered by AI</span>
            <h1 className="hero-title mt-6">Make your next career move <span>with confidence.</span></h1>
            <p className="hero-description mt-6 max-w-xl text-lg text-slate-300">
              Turn your resume into a practical plan. See how your skills line up with real roles, what to improve, and where to focus next.
            </p>
            <div className="hero-actions mt-8 flex flex-wrap gap-4">
              <button className="primary-button" onClick={() => navigate('/register')}>Analyze my resume <ChevronRight size={17} /></button>
              <a className="secondary-button" href="#how-it-works">See how it works</a>
            </div>
            <p className="hero-note mt-4 text-sm text-slate-400">Start with a PDF, DOCX, or TXT resume · Demo mode available</p>
            <div className="hero-highlights mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
              <span><CheckCircle2 size={16} /> ATS feedback</span>
              <span><CheckCircle2 size={16} /> Role matching</span>
              <span><CheckCircle2 size={16} /> Personal roadmap</span>
            </div>
          </motion.div>

          <motion.div
            aria-label="Preview of the CareerIQ resume insights dashboard"
            className="dashboard-illustration"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="hero-preview">
              <div className="preview-topline">
                <div>
                  <span className="preview-eyebrow">SAMPLE RESUME INSIGHTS</span>
                  <h2>Career snapshot</h2>
                </div>
                <span className="preview-status"><span /> Analysis ready</span>
              </div>
              <div className="preview-score-row">
                <div className="preview-score">
                  <span className="preview-score-number">88</span><span className="preview-score-unit">/100</span>
                  <span className="preview-score-caption">ATS compatibility</span>
                </div>
                <div className="preview-score-copy">
                  <strong>Strong foundation</strong>
                  <p>See what’s working and the next improvements to prioritize.</p>
                </div>
              </div>
              <div className="preview-chart">
                <div className="preview-chart-heading"><span>Resume score trend</span><span>Sample data</span></div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[{ name: 'Jan', value: 62 }, { name: 'Feb', value: 70 }, { name: 'Mar', value: 74 }, { name: 'Apr', value: 78 }, { name: 'May', value: 88 }]}>
                      <defs>
                        <linearGradient id="blueArea" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#4f8df9" stopOpacity={0.55} />
                          <stop offset="100%" stopColor="#4f8df9" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke="#7dd3fc" fill="url(#blueArea)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="preview-match">
                <div className="preview-match-icon"><Briefcase size={17} /></div>
                <div className="preview-match-copy"><strong>Top role match</strong><span>Full Stack Developer</span></div>
                <span className="preview-match-score">92%</span>
              </div>
              <div className="preview-footnote">Illustrative demo results · Your analysis is based on your uploaded resume</div>
            </div>
          </motion.div>
        </section>

        <section aria-label="CareerIQ benefits" className="container mx-auto px-6 pb-12">
          <div className="benefit-strip grid gap-4 md:grid-cols-3">
            <div><span className="benefit-number">01</span><div><strong>Understand your resume</strong><p>Get clear, actionable feedback</p></div></div>
            <div><span className="benefit-number">02</span><div><strong>Find your best-fit roles</strong><p>Connect strengths to opportunities</p></div></div>
            <div><span className="benefit-number">03</span><div><strong>Know what to do next</strong><p>Follow a focused growth roadmap</p></div></div>
          </div>
        </section>

        <section id="features" className="container mx-auto px-6 py-20">
          <div className="mb-10 text-center">
            <span className="badge">Features</span>
            <h2 className="section-title mt-4">Everything you need to improve your career trajectory</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map(({ title, description, icon: Icon }) => (
              <motion.div key={title} whileHover={{ y: -5 }} className="feature-card">
                <div className="feature-icon"><Icon size={20} /></div>
                <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm text-slate-300">{description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="container mx-auto px-6 py-16">
          <div className="text-center">
            <span className="badge">How it works</span>
            <h2 className="section-title mt-4">A simple path to better career outcomes</h2>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {processSteps.map((step, index) => (
              <div key={step.title} className="feature-card flex flex-col justify-between text-left">
                <div className="step-num">0{index + 1}</div>
                <h3 className="mt-5 text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm text-slate-300">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="about" className="container mx-auto px-6 pb-20 pt-16">
          <div className="cta-panel">
            <div>
              <span className="badge">Career growth platform</span>
              <h2 className="section-title mt-4">Your next step starts with a clearer picture.</h2>
              <p className="mt-3 text-slate-300">Upload your resume and turn your career goals into an actionable plan.</p>
            </div>
            <button className="primary-button" onClick={() => navigate('/register')}>Get my career snapshot <ChevronRight size={17} /></button>
          </div>
        </section>
      </main>

      <footer className="footer-shell">
        <div className="container mx-auto grid gap-8 px-6 py-12 md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-3 font-semibold text-lg"><div className="nav-logo">C</div>CareerIQ</div>
            <p className="text-sm text-slate-400">AI-assisted resume analysis for students, graduates, and professionals.</p>
          </div>
          <div>
            <h4 className="mb-3 text-sm uppercase tracking-[0.2em] text-slate-400">Company</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>About</li>
              <li>Features</li>
              <li>Contact</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm uppercase tracking-[0.2em] text-slate-400">Legal</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>Privacy Policy</li>
              <li>Terms</li>
              <li>GitHub</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm uppercase tracking-[0.2em] text-slate-400">Resources</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>Resume Analyzer</li>
              <li>Career Roadmap</li>
              <li>Mentor</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}

function AuthPage({ mode, setUser, theme, setTheme }: { mode: 'login' | 'register'; setUser: (user: User | null) => void; theme: 'light' | 'dark'; setTheme: (value: 'light' | 'dark') => void }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: 'demo@careeriq.ai', password: 'demo123', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (mode === 'register' && form.password !== form.confirmPassword) {
      setError('Passwords must match.')
      return
    }

    try {
      setLoading(true)
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password, confirmPassword: form.confirmPassword }

      let data: { user: User; token: string } | null = null
      try {
        data = await apiRequest<{ user: User; token: string }>(mode === 'login' ? '/auth/login' : '/auth/register', 'POST', payload)
      } catch {
        if (mode === 'login' && form.email.toLowerCase() === 'demo@careeriq.ai' && form.password === 'demo123') {
          data = { user: { id: '1', name: 'Demo User', email: form.email, role: 'user' }, token: 'demo-token' }
        } else {
          throw new Error('Authentication service is unavailable. Please try again later.')
        }
      }

      const loginUser = data.user
      localStorage.setItem('careeriq-user', JSON.stringify(loginUser))
      localStorage.setItem('careeriq-token', data.token)
      setUser(loginUser)
      navigate('/dashboard/overview')
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Could not authenticate the user.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page min-h-screen">
      <div className="absolute right-5 top-5">
        <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          {theme === 'light' ? <MoonStar size={16} /> : <SunMedium size={16} />}
        </button>
      </div>
      <div className="auth-card">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-sky-300"><MoveRight size={16} /> Back to home</Link>
        <h1 className="text-3xl font-bold text-white">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="mt-2 text-slate-400">{mode === 'login' ? 'Sign in to continue preparation and analysis.' : 'Start building a stronger career profile.'}</p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          {mode === 'register' && (
            <div className="input-shell">
              <label>Full name</label>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Jane Doe" />
            </div>
          )}

          <div className="input-shell">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" />
          </div>

          <div className="input-shell">
            <label>Password</label>
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="••••••••" />
          </div>

          {mode === 'register' && (
            <div className="input-shell">
              <label>Confirm password</label>
              <input type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} placeholder="Repeat password" />
            </div>
          )}

          {mode === 'login' && (
            <div className="mt-2 flex items-center justify-between text-sm text-slate-400">
              <label className="inline-flex items-center gap-2"><input type="checkbox" /> Remember me</label>
              <button type="button" className="text-sky-300">Forgot password?</button>
            </div>
          )}

          {error && <div className="error-banner">{error}</div>}

          <button type="submit" className="primary-button w-full justify-center" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {mode === 'login' ? 'Need an account?' : 'Already have an account?'}{' '}
          <Link to={mode === 'login' ? '/register' : '/login'} className="text-sky-300">{mode === 'login' ? 'Sign up' : 'Login'}</Link>
        </div>
      </div>
    </div>
  )
}

function DashboardPage({ user, theme, setTheme, setUser }: { user: User | null; theme: 'light' | 'dark'; setTheme: (value: 'light' | 'dark') => void; setUser: (user: User | null) => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [overview, setOverview] = useState(sampleScenario)
  const [resumeFiles, setResumeFiles] = useState<ResumeItem[]>([
    { id: '1', name: 'Resume_v3.pdf', status: 'Analyzed', uploadedAt: 'Today', score: 88 },
    { id: '2', name: 'Resume_v2.docx', status: 'Draft', uploadedAt: '2 days ago', score: 81 },
  ])
  const [mentorInput, setMentorInput] = useState('Which job role suits my skills?')
  const [mentorReply, setMentorReply] = useState('Based on your profile, your strongest alignment is in Full Stack Developer and Frontend Developer roles.')
  const [sendingMentor, setSendingMentor] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const token = getStoredToken()
        const data = await apiRequest<{ latestAtsScore: number; resumeQualityScore: number; placementReadiness: number; totalResumesAnalyzed: number; bestMatchingJobRole: string; skillImprovementProgress: number; ATSScoreHistory: number[]; recentResumes: Array<{ name: string; score: number; date: string }>; recommendations: string[] }>( '/dashboard/overview', 'GET', undefined, token)

        setOverview({
          ...sampleScenario,
          latestAtsScore: data.latestAtsScore,
          resumeQualityScore: data.resumeQualityScore,
          placementReadiness: data.placementReadiness,
          totalResumesAnalyzed: data.totalResumesAnalyzed,
          bestMatchingJobRole: data.bestMatchingJobRole,
          skillImprovementProgress: data.skillImprovementProgress,
          atsHistory: data.ATSScoreHistory,
          recentResumes: data.recentResumes,
          weaknesses: data.recommendations,
        })
      } catch {
        setOverview(sampleScenario)
      }
    }

    fetchOverview()
  }, [])

  const currentPath = location.pathname.replace('/dashboard/', '') || 'overview'

  const askMentor = async () => {
    setSendingMentor(true)
    try {
      const token = getStoredToken()
      const result = await apiRequest<{ reply: string; suggestedQuestions: string[] }>('/chat/mentor', 'POST', { message: mentorInput }, token)
      setMentorReply(result.reply)
      setOverview((prev) => ({ ...prev, mentorSuggestions: result.suggestedQuestions }))
    } catch {
      setMentorReply('Based on your profile, your strongest fit is in full-stack and frontend roles with good communication and project execution.')
    } finally {
      setSendingMentor(false)
    }
  }

  const handleResumeUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('resume', file)
      const token = getStoredToken()
      const result = await apiRequest<{ message: string; analysis: { atsScore: { overall: number; strengths: string[]; weaknesses: string[]; recommendations: string[] }; jobMatches: Array<{ role: string; match: number; reason: string }>; skillGaps: { current: string[]; missing: string[]; unverified: string[] }; personalInfo: { name: string; email: string } }; resume: { id: string; fileName: string } }>( '/resume/analyze', 'POST', formData, token)

      const fileEntry: ResumeItem = {
        id: result.resume.id,
        name: result.resume.fileName,
        status: 'Analyzed',
        uploadedAt: 'Just now',
        score: result.analysis.atsScore.overall,
      }

      setResumeFiles((prev) => [fileEntry, ...prev])
      setOverview((prev) => ({
        ...prev,
        latestAtsScore: result.analysis.atsScore.overall,
        strengths: result.analysis.atsScore.strengths,
        weaknesses: result.analysis.atsScore.weaknesses,
      }))
    } catch {
      const fallbackEntry: ResumeItem = { id: Date.now().toString(), name: file.name, status: 'Demo analyzed', uploadedAt: 'Now', score: 88 }
      setResumeFiles((prev) => [fallbackEntry, ...prev])
      setOverview((prev) => ({ ...prev, latestAtsScore: 88, strengths: ['Strong project outcomes', 'Good relevant tools'], weaknesses: ['Add more metrics and DSA depth'] }))
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const logout = () => {
    localStorage.removeItem('careeriq-user')
    localStorage.removeItem('careeriq-token')
    setUser(null)
    navigate('/login')
  }

  const renderView = () => {
    switch (currentPath) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Latest ATS Score', value: `${overview.latestAtsScore}`, accent: 'sky' },
                { label: 'Resume Quality Score', value: `${overview.resumeQualityScore}`, accent: 'violet' },
                { label: 'Placement Readiness', value: `${overview.placementReadiness}`, accent: 'emerald' },
                { label: 'Total Resumes', value: `${overview.totalResumesAnalyzed}`, accent: 'amber' },
              ].map((item) => (
                <div key={item.label} className="metric-card">
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <h3 className="mt-4 text-3xl font-bold text-white">{item.value}</h3>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
              <div className="panel-card p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">ATS Score Visualization</h3>
                  <span className="score-pill">{overview.latestAtsScore}</span>
                </div>
                <div className="mt-6 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overview.atsHistory.map((value, index) => ({ name: `V${index + 1}`, value }))}>
                      <defs>
                        <linearGradient id="scoreFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="#7dd3fc" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Area type="monotone" dataKey="value" stroke="#7dd3fc" fill="url(#scoreFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="panel-card p-6">
                <h3 className="text-lg font-semibold text-white">Skill distribution</h3>
                <div className="mt-6 h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={overview.skillDistribution} innerRadius={45} outerRadius={80} dataKey="value" nameKey="name">
                        {overview.skillDistribution.map((entry, index) => (
                          <Cell key={entry.name} fill={['#4f8df9', '#7c3aed', '#10b981', '#fbbf24'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <div className="panel-card p-6">
                <h3 className="text-lg font-semibold text-white">Recent Resume Analysis</h3>
                <div className="mt-5 space-y-4">
                  {overview.recentResumes.map((resume) => (
                    <div key={resume.name} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                      <div>
                        <p className="font-medium text-white">{resume.name}</p>
                        <p className="text-xs text-slate-400">{resume.date}</p>
                      </div>
                      <span className="score-pill">{resume.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel-card p-6">
                <h3 className="text-lg font-semibold text-white">Recommended next steps</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  {overview.weaknesses.map((step) => (
                    <li key={step} className="flex items-start gap-3"><ChevronRight size={16} className="mt-0.5 text-sky-300" /> {step}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )
      case 'resume-analyzer':
        return (
          <div className="space-y-6">
            <div className="panel-card p-6">
              <h3 className="text-xl font-semibold text-white">Resume upload and analysis</h3>
              <div className="mt-6 rounded-3xl border border-dashed border-sky-500/60 bg-slate-950/40 p-8 text-center">
                <Upload className="mx-auto text-sky-300" size={32} />
                <p className="mt-4 text-lg text-white">Drag and drop your resume file or browse.</p>
                <p className="mt-2 text-sm text-slate-400">Supports PDF, DOCX, and TXT files up to 5MB.</p>
                <label className="primary-button mt-6 inline-flex cursor-pointer">
                  Browse file
                  <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleResumeUpload} />
                </label>
              </div>
              {uploading && <div className="mt-4 text-sm text-sky-300">Processing resume and generating structured analysis...</div>}
            </div>

            <div className="panel-card p-6">
              <h3 className="mb-4 text-xl font-semibold text-white">Analysis history</h3>
              <div className="space-y-3">
                {resumeFiles.map((resume) => (
                  <div key={resume.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                    <div>
                      <p className="font-medium text-white">{resume.name}</p>
                      <p className="text-xs text-slate-400">{resume.status} • {resume.uploadedAt}</p>
                    </div>
                    <span className="score-pill">{resume.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      case 'my-resumes':
        return (
          <div className="panel-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">My resumes</h3>
              <button className="primary-button">Upload another</button>
            </div>
            <div className="space-y-4">
              {resumeFiles.map((resume) => (
                <div key={resume.id} className="resume-row">
                  <div>
                    <p className="font-medium text-white">{resume.name}</p>
                    <p className="text-xs text-slate-400">Uploaded {resume.uploadedAt}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="score-pill">{resume.score}</span>
                    <button className="secondary-button">Reanalyze</button>
                    <button className="secondary-button danger">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      case 'ats-score':
        return (
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="panel-card p-6">
              <h3 className="text-xl font-semibold text-white">ATS compatibility score</h3>
              <div className="mt-6 flex items-center justify-center">
                <div className="score-ring">
                  <span>{overview.latestAtsScore}</span>
                </div>
              </div>
              <p className="mt-4 text-center text-sm text-slate-400">Estimated ATS compatibility score, not from an actual employer ATS software.</p>
            </div>

            <div className="panel-card p-6">
              <h3 className="text-xl font-semibold text-white">Category breakdown</h3>
              <div className="mt-6 space-y-4">
                {[
                  ['Resume Formatting', 90],
                  ['Keyword Optimization', 84],
                  ['Skills Relevance', 91],
                  ['Experience Quality', 87],
                  ['Project Impact', 86],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="mb-2 flex justify-between text-sm text-slate-300"><span>{label}</span><span>{value}</span></div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${value}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      case 'job-matches':
        return (
          <div className="space-y-5">
            {[
              { role: 'Full Stack Developer', match: 92, reason: 'Strong backend and frontend overlap with your current profile.' },
              { role: 'Frontend Developer', match: 89, reason: 'Your UI workflow and frontend stack are highly relevant.' },
              { role: 'Data Analyst', match: 72, reason: 'Your resume shows good analytical thinking with room for statistics depth.' },
            ].map((item) => (
              <div key={item.role} className="panel-card p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">{item.role}</h3>
                  <span className="score-pill">{item.match}%</span>
                </div>
                <p className="mt-3 text-sm text-slate-300">{item.reason}</p>
                <div className="mt-4 text-sm text-slate-400">Required skills: React.js, Node.js, SQL, APIs</div>
              </div>
            ))}
          </div>
        )
      case 'skills-analysis':
        return (
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="panel-card p-6">
              <h3 className="text-xl font-semibold text-white">Current skills</h3>
              <div className="mt-5 flex flex-wrap gap-2">
                {['React.js', 'Node.js', 'MongoDB', 'SQL', 'TypeScript', 'Git', 'JavaScript', 'Python'].map((skill) => (
                  <span key={skill} className="tag-pill">{skill}</span>
                ))}
              </div>
            </div>
            <div className="panel-card p-6">
              <h3 className="text-xl font-semibold text-white">Missing or weak skills</h3>
              <div className="mt-5 flex flex-wrap gap-2">
                {['System Design', 'Docker', 'AWS', 'Data Structures', 'Unverified: NLP'].map((skill) => (
                  <span key={skill} className="tag-pill warning">{skill}</span>
                ))}
              </div>
            </div>
          </div>
        )
      case 'career-roadmap':
        return (
          <div className="panel-card p-6">
            <h3 className="text-xl font-semibold text-white">Six month roadmap</h3>
            <div className="mt-6 space-y-4">
              {overview.roadmap.map((roadmapItem) => (
                <div key={roadmapItem.month} className="roadmap-item">
                  <div className="roadmap-badge">{roadmapItem.month}</div>
                  <div className="ml-4 flex flex-wrap gap-2">
                    {roadmapItem.tasks.map((task) => (
                      <span key={task} className="tag-pill">{task}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      case 'placement-preparation':
        return (
          <div className="panel-card p-6">
            <h3 className="text-xl font-semibold text-white">Placement readiness</h3>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ['Technical Knowledge', 85],
                ['Data Structures and Algorithms', 74],
                ['Aptitude', 79],
                ['Communication', 88],
                ['Project Experience', 86],
                ['Interview Preparation', 80],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="mb-2 flex justify-between text-sm text-slate-300"><span>{label}</span><span>{value}</span></div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${value}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        )
      case 'mentor':
        return (
          <div className="panel-card p-6">
            <h3 className="text-xl font-semibold text-white">AI Career Mentor</h3>
            <div className="mt-6 flex flex-wrap gap-2">
              {overview.mentorSuggestions.map((question) => (
                <button key={question} className="tag-pill suggest" onClick={() => setMentorInput(question)}>{question}</button>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200">
              {mentorReply}
            </div>
            <div className="mt-5 flex gap-3">
              <input value={mentorInput} onChange={(event) => setMentorInput(event.target.value)} className="input-plain" placeholder="Ask your mentor..." />
              <button className="primary-button" onClick={askMentor} disabled={sendingMentor}>{sendingMentor ? 'Thinking...' : 'Ask'}</button>
            </div>
          </div>
        )
      case 'settings':
        return (
          <div className="panel-card p-6">
            <h3 className="text-xl font-semibold text-white">Profile settings</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-sm text-slate-400">Name</p>
                <p className="mt-2 text-lg font-semibold text-white">{user?.name || 'Demo User'}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-sm text-slate-400">Email</p>
                <p className="mt-2 text-lg font-semibold text-white">{user?.email || 'demo@careeriq.ai'}</p>
              </div>
            </div>
          </div>
        )
      default:
        return <Navigate to="/dashboard/overview" replace />
    }
  }

  return (
    <div className="dashboard-shell min-h-screen">
      <aside className="dashboard-sidebar">
        <div className="mb-8 flex items-center gap-3 px-5 text-xl font-semibold text-white">
          <div className="nav-logo">C</div>
          CareerIQ
        </div>

        <nav className="space-y-2 px-3">
          {dashboardItems.map(({ label, path, icon: Icon }) => (
            <button
              key={path}
              onClick={() => navigate(`/dashboard/${path}`)}
              className={`dashboard-nav-item ${currentPath === path ? 'active' : ''}`}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-8 space-y-2 px-3">
          {user?.role === 'admin' && (
            <button className="dashboard-nav-item" onClick={() => navigate('/admin')}><UserRound size={17} /> Admin</button>
          )}
          <button className="dashboard-nav-item" onClick={logout}><LogOut size={17} /> Logout</button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-300">Career dashboard</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Welcome back, {user?.name || 'Alex'}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? <MoonStar size={16} /> : <SunMedium size={16} />}
            </button>
            <button className="primary-button">Upgrade plan</button>
          </div>
        </header>

        <div className="p-6">{renderView()}</div>
      </main>
    </div>
  )
}

function AdminPage({ user, theme, setTheme, setUser }: { user: User | null; theme: 'light' | 'dark'; setTheme: (value: 'light' | 'dark') => void; setUser: (user: User | null) => void }) {
  const navigate = useNavigate()
  const [data, setData] = useState({ totalUsers: 120, totalResumesProcessed: 842, analysisUsage: 128, popularRoles: ['Full Stack Developer', 'Frontend Developer', 'Data Analyst'], trends: [42, 56, 64, 68, 72, 81] })

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const token = getStoredToken()
        const adminData = await apiRequest<{ totalUsers: number; totalResumesProcessed: number; analysisUsage: number; popularRoles: string[]; trends: number[] }>( '/admin/summary', 'GET', undefined, token)
        setData(adminData)
      } catch {
        setData({ totalUsers: 120, totalResumesProcessed: 842, analysisUsage: 128, popularRoles: ['Full Stack Developer', 'Frontend Developer', 'Data Analyst'], trends: [42, 56, 64, 68, 72, 81] })
      }
    }

    fetchAdmin()
  }, [])

  const logout = () => {
    localStorage.removeItem('careeriq-user')
    localStorage.removeItem('careeriq-token')
    setUser(null)
    navigate('/login')
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard/overview" replace />
  }

  return (
    <div className="dashboard-shell min-h-screen">
      <aside className="dashboard-sidebar">
        <div className="mb-8 flex items-center gap-3 px-5 text-xl font-semibold text-white">
          <div className="nav-logo">C</div>
          CareerIQ Admin
        </div>
        <div className="space-y-2 px-3">
          <button className="dashboard-nav-item active" onClick={() => navigate('/dashboard/overview')}><LayoutDashboard size={17} /> Dashboard</button>
          <button className="dashboard-nav-item" onClick={logout}><LogOut size={17} /> Logout</button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-300">Admin panel</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Usage & analytics</h2>
          </div>
          <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? <MoonStar size={16} /> : <SunMedium size={16} />}
          </button>
        </header>

        <div className="p-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['Total registered users', data.totalUsers],
            ['Total resumes processed', data.totalResumesProcessed],
            ['Analysis usage', data.analysisUsage],
            ['Popular job roles', data.popularRoles.length],
          ].map(([label, value]) => (
            <div key={label} className="metric-card">
              <p className="text-sm text-slate-400">{label}</p>
              <h3 className="mt-4 text-3xl font-bold text-white">{value}</h3>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6">
          <div className="panel-card p-6">
            <h3 className="text-xl font-semibold text-white">Resume analysis trends</h3>
            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.trends.map((value, index) => ({ name: `M${index + 1}`, value }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4f8df9" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
