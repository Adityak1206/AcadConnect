# AcadConnect — Frontend Developer API Guide

## What is AcadConnect?

AcadConnect is a student-led academic project collaboration platform. Students form groups (3-5 members), propose research projects, get AI feedback on their pitches, find faculty mentors via semantic search, and progress through milestones to completion.

---

## Backend Services

| Service | Base URL | Purpose |
|---|---|---|
| User Service | `http://localhost:3001` | Auth, profiles, admin functions |
| Project Service | `http://localhost:3002` | Groups, projects, mentorship requests, milestones |
| AI Feedback Service | `http://localhost:8001` | AI-powered project pitch analysis |
| Recommendation Service | `http://localhost:8002` | Faculty mentor matching |

> All services have CORS enabled. All protected routes require `Authorization: Bearer <token>` header.

---

## Authentication

### Register
**`POST http://localhost:3001/api/auth/register`**

Request:
```json
{
  "name": "Alex Student",
  "email": "alex@example.com",
  "password": "Password123!",
  "role": "student"
}
```
> `role` must be one of: `student`, `faculty`, `admin`

Response (`201`):
```json
{
  "user": { "id": "uuid", "name": "Alex Student", "email": "alex@example.com", "role": "student" },
  "token": "eyJ..."
}
```

### Login
**`POST http://localhost:3001/api/auth/login`**

Request:
```json
{
  "email": "alex@example.com",
  "password": "Password123!"
}
```

Response (`200`):
```json
{
  "user": { "id": "uuid", "name": "Alex Student", "email": "alex@example.com", "role": "student" },
  "token": "eyJ..."
}
```

> **Frontend routing**: Use the `role` field from the response to redirect to the correct dashboard after login:
> - `student` → Student Dashboard
> - `faculty` → Faculty Dashboard
> - `admin` → Admin Dashboard

> **JWT**: Store the `token` and include it in all subsequent requests as `Authorization: Bearer <token>`. Tokens expire in 7 days.

---

## Student APIs

| Action | Method | URL | Auth |
|---|---|---|---|
| Get my profile | GET | `/api/users/me` | Student token |
| Update my profile | PUT | `/api/users/me` | Student token |
| Create a group | POST | `/api/groups` | Student token |
| Accept group invite | PUT | `/api/groups/:id/accept-invite` | Student token |
| View my groups | GET | `/api/groups/me` | Student token |
| Create a project | POST | `/api/projects` | Student token (leader only) |
| View all projects | GET | `/api/projects` | Any token |
| View project details | GET | `/api/projects/:id` | Any token |
| Get AI feedback | POST | `/api/projects/:id/ai-feedback` | Student token (leader only) |
| Find faculty mentors | GET | `http://localhost:8002/recommend/faculty` | None (public) |
| Send mentorship request | POST | `/api/requests` | Student token (leader only) |
| Advance milestone | PUT | `/api/projects/:id/milestone` | Student token (leader only) |

> Unless stated otherwise, all `/api/*` routes above are on `http://localhost:3002` (Project Service) except `/api/users/me` and `/api/auth/*` which are on `http://localhost:3001` (User Service).

### Get My Profile
**`GET http://localhost:3001/api/users/me`**

Response (`200`):
```json
{
  "id": "uuid",
  "name": "Alex Student",
  "email": "alex@example.com",
  "role": "student",
  "created_at": "2026-04-01T...",
  "profile": {
    "skills": ["Python", "Machine Learning"],
    "interests": "NLP and LLM research",
    "eligibility_status": "eligible"
  }
}
```

### Update My Profile
**`PUT http://localhost:3001/api/users/me`**

Request (student):
```json
{
  "name": "Alex Updated",
  "skills": ["Python", "PyTorch", "NLP"],
  "interests": "Large Language Model behavior analysis"
}
```

Response (`200`):
```json
{ "message": "Profile updated successfully" }
```

### Create a Group
**`POST http://localhost:3002/api/groups`**

Request:
```json
{
  "name": "The AI Innovators",
  "member_emails": ["jordan@example.com", "rishabh@example.com"]
}
```
> Group must have 3-5 total members (including the creator). The creator is automatically the leader. Do NOT include your own email.

Response (`201`):
```json
{
  "message": "Group created and invites sent",
  "group_id": "uuid"
}
```

### Accept Group Invite
**`PUT http://localhost:3002/api/groups/:group_id/accept-invite`**

No request body needed.

Response (`200`):
```json
{ "message": "Invite accepted successfully" }
```

### View My Groups
**`GET http://localhost:3002/api/groups/me`**

Response (`200`):
```json
{
  "groups": [
    {
      "group_id": "uuid",
      "name": "The AI Innovators",
      "leader_name": "Alex Student",
      "my_status": "accepted",
      "created_at": "2026-04-01T...",
      "members": [
        { "name": "Alex Student", "email": "alex@example.com", "status": "accepted" },
        { "name": "Jordan Student", "email": "jordan@example.com", "status": "pending" },
        { "name": "Rishabh Student", "email": "rishabh@example.com", "status": "accepted" }
      ]
    }
  ]
}
```

