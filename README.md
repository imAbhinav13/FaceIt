# FaceIt

AI-powered private event photo retrieval platform.

FaceIt is a modern computer vision system designed to solve one of the biggest pain points in large social events:

```text
“How do attendees quickly find only their own photos from thousands of event images?”
```

Instead of manually searching through massive event albums, FaceIt uses AI facial recognition and vector similarity search to automatically connect participants with their own event photos through secure private galleries.

The platform combines:

* AI face embedding generation
* Vector similarity search
* Human-in-the-loop review workflows
* Temporary guest matching
* Secure signed URL delivery
* Modern production-grade frontend UX

---

# The Problem FaceIt Solves

At large events such as:

* weddings
* college festivals
* conferences
* corporate events
* sports tournaments
* graduation ceremonies
* photography events

thousands of photos are captured.

Traditionally, attendees must:

* scroll manually through giant galleries,
* depend on photographers,
* search social media uploads,
* or request photos individually.

This creates:

* poor user experience,
* privacy concerns,
* low discoverability,
* inefficient photo distribution.

---

# FaceIt Solution

FaceIt introduces a private AI-driven event photo retrieval workflow.

## Core Workflow

```text
Create Room
→ Upload Event Photos
→ Detect Faces
→ Generate Embeddings
→ Match Participants
→ Deliver Private Galleries
```

Instead of browsing entire event albums, participants receive:

```text
only the photos matched to their face
```

This creates:

* faster discovery,
* private access,
* scalable event handling,
* automated retrieval,
* improved user experience.

---

# Key Product Goals

FaceIt was designed with the following principles:

## 1. Privacy First

Participants should not be able to browse all event photos.

FaceIt uses:

* signed URLs,
* isolated galleries,
* room expiration,
* temporary guest sessions,
* uploader review workflows.

---

## 2. AI-Assisted, Human-Validated

Facial recognition systems are probabilistic.

FaceIt includes:

```text
Human Review Queue
```

for uncertain matches.

Low-confidence matches are routed to uploaders for approval before becoming visible.

---

## 3. Event-Oriented Architecture

The platform is designed around:

```text
temporary event rooms
```

instead of permanent public galleries.

This allows:

* automatic cleanup,
* temporary storage,
* simplified sharing,
* better privacy control.

---

## 4. Premium UX for AI Latency

AI inference can take time.

Instead of exposing raw backend delays, the frontend was designed to:

* visualize scanning,
* use staged processing UI,
* show animated overlays,
* provide responsive progress states,
* maintain premium interaction quality.

---

# System Architecture

FaceIt follows a distributed architecture.

```text
Frontend
  ↓
FastAPI Backend APIs
  ↓
Background Worker
  ↓
DeepFace / FaceNet512
  ↓
PostgreSQL + pgvector
  ↓
Supabase Storage
```

---

# Technology Stack

# Frontend

```text
Next.js App Router
TypeScript
Tailwind CSS
Shadcn UI
motion.dev
```

The frontend focuses heavily on:

* premium dark-mode UX,
* glassmorphism,
* smooth animation systems,
* responsive design,
* AI workflow visualization.

---

# Backend

```text
FastAPI
SQLAlchemy
Pydantic
PostgreSQL
pgvector
```

The backend provides:

* authentication,
* room management,
* upload handling,
* signed URL generation,
* match APIs,
* review APIs,
* guest session orchestration.

---

# AI / ML Layer

```text
DeepFace
FaceNet512
Cosine similarity search
Vector embedding comparison
```

The ML layer performs:

* face detection,
* embedding generation,
* similarity search,
* confidence scoring.

---

# Authentication & Storage

```text
Supabase Auth
Supabase Storage
```

Used for:

* user authentication,
* secure object storage,
* signed URL generation.

---

# Core Features

# 1. Event Rooms

Uploaders can:

* create rooms,
* configure room expiry,
* upload event photos,
* manage participant access.

Each room acts as a temporary isolated event workspace.

---

# 2. AI Face Matching

Uploaded event photos are processed through:

```text
face detection
→ embedding generation
→ vector similarity matching
```

Matched photos are linked to participants automatically.

---

# 3. Human Review Queue

Low-confidence matches are routed into:

```text
Review Queue
```

Uploaders can:

* approve matches,
* reject matches,
* inspect bounding box overlays.

This hybrid approach improves trust and accuracy.

---

# 4. Participant Private Galleries

Participants receive:

```text
private matched galleries
```

Features include:

* secure signed URLs,
* ZIP downloads,
* isolated access.

Participants cannot browse unrelated photos.

---

# 5. Guest Matching

FaceIt supports:

```text
temporary guest selfie matching
```

without account enrollment.

Guests:

* capture temporary selfies,
* generate temporary embeddings,
* retrieve matched photos.

