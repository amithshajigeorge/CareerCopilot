# System Design Document

## Project Name: CareerCopilot AI
**Date:** June 18, 2026

---

## 1. High-Level Architecture

CareerCopilot AI follows a decoupled, client-server architecture. The system is divided into three primary tiers: Presentation (Next.js Frontend), Application (FastAPI Backend), and Data (PostgreSQL with pgvector).

```mermaid
graph TD
    %% Presentation Layer
    subgraph Presentation ["Presentation Layer (Next.js & React)"]
        UI["User Interface (Next.js App Router)"]
        State["Client State Management (React Context / Zustand)"]
    end

    %% Application Layer
    subgraph Application ["Application Layer (FastAPI)"]
        Gateway["API Gateway / Router"]
        AuthSvc["Auth Service (JWT / OAuth2)"]
        ParserSvc["Resume Parser Service (PyMuPDF / Gemini)"]
        VectorSvc["Vector embedding Service (Sentence Transformers)"]
        AISvc["AI Agent & Prompt Service (Gemini API)"]
        TaskQueue["Background Worker Queue (Celery & Redis)"]
    end

    %% Data Layer
    subgraph Data ["Data Layer"]
        RelDB["PostgreSQL (Relational Tables)"]
        VecDB["pgvector Extension (Embedding Vector Store)"]
        RedisStore["Redis (Cache & Message Broker)"]
        S3Bucket["Object Storage (S3 / Local Storage)"]
    end

    %% Connections
    UI <-->|HTTPS / JSON / Uploads| Gateway
    Gateway <--> AuthSvc
    Gateway <--> ParserSvc
    Gateway <--> VectorSvc
    Gateway <--> AISvc
    ParserSvc -->|Save uploads| S3Bucket
    ParserSvc <-->|Asynchronous jobs| TaskQueue
    TaskQueue <-->|Broker| RedisStore
    
    AuthSvc <--> RelDB
    VectorSvc <--> VecDB
    AISvc <-->|Prompt Context| VecDB
    
    classDef layer fill:#f9f9f9,stroke:#333,stroke-width:1px;
    class Presentation,Application,Data layer;
```

### Component Breakdown
1.  **Frontend (Next.js):** Served as a single-page application using Next.js App Router. It communicates with the backend via RESTful APIs. TailwindCSS is used for responsive UI styling.
2.  **Backend (FastAPI):** Python-based asynchronous framework. Handles authentication, business logic, background document processing, and interacts with LLM providers.
3.  **Vector Generator (Sentence Transformers):** A lightweight HuggingFace model run locally/inside the backend container to convert resume text and job descriptions into vector embeddings (e.g., using `all-MiniLM-L6-v2`).
4.  **Database (PostgreSQL + pgvector):** Stores transactional data (users, jobs, application states) and performs fast cosine similarity searches directly in SQL queries via `pgvector`.
5.  **External AI (Gemini API):** Performs complex tasks like ATS scoring analysis, custom cover letter compilation, resume tailoring recommendations, and mock interview question generation.

---

## 2. Authentication Flow

The application uses standard JSON Web Tokens (JWT) for stateless session management, supporting both Username/Password credentials and third-party OAuth2 (LinkedIn/Google).

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Client
    participant FE as Next.js Frontend
    participant BE as FastAPI Backend
    participant DB as PostgreSQL Database
    participant OAuth as OAuth Provider (Google/LinkedIn)

    alt Password Authentication
        User->>FE: Enters credentials (Email, Password)
        FE->>BE: POST /api/auth/login {email, password}
        BE->>DB: Query user record & verify hashed password
        DB-->>BE: User data / success
        BE->>BE: Generate Access Token (JWT) & Refresh Token
        BE-->>FE: Return Tokens (HTTP-Only Refresh Cookie, Access JSON)
        FE-->>User: Authenticated Dashboard Access
    else OAuth2 Authentication
        User->>FE: Clicks "Sign in with LinkedIn/Google"
        FE->>OAuth: Redirects to Auth URL
        OAuth-->>User: Prompts for login permission
        User->>OAuth: Grants consent
        OAuth-->>FE: Redirects to Frontend with auth `code`
        FE->>BE: POST /api/auth/oauth/callback {code, provider}
        BE->>OAuth: Exchange `code` for user access token & profile info
        OAuth-->>BE: Returns email, name, avatar
        BE->>DB: Find or Create User profile
        DB-->>BE: User profile record
        BE->>BE: Generate Access Token (JWT) & Refresh Token
        BE-->>FE: Return Tokens
        FE-->>User: Authenticated Dashboard Access
    end