### Create a Project
**`POST http://localhost:3002/api/projects`**

Request:
```json
{
  "group_id": "uuid",
  "title": "LLM Behavior Research",
  "description": "Analyzing how LLMs act under specific zero-shot prompts. We have used PyTorch."
}
```
> Only the group leader can create a project. Group must have 3-5 **accepted** members.

Response (`201`):
```json
{
  "message": "Project created successfully",
  "project": { "id": "uuid", "title": "LLM Behavior Research", "group_id": "uuid", "status": "proposal_drafting" }
}
```

### View Project Details
**`GET http://localhost:3002/api/projects/:project_id`**

Response (`200`):
```json
{
  "project": {
    "id": "uuid",
    "group_id": "uuid",
    "title": "LLM Behavior Research",
    "description": "Analyzing how LLMs...",
    "status": "proposal_drafting",
    "created_at": "2026-04-01T...",
    "group_name": "The AI Innovators"
  }
}
```

### Get AI Feedback on Project Pitch
**`POST http://localhost:3002/api/projects/:project_id/ai-feedback`**

No request body needed (uses the project's stored title & description).

Response (`200`):
```json
{
  "relevance_score": 7,
  "strengths": [
    "Clear research direction with LLM focus",
    "Mentions specific tooling (PyTorch)"
  ],
  "gaps": [
    "No specific research question or hypothesis stated",
    "Scope of 'zero-shot prompts' is too broad"
  ],
  "suggestions": [
    "Narrow the scope to specific LLM models",
    "Include a methodology section with evaluation metrics"
  ],
  "summary": "The project shows promise but needs a more defined scope and methodology..."
}
```

### Find Faculty Mentors
**`GET http://localhost:8002/recommend/faculty?skills=Python&interests=I want to study NLP&top_k=5`**

> Note: This is on port **8002** (Recommendation Service). No auth required.

Query params:
- `skills` (optional) — comma-separated skills
- `interests` (optional) — free-text description
- `student_id` (optional) — auto-fetches from student profile if provided
- `top_k` (optional, default 5) — number of results

Response (`200`):
```json
{
  "recommendations": [
    {
      "faculty_id": "uuid",
      "name": "Dr. Smith",
      "research_areas": ["Natural Language Processing", "Machine Learning", "AI Ethics"],
      "score": 0.8923
    }
  ],
  "query_text": "Python; I want to study NLP"
}
```

### Send Mentorship Request
**`POST http://localhost:3002/api/requests`**

Request:
```json
{
  "project_id": "uuid",
  "faculty_id": "uuid"
}
```

Response (`201`):
```json
{
  "message": "Request submitted successfully",
  "request_id": "uuid"
}
```

### Advance Milestone (Student)
**`PUT http://localhost:3002/api/projects/:project_id/milestone`**

Request:
```json
{ "status": "midpoint_submission" }
```
> Students can advance to: `midpoint_submission`, `final_submission`. Students **cannot** set `completed` (faculty only).

Response (`200`):
```json
{ "message": "Project milestone advanced to midpoint_submission" }
```

---

## Faculty APIs

| Action | Method | URL | Auth |
|---|---|---|---|
| Get my profile | GET | `/api/users/me` | Faculty token |
| Update my profile | PUT | `/api/users/me` | Faculty token |
| View incoming requests | GET | `/api/requests/faculty` | Faculty token |
| Accept/reject request | PUT | `/api/requests/:id/status` | Faculty token |
| Advance milestone | PUT | `/api/projects/:id/milestone` | Faculty token (mentor only) |

### Get My Profile (Faculty)
**`GET http://localhost:3001/api/users/me`**

Response (`200`):
```json
{
  "id": "uuid",
  "name": "Dr. Smith",
  "email": "smith@example.com",
  "role": "faculty",
  "created_at": "2026-04-01T...",
  "profile": {
    "research_areas": ["Natural Language Processing", "Machine Learning", "AI Ethics"],
    "max_capacity": 3,
    "mentee_count": 1
  }
}
```

### Update My Profile (Faculty)
**`PUT http://localhost:3001/api/users/me`**

Request:
```json
{
  "research_areas": ["NLP", "Machine Learning", "AI Ethics", "Computer Vision"],
  "max_capacity": 5
}
```

### View Incoming Requests
**`GET http://localhost:3002/api/requests/faculty`**

Response (`200`):
```json
{
  "requests": [
    {
      "request_id": "uuid",
      "request_status": "pending",
      "created_at": "2026-04-01T...",
      "project_id": "uuid",
      "project_title": "LLM Behavior Research",
      "project_description": "Analyzing how LLMs act under...",
      "group_id": "uuid",
      "group_name": "The AI Innovators",
      "leader_name": "Alex Student",
      "members": [
        { "name": "Alex Student", "email": "alex@example.com" },
        { "name": "Jordan Student", "email": "jordan@example.com" }
      ]
    }
  ]
}
```

### Accept or Reject Request
**`PUT http://localhost:3002/api/requests/:request_id/status`**

Request:
```json
{ "status": "accepted" }
```
> `status` must be `accepted` or `rejected`.
>
> **On accept**: Project advances to `active_research`. All other pending requests for this project are auto-rejected. If faculty reaches `max_capacity`, all their other pending requests are also auto-rejected.

Response (`200`):
```json
{ "message": "Request successfully accepted" }
```

### Advance Milestone (Faculty)
**`PUT http://localhost:3002/api/projects/:project_id/milestone`**

Request:
```json
{ "status": "completed" }
```
> Faculty mentor can mark project as `completed`.

---

## Admin APIs

All admin routes are on `http://localhost:3001` and require an admin JWT.

| Action | Method | URL | Auth |
|---|---|---|---|
| List all users | GET | `/api/admin/users` | Admin token |
| Get user by ID | GET | `/api/admin/users/:id` | Admin token |
| Change student eligibility | PUT | `/api/admin/users/:id/eligibility` | Admin token |
| View audit logs | GET | `/api/admin/audit-logs` | Admin token |

### List All Users
**`GET http://localhost:3001/api/admin/users?role=student`**

> Optional filter: `?role=student`, `?role=faculty`, `?role=admin`

Response (`200`):
```json
{
  "users": [
    { "id": "uuid", "name": "Alex Student", "email": "alex@example.com", "role": "student", "created_at": "..." },
    { "id": "uuid", "name": "Dr. Smith", "email": "smith@example.com", "role": "faculty", "created_at": "..." }
  ]
}
```

### Get User Detail
**`GET http://localhost:3001/api/admin/users/:user_id`**

Response (`200`):
```json
{
  "user": {
    "id": "uuid",
    "name": "Alex Student",
    "email": "alex@example.com",
    "role": "student",
    "created_at": "...",
    "profile": {
      "skills": ["Python"],
      "interests": "NLP research",
      "eligibility_status": "eligible"
    }
  }
}
```

### Change Student Eligibility
**`PUT http://localhost:3001/api/admin/users/:student_id/eligibility`**

Request:
```json
{
  "eligibility_status": "probation",
  "reason": "Academic integrity violation"
}
```
> `eligibility_status` must be: `eligible`, `probation`, or `ineligible`. An audit log entry is auto-created.

Response (`200`):
```json
{
  "message": "Eligibility updated to 'probation'",
  "eligibility_status": "probation"
}
```

### View Audit Logs
**`GET http://localhost:3001/api/admin/audit-logs?page=1&limit=20`**

Optional filters: `?admin_id=`, `?target_user_id=`, `?action=ELIGIBILITY_CHANGE`

Response (`200`):
```json
{
  "logs": [
    {
      "id": "uuid",
      "action": "ELIGIBILITY_CHANGE",
      "details": {
        "before": "eligible",
        "after": "probation",
        "reason": "Academic integrity violation",
        "student_name": "Alex Student",
        "student_email": "alex@example.com"
      },
      "created_at": "...",
      "admin_name": "Super Admin",
      "admin_email": "admin@example.com",
      "target_name": "Alex Student",
      "target_email": "alex@example.com"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

## Project Lifecycle (Milestone Flow)

```
proposal_drafting → faculty_review → active_research → midpoint_submission → final_submission → completed
```

| Milestone | Triggered By |
|---|---|
| `proposal_drafting` | Auto-set on project creation |
| `faculty_review` | Auto-set when student sends a mentorship request |
| `active_research` | Auto-set when faculty accepts the request |
| `midpoint_submission` | Student (leader) manually advances |
| `final_submission` | Student (leader) manually advances |
| `completed` | Faculty (mentor) manually marks complete |

---

## Error Format

All errors follow this format:
```json
{
  "error": "Human-readable error message",
  "code": "OPTIONAL_ERROR_CODE"
}
```

Common HTTP status codes:
- `400` — Validation error
- `401` — Missing/invalid token
- `403` — Insufficient permissions (wrong role)
- `404` — Resource not found
- `409` — Conflict (duplicate email, duplicate request)

---

## Quick Start (Running the Backend)

```bash
cd backend

# 1. Start databases
docker compose up -d

# 2. Run migrations (from user-service since migrations live there)
cd services/user-service && npx knex migrate:latest && cd ../..

# 3. Start all 4 services
bash startup.sh
```

Health checks:
- `curl http://localhost:3001/health`
- `curl http://localhost:3002/health`
- `curl http://localhost:8001/health`
- `curl http://localhost:8002/health`
