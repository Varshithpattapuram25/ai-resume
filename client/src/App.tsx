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
  MessageSquare,
  MoonStar,
  MoveRight,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  SunMedium,
  Target,
  Trophy,
  Upload,
  UserRound,
  Wand2,
} from 'lucide-react'
import { deleteSavedResume, fetchResumeText, fetchResumes, getResumeUrl, saveResume } from './lib/resumes'
import {
  askGeminiMentor,
  evaluateMockInterviewAnswer,
  matchResumeToJob,
  startMockInterview,
  type JobMatchResult,
  type MockInterviewQuestion,
  type MockInterviewTurn,
} from './lib/gemini'
import { requireSupabaseConfig, supabase } from './lib/supabase'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'

const features = [
  { title: 'AI Resume Analysis', description: 'Unlock actionable insights from your resume, skills, and experience.', icon: Wand2 },
  { title: 'ATS Score Checker', description: 'Measure your resume’s compatibility with modern hiring systems.', icon: Gauge },
  { title: 'Job Match Studio', description: 'Compare your resume with a real job description and get a tailored action plan.', icon: Target },
  { title: 'Skill Gap Detection', description: 'Spot missing strengths and prioritized learning paths.', icon: Search },
  { title: 'Career Roadmap', description: 'Turn your profile into a measurable six-month preparation plan.', icon: CheckCircle2 },
  { title: 'Placement Readiness', description: 'See how ready you are for interviews and recruiter screens.', icon: Briefcase },
  { title: 'Live AI Mock Interview', description: 'Practice five personalized questions and get a clear answer-by-answer scorecard.', icon: MessageSquare },
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
  { label: 'Job Match Studio', path: 'job-matches', icon: Briefcase },
  { label: 'Mock Interview', path: 'mock-interview', icon: MessageSquare },
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
  storagePath: string
}

type MentorMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: string
}

type MockInterviewSession = {
  role: string
  resumeText: string
  jobDescription: string
  question: MockInterviewQuestion
  questionNumber: number
  turns: MockInterviewTurn[]
  completed: boolean
}

const getStoredToken = () => localStorage.getItem('careeriq-token') || ''

