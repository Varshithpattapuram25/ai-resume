import { requireSupabaseConfig, supabase } from './supabase'
import { analyzeResumeWithGemini } from './gemini'

const RESUME_BUCKET = 'resumes'
const MAX_FILE_SIZE = 5 * 1024 * 1024
const MIGRATION_MESSAGE = 'Supabase is missing the resume database tables. Run supabase/migrations/20261112000000_create_resume_analyzer_schema.sql in your project’s SQL Editor, then try again.'

function isMissingSchemaError(error: { code?: string; message?: string }) {
  return error.code === 'PGRST205' || error.code === '42P01'
}

function isMissingBucketError(error: { message?: string }) {
  return /bucket not found|bucket.*does not exist/i.test(error.message || '')
}

export type ResumeAnalysis = {
  ats_score: number
  skills_score: number
  keyword_match_score: number
  strengths: string[]
  weaknesses: string[]
  missing_skills: string[]
  improvement_suggestions: string[]
  job_role_recommendations: Array<{ role: string; match: number; reason: string }>
}

export type SavedResume = {
  id: string
  original_file_name: string
  uploaded_file_url: string
  file_type: 'PDF' | 'DOCX'
  upload_date: string
  resume_status: string
  analysis: ResumeAnalysis | null
}

async function extractResumeText(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'pdf') {
    const [pdfjs, pdfWorker] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker.default
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
    const pages = await Promise.all(
      Array.from({ length: pdf.numPages }, async (_, index) => {
        const page = await pdf.getPage(index + 1)
        const content = await page.getTextContent()
        return content.items
          .filter((item) => 'str' in item)
          .map((item) => item.str)
          .join(' ')
      }),
    )
    return pages.join('\n')
  }

  const { default: mammoth } = await import('mammoth/mammoth.browser')
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return result.value
}

export async function saveResume(file: File, targetRole = '') {
  requireSupabaseConfig()
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension !== 'pdf' && extension !== 'docx') {
    throw new Error('Only PDF and DOCX resumes are supported.')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Resume files must be 5MB or smaller.')
  }

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!authData.user) throw new Error('Sign in before uploading a resume.')

  const extractedText = await extractResumeText(file)
  if (!extractedText.trim()) {
    throw new Error('No readable text was found in the resume.')
  }

  const analysis = await analyzeResumeWithGemini(extractedText, targetRole)
  const fileType = extension.toUpperCase() as 'PDF' | 'DOCX'
  const contentType = fileType === 'PDF'
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  const safeName = file.name.replace(/[^\w.-]/g, '_')
  const storagePath = `${authData.user.id}/${crypto.randomUUID()}-${safeName}`
  const { error: storageError } = await supabase.storage
    .from(RESUME_BUCKET)
    .upload(storagePath, file, { contentType, upsert: false })
  if (storageError) {
    if (isMissingBucketError(storageError)) {
      throw new Error('The private “resumes” Storage bucket is missing. Run supabase/migrations/20261112000000_create_resume_analyzer_schema.sql in your project’s SQL Editor, then try again.')
    }
    throw storageError
  }

  let resumeId: string | undefined
  try {
    const { data: resume, error: resumeError } = await supabase
      .from('resumes')
      .insert({
        user_id: authData.user.id,
        original_file_name: file.name,
        uploaded_file_url: storagePath,
        extracted_resume_text: extractedText,
        file_type: fileType,
        resume_status: 'analyzed',
      })
      .select('id')
      .single()
    if (resumeError) {
      if (isMissingSchemaError(resumeError)) throw new Error(MIGRATION_MESSAGE)
      throw resumeError
    }
    resumeId = resume.id

    const { error: analysisError } = await supabase.from('resume_analyses').insert({
      user_id: authData.user.id,
      resume_id: resumeId,
      ...analysis,
    })
    if (analysisError) {
      if (isMissingSchemaError(analysisError)) throw new Error(MIGRATION_MESSAGE)
      throw analysisError
    }
  } catch (error) {
    if (resumeId) {
      const { error: rowCleanupError } = await supabase.from('resumes').delete().eq('id', resumeId)
      if (rowCleanupError) {
        throw new Error(`Resume save failed and its database record could not be cleaned up: ${rowCleanupError.message}`)
      }
    }
    const { error: storageCleanupError } = await supabase.storage.from(RESUME_BUCKET).remove([storagePath])
    if (storageCleanupError) {
      throw new Error(`Resume save failed and its uploaded file could not be cleaned up: ${storageCleanupError.message}`)
    }
    throw error
  }

  if (!resumeId) throw new Error('The resume record was not returned after saving.')
  return { id: resumeId, path: storagePath, fileType, analysis }
}

export async function fetchResumes(): Promise<SavedResume[]> {
  requireSupabaseConfig()
  const { data: resumes, error: resumesError } = await supabase
    .from('resumes')
    .select('id, original_file_name, uploaded_file_url, file_type, upload_date, resume_status')
    .order('upload_date', { ascending: false })
  if (resumesError) {
    if (isMissingSchemaError(resumesError)) throw new Error(MIGRATION_MESSAGE)
    throw resumesError
  }
  if (!resumes.length) return []

  const resumeIds = resumes.map((resume) => resume.id)
  const { data: analyses, error: analysesError } = await supabase
    .from('resume_analyses')
    .select('resume_id, ats_score, skills_score, keyword_match_score, strengths, weaknesses, missing_skills, improvement_suggestions, job_role_recommendations')
    .in('resume_id', resumeIds)
  if (analysesError) {
    if (isMissingSchemaError(analysesError)) throw new Error(MIGRATION_MESSAGE)
    throw analysesError
  }

  return resumes.map((resume) => {
    const analysis = analyses.find((item) => item.resume_id === resume.id)
    return {
      ...resume,
      file_type: resume.file_type as 'PDF' | 'DOCX',
      analysis: analysis ? {
        ats_score: analysis.ats_score,
        skills_score: analysis.skills_score,
        keyword_match_score: analysis.keyword_match_score,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        missing_skills: analysis.missing_skills,
        improvement_suggestions: analysis.improvement_suggestions,
        job_role_recommendations: analysis.job_role_recommendations,
      } : null,
    }
  })
}

export async function fetchResumeText(resumeId: string): Promise<string> {
  requireSupabaseConfig()
  const { data: resume, error } = await supabase
    .from('resumes')
    .select('extracted_resume_text')
    .eq('id', resumeId)
    .single()
  if (error) {
    if (isMissingSchemaError(error)) throw new Error(MIGRATION_MESSAGE)
    throw error
  }
  if (!resume.extracted_resume_text?.trim()) {
    throw new Error('This resume has no extracted text. Upload it again before matching it to a job.')
  }
  return resume.extracted_resume_text
}

export async function getResumeUrl(path: string, download = false) {
  requireSupabaseConfig()
  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(path, 60, download ? { download: true } : undefined)
  if (error) throw error
  return data.signedUrl
}

export async function deleteSavedResume(resume: SavedResume) {
  requireSupabaseConfig()
  const { error: storageError } = await supabase.storage.from(RESUME_BUCKET).remove([resume.uploaded_file_url])
  if (storageError) throw storageError

  const { error: rowError } = await supabase.from('resumes').delete().eq('id', resume.id)
  if (rowError) {
    throw new Error(`The file was removed, but its database record could not be deleted: ${rowError.message}`)
  }
}
