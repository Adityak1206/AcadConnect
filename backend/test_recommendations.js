const fs = require('fs');
const http = require('http');

const USER_API = 'http://localhost:3001/api';
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
    console.log('## 1. Creating Faculty 1 (ML/NLP)');
    const f1 = await req(`${USER_API}/auth/register`, 'POST', {
      name: 'Dr. Alice ML',
      email: `alice_ml_${uid}@example.com`,
      password: 'password123!',
      role: 'faculty'
    });
    const t1 = f1.data.token;
    await req(`${USER_API}/users/me`, 'PUT', {
      research_areas: ["Machine Learning", "Natural Language Processing", "Deep Learning"]
    }, t1);

    console.log('\n## 2. Creating Faculty 2 (Biology)');
    const f2 = await req(`${USER_API}/auth/register`, 'POST', {
      name: 'Dr. Bob Bio',
      email: `bob_bio_${uid}@example.com`,
      password: 'password123!',
      role: 'faculty'
    });
    const t2 = f2.data.token;
    await req(`${USER_API}/users/me`, 'PUT', {
      research_areas: ["Molecular Biology", "Genetics", "Cell Biology"]
    }, t2);

    console.log('\n## 3. Creating Faculty 3 (Web Tech)');
    const f3 = await req(`${USER_API}/auth/register`, 'POST', {
      name: 'Dr. Carol Web',
      email: `carol_web_${uid}@example.com`,
      password: 'password123!',
      role: 'faculty'
    });
    const t3 = f3.data.token;
    await req(`${USER_API}/users/me`, 'PUT', {
      research_areas: ["Web Development", "React", "Cloud Computing"]
    }, t3);

    console.log('\n## 4. Syncing all faculty to Recommendation Service');
    const syncRes = await req(`${REC_API}/index/sync-all`, 'POST');
    console.log(`✅ Synced: ${syncRes.data.message}`);

    console.log('\n## 5. Querying Recommendations for a student interested in AI and NLP');
    const queryParams = new URLSearchParams({
      skills: "Python, TensorFlow",
      interests: "I want to do research in Natural Language Processing and build LLMs",
      top_k: "3"
    });
    const recRes = await req(`${REC_API}/recommend/faculty?${queryParams}`, 'GET');
    
    console.log(`✅ Top Recommendations successfully retrieved!`);
    console.log(JSON.stringify(recRes.data, null, 2));

    console.log('\n🎉 test_recommendations passed!');

  } catch (err) {
    console.error(`\n❌ TEST FAILED:\n${err.message}`);
    process.exit(1);
  }
}

runTest();
