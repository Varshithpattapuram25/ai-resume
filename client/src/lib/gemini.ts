import { supabase } from './supabase'
import type { ResumeAnalysis } from './resumes'

const API_BASE = import.meta.env.VITE_GEMINI_API_BASE
  || (import.meta.env.PROD ? '/api' : 'http://localhost:5002/api')

async function postGemini<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!session?.access_token) throw new Error('Sign in before using Gemini features.')

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })

  const result = await response.json().catch(() => null) as { message?: string } | null
  if (!response.ok) {
    throw new Error(result?.message || `Gemini request failed with status ${response.status}.`)
  }
  return result as T
}

export async function analyzeResumeWithGemini(text: string, targetRole = '') {
  const result = await postGemini<{ analysis: ResumeAnalysis }>('/ai/analyze', { text, targetRole })
  return result.analysis
}

export async function askGeminiMentor(message: string, context: Record<string, unknown>) {
  const result = await postGemini<{ reply: string }>('/ai/mentor', { message, context })
  return result.reply
}

export type JobMatchResult = {
  match_score: number
  summary: string
  matched_skills: string[]
  missing_keywords: string[]
  experience_gaps: string[]
  tailored_bullets: string[]
  priority_actions: string[]
}

export async function matchResumeToJob(resumeText: string, jobDescription: string) {
  const result = await postGemini<{ match: JobMatchResult }>('/ai/job-match', { resumeText, jobDescription })
  return result.match
}

export type InterviewQuestionType = 'behavioral' | 'technical' | 'experience' | 'situational'

export type MockInterviewQuestion = {
  question: string
  focus: string
  question_type: InterviewQuestionType
}

export type MockInterviewTurn = {
  question: string
  answer: string
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
  sample_answer: string
}

export type MockInterviewEvaluation = MockInterviewTurn & {
  completed: boolean
  next_question: string
  next_focus: string
  next_question_type: InterviewQuestionType
}

export async function startMockInterview(resumeText: string, role: string, jobDescription: string) {
  const result = await postGemini<{ question: MockInterviewQuestion }>('/ai/mock-interview/start', {
    resumeText,
    role,
    jobDescription,
  })
  return result.question
}

export async function evaluateMockInterviewAnswer(input: {
  resumeText: string
  role: string
  jobDescription: string
  question: string
  focus: string
  questionType: InterviewQuestionType
  answer: string
  questionNumber: number
  history: Array<Pick<MockInterviewTurn, 'question' | 'answer'>>
}) {
  const result = await postGemini<{ evaluation: MockInterviewEvaluation }>('/ai/mock-interview/answer', input)
  return result.evaluation
}
