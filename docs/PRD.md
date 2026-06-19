# Product Requirements Document (PRD)

## Project Name: CareerCopilot AI
**Status:** Draft | **Date:** June 18, 2026

---

## 1. Executive Summary
CareerCopilot AI is an AI-powered career optimization platform designed to guide job seekers, freshers, and students in navigating the competitive job market. The application leverages generative AI and natural language processing to evaluate resumes, conduct Applicant Tracking System (ATS) optimization, match profiles with job descriptions, generate customized application materials, and prepare users for interviews. It also features a built-in application tracker and analytics dashboard to manage the end-to-end job application lifecycle.

---

## 2. Target Users & Personas

### 2.1 Students
*   **Context:** Currently enrolled in high school or university.
*   **Pain Points:** Little to no formal work experience, difficulty translating academic projects and extracurricular activities into professional achievements, and uncertainty about which roles match their field of study.
*   **Needs:** Easy-to-use resume templates, guidance on highlighting transferable skills, skill gap analysis for target roles, and interview preparation.

### 2.2 Freshers (Recent Graduates)
*   **Context:** Graduated within the past 0–2 years and looking for entry-level positions.
*   **Pain Points:** Competing with experienced candidates, facing high rejection rates from automated ATS filters, and lacking confidence in technical or behavioral interviews.
*   **Needs:** Resume scoring and ATS optimization, job matching tailored to junior positions, customized cover letters, and structured interview practice.

### 2.3 Job Seekers
*   **Context:** Active job seekers looking for career shifts, promotions, or re-entering the workforce.
*   **Pain Points:** Tailoring resumes manually for dozens of applications is tedious; keeping track of multiple applications in spreadsheets is disorganized; identifying why they aren't passing resume screening stages.
*   **Needs:** Automation for resume tailoring, bulk cover letter generation, a clean visual dashboard to track applications, and comprehensive interview preparation tailored to specific job listings.

---

## 3. Core Features & Functional Requirements

### 3.1 Authentication
*   **Description:** Secure user signup, login, and session management.
*   **Requirements:**
    *   Support standard Email/Password authentication with password strength validation and verification emails.
    *   Provide OAuth 2.0 social sign-on (Google and LinkedIn).
    *   Enable secure session persistence with JWT (JSON Web Tokens) or HTTP-only cookies.
    *   Enable password reset flows.

### 3.2 Resume Upload
*   **Description:** Upload and store candidate resumes.
*   **Requirements:**
    *   Support file formats: `.pdf` and `.docx`.
    *   Set file size limit to 5MB.
    *   Allow users to upload multiple resumes (e.g., draft versions or tailored variations) and select one as the "Primary Resume".
    *   Drag-and-drop file upload interface with real-time upload progress indicators.

### 3.3 Resume Parsing
*   **Description:** Extract structured metadata from raw resume documents.
*   **Requirements:**
    *   Convert PDF and Word files into structured JSON format.
    *   Extract key sections:
        *   **Contact Details:** Name, email, phone number, location, portfolio/social links (GitHub, LinkedIn).
        *   **Work Experience:** Company, job title, duration, locations, descriptions.
        *   **Education:** Institution, degree, graduation year, GPA (optional).
        *   **Skills:** Categorized into Technical Skills (languages, frameworks, tools) and Soft Skills.
        *   **Projects & Certifications:** Project titles, descriptions, technologies used, credential issuers.
    *   Allow users to review and manually edit parsed details on a profile setup screen to correct parsing inaccuracies.

### 3.4 ATS Analysis
*   **Description:** Audit resumes against common Applicant Tracking System constraints.
*   **Requirements:**
    *   Assess format compatibility (e.g., detecting non-standard symbols, multi-column layouts, graphics/charts that trip up simple parsers).
    *   Calculate an **ATS Score (0–100%)** based on formatting, keyword density, section headers, and measurable impact verbs.
    *   Identify formatting violations (e.g., headers or footers, scanning text embedded as images).
    *   Provide actionable recommendations to improve the score (e.g., "Add quantified metrics to your bullet points").

### 3.5 Job Matching
*   **Description:** Match user profiles against specific job descriptions.
*   **Requirements:**
    *   Allow users to input job descriptions via text copy-paste or by entering a job posting URL.
    *   Provide a **Compatibility/Match Score** (Percentage) representing how well the primary resume aligns with the job description.
    *   Highlight matching keywords/skills and call out missing key credentials.

