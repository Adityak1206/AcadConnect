# AcadConnect Manual End-to-End Testing Guide (Updated Workflow)

This guide covers the refactored lifecycle of the AcadConnect microservices. You can run these commands using tools like Postman, Insomnia, or cURL.

## Prerequisites
Ensure all 4 services are running locally on their assigned ports:
- **User Service:** `http://localhost:3001`
- **Project Service:** `http://localhost:3002`
- **AI Feedback Service:** `http://localhost:8001`
- **Recommendation Service:** `http://localhost:8002`

---

### Step 1: Create Student 1 (Group Leader)
**Endpoint**: `POST http://localhost:3001/api/auth/register`
**Body (JSON)**:
```json
{
  "name": "Alex Student",
  "email": "alex@acadconnect.test",
  "password": "Password123!",
  "role": "student"
}
```
**Expected Result**: `201 Created`. Copy `"token"` -> `<Student 1 Token>`.

---

### Step 2: Create Student 2
**Endpoint**: `POST http://localhost:3001/api/auth/register`
**Body (JSON)**:
```json
{
  "name": "Jordan Student",
  "email": "jordan@acadconnect.test",
  "password": "Password123!",
  "role": "student"
}
```
**Expected Result**: `201 Created`. Copy `"token"` -> `<Student 2 Token>`. Copy `user.email` -> `<Student 2 Email>`.

---

### Step 3: Create a Faculty Member
**Endpoint**: `POST http://localhost:3001/api/auth/register`
**Body (JSON)**:
```json
{
  "name": "Dr. Smith",
  "email": "smith@acadconnect.test",
  "password": "Password123!",
  "role": "faculty"
}
```
**Expected Result**: `201 Created`. Copy `"token"` -> `<Faculty Token>`. Copy `user.id` -> `<Faculty ID>`.

---

### Step 4: Add Research Areas to Faculty Profile
**Endpoint**: `PUT http://localhost:3001/api/users/me`
**Headers**: `Authorization: Bearer <Faculty Token>`
**Body (JSON)**:
```json
{
  "research_areas": ["Natural Language Processing", "Machine Learning", "AI Ethics"]
}
```
**Expected Result**: `200 OK`. 

---

### Step 5: Sync Faculty with Recommendation Service
**Endpoint**: `POST http://localhost:8002/index/sync-all`
**Body**: *(Empty)*
**Expected Result**: `200 OK`. (Wait 2 seconds to finish embedding).

---

### Step 6: Form a Student Group (As Student 1)
**Endpoint**: `POST http://localhost:3002/api/groups`
**Headers**: `Authorization: Bearer <Student 1 Token>`
**Body (JSON)**:
```json
{
  "name": "The AI Innovators",
  "member_emails": ["<Student 2 Email>"]
}
```
**Expected Result**: `201 Created`. Copy `"group_id"` -> `<Group ID>`. 

---

### Step 7: Accept the Group Invite (As Student 2)
**Endpoint**: `PUT http://localhost:3002/api/groups/<Group ID>/accept-invite`
**Headers**: `Authorization: Bearer <Student 2 Token>`
**Body**: *(Empty)*
**Expected Result**: `200 OK`.

*(Note: In AcadConnect, groups require 3-5 students! Repeat Step 2 and Step 7 for a 3rd student so the group has 3 accepted members!)*

---

### Step 8: Create a Project (As Student 1)
**Endpoint**: `POST http://localhost:3002/api/projects`
**Headers**: `Authorization: Bearer <Student 1 Token>`
**Body (JSON)**:
```json
{
  "group_id": "<Group ID>",
  "title": "LLM Behavior Research",
  "description": "Analyzing how LLMs act under specific zero-shot prompts. We have used PyTorch."
}
```
**Expected Result**: `201 Created`. Copy `"id"` -> `<Project ID>`.

---

### Step 9: Get Real-Time AI Feedback (As Student 1)
**Endpoint**: `POST http://localhost:3002/api/projects/<Project ID>/ai-feedback`
**Headers**: `Authorization: Bearer <Student 1 Token>`
**Body**: *(Empty)*
**Expected Result**: `200 OK`. The AI immediately analyzes your description and returns JSON with `relevance_score`, `gaps`, `strengths`, and `suggestions`, so you can improve your project!

---

### Step 10: Find a Faculty Mentor (As Student 1)
**Endpoint**: `GET http://localhost:8002/recommend/faculty?skills=Python&interests=I want to study NLP&top_k=5`
**Expected Result**: `200 OK`. Locate Dr. Smith in the array list.

---

### Step 11: Send Pitch Request to Faculty (As Student 1)
**Endpoint**: `POST http://localhost:3002/api/requests`
**Headers**: `Authorization: Bearer <Student 1 Token>`
**Body (JSON)**:
```json
{
  "project_id": "<Project ID>",
  "faculty_id": "<Faculty ID>"
}
```
**Expected Result**: `201 Created`. Copy `"request_id"`.

---

### Step 12: Accept Mentorship Request (As Faculty)
**Endpoint**: `PUT http://localhost:3002/api/requests/<Request ID>/status`
**Headers**: `Authorization: Bearer <Faculty Token>`
**Body (JSON)**:
```json
{
  "status": "accepted"
}
```
**Expected Result**: `200 OK`. Your group is now officially mentored by Dr. Smith! All other pending requests are securely rejected, adhering to capacity models!

---

### Step 13: View Your Group Dashboard (As Any Student)
**Endpoint**: `GET http://localhost:3002/api/groups/me`
**Headers**: `Authorization: Bearer <Student Token>`
**Expected Result**: `200 OK`. Returns a list of groups you belong to, their members, and everyone's invite status (Pending vs. Accepted).

---

### Step 14: View Detailed Project Information (As Any Student)
**Endpoint**: `GET http://localhost:3002/api/projects/<Project ID>`
**Headers**: `Authorization: Bearer <Student Token>`
**Expected Result**: `200 OK`. Returns the fully detailed breakdown of the specific project, its status, and the acting group!