```

---

## 3. Core Data Flow: Resume Processing & Job Matching

```mermaid
flowchart TD
    A[User Uploads Resume] -->|PDF / DOCX File| B(FastAPI Endpoint)
    B -->|Save File| C[Object Storage / Local Storage]
    B -->|Trigger Async Task| D{Parser Engine}
    D -->|Method 1: Extraction| E[PyMuPDF / Text Extraction]
    D -->|Method 2: LLM Structuring| F[Gemini API Parser Prompt]
    E --> F
    F -->|Parsed JSON Structure| G[Save to PostgreSQL Profile]
    
    G -->|Update Profile UI| H[User Reviews & Validates Profile]
    H -->|Save Profile Text| I[Sentence Transformers Vectorizer]
    I -->|Create Vector Embeddings| J[Save Vector to pgvector table]

    %% Matching Flow
    K[User pastes Job Description] -->|Job Text| L[FastAPI /match endpoint]
    L -->|Generate Embedding| M[Sentence Transformers]
    M -->|Search Vector| N[Query pgvector via Cosine Similarity]
    N -->|Rank matches| O[Extract Matching & Missing Skills]
    O -->|Send Context| P[Gemini AI for Match Detail Generation]
    P -->|Return Recommendations| Q[Display match score & skill gaps to User]
```

---

## 4. Database Schema (Entities & pgvector)

```mermaid
erDiagram
    USERS {
        uuid id PK
        string email UK
        string hashed_password
        string full_name
        timestamp created_at
    }
    RESUMES {
        uuid id PK
        uuid user_id FK
        string file_name
        string file_url
        jsonb parsed_data
        vector embedding "1536 / 384 dimensions"
        boolean is_primary
        timestamp uploaded_at
    }
    APPLICATIONS {
        uuid id PK
        uuid user_id FK
        uuid resume_id FK
        string company_name
        string job_title
        string status "Wishlist | Applied | Interviewing | Offer | Rejected"
        string job_description
        timestamp date_applied
        timestamp updated_at
    }
    MATCHES {
        uuid id PK
        uuid resume_id FK
        uuid application_id FK
        float match_score
        jsonb skill_gaps
        jsonb recommendations
    }

    USERS ||--o{ RESUMES : owns
    USERS ||--o{ APPLICATIONS : tracks
    RESUMES ||--o{ APPLICATIONS : used_in
    RESUMES ||--o{ MATCHES : generates
    APPLICATIONS ||--o{ MATCHES : calculated_for
```

---

## 5. Directory & Folder Structure

```text
CareerCopilotAI/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── auth.py
│   │   │   │   │   ├── resumes.py
│   │   │   │   │   ├── jobs.py
│   │   │   │   │   └── tracking.py
│   │   │   │   └── api.py
│   │   │   └── deps.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── database.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── resume.py
│   │   │   └── application.py
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── resume.py
│   │   │   └── application.py
│   │   ├── services/
│   │   │   ├── ai.py              # Gemini API Client
│   │   │   ├── parser.py          # Resume document parsing
│   │   │   └── embedder.py        # Sentence Transformers model loader
│   │   ├── main.py
│   │   └── worker.py              # Background Celery worker
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js App Router folders
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── dashboard/
│   │   │   ├── resume/
│   │   │   └── tracking/
│   │   ├── components/            # Reusable UI Components
│   │   │   ├── ui/                # Core elements (buttons, inputs)
│   │   │   ├── dashboard/
│   │   │   └── tracking/
│   │   ├── hooks/                 # Custom React Hooks
│   │   ├── lib/                   # Utility scripts (API client, helpers)
│   │   └── context/               # Global state contexts
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── postcss.config.js
├── docs/
│   ├── PRD.md
│   └── SYSTEM_DESIGN.md
├── prompts/
│   ├── parser_prompt.txt          # LLM resume parsing instruction
│   ├── ats_scoring.txt            # ATS layout check prompt
│   └── interview_questions.txt    # Interview prep template
├── .gitignore
└── README.md
```