### 3.6 Skill Gap Analysis
*   **Description:** Identify the delta between the user's current skill set and target job roles.
*   **Requirements:**
    *   Provide a side-by-side comparison of user skills vs. required job description skills.
    *   Classify gaps into:
        *   *Critical Gaps:* Skills explicitly mentioned as required.
        *   *Secondary Gaps:* Nice-to-have or preferred skills.
    *   Suggest learning resources, certifications, or project topics to bridge identified gaps.

### 3.7 Resume Tailoring
*   **Description:** Automatically adapt resume bullet points to fit target job requirements.
*   **Requirements:**
    *   Suggest adjustments to professional summaries and work experience bullet points.
    *   Integrate missing keywords organically while retaining the user's factual work history.
    *   Provide a side-by-side diff editor showing original vs. tailored suggestions with a one-click "Apply" option.

### 3.8 Cover Letter Generation
*   **Description:** Generate high-impact, custom cover letters matching the candidate's experience and target job.
*   **Requirements:**
    *   Generate cover letters based on the user's primary resume and the provided job description.
    *   Allow tone selection (e.g., Professional, Creative, Confident, Humble).
    *   Provide an in-app rich text editor to preview, modify, and copy/download the generated cover letter (.pdf or .docx).

### 3.9 Interview Question Generation
*   **Description:** Generate tailored practice questions for preparation.
*   **Requirements:**
    *   Analyze the resume and target job description to generate:
        *   **Technical Questions:** Tailored to specified technologies and skill levels.
        *   **Behavioral Questions:** Based on STAR methodology matching the role's responsibilities.
        *   **Resume-Specific Questions:** Focusing on details extracted from projects and work history (e.g., "Tell me about your React project listed on your resume").
    *   Provide sample high-quality answers and tips on how to frame responses for each question.

### 3.10 Application Tracking
*   **Description:** A personal CRM/Kanban board for managing job applications.
*   **Requirements:**
    *   Display applications in a board format with columns:
        *   `Wishlist` / `To Apply`
        *   `Applied`
        *   `Interviewing`
        *   `Offer Received`
        *   `Rejected` / `Archived`
    *   Allow users to create application cards detailing: Job Title, Company, Date Applied, Job Description, Salary Range, Interview Dates, and custom notes.
    *   Link tailored resumes and cover letters directly to their corresponding application card.

### 3.11 Analytics Dashboard
*   **Description:** High-level metrics showing application statistics and success rates.
*   **Requirements:**
    *   Visualize application counts across different statuses (e.g., a funnel chart from Applied to Offer).
    *   Display average resume scores, average job match percentages, and interview conversion rates.
    *   Provide time-based analytics (e.g., applications sent per week/month).

---

## 4. Non-Functional Requirements

### 4.1 Security & Privacy
*   All user resumes, contact details, and application data must be encrypted at rest and in transit (SSL/TLS).
*   User data must not be used to train public LLM models without explicit user consent.
*   Strict role-based access control (RBAC) to ensure users can only access their own profiles and documents.

### 4.2 Performance & Reliability
*   File uploads and document parsing should complete in under 5 seconds.
*   AI generation tasks (Cover Letters, Resumes, Interview Questions) should stream responses or use load indicators, completing in under 15 seconds.
*   Ensure application availability of 99.9%.

### 4.3 Accessibility
*   Adhere to WCAG 2.1 Level AA standards.
*   Ensure keyboard accessibility for all interactive visual interfaces (like the Kanban board and charts).
*   Support screen readers and maintain readable color contrast ratios.

### 4.4 Scalability
*   The system must handle horizontal scaling for database collections and API containers.
*   Support background workers and message queues (e.g., Celery/Redis) for asynchronous processing of PDF parsers and LLM API calls to prevent blocking the main web server threads.

---

## 5. Proposed Technology Stack
*   **Frontend:** React / Next.js (TypeScript, TailwindCSS/Vanilla CSS).
*   **Backend:** FastAPI / Python (For seamless integration with machine learning libraries and PDF extraction).
*   **Database:** PostgreSQL (for relational data like users, applications, and logs) + MongoDB (optional, for storing variable JSON resume models).
*   **AI/LLM Integration:** OpenAI API (GPT-4o) / Anthropic API (Claude 3.5 Sonnet) / Google Gemini API.
*   **Document Parsing:** PyMuPDF / Tesseract OCR / PDFPlumber / Claude PDF extraction.
