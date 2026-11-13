const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { after, before, test } = require('node:test');

process.env.SUPABASE_URL = 'https://supabase.test';
process.env.SUPABASE_ANON_KEY = 'test-publishable-key';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.GEMINI_PORT = '0';

const {
  app,
  validateAnalysis,
  validateJobMatch,
  validateInterviewQuestion,
  validateInterviewEvaluation,
} = require('./gemini-api');

const sampleAnalysis = {
  ats_score: 82,
  skills_score: 77,
  keyword_match_score: 70,
  strengths: ['Clear project evidence'],
  weaknesses: ['Limited metrics'],
  missing_skills: ['Docker'],
  improvement_suggestions: ['Quantify project outcomes'],
  job_role_recommendations: [{ role: 'Frontend Developer', match: 82, reason: 'Strong UI experience.' }],
};

const sampleJobMatch = {
  match_score: 84,
  summary: 'Strong alignment on React and accessibility; add evidence of testing tools if you have it.',
  matched_skills: ['React', 'Accessibility'],
  missing_keywords: ['Playwright'],
  experience_gaps: ['The resume does not describe browser automation experience.'],
  tailored_bullets: ['Built accessible React interfaces for customer-facing workflows.'],
  priority_actions: ['Add a testing example only if you have completed one.'],
};

const sampleInterviewQuestion = {
  question: 'Tell me about a project where you used React to solve a user problem.',
  focus: 'Connect a resume project to user impact.',
  question_type: 'experience',
};

const sampleInterviewEvaluation = {
  score: 78,
  feedback: 'You explained your implementation clearly; make your personal contribution more specific.',
  strengths: ['Clear technical context'],
  improvements: ['Clarify your individual decision and its result.'],
  sample_answer: 'I built [specific feature] with React to address [user need]. My contribution was [your role], and the result was [real outcome].',
  next_question: 'How would you make a React page accessible to keyboard and screen-reader users?',
  next_focus: 'Explain practical accessibility techniques.',
  next_question_type: 'technical',
};

let server;
let originalFetch;
let upstreamCalls;
let transientOverloadCalls;