Guest sessions are intentionally temporary and non-persistent.

---

# 6. Enrollment System

Registered users can enroll persistent embeddings.

This allows:

* reusable participant identity,
* faster future matching,
* account-linked galleries.

---

# Frontend Design System

The frontend was redesigned as a premium AI application experience.

## Design Principles

```text
Minimal visible text
High visual hierarchy
Dark mode first
Glassmorphism cards
Responsive layouts
Motion-driven interaction
```

---

## UX Goals

The UI was intentionally designed to:

* hide AI latency,
* make processing feel intentional,
* maintain responsiveness,
* simplify complex workflows.

Key interaction systems include:

* scanning overlays,
* stagger animations,
* animated review queues,
* progressive skeleton loading,
* hover-driven information hints.

---

# Current Project Status

## Frontend Status

```text
Production-grade frontend complete
```

Includes:

* uploader dashboard
* participant gallery
* review queue
* guest matching flow
* enrollment flow
* auth system
* home page
* about page
* premium responsive UI

---

## Backend Status

```text
Core backend architecture stable
```

Includes:

* room lifecycle APIs
* upload APIs
* review APIs
* participant matching APIs
* guest workflows
* signed URL system
* enrollment pipeline

---

# Current Limitation

## Background Worker Dependency

FaceIt relies on a separate background worker process.

The API server only handles:

* uploads,
* metadata,
* orchestration,
* API responses.

The heavy AI processing is performed separately by:

```text
worker.worker
```

This worker is responsible for:

* face detection,
* embedding generation,
* vector matching,
* review item generation,
* guest processing.

Without the worker process running:

```text
uploads may succeed
but AI matching will remain pending
```

---

# Why The App May Not Fully Work Right Now

The current deployment setup uses lightweight infrastructure.

The ML pipeline is CPU intensive and asynchronous.

Because of this:

```text
worker.worker cannot reliably run inside the same lightweight deployment service
```

This affects:

* photo processing,
* review queue generation,
* participant galleries,
* guest match completion.

The frontend remains fully functional, but AI processing depends on a dedicated worker deployment.

---

# Recommended Production Architecture

## Frontend

```text
Vercel
```

Hosts:

* Next.js frontend
* static assets
* premium UI experience.

---

## Backend API

```text
Render / Railway / Fly.io
```

Hosts:

* FastAPI APIs
* upload orchestration
* room management
* auth workflows.

---

## Worker Service

Separate deployment:

```bash
python -m worker.worker
```

Handles:

* AI inference,
* embedding generation,
* vector similarity search,
* guest matching,
* review creation.

This service must scale independently.

---

## Database

```text
PostgreSQL + pgvector
```

Stores:

* embeddings,
* rooms,
* matches,
* review items,
* participants.

---

## Storage

```text
Supabase Storage
```

Stores:

* uploaded event photos,
* guest captures,
* enrollment images.

---

# Security Model

FaceIt was designed around controlled access.

Security features include:

* signed URL delivery,
* temporary sessions,
* room expiration,
* participant isolation,
* uploader-controlled review workflows.

The platform intentionally avoids:

```text
public photo browsing
```

---

# Future Improvements

# Infrastructure

* Dedicated GPU workers
* Redis-backed job queues
* Celery/RQ architecture
* Autoscaling worker pools
* Kubernetes deployment

---

# Product Features

* Real-time processing dashboards
* Event analytics
* Multi-room management
* Photographer upload tools
* Mobile application
* Notification system
* Bulk export workflows

---

# AI Improvements

* Faster embedding models
* GPU inference optimization
* Multi-face clustering
* Confidence calibration
* Improved duplicate handling
* Advanced vector indexing

---

# Environment Variables

## Frontend

```env
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Backend

```env
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=
JWT_SECRET=
```

---

# Running Locally

## Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## Worker

Required separately:

```bash
cd backend
python -m worker.worker
```

Without the worker process:

```text
AI processing will not complete
```

---

# Project Structure

```text
frontend/
backend/
worker/
```

## Frontend

```text
Next.js frontend
premium UI
motion systems
participant flows
```

## Backend

```text
FastAPI APIs
room lifecycle
uploads
matching APIs
review APIs
```

## Worker

```text
background AI processing
embedding generation
vector matching
review creation
```

---

# Conclusion

FaceIt is an AI-powered event photo retrieval platform designed around:

```text
privacy
automation
human review
premium UX
```

The project demonstrates:

* AI-powered facial matching,
* vector similarity search,
* scalable event workflows,
* human-in-the-loop validation,
* production-grade frontend engineering.

The frontend experience is fully complete and production-ready.

The primary remaining infrastructure requirement is:

```text
stable independent worker deployment
```

Once dedicated worker infrastructure is deployed, the complete end-to-end AI matching pipeline functions as intended.
