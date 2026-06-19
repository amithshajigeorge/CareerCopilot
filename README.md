# 🚀 CareerCopilot AI

CareerCopilot AI is a production-grade, AI-powered career optimization suite designed to bridge the gap between candidates and their dream jobs. By leveraging Google's modern **Gemini GenAI SDK** and local **semantic search transformers**, CareerCopilot AI delivers automated resume parsing, interactive mock interview preparation, resume re-wording/tailoring, cover letter generation, ATS auditing, and a drag-and-drop job application tracker.

---

## 🧭 System Overview & Features

### 1. 📋 ATS Auditor & Compatibility Check
*   Evaluate formatting conflicts, layout concerns, and density alignment.
*   Get a structural compatibility score (0 to 100) and bulleted lists of actionable recommendations.

### 2. ⚡ Skill Gap Analyzer & Roads map
*   Compare resume achievements side-by-side with target job description specifications.
*   Identify critical and secondary missing skills.
*   Auto-generate a step-by-step roadmap and retrieve curated online courses and training links.

### 3. 🎯 Semantic Job Matcher
*   Compute semantic similarity indexes using local sentence-transformer models (`all-MiniLM-L6-v2`) to compare resume copy directly against vacancies.

### 4. ✏️ Smart Wording Tailor
*   Side-by-side split comparison panels (Original Resume vs. Tailored Wording).
*   Visual color-coded diff boxes highlighting rephrasing edits (insertions in green, deletions in red) without facts fabrication.
*   Print and export customized versions directly as standard PDF.

### 5. ✉️ Cover Letter Generator
*   Choose between 4 custom tone presets: **Professional**, **Confident**, **Humble**, and **Creative**.
*   Real-time printable document paper-preview deck.
*   Download generated outputs immediately as raw `.txt` or high-quality formatted PDF.

### 6. 🎙️ Mock Interview Preparation
*   Tailor mock questions to specific resume details and job roles.
*   Interactive question panels filtered by category: **Technical**, **Behavioral**, and **Resume/Project Specifics**.
*   Retrieve strategic answering tips and structured outline responses.
*   Review dynamic difficulty badges (Hard, Medium, Easy).

### 7. 🗂️ Applications Kanban Tracker
*   Organize your pipeline across columns: *Interested*, *Applied*, *Assessment*, *Interview*, *Offer*, *Rejected*.
*   Full drag-and-drop support with optimistic UI updates and backend synchronization.

### 8. 📊 Analytics Dashboard
*   Recharts visualization representation of pipeline funnel distribution.
*   Average ATS audit progress.
*   Circular KPI rate gauges for signed offers and interview callbacks.
*   Horizontal bar charts highlighting the most frequent missing skill gaps.

---

## 🏗️ Architecture Design

```mermaid
graph TD
    User([Professional User]) <-->|HTTPS/WSS| FE[Next.js App Router Frontend]
    FE <-->|Async API Calls| BE[FastAPI Backend Server]
    BE <-->|Read/Write Operations| DB[(PostgreSQL Database)]
    BE <-->|Client API Requests| Gemini[Google Gemini API client - Client SDK]
    BE <-->|Local Embeddings| ST[Sentence-Transformers - all-MiniLM-L6-v2]
```

---

## 🛠️ Technology Stack

| Layer | Technologies | Description |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS v4, Recharts | Glassmorphic, dark theme layout with collapsible mobile drawer, accessible overlays, and responsive animations. |
| **Backend** | FastAPI, Python 3.13, Pydantic v2 | High-performance asynchronous API server, strict request validation, and schema definitions. |
| **Database** | PostgreSQL, SQLAlchemy 2.0, Alembic | Relational database schema with full migration support and cascade models relationship. |
| **AI/GenAI** | Google GenAI SDK (`google-genai`), PyTorch, Sentence-Transformers | Uses modern `genai.Client` for reasoning and Gemini APIs, and local embeddings for semantic job matching. |

---

## 📸 Interface Screenshots

| Dashboard Overview | Smart Wording Tailor |
|:---:|:---:|
| ![Dashboard](/docs/screenshots/dashboard_mockup.png) | ![Tailor](/docs/screenshots/tailor_mockup.png) |
| **Onboarding Empty State** | **Mock Interview Practice** |
| ![Onboarding](/docs/screenshots/onboarding_mockup.png) | ![Mock Prep](/docs/screenshots/interview_mockup.png) |

---

## 🚀 Installation & Local Development

### Prerequisites
*   [Python 3.13+](https://www.python.org/downloads/)
*   [Node.js 20+](https://nodejs.org/)
*   [PostgreSQL 15+](https://www.postgresql.org/)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/CareerCopilotAI.git
cd CareerCopilotAI
```

### 2. Backend Setup
1. Navigate to the backend directory and create a virtual environment:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up environment variables in `backend/.env`:
   ```ini
   DATABASE_URL=postgresql+psycopg2://username:password@localhost:5432/careercopilot
   SECRET_KEY=your-jwt-auth-signing-secret
   GEMINI_API_KEY=your-google-gemini-api-key
   ```
4. Run migrations:
   ```bash
   alembic upgrade head
   ```
5. Start development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `frontend/.env.local`:
   ```ini
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```
4. Run development compiler:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Containerized Run (Docker Compose)

The application includes full multi-container configurations.

To spin up the entire local ecosystem (Frontend, Backend API, and Postgres Database) in production mode:

```bash
docker-compose up --build
```

### Volume Configurations
*   `postgres_data`: Persistent local storage volume for PostgreSQL databases.
*   `hf_cache`: Local storage cache volume for caching Hugging Face sentence-transformers to avoid downloading embeddings on every startup.

---

## 🧪 Testing

Run backend tests using pytest:
```bash
cd backend
.venv/Scripts/pytest
```

---

## 📈 Future Improvements
*   **Voice Interview Simulator**: Integrate real-time text-to-speech (TTS) and speech-to-text (STT) for interactive voice-based mock interviews.
*   **Third-party Job Sync**: Connect to job boards (LinkedIn, Indeed, glassdoor) to automatically pull descriptions and apply match scoring.
*   **Enhanced Multi-resume Support**: Compare historical version diffs and track improvements over time.
