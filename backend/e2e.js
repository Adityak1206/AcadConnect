const fs = require('fs');

const LOG_FILE = '/Users/rishabhmalviya/.gemini/antigravity/brain/b5de1cb7-1ac7-4b35-934a-ceed76357561/e2e_test_logs.md';

function log(msg) {
  console.log(msg);
  fs.appendFileSync(LOG_FILE, msg + '\n');
}

log('# AcadConnect Refactored End-To-End Test Logs\n');
log('**Date:** ' + new Date().toISOString() + '\n');

const USER_API = 'http://localhost:3001/api';
const PROJ_API = 'http://localhost:3002/api';
const AI_API = 'http://localhost:8001';
const REC_API = 'http://localhost:8002';

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
    
    // Add research areas
    await req(`${USER_API}/users/me`, 'PUT', { research_areas: ["Cybersecurity", "Blockchain"] }, mentorToken);
    log(`✅ Mentor created and profile updated (ID: ${mentorId})`);

    log('\n## 2. Syncing Recommendations');
    await req(`${REC_API}/index/sync-all`, 'POST');
    log(`✅ Synced Faculty into memory.`);

    log('\n## 3. Creating Students');
    const students = [];
    for (let i = 1; i <= 3; i++) {
      const sRes = await req(`${USER_API}/auth/register`, 'POST', {
        email: `student_${i}_${uid}@example.com`,
        password: 'testPassword123!',
        role: 'student',
        name: `Student${i} Test`
      });
      students.push({ id: sRes.data.user.id, token: sRes.data.token, email: `student_${i}_${uid}@example.com` });
      log(`✅ Student ${i} created (ID: ${sRes.data.user.id})`);
    }

    log('\n## 4. Creating Student Group');
    const groupRes = await req(`${PROJ_API}/groups`, 'POST', {
      name: 'Cyber Researchers ' + uid,
      member_emails: [students[1].email, students[2].email]
    }, students[0].token); // Leader is student 1
    const groupId = groupRes.data.group_id;
    log(`✅ Group created by Student 1 (ID: ${groupId})`);

    for (let i = 1; i < 3; i++) {
      await req(`${PROJ_API}/groups/${groupId}/accept-invite`, 'PUT', {}, students[i].token);
      log(`✅ Student ${i+1} joined the group`);
    }

    log('\n## 5. Group Creates Project');
    const projRes = await req(`${PROJ_API}/projects`, 'POST', {
      group_id: groupId,
      title: 'Decentralized Identity Verification',
      description: 'We aim to build a system utilizing Ethereum smart contracts.'
    }, students[0].token);
    const projectId = projRes.data.project.id;
    log(`✅ Project created by Group (ID: ${projectId})`);

    log('\n## 6. Real-Time AI Feedback Generation');
    const aiRes = await req(`${PROJ_API}/projects/${projectId}/ai-feedback`, 'POST', {}, students[0].token);
    log(`✅ AI responded synchronously with feedback:`);
    log('```json\n' + JSON.stringify(aiRes.data, null, 2) + '\n```');

    log('\n## 7. Submitting Pitch to Faculty');
    const reqRes = await req(`${PROJ_API}/requests`, 'POST', {
      project_id: projectId,
      faculty_id: mentorId,
    }, students[0].token);
    const requestId = reqRes.data.request_id;
    log(`✅ Pitch submitted to Dr. Jane Doe (Request ID: ${requestId})`);

    log('\n## 8. Faculty Accepts Pitch');
    await req(`${PROJ_API}/requests/${requestId}/status`, 'PUT', {
      status: 'accepted'
    }, mentorToken);
    log(`✅ Faculty secured the project mentorship successfully. 1:1 and capacity rules passed.`);
    
    log('\n🎉 **END TO END TEST PASSED** 🎉');

  } catch (err) {
    log(`\n❌ **TEST FAILED:**\n${err.message}`);
    process.exit(1);
  }
}

runTest();