async function apiRequest<T>(path: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', body?: Record<string, unknown> | FormData, token?: string): Promise<T> {
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
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    document.body.classList.toggle('light-theme', theme === 'light')
  }, [theme])

  useEffect(() => {
    let active = true
    const applySession = (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      if (!active) return
      const sessionUser = session?.user
      setUser(sessionUser ? {
        id: sessionUser.id,
        name: sessionUser.is_anonymous ? 'Guest' : sessionUser.user_metadata.full_name || sessionUser.email || 'User',
        email: sessionUser.email || '',
        role: sessionUser.app_metadata.role || 'user',
      } : null)
      setAuthReady(true)
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setAuthError(error.message)
        setAuthReady(true)
        return
      }
      applySession(data.session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => applySession(session))
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (!authReady) return null

  return (
    <BrowserRouter>
      <div className={`app-shell ${theme}`}>
        {authError && <p role="alert" className="error-banner m-4">{authError}</p>}
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/welcome" element={<LandingPage theme={theme} setTheme={setTheme} user={user} />} />
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
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const continueAsGuest = async () => {
    setError('')
    setLoading(true)
    try {
      requireSupabaseConfig()
      const { data, error: authError } = await supabase.auth.signInAnonymously()
      if (authError) throw authError
      if (!data.user) throw new Error('Supabase did not return a guest session.')

      setUser({
        id: data.user.id,
        name: 'Guest',
        email: '',
        role: 'user',
      })
      navigate('/dashboard/overview')
    } catch (authError) {
      setError(authError instanceof Error
        ? `${authError.message} If anonymous sign-in is disabled, enable it under Supabase Authentication settings.`
        : 'Could not start a guest session.')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (mode === 'register' && form.password !== form.confirmPassword) {
      setError('Passwords must match.')
      return
    }
    if (mode === 'register' && !form.name.trim()) {
      setError('Enter your full name.')
      return
    }

    try {
      setLoading(true)
      requireSupabaseConfig()
      const { data, error: authError } = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
        : await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.name.trim() } },
        })
      if (authError) throw authError
      if (!data.user) throw new Error('Supabase did not return an authenticated user.')
      if (mode === 'register' && !data.session) {
        setError('Account created. Check your email to confirm your address, then log in.')
        return
      }

      localStorage.removeItem('careeriq-user')
      localStorage.removeItem('careeriq-token')
      setUser({
        id: data.user.id,
        name: data.user.user_metadata.full_name || data.user.email || 'User',
        email: data.user.email || '',
        role: data.user.app_metadata.role || 'user',
      })
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
        <Link to="/welcome" className="mb-6 inline-flex items-center gap-2 text-sm text-sky-300"><MoveRight size={16} /> Back to home</Link>
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
            {mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {mode === 'login' ? 'Need an account?' : 'Already have an account?'}{' '}
          <Link to={mode === 'login' ? '/register' : '/login'} className="text-sky-300">{mode === 'login' ? 'Sign up' : 'Login'}</Link>
        </div>
        {mode === 'login' && (
          <div className="mt-5 border-t border-slate-700 pt-5 text-center">
            <button type="button" className="secondary-button w-full justify-center" onClick={() => void continueAsGuest()} disabled={loading}>
              Continue as guest
            </button>
            <p className="mt-3 text-xs text-slate-400">
              No email needed. Guest resumes belong only to this browser account; signing out means you cannot recover them.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function DashboardPage({ user, theme, setTheme, setUser }: { user: User | null; theme: 'light' | 'dark'; setTheme: (value: 'light' | 'dark') => void; setUser: (user: User | null) => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [overview, setOverview] = useState<typeof sampleScenario>({
    ...sampleScenario,
    latestAtsScore: 0,
    resumeQualityScore: 0,
    placementReadiness: 0,
    totalResumesAnalyzed: 0,
    bestMatchingJobRole: 'Not available',
    atsHistory: [],
    recentResumes: [],
    strengths: [],
    weaknesses: [],
  })
  const [resumeFiles, setResumeFiles] = useState<ResumeItem[]>([])
  const [mentorMessages, setMentorMessages] = useState<MentorMessage[]>([])
  const [completedTasks, setCompletedTasks] = useState<string[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [jobMatchResult, setJobMatchResult] = useState<JobMatchResult | null>(null)
  const [matchingJob, setMatchingJob] = useState(false)
  const [interviewResumeId, setInterviewResumeId] = useState('')
  const [interviewRole, setInterviewRole] = useState('')
  const [interviewJobDescription, setInterviewJobDescription] = useState('')
  const [mockInterview, setMockInterview] = useState<MockInterviewSession | null>(null)
  const [mockInterviewAnswer, setMockInterviewAnswer] = useState('')
  const [mockInterviewBusy, setMockInterviewBusy] = useState(false)
  const [mentorInput, setMentorInput] = useState('Which job role suits my skills?')
  const [sendingMentor, setSendingMentor] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const savedResumes = await fetchResumes()
        const resumes = savedResumes.map((resume) => ({
          id: resume.id,
          name: resume.original_file_name,
          status: resume.resume_status,
          uploadedAt: resume.upload_date,
          score: resume.analysis?.ats_score || 0,
          storagePath: resume.uploaded_file_url,
        }))
        const analyses = savedResumes.flatMap((resume) => resume.analysis ? [resume.analysis] : [])
        const latestAnalysis = analyses[0]
        const atsHistory = analyses.slice(0, 5).map((analysis) => analysis.ats_score).reverse()
        setOverview({
          ...sampleScenario,
          latestAtsScore: latestAnalysis?.ats_score || 0,
          resumeQualityScore: latestAnalysis?.skills_score || 0,
          placementReadiness: latestAnalysis?.keyword_match_score || 0,
          totalResumesAnalyzed: savedResumes.length,
          bestMatchingJobRole: latestAnalysis?.job_role_recommendations[0]?.role || 'Not available',
          atsHistory,
          recentResumes: resumes.slice(0, 5).map((resume) => ({
            name: resume.name,
            score: resume.score,
            date: new Date(resume.uploadedAt).toLocaleDateString(),
          })),
          strengths: latestAnalysis?.strengths || [],
          weaknesses: latestAnalysis?.improvement_suggestions || [],
        })
        setResumeFiles(resumes)
        setActionError('')
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Could not load your saved information.')
      }
    }

    fetchDashboardData()
  }, [user?.id])

  const currentPath = location.pathname.replace('/dashboard/', '') || 'overview'

  const toggleRoadmapTask = async (task: string) => {
    const nextTasks = completedTasks.includes(task)
      ? completedTasks.filter((completedTask) => completedTask !== task)
      : [...completedTasks, task]
    const totalTasks = overview.roadmap.reduce((total, item) => total + item.tasks.length, 0)
    const progress = totalTasks ? Math.round((nextTasks.length / totalTasks) * 100) : 0

    setCompletedTasks(nextTasks)
    setOverview((prev) => ({ ...prev, skillImprovementProgress: progress }))
  }

  const askMentor = async () => {
    setSendingMentor(true)
    setActionError('')
    try {
      const createdAt = new Date().toISOString()
      const reply = await askGeminiMentor(mentorInput, {
        atsScore: overview.latestAtsScore,
        skillsScore: overview.resumeQualityScore,
        keywordMatchScore: overview.placementReadiness,
        targetRole: overview.bestMatchingJobRole,
        strengths: overview.strengths,
        weaknesses: overview.weaknesses,
      })
      setMentorMessages((messages) => [
        ...messages,
        { id: `${createdAt}-user`, role: 'user', text: mentorInput, createdAt },
        { id: `${createdAt}-assistant`, role: 'assistant', text: reply, createdAt },
      ])
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Gemini could not answer your question.')
    } finally {
      setSendingMentor(false)
    }
  }

  const runJobMatch = async () => {
    const resume = resumeFiles.find((item) => item.id === selectedResumeId) || resumeFiles[0]
    if (!resume) {
      setActionError('Upload a resume before matching it to a job description.')
      return
    }
    if (jobDescription.trim().length < 80) {
      setActionError('Paste a job description with at least 80 characters to get a useful match.')
      return
    }

    setMatchingJob(true)
    setJobMatchResult(null)
    setActionError('')
    try {
      const resumeText = await fetchResumeText(resume.id)
      const result = await matchResumeToJob(resumeText, jobDescription.trim())
      setJobMatchResult(result)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The job match could not be completed.')
    } finally {
      setMatchingJob(false)
    }
  }

  const beginMockInterview = async () => {
    const resume = resumeFiles.find((item) => item.id === interviewResumeId) || resumeFiles[0]
    if (!resume) {
      setActionError('Upload a resume before starting a mock interview.')
      return
    }
    if (interviewRole.trim().length < 2) {
      setActionError('Enter the role you are preparing to interview for.')
      return
    }

    setMockInterviewBusy(true)
    setMockInterview(null)
    setActionError('')
    try {
      const resumeText = await fetchResumeText(resume.id)
      const question = await startMockInterview(resumeText, interviewRole.trim(), interviewJobDescription.trim())
      setMockInterview({
        role: interviewRole.trim(),
        resumeText,
        jobDescription: interviewJobDescription.trim(),
        question,
        questionNumber: 1,
        turns: [],
        completed: false,
      })
      setMockInterviewAnswer('')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The mock interview could not be started.')
    } finally {
      setMockInterviewBusy(false)
    }
  }

  const submitMockInterviewAnswer = async () => {
    if (!mockInterview) return
    if (mockInterviewAnswer.trim().length < 20) {
      setActionError('Write at least 20 characters so the interviewer can evaluate your answer.')
      return
    }

    setMockInterviewBusy(true)
    setActionError('')
    try {
      const evaluation = await evaluateMockInterviewAnswer({
        resumeText: mockInterview.resumeText,
        role: mockInterview.role,
        jobDescription: mockInterview.jobDescription,
        question: mockInterview.question.question,
        focus: mockInterview.question.focus,
        questionType: mockInterview.question.question_type,
        answer: mockInterviewAnswer.trim(),
        questionNumber: mockInterview.questionNumber,
        history: mockInterview.turns.map(({ question, answer }) => ({ question, answer })),
      })
      const turn: MockInterviewTurn = {
        question: mockInterview.question.question,
        answer: mockInterviewAnswer.trim(),
        score: evaluation.score,
        feedback: evaluation.feedback,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        sample_answer: evaluation.sample_answer,
      }
      setMockInterview({
        ...mockInterview,
        question: evaluation.completed ? mockInterview.question : {
          question: evaluation.next_question,
          focus: evaluation.next_focus,
          question_type: evaluation.next_question_type,
        },
        questionNumber: evaluation.completed ? mockInterview.questionNumber : mockInterview.questionNumber + 1,
        turns: [...mockInterview.turns, turn],
        completed: evaluation.completed,
      })
      setMockInterviewAnswer('')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Your answer could not be evaluated.')
    } finally {
      setMockInterviewBusy(false)
    }
  }

  const resetMockInterview = () => {
    setMockInterview(null)
    setMockInterviewAnswer('')
    setActionError('')
  }

  const handleResumeUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadProgress('Preparing your resume...')
    setActionError('')

    try {
      const result = await saveResume(file, '', setUploadProgress)

      const fileEntry: ResumeItem = {
        id: result.id,
        name: file.name,
        status: 'analyzed',
        uploadedAt: new Date().toISOString(),
        score: result.analysis.ats_score,
        storagePath: result.path,
      }

      setResumeFiles((prev) => [fileEntry, ...prev])
      setOverview((prev) => ({
        ...prev,
        latestAtsScore: result.analysis.ats_score,
        resumeQualityScore: result.analysis.skills_score,
        placementReadiness: result.analysis.keyword_match_score,
        totalResumesAnalyzed: prev.totalResumesAnalyzed + 1,
        atsHistory: [...prev.atsHistory, result.analysis.ats_score].slice(-5),
        recentResumes: [
          { name: file.name, score: result.analysis.ats_score, date: new Date().toLocaleDateString() },
          ...prev.recentResumes,
        ].slice(0, 5),
        bestMatchingJobRole: result.analysis.job_role_recommendations[0]?.role || prev.bestMatchingJobRole,
        strengths: result.analysis.strengths,
        weaknesses: result.analysis.improvement_suggestions,
      }))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The resume could not be analyzed and saved.')
    } finally {
      setUploading(false)
      setUploadProgress('')
      event.target.value = ''
    }
  }

  const downloadResume = async (resume: ResumeItem) => {
    try {
      const url = await getResumeUrl(resume.storagePath, true)
      const link = document.createElement('a')
      link.href = url
      link.download = resume.name
      link.click()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The saved resume could not be downloaded.')
    }
  }

  const viewResume = async (resume: ResumeItem) => {
    try {
      const url = await getResumeUrl(resume.storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The saved resume could not be opened.')
    }
  }

  const deleteResume = async (resume: ResumeItem) => {
    try {
      await deleteSavedResume({
        id: resume.id,
        original_file_name: resume.name,
        uploaded_file_url: resume.storagePath,
        file_type: resume.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOCX',
        upload_date: resume.uploadedAt,
        resume_status: resume.status,
        analysis: null,
      })
      const savedResumes = await fetchResumes()
      const remainingResumes = savedResumes.map((item) => ({
        id: item.id,
        name: item.original_file_name,
        status: item.resume_status,
        uploadedAt: item.upload_date,
        score: item.analysis?.ats_score || 0,
        storagePath: item.uploaded_file_url,
      }))
      const latestAnalysis = savedResumes[0]?.analysis
      setResumeFiles(remainingResumes)
      setOverview((prev) => ({
        ...prev,
        latestAtsScore: latestAnalysis?.ats_score || 0,
        resumeQualityScore: latestAnalysis?.skills_score || 0,
        placementReadiness: latestAnalysis?.keyword_match_score || 0,
        totalResumesAnalyzed: savedResumes.length,
        bestMatchingJobRole: latestAnalysis?.job_role_recommendations[0]?.role || 'Not available',
        atsHistory: savedResumes.flatMap((item) => item.analysis ? [item.analysis.ats_score] : []).slice(0, 5).reverse(),
        recentResumes: remainingResumes.slice(0, 5).map((item) => ({
          name: item.name,
          score: item.score,
          date: new Date(item.uploadedAt).toLocaleDateString(),
        })),
        strengths: latestAnalysis?.strengths || [],
        weaknesses: latestAnalysis?.improvement_suggestions || [],
      }))
      setActionError('')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The saved resume could not be deleted.')
    }
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      setActionError(error.message)
      return
    }
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
                <p className="mt-2 text-sm text-slate-400">Supports PDF and DOCX files up to 5MB. Resume text is sent securely to Gemini for analysis.</p>
                <label className="primary-button mt-6 inline-flex cursor-pointer">
                  Browse file
                  <input type="file" className="hidden" accept=".pdf,.docx" onChange={handleResumeUpload} disabled={uploading} />
                </label>
              </div>
              {uploading && <div className="mt-4 text-sm text-sky-300" role="status" aria-live="polite">{uploadProgress}</div>}
            </div>

            <div className="panel-card p-6">
              <h3 className="mb-4 text-xl font-semibold text-white">Analysis history</h3>
              <div className="space-y-3">
                {resumeFiles.length === 0 && <p className="text-sm text-slate-400">No analysis history yet. Upload a PDF or DOCX resume to begin.</p>}
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
              <button className="primary-button" onClick={() => navigate('/dashboard/resume-analyzer')}>Upload another</button>
            </div>
            <div className="space-y-4">
              {resumeFiles.length === 0 && <p className="text-sm text-slate-400">No resumes uploaded yet.</p>}
              {resumeFiles.map((resume) => (
                <div key={resume.id} className="resume-row">
                  <div>
                    <p className="font-medium text-white">{resume.name}</p>
                    <p className="text-xs text-slate-400">Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="score-pill">{resume.score}</span>
                    <button className="secondary-button" onClick={() => void viewResume(resume)}>View</button>
                    <button className="secondary-button" onClick={() => void downloadResume(resume)}>Download</button>
                    <button className="secondary-button danger" onClick={() => void deleteResume(resume)}>Delete</button>
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
          <div className="space-y-6">
            <section className="job-match-hero overflow-hidden rounded-3xl border border-sky-400/20 bg-[radial-gradient(ellipse_at_90%_0%,rgba(124,58,237,0.22),transparent_42%),linear-gradient(135deg,rgba(8,47,73,0.7),rgba(15,23,42,0.92))] p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="max-w-2xl">
                  <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-200">
                    <Sparkles size={14} /> AI-powered job targeting
                  </span>
                  <h3 className="mt-4 text-2xl font-bold text-white md:text-3xl">Job Match Studio</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    See how your resume stacks up against a real role. Get an evidence-based match score,
                    missing keywords, and stronger bullet suggestions—without inventing experience.
                  </p>
                </div>
                <div className="job-match-privacy rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-slate-300">
                  <p className="font-semibold text-white">Private by design</p>
                  <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">Your saved resume is sent securely for this comparison and is not added to AI chat history.</p>
                </div>
              </div>

              <div className="mt-7 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <label className="block text-sm font-medium text-slate-200">
                  Choose a saved resume
                  <select
                    value={resumeFiles.some((resume) => resume.id === selectedResumeId) ? selectedResumeId : resumeFiles[0]?.id || ''}
                    onChange={(event) => {
                      setSelectedResumeId(event.target.value)
                      setJobMatchResult(null)
                    }}
                    disabled={resumeFiles.length === 0 || matchingJob}
                    className="job-match-control mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 disabled:opacity-60"
                  >
                    {resumeFiles.length === 0 && <option value="">Upload a resume to get started</option>}
                    {resumeFiles.map((resume) => <option key={resume.id} value={resume.id}>{resume.name}</option>)}
                  </select>
                </label>
                <div className="text-sm font-medium text-slate-200">
                  Paste the job description
                  <textarea
                    value={jobDescription}
                    onChange={(event) => {
                      setJobDescription(event.target.value)
                      setJobMatchResult(null)
                    }}
                    disabled={matchingJob}
                    rows={5}
                    maxLength={15000}
                    placeholder="Paste the responsibilities, requirements, and skills from the job post..."
                    className="job-match-control mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 disabled:opacity-60"
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">{jobDescription.length.toLocaleString()} / 15,000</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  className="primary-button inline-flex items-center gap-2"
                  onClick={() => void runJobMatch()}
                  disabled={matchingJob || resumeFiles.length === 0 || jobDescription.trim().length < 80}
                >
                  <Sparkles size={16} />
                  {matchingJob ? 'Comparing your resume…' : 'Analyze my match'}
                </button>
                {resumeFiles.length === 0
                  ? <button type="button" className="text-sm font-medium text-sky-300 hover:text-sky-200" onClick={() => navigate('/dashboard/resume-analyzer')}>Upload a resume first <ChevronRight className="inline" size={15} /></button>
                  : <span className="text-xs text-slate-400">Add at least 80 characters from the job post.</span>}
              </div>
              {matchingJob && <p role="status" className="mt-4 text-sm text-sky-200">Comparing requirements with your saved resume evidence…</p>}
            </section>

            {jobMatchResult ? (
              <div className="space-y-5">
                <section className="panel-card p-6 md:p-8">
                  <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
                    <div
                      className="mx-auto grid h-36 w-36 place-items-center rounded-full"
                      style={{ background: `conic-gradient(#34d399 ${jobMatchResult.match_score}%, rgba(148,163,184,0.18) ${jobMatchResult.match_score}% 100%)` }}
                      role="img"
                      aria-label={`Job match score: ${jobMatchResult.match_score} percent`}
                    >
                      <div className="job-match-score-core grid h-28 w-28 place-items-center rounded-full bg-slate-950 text-center">
                        <div><strong className="job-match-score-value block text-4xl font-bold text-white">{jobMatchResult.match_score}</strong><span className="text-xs uppercase tracking-widest text-slate-400">match score</span></div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Your role fit snapshot</p>
                      <h4 className="mt-2 text-xl font-semibold text-white">Here’s where you stand</h4>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{jobMatchResult.summary}</p>
                    </div>
                  </div>
                </section>

                <div className="grid gap-5 lg:grid-cols-2">
                  <section className="panel-card p-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="text-emerald-300" size={19} />
                      <h4 className="text-lg font-semibold text-white">Your strengths for this role</h4>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {jobMatchResult.matched_skills.length
                        ? jobMatchResult.matched_skills.map((skill) => <span key={skill} className="tag-pill suggest">{skill}</span>)
                        : <p className="text-sm text-slate-400">No direct skill matches were identified from the resume text.</p>}
                    </div>
                  </section>
                  <section className="panel-card p-6">
                    <div className="flex items-center gap-2">
                      <Search className="text-amber-300" size={19} />
                      <h4 className="text-lg font-semibold text-white">Keywords to address</h4>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {jobMatchResult.missing_keywords.length
                        ? jobMatchResult.missing_keywords.map((keyword) => <span key={keyword} className="tag-pill warning">{keyword}</span>)
                        : <p className="text-sm text-slate-400">No major missing keywords were identified.</p>}
                    </div>
                    <p className="mt-3 text-xs text-slate-400">Only add these if they accurately reflect your experience.</p>
                  </section>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <section className="panel-card p-6">
                    <h4 className="text-lg font-semibold text-white">Experience gaps to review</h4>
                    <ul className="mt-4 space-y-3">
                      {jobMatchResult.experience_gaps.length
                        ? jobMatchResult.experience_gaps.map((gap) => <li key={gap} className="flex gap-3 text-sm leading-6 text-slate-300"><span className="mt-1 text-amber-300">•</span>{gap}</li>)
                        : <li className="text-sm text-slate-400">No major experience gaps were identified.</li>}
                    </ul>
                  </section>
                  <section className="panel-card p-6">
                    <h4 className="text-lg font-semibold text-white">Your next best moves</h4>
                    <ol className="mt-4 space-y-3">
                      {jobMatchResult.priority_actions.map((action, index) => (
                        <li key={action} className="flex gap-3 text-sm leading-6 text-slate-300">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sky-400/10 text-xs font-bold text-sky-300">{index + 1}</span>{action}
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>

                <section className="panel-card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">AI rewrite coach</p>
                      <h4 className="mt-1 text-lg font-semibold text-white">Stronger bullets, grounded in your resume</h4>
                    </div>
                    <span className="text-xs text-slate-400">Review every suggestion for accuracy before using it.</span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {jobMatchResult.tailored_bullets.length
                      ? jobMatchResult.tailored_bullets.map((bullet, index) => (
                        <div key={bullet} className="rounded-2xl border border-violet-400/15 bg-violet-400/5 p-4">
                          <span className="text-xs font-semibold text-violet-300">SUGGESTION {index + 1}</span>
                          <p className="mt-2 text-sm leading-6 text-slate-200">{bullet}</p>
                        </div>
                      ))
                      : <p className="text-sm text-slate-400">There is not enough resume evidence for a safe bullet rewrite. Add more detail to your saved resume first.</p>}
                  </div>
                </section>
              </div>
            ) : (
              <section className="panel-card grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">One tailored report. No guesswork.</p>
                  <h4 className="mt-2 text-lg font-semibold text-white">Know what to emphasize before you apply.</h4>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">The match is based on your saved resume and the exact job post—not generic sample roles. Suggestions never add credentials or achievements you haven’t provided.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {['Role fit score', 'Keyword gaps', 'Bullet rewrites'].map((item) => <span key={item} className="tag-pill">{item}</span>)}
                </div>
              </section>
            )}
          </div>
        )
      case 'mock-interview': {
        const averageScore = mockInterview?.turns.length
          ? Math.round(mockInterview.turns.reduce((sum, turn) => sum + turn.score, 0) / mockInterview.turns.length)
          : 0
        const latestTurn = mockInterview?.turns.at(-1)
        const interviewProgress = mockInterview
          ? mockInterview.completed ? 100 : Math.round(((mockInterview.questionNumber - 1) / 5) * 100)
          : 0

        return (
          <div className="space-y-6">
            <section className="job-match-hero overflow-hidden rounded-3xl border border-violet-400/20 bg-[radial-gradient(ellipse_at_90%_0%,rgba(124,58,237,0.24),transparent_42%),linear-gradient(135deg,rgba(49,46,129,0.48),rgba(15,23,42,0.96))] p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="max-w-2xl">
                  <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-200">
                    <MessageSquare size={14} /> Personalized practice
                  </span>
                  <h3 className="mt-4 text-2xl font-bold text-white md:text-3xl">Live AI Mock Interview</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Practice a five-question interview tailored to your resume and target role.
                    Get honest, specific coaching after every answer.
                  </p>
                </div>
                <div className="job-match-privacy rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-slate-300">
                  <p className="font-semibold text-white">Practice in private</p>
                  <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">Your answers are used to coach this session and aren’t stored in Gemini chat history.</p>
                </div>
              </div>
            </section>

            {!mockInterview ? (
              <section className="panel-card p-6 md:p-8">
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Set up your session</p>
                  <h4 className="mt-2 text-xl font-semibold text-white">Walk into your next interview ready.</h4>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Questions are grounded in the saved resume you choose. Add a job description for an even closer simulation.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-200">
                    Saved resume
                    <select
                      value={resumeFiles.some((resume) => resume.id === interviewResumeId) ? interviewResumeId : resumeFiles[0]?.id || ''}
                      onChange={(event) => setInterviewResumeId(event.target.value)}
                      disabled={resumeFiles.length === 0 || mockInterviewBusy}
                      className="job-match-control mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 disabled:opacity-60"
                    >
                      {resumeFiles.length === 0 && <option value="">Upload a resume to get started</option>}
                      {resumeFiles.map((resume) => <option key={resume.id} value={resume.id}>{resume.name}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-200">
                    Target role
                    <input
                      value={interviewRole}
                      onChange={(event) => setInterviewRole(event.target.value)}
                      disabled={mockInterviewBusy}
                      maxLength={150}
                      placeholder="e.g. Frontend Engineer"
                      className="job-match-control mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-200 md:col-span-2">
                    Job description <span className="font-normal text-slate-400">(optional)</span>
                    <textarea
                      value={interviewJobDescription}
                      onChange={(event) => setInterviewJobDescription(event.target.value)}
                      disabled={mockInterviewBusy}
                      rows={4}
                      maxLength={12000}
                      placeholder="Paste the role requirements to tailor interview questions..."
                      className="job-match-control mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                    />
                    <span className="mt-1 block text-right text-xs text-slate-400">{interviewJobDescription.length.toLocaleString()} / 12,000</span>
                  </label>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    className="primary-button inline-flex items-center gap-2"
                    onClick={() => void beginMockInterview()}
                    disabled={mockInterviewBusy || resumeFiles.length === 0 || interviewRole.trim().length < 2}
                  >
                    <MessageSquare size={16} />
                    {mockInterviewBusy ? 'Preparing your interview…' : 'Start mock interview'}
                  </button>
                  {resumeFiles.length === 0 && <button type="button" className="text-sm font-medium text-sky-300" onClick={() => navigate('/dashboard/resume-analyzer')}>Upload a resume first <ChevronRight className="inline" size={15} /></button>}
                  <span className="text-xs text-slate-400">5 questions · instant coaching · final scorecard</span>
                </div>
                {mockInterviewBusy && <p role="status" className="mt-4 text-sm text-violet-200">Building questions from your resume and target role…</p>}
              </section>
            ) : (
              <>
                <section className="panel-card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">{mockInterview.completed ? 'Interview complete' : `Question ${mockInterview.questionNumber} of 5`}</p>
                      <h4 className="mt-1 text-lg font-semibold text-white">{mockInterview.role} interview practice</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      {mockInterview.completed && <span className="score-pill">Overall {averageScore}/100</span>}
                      <button type="button" className="secondary-button inline-flex items-center gap-2" onClick={resetMockInterview}><RotateCcw size={15} /> New session</button>
                    </div>
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-700/70" role="progressbar" aria-label="Interview progress" aria-valuenow={interviewProgress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400 transition-all" style={{ width: `${interviewProgress}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-400"><span>Warm-up</span><span>{mockInterview.turns.length} answered</span><span>Scorecard</span></div>
                </section>

                {!mockInterview.completed && (
                  <section className="panel-card p-6 md:p-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tag-pill">{mockInterview.question.question_type}</span>
                      <span className="text-sm text-slate-400">Interviewer focus: {mockInterview.question.focus}</span>
                    </div>
                    <h4 className="mt-5 max-w-4xl text-xl font-semibold leading-8 text-white md:text-2xl">{mockInterview.question.question}</h4>
                    <label className="mt-6 block text-sm font-medium text-slate-200">
                      Your answer
                      <textarea
                        value={mockInterviewAnswer}
                        onChange={(event) => setMockInterviewAnswer(event.target.value)}
                        disabled={mockInterviewBusy}
                        rows={7}
                        maxLength={4000}
                        placeholder="Structure your answer with a specific situation, what you did, and the result..."
                        className="job-match-control mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                      />
                      <span className="mt-1 block text-right text-xs text-slate-400">{mockInterviewAnswer.length.toLocaleString()} / 4,000 · minimum 20 characters</span>
                    </label>
                    <button
                      type="button"
                      className="primary-button mt-4 inline-flex items-center gap-2"
                      onClick={() => void submitMockInterviewAnswer()}
                      disabled={mockInterviewBusy || mockInterviewAnswer.trim().length < 20}
                    >
                      {mockInterviewBusy ? 'Reviewing your answer…' : 'Submit answer'}
                      {!mockInterviewBusy && <ChevronRight size={16} />}
                    </button>
                    {mockInterviewBusy && <p role="status" className="mt-3 text-sm text-violet-200">Your coach is reviewing the evidence, structure, and clarity of your answer…</p>}
                  </section>
                )}

                {latestTurn && (
                  <section className="panel-card space-y-5 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Answer coaching</p>
                        <h4 className="mt-1 text-lg font-semibold text-white">Question {mockInterview.turns.length} feedback</h4>
                      </div>
                      <span className="score-pill">{latestTurn.score}/100</span>
                    </div>
                    <p className="rounded-2xl border border-slate-700/70 bg-slate-950/30 p-4 text-sm leading-6 text-slate-300">{latestTurn.feedback}</p>
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <h5 className="font-semibold text-emerald-300">What worked</h5>
                        <ul className="mt-2 space-y-2 text-sm text-slate-300">{latestTurn.strengths.map((item) => <li key={item}>✓ {item}</li>)}</ul>
                      </div>
                      <div>
                        <h5 className="font-semibold text-amber-300">Try next time</h5>
                        <ul className="mt-2 space-y-2 text-sm text-slate-300">{latestTurn.improvements.map((item) => <li key={item}>→ {item}</li>)}</ul>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-violet-400/15 bg-violet-400/5 p-4">
                      <h5 className="font-semibold text-violet-200">Answer framework to consider</h5>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{latestTurn.sample_answer}</p>
                    </div>
                  </section>
                )}

                {mockInterview.completed && (
                  <section className="panel-card p-6 md:p-8">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400/10 text-amber-300"><Trophy size={22} /></div>
                      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Your interview scorecard</p><h4 className="mt-1 text-xl font-semibold text-white">You completed all five questions</h4></div>
                    </div>
                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                      {[
                        { label: 'Overall score', value: averageScore },
                        { label: 'Strongest answer', value: Math.max(...mockInterview.turns.map((turn) => turn.score)) },
                        { label: 'Questions completed', value: mockInterview.turns.length },
                      ].map((metric) => (
                        <div key={metric.label} className="metric-card">
                          <p className="text-sm text-slate-400">{metric.label}</p>
                          <p className="mt-2 text-3xl font-bold text-white">{metric.value}{metric.label !== 'Questions completed' ? '/100' : ''}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 space-y-3">
                      {mockInterview.turns.map((turn, index) => (
                        <div key={`${index}-${turn.question}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/30 p-4">
                          <div className="max-w-3xl"><p className="text-xs font-semibold text-slate-400">QUESTION {index + 1}</p><p className="mt-1 text-sm text-slate-200">{turn.question}</p></div>
                          <span className="score-pill">{turn.score}/100</span>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="primary-button mt-6 inline-flex items-center gap-2" onClick={resetMockInterview}><RotateCcw size={16} /> Practice again</button>
                  </section>
                )}
              </>
            )}
          </div>
        )
      }
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
                      <button
                        key={task}
                        type="button"
                        aria-pressed={completedTasks.includes(task)}
                        className={`tag-pill ${completedTasks.includes(task) ? 'suggest' : ''}`}
                        onClick={() => toggleRoadmapTask(task)}
                      >
                        {completedTasks.includes(task) ? '✓ ' : ''}{task}
                      </button>
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
            <div className="mt-6 max-h-96 space-y-3 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200">
              {mentorMessages.length === 0 && <p className="text-slate-400">Your conversation for this session will appear here.</p>}
              {mentorMessages.map((message) => (
                <div key={message.id} className={message.role === 'user' ? 'text-right' : 'text-left'}>
                  <span className="mb-1 block text-xs text-slate-400">{message.role === 'user' ? 'You' : 'Career mentor'}</span>
                  <p className="inline-block max-w-[90%] rounded-2xl bg-slate-800 px-4 py-2">{message.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-3">
              <input value={mentorInput} onChange={(event) => setMentorInput(event.target.value)} className="input-plain" placeholder="Ask your mentor..." onKeyDown={(event) => { if (event.key === 'Enter' && !sendingMentor) void askMentor() }} />
              <button className="primary-button" onClick={askMentor} disabled={sendingMentor || !mentorInput.trim()}>{sendingMentor ? 'Thinking...' : 'Ask'}</button>
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

        <div className="p-6">
          {actionError && <p role="alert" className="error-banner mb-5">{actionError}</p>}
          {renderView()}
        </div>
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
