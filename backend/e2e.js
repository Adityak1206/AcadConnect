const fs = require('fs');

const LOG_FILE = '/Users/rishabhmalviya/.gemini/antigravity/brain/b5de1cb7-1ac7-4b35-934a-ceed76357561/e2e_test_logs.md';

function log(msg) {
  console.log(msg);
  fs.appendFileSync(LOG_FILE, msg + '\n');
}

log('# AcadConnect End-To-End Test Logs\n');
log('**Date:** ' + new Date().toISOString() + '\n');

const USER_API = 'http://localhost:3001/api';
const PROJ_API = 'http://localhost:3002/api';
const AI_API = 'http://localhost:8001';

async function req(url, method = 'GET', body = null, token = null) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  
  if (!res.ok) {
    throw new Error(`API Error [${method} ${url}]: ${res.status} - ${JSON.stringify(data)}`);
  }
  return { status: res.status, data };
}

const uid = Date.now().toString().slice(-6);

async function runTest() {
  try {
    log('## 1. Creating Faculty Mentor');
    const facRes = await req(`${USER_API}/auth/register`, 'POST', {
      email: `faculty_${uid}@example.com`,
      password: 'testPassword123!',
      role: 'faculty',
      name: 'Dr. Jane Doe'
    });
    const mentorToken = facRes.data.token;
    const mentorId = facRes.data.user.id;
    log(`✅ Mentor created (ID: ${mentorId})`);

    log('\n## 2. Creating Students');
    const students = [];
    for (let i = 1; i <= 3; i++) {
      const sRes = await req(`${USER_API}/auth/register`, 'POST', {
        email: `student_${i}_${uid}@example.com`,
        password: 'testPassword123!',
        role: 'student',
        name: `Student${i} Test`
      });
      students.push({ id: sRes.data.user.id, token: sRes.data.token });
      log(`✅ Student ${i} created (ID: ${sRes.data.user.id})`);
    }

    log('\n## 3. Creating Project as Faculty');
    const projRes = await req(`${PROJ_API}/projects`, 'POST', {
      title: 'AI in Education ' + uid,
      description: 'Researching how LLMs can provide intelligent feedback.',
      prerequisites: 'Python, ML',
      max_groups: 2
    }, mentorToken);
    const projectId = projRes.data.project.id;
    log(`✅ Project created (ID: ${projectId})`);

    log('\n## 4. Creating Student Group');
    const groupRes = await req(`${PROJ_API}/groups`, 'POST', {
      name: 'AI Researchers ' + uid,
      member_emails: [
        `student_2_${uid}@example.com`,
        `student_3_${uid}@example.com`
      ]
    }, students[0].token); // Leader is student 1
    const groupId = groupRes.data.group_id;
    log(`✅ Group created by Student 1 (ID: ${groupId})`);

    // Invited students must accept
    for (let i = 1; i < 3; i++) {
      await req(`${PROJ_API}/groups/${groupId}/accept-invite`, 'PUT', {}, students[i].token);
      log(`✅ Student ${i+1} joined the group`);
    }

    log('\n## 5. Submitting Project Request');
    const reqRes = await req(`${PROJ_API}/requests`, 'POST', {
      project_id: projectId,
      group_id: groupId,
      snippet: 'We are a group of 3 ML enthusiasts. We have taken CS 229 and built small LLM pipelines using PyTorch. We want to apply this to standard educational workflows.'
    }, students[0].token);
    const requestId = reqRes.data.request_id;
    log(`✅ Project request submitted (Request ID: ${requestId})`);

    log('\n## 6. Resolving Project Request (Accepting as Faculty)');
    await req(`${PROJ_API}/requests/${requestId}/status`, 'PUT', {
      status: 'accepted'
    }, mentorToken);
    log(`✅ Faculty accepted the request (Triggering async AI feedback...)`);

    log('\n## 7. Awaiting AI Feedback Service (10 seconds)');
    await new Promise(resolve => setTimeout(resolve, 10000));

    log('\n## 8. Querying Generated AI Feedback');
    const aiRes = await req(`${AI_API}/feedback/${requestId}`);
    log(`✅ Final AI Feedback Retrieved:\n`);
    log('```json\n' + JSON.stringify(aiRes.data, null, 2) + '\n```');
    
    log('\n🎉 **END TO END TEST PASSED** 🎉');

  } catch (err) {
    log(`\n❌ **TEST FAILED:**\n${err.message}`);
    process.exit(1);
  }
}

runTest();
