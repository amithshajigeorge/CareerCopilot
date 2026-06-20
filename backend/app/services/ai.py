import json
import time
import logging
from google import genai
from google.genai import types
from app.config import settings

logger = logging.getLogger(__name__)

def retry_on_exception(retries: int = 3, delay: float = 2.0, backoff: float = 2.0):
    """Custom decorator to retry a function on rate limits or API transient failures."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            current_delay = delay
            for attempt in range(retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    logger.warning(f"Gemini API call failed (attempt {attempt + 1}/{retries}): {e}")
                    if attempt == retries - 1:
                        raise e
                    time.sleep(current_delay)
                    current_delay *= backoff
            return None
        return wrapper
    return decorator

@retry_on_exception(retries=3, delay=1.0)
def _call_gemini_api(prompt: str, json_mode: bool = False) -> str:
    """Wrapper to make actual call to Google Gemini model."""
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set in application settings.")
        
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    config = None
    if json_mode:
        config = types.GenerateContentConfig(
            response_mime_type="application/json"
        )
        
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=config
    )
    return response.text

def parse_resume(raw_text: str) -> dict:
    """Parse raw resume text into structured structural JSON using Gemini."""
    prompt = f"""
    You are an expert resume parsing assistant. Parse the following raw resume text and extract structural data.
    You must output a JSON object containing precisely the following keys:
    - contact_details: {{ name: string, email: string, phone: string, location: string, links: [string] }}
    - work_experience: [ {{ company: string, role: string, duration: string, achievements: [string] }} ]
    - projects: [ {{ title: string, description: string, technologies: [string] }} ]
    - skills: [ string ]
    - education: [ {{ school: string, degree: string, graduation_year: string }} ]

    Raw Resume Text:
    {raw_text}
    """
    try:
        response_text = _call_gemini_api(prompt, json_mode=True)
        return json.loads(response_text)
    except Exception as e:
        logger.error(f"Error parsing resume structure: {e}")
        # Default fallback structure
        return {
            "contact_details": {"name": "", "email": "", "phone": "", "location": "", "links": []},
            "work_experience": [],
            "projects": [],
            "skills": [],
            "education": []
        }

def analyze_ats(raw_text: str) -> dict:
    """Analyze resume for formatting and content ATS issues."""
    prompt = f"""
    Evaluate the following resume text for Applicant Tracking System (ATS) compatibility. 
    Analyze formatting conflicts, keyword issues, structure, and readability metrics.
    Return a JSON object containing precisely:
    - score: integer (0 to 100 representing compatibility score)
    - formatting_issues: [string] (list of formatting warnings)
    - content_issues: [string] (list of issues related to descriptions or credentials)
    - key_recommendations: [string] (list of actionable tips to improve compatibility)

    Resume Text:
    {raw_text}
    """
    try:
        response_text = _call_gemini_api(prompt, json_mode=True)
        return json.loads(response_text)
    except Exception as e:
        logger.error(f"Error executing ATS audit: {e}")
        return {
            "score": 0,
            "formatting_issues": ["Error during parsing analysis"],
            "content_issues": [],
            "key_recommendations": ["Ensure resume has clear headers and standard styling"]
        }

def skill_gap_analysis(resume_text: str, job_description: str) -> dict:
    """Identify matching skills and gaps against target job description requirements."""
    prompt = f"""
    Perform a side-by-side skill comparison between the candidate's resume and the job description.
    Output a JSON object with the following fields:
    - match_score: integer (0 to 100 percentage)
    - matching_skills: [string] (skills present in both)
    - missing_critical_skills: [string] (required skills missing)
    - missing_secondary_skills: [string] (nice-to-have or optional skills missing)
    - roadmap: [string] (step-by-step sequential list of study/project actions to bridge the gap)
    - learning_resources: [ {{ skill: string, resource_name: string, resource_type: string (e.g. course, project), url: string }} ]

    Resume text:
    {resume_text}

    Job description text:
    {job_description}
    """
    try:
        response_text = _call_gemini_api(prompt, json_mode=True)
        return json.loads(response_text)
    except Exception as e:
        logger.error(f"Error performing skill gap audit: {e}")
        return {
            "match_score": 0,
            "matching_skills": [],
            "missing_critical_skills": [],
            "missing_secondary_skills": [],
            "roadmap": [],
            "learning_resources": []
        }

def tailor_resume(resume_text: str, job_description: str) -> dict:
    """Provide specific adjustments and bullet point edits for a target job posting."""
    prompt = f"""
    Help the candidate adapt their resume to target the specific job description below.
    Generate suggested revisions. Output a JSON object containing:
    - tailored_summary: string (suggested updated career objective or summary paragraph)
    - section_adjustments: [ {{ section_name: string, original_text: string, suggested_text: string, reason: string }} ]

    Rules:
    1. Do not fabricate information: do not add skills, technologies, experiences, degrees, or projects that the candidate does not already possess or mention in the resume.
    2. Preserve facts: keep numbers, metrics, years of experience, company names, and core responsibilities completely accurate and truthful to the original text.
    3. Improve wording: focus on rephrasing, highlighting existing relevant skills, optimizing keyword alignment with the job description, and making the language more professional, clear, and impactful.

    Resume text:
    {resume_text}

    Job description text:
    {job_description}
    """
    try:
        response_text = _call_gemini_api(prompt, json_mode=True)
        return json.loads(response_text)
    except Exception as e:
        logger.error(f"Error tailoring resume: {e}")
        return {
            "tailored_summary": "",
            "section_adjustments": []
        }

def generate_cover_letter(resume_text: str, job_description: str, tone: str = "Professional") -> str:
    """Generate high-quality custom cover letter based on user resume and target JD."""
    prompt = f"""
    Write a tailored, high-impact cover letter matching the candidate's resume achievements to the target job description.
    Keep the tone '{tone}'. Do not write placeholders. Return the cover letter directly as clean text.

    Resume:
    {resume_text}

    Job Description:
    {job_description}
    """
    try:
        return _call_gemini_api(prompt, json_mode=False)
    except Exception as e:
        logger.error(f"Error generating cover letter: {e}")
        return "Failed to generate cover letter. Please verify your API keys and try again."

def generate_interview_questions(resume_text: str, job_description: str) -> list[dict]:
    """Generate mock interview preparation questions with answer guides."""
    prompt = f"""
    Analyze the candidate's resume and target job description to generate 5 tailored mock interview questions.
    Provide a mix of technical, behavioral, and resume-specific questions.
    Return a JSON array of objects, where each object contains:
    - question: string
    - type: string (one of: 'technical', 'behavioral', 'resume-specific')
    - tip: string (advice on how to frame the response)
    - sample_answer: string (outline of a stellar answer)

    Resume:
    {resume_text}

    Job Description:
    {job_description}
    """
    try:
        response_text = _call_gemini_api(prompt, json_mode=True)
        return json.loads(response_text)
    except Exception as e:
        logger.error(f"Error generating interview questions: {e}")
        return []

def extract_skills_from_text(text: str) -> list[str]:
    """Use Gemini to extract a flat list of professional skills, tools, and technologies from a text."""
    prompt = f"""
    Analyze the following text and extract a clean list of professional skills, programming languages, frameworks, databases, tools, and technical competencies.
    Return a JSON array of strings only. Do not include duplicate items.

    Text:
    {text}
    """
    try:
        response_text = _call_gemini_api(prompt, json_mode=True)
        return json.loads(response_text)
    except Exception as e:
        logger.error(f"Error extracting skills from text: {e}")
        return []