function request(path, body, token = 'valid-session-token') {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? '' : JSON.stringify(body);
    const req = http.request({
      host: '127.0.0.1',
      port: server.address().port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => resolve({
        status: res.statusCode,
        body: responseBody ? JSON.parse(responseBody) : null,
      }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

before(async () => {
  originalFetch = global.fetch;
  upstreamCalls = [];
  transientOverloadCalls = 0;
  global.fetch = async (url, options = {}) => {
    upstreamCalls.push({ url: String(url), options });
    if (String(url).endsWith('/auth/v1/user')) {
      return new Response(JSON.stringify({ id: 'user-123', email: 'user@example.com' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const requestBody = JSON.parse(options.body);
    const prompt = requestBody.input;
    assert.equal(String(url), 'https://generativelanguage.googleapis.com/v1beta/interactions');
    assert.ok(['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash-lite'].includes(requestBody.model));
    assert.equal(typeof requestBody.system_instruction, 'string');
    assert.equal(requestBody.response_format.mime_type, 'application/json');
    assert.equal(requestBody.generation_config.max_output_tokens > 0, true);
    assert.equal(requestBody.store, false);
    if (requestBody.model === 'gemini-3.1-flash-lite' && prompt.includes('TRIGGER_OVERLOAD_FOR_TEST')) {
      return new Response(JSON.stringify({
        error: { message: 'This model is currently experiencing high demand.' },
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (requestBody.model === 'gemini-3.1-flash-lite'
      && prompt.includes('TRIGGER_TRANSIENT_ONCE')
      && transientOverloadCalls++ === 0) {
      return new Response(JSON.stringify({
        error: { message: 'This model is currently experiencing high demand.' },
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '0.001' },
      });
    }
    if (prompt.includes('TRIGGER_TIMEOUT_FOR_TEST')) {
      throw Object.assign(new Error('Gemini request timed out.'), { name: 'TimeoutError' });
    }
    if (prompt.includes('Generate the first of five interview questions.')) {
      return new Response(JSON.stringify({
        steps: [{
          type: 'model_output',
          content: [{ type: 'text', text: JSON.stringify(sampleInterviewQuestion) }],
        }],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (prompt.includes('CANDIDATE ANSWER:')) {
      const evaluation = prompt.includes('CURRENT QUESTION 5 OF 5')
        ? { ...sampleInterviewEvaluation, next_question: '' }
        : sampleInterviewEvaluation;
      return new Response(JSON.stringify({
        steps: [{
          type: 'model_output',
          content: [{ type: 'text', text: JSON.stringify(evaluation) }],
        }],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (prompt.includes('JOB DESCRIPTION:')) {
      return new Response(JSON.stringify({
        steps: [{
          type: 'model_output',
          content: [{ type: 'text', text: JSON.stringify(sampleJobMatch) }],
        }],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({
      steps: [{
        type: 'model_output',
        content: [{
          type: 'text',
          text: JSON.stringify(
            prompt.includes('\n\nQuestion:\n')
              ? { reply: 'Focus on measurable project outcomes.' }
              : sampleAnalysis,
          ),
        }],
      }],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
});

test('analysis retries with a fallback model when Gemini reports high demand', async () => {
  const result = await request('/api/ai/analyze', {
    text: 'TRIGGER_OVERLOAD_FOR_TEST Built React applications and shipped accessible interfaces.',
    targetRole: 'Frontend Developer',
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body.analysis, sampleAnalysis);
  const requestedModels = upstreamCalls
    .filter((call) => call.url.endsWith('/v1beta/interactions') && call.options.body.includes('TRIGGER_OVERLOAD_FOR_TEST'))
    .map((call) => JSON.parse(call.options.body).model);
  assert.deepEqual(requestedModels, ['gemini-3.1-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash']);
});

test('analysis retries a transient 429 before using a fallback model', async () => {
  const result = await request('/api/ai/analyze', {
    text: 'TRIGGER_TRANSIENT_ONCE Built React applications and shipped accessible interfaces.',
    targetRole: 'Frontend Developer',
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body.analysis, sampleAnalysis);
  const requestedModels = upstreamCalls
    .filter((call) => call.url.endsWith('/v1beta/interactions') && call.options.body.includes('TRIGGER_TRANSIENT_ONCE'))
    .map((call) => JSON.parse(call.options.body).model);
  assert.deepEqual(requestedModels, ['gemini-3.1-flash-lite', 'gemini-3.1-flash-lite']);
});

test('analysis returns a clear error when all Gemini models time out', async () => {
  const result = await request('/api/ai/analyze', {
    text: 'TRIGGER_TIMEOUT_FOR_TEST Resume content.',
    targetRole: 'Frontend Developer',
  });

  assert.equal(result.status, 502);
  assert.match(result.body.message, /Gemini did not respond in time/);
});

after(async () => {
  global.fetch = originalFetch;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('analysis rejects requests without an authenticated Supabase session', async () => {
  const result = await request('/api/ai/analyze', { text: 'UNAUTHENTICATED_SENTINEL_RESUME' }, '');
  assert.equal(result.status, 401);
  assert.equal(upstreamCalls.some((call) => call.options.body?.includes('UNAUTHENTICATED_SENTINEL_RESUME')), false);
});

test('analysis route works when the deployment strips the /api prefix', async () => {
  const result = await request('/ai/analyze', { text: 'UNAUTHENTICATED_STRIPPED_PREFIX_RESUME' }, '');
  assert.equal(result.status, 401);
  assert.equal(upstreamCalls.some((call) => call.options.body?.includes('UNAUTHENTICATED_STRIPPED_PREFIX_RESUME')), false);
});

test('analysis verifies the user and returns validated Gemini analysis', async () => {
  const result = await request('/api/ai/analyze', {
    text: 'NORMAL_ANALYSIS_SENTINEL Built React applications and shipped accessible interfaces.',
    targetRole: 'Frontend Developer',
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body.analysis, sampleAnalysis);
  const analysisCalls = upstreamCalls.filter((call) => call.options.body?.includes('NORMAL_ANALYSIS_SENTINEL'));
  assert.equal(analysisCalls.length, 1);
  assert.equal(analysisCalls[0].url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
  assert.equal(analysisCalls[0].options.headers['x-goog-api-key'], 'test-gemini-key');
});

test('mentor returns Gemini response with the user analysis context', async () => {
  const result = await request('/api/ai/mentor', {
    message: 'How can I improve my resume?',
    context: { atsScore: 82, strengths: ['Clear project evidence'] },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.reply, 'Focus on measurable project outcomes.');
});

test('job match compares resume evidence with the supplied job description', async () => {
  const result = await request('/api/ai/job-match', {
    resumeText: 'Built accessible React interfaces for customer-facing workflows.',
    jobDescription: `Frontend engineer needed to build accessible customer-facing web products.
      Responsibilities include developing reusable React components, collaborating with design,
      testing browser behavior, and maintaining a high-quality production codebase. Experience
      with JavaScript, accessibility, and automated testing is preferred.`,
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body.match, sampleJobMatch);
  const matchCall = upstreamCalls.find((call) => call.options.body?.includes('JOB DESCRIPTION:'));
  assert.ok(matchCall);
  const requestBody = JSON.parse(matchCall.options.body);
  assert.match(requestBody.input, /CANDIDATE RESUME:/);
  assert.match(requestBody.system_instruction, /Never claim the candidate has a skill/);
});

test('job match rejects an incomplete description without calling Gemini', async () => {
  const callCount = upstreamCalls.length;
  const result = await request('/api/ai/job-match', {
    resumeText: 'Resume text.',
    jobDescription: 'Too short.',
  });

  assert.equal(result.status, 400);
  assert.match(result.body.message, /between 80 and 15,000 characters/);
  assert.equal(upstreamCalls.length, callCount + 1);
  assert.equal(upstreamCalls.at(-1).url, 'https://supabase.test/auth/v1/user');
});

test('analysis validation rejects invalid score output', () => {
  assert.throws(() => validateAnalysis({ ...sampleAnalysis, ats_score: 120 }), /invalid ats_score/);
});

test('job match validation rejects scores outside the supported range', () => {
  assert.throws(() => validateJobMatch({ ...sampleJobMatch, match_score: 101 }), /invalid job match score/);
});

test('mock interview starts with a role-specific question after session authentication', async () => {
  const result = await request('/api/ai/mock-interview/start', {
    resumeText: 'Built React projects and improved keyboard navigation.',
    role: 'Frontend Engineer',
    jobDescription: 'Build accessible web applications and collaborate with design.',
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body.question, sampleInterviewQuestion);
  const startCall = upstreamCalls.find((call) => call.options.body?.includes('Generate the first of five interview questions.'));
  assert.ok(startCall);
  assert.match(JSON.parse(startCall.options.body).input, /TARGET ROLE:\nFrontend Engineer/);
});

test('mock interview evaluates answers and returns actionable coaching', async () => {
  const result = await request('/api/ai/mock-interview/answer', {
    resumeText: 'Built React projects and improved keyboard navigation.',
    role: 'Frontend Engineer',
    question: sampleInterviewQuestion.question,
    focus: sampleInterviewQuestion.focus,
    questionType: sampleInterviewQuestion.question_type,
    answer: 'I built a React dashboard and added keyboard navigation to help users move through the interface.',
    questionNumber: 1,
    history: [],
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body.evaluation, { ...sampleInterviewEvaluation, completed: false });
  const answerCall = upstreamCalls.find((call) => call.options.body?.includes('CANDIDATE ANSWER:'));
  assert.ok(answerCall);
  assert.match(JSON.parse(answerCall.options.body).system_instruction, /Never invent candidate experience/);
});

test('mock interview rejects short answers before calling Gemini', async () => {
  const callsBefore = upstreamCalls.filter((call) => call.url.includes('generativelanguage.googleapis.com')).length;
  const result = await request('/api/ai/mock-interview/answer', {
    resumeText: 'Resume text.',
    role: 'Frontend Engineer',
    question: sampleInterviewQuestion.question,
    focus: sampleInterviewQuestion.focus,
    questionType: sampleInterviewQuestion.question_type,
    answer: 'Too short.',
    questionNumber: 1,
    history: [],
  });

  assert.equal(result.status, 400);
  assert.match(result.body.message, /between 20 and 4,000 characters/);
  const callsAfter = upstreamCalls.filter((call) => call.url.includes('generativelanguage.googleapis.com')).length;
  assert.equal(callsAfter, callsBefore);
});

test('mock interview marks the fifth answer as complete without another question', async () => {
  const history = Array.from({ length: 4 }, (_, index) => ({
    question: `Interview question ${index + 1}?`,
    answer: `This is a sufficiently detailed answer for question ${index + 1}.`,
  }));
  const result = await request('/api/ai/mock-interview/answer', {
    resumeText: 'Built React projects and improved keyboard navigation.',
    role: 'Frontend Engineer',
    question: sampleInterviewEvaluation.next_question,
    focus: sampleInterviewEvaluation.next_focus,
    questionType: sampleInterviewEvaluation.next_question_type,
    answer: 'I would use semantic HTML and test the interface with keyboard navigation and a screen reader.',
    questionNumber: 5,
    history,
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.evaluation.completed, true);
  assert.equal(result.body.evaluation.next_question, '');
});

test('mock interview validators reject unsupported scores and question types', () => {
  assert.throws(() => validateInterviewQuestion({ ...sampleInterviewQuestion, question_type: 'unrelated' }), /invalid interview question type/);
  assert.throws(() => validateInterviewEvaluation({ ...sampleInterviewEvaluation, score: -1 }, 1), /invalid interview score/);
});
