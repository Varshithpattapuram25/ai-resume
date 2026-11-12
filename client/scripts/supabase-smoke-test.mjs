import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_TEST_EMAIL', 'SUPABASE_TEST_PASSWORD']
const missing = required.filter((name) => !process.env[name])
if (missing.length) {
  throw new Error(`Missing environment variables: ${missing.join(', ')}`)
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const anonymousClient = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const failIfError = (error) => {
  if (error) throw error
}

let resumeId
let storagePath
let signedIn = false

try {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: process.env.SUPABASE_TEST_EMAIL,
    password: process.env.SUPABASE_TEST_PASSWORD,
  })
  failIfError(signInError)
  signedIn = true

  const { data: userData, error: userError } = await supabase.auth.getUser()
  failIfError(userError)
  if (!userData.user) throw new Error('The test account could not be loaded.')

  storagePath = `${userData.user.id}/supabase-smoke-${randomUUID()}.pdf`
  const { error: uploadError } = await supabase.storage
    .from('resumes')
    .upload(storagePath, new Blob(['supabase resume smoke test'], { type: 'application/pdf' }), {
      contentType: 'application/pdf',
      upsert: false,
    })
  failIfError(uploadError)

  const { data: resume, error: resumeError } = await supabase
    .from('resumes')
    .insert({
      user_id: userData.user.id,
      original_file_name: 'supabase-smoke-test.pdf',
      uploaded_file_url: storagePath,
      extracted_resume_text: 'Smoke test extracted text',
      file_type: 'PDF',
      resume_status: 'analyzed',
    })
    .select('id')
    .single()
  failIfError(resumeError)
  resumeId = resume.id

  const { error: analysisError } = await supabase.from('resume_analyses').insert({
    user_id: userData.user.id,
    resume_id: resumeId,
    ats_score: 80,
    skills_score: 75,
    keyword_match_score: 70,
    strengths: ['Smoke test'],
    weaknesses: [],
    missing_skills: [],
    improvement_suggestions: [],
    job_role_recommendations: [{ role: 'Test role', match: 80 }],
  })
  failIfError(analysisError)

  const { data: anonymousRows, error: anonymousReadError } = await anonymousClient
    .from('resumes')
    .select('id')
    .eq('id', resumeId)
  if (!anonymousReadError && anonymousRows.length > 0) {
    throw new Error('RLS check failed: an unauthenticated client could read a resume.')
  }

  const signedUrlResult = await supabase.storage.from('resumes').createSignedUrl(storagePath, 60)
  failIfError(signedUrlResult.error)
  const downloadedFile = await fetch(signedUrlResult.data.signedUrl)
  if (!downloadedFile.ok) throw new Error(`Signed file download failed: HTTP ${downloadedFile.status}`)

  const { error: signOutError } = await supabase.auth.signOut()
  failIfError(signOutError)
  signedIn = false

  const { error: secondSignInError } = await supabase.auth.signInWithPassword({
    email: process.env.SUPABASE_TEST_EMAIL,
    password: process.env.SUPABASE_TEST_PASSWORD,
  })
  failIfError(secondSignInError)
  signedIn = true

  const { data: persistedResume, error: persistedResumeError } = await supabase
    .from('resumes')
    .select('id, extracted_resume_text')
    .eq('id', resumeId)
    .single()
  failIfError(persistedResumeError)
  if (persistedResume.extracted_resume_text !== 'Smoke test extracted text') {
    throw new Error('Resume data did not persist across sign-out and sign-in.')
  }

  const { data: persistedAnalysis, error: persistedAnalysisError } = await supabase
    .from('resume_analyses')
    .select('ats_score')
    .eq('resume_id', resumeId)
    .single()
  failIfError(persistedAnalysisError)
  if (persistedAnalysis.ats_score !== 80) throw new Error('Analysis data was not persisted.')

  const { error: removeError } = await supabase.storage.from('resumes').remove([storagePath])
  failIfError(removeError)
  const { error: deleteError } = await supabase.from('resumes').delete().eq('id', resumeId)
  failIfError(deleteError)
  resumeId = undefined
  storagePath = undefined

  console.log('Supabase smoke test passed: auth, private upload, database writes/reads, signed download, persistence, and cleanup.')
} finally {
  const cleanupErrors = []
  if ((resumeId || storagePath) && !signedIn) {
    const { error } = await supabase.auth.signInWithPassword({
      email: process.env.SUPABASE_TEST_EMAIL,
      password: process.env.SUPABASE_TEST_PASSWORD,
    })
    if (error) cleanupErrors.push(`Could not sign in for cleanup: ${error.message}`)
    else signedIn = true
  }
  if (resumeId) {
    const { error } = await supabase.from('resumes').delete().eq('id', resumeId)
    if (error) cleanupErrors.push(`Could not clean up the temporary resume row: ${error.message}`)
  }
  if (storagePath) {
    const { error } = await supabase.storage.from('resumes').remove([storagePath])
    if (error) cleanupErrors.push(`Could not clean up the temporary Storage object: ${error.message}`)
  }
  if (signedIn) {
    const { error } = await supabase.auth.signOut()
    if (error) cleanupErrors.push(`Could not sign out the Supabase smoke-test account: ${error.message}`)
  }
  if (cleanupErrors.length) {
    console.error(cleanupErrors.join('\n'))
    process.exitCode = 1
  }
}
