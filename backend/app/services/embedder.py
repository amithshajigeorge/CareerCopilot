import numpy as np
import logging
import re
import json
from app.config import settings

logger = logging.getLogger(__name__)

# Cache model instance to avoid reloading it on every request
_model = None

def get_embedding_model():
    """Load and return the all-MiniLM-L6-v2 SentenceTransformer model."""
    global _model
    if _model is None:
        print("[EMBEDDER] get_embedding_model: initializing model...", flush=True)
        try:
            import torch
            torch.set_num_threads(1)
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer("all-MiniLM-L6-v2")
            print("[EMBEDDER] get_embedding_model: loaded successfully!", flush=True)
        except Exception as e:
            print(f"[EMBEDDER] get_embedding_model: failed with error: {e}", flush=True)
            raise e
    return _model

def calculate_match_score_fallback(resume_text: str, job_description: str) -> float:
    """Calculate similarity using a lightweight pure-Python Jaccard token overlap method."""
    print("[EMBEDDER] calculate_match_score_fallback: calculating Jaccard similarity...", flush=True)
    def get_words(text):
        return set(re.findall(r'\b[a-zA-Z]{2,}\b', text.lower()))
    
    words_resume = get_words(resume_text)
    words_jd = get_words(job_description)
    
    if not words_resume or not words_jd:
        return 0.0
        
    intersection = words_resume.intersection(words_jd)
    union = words_resume.union(words_jd)
    
    percentage_score = (len(intersection) / len(union)) * 100.0
    print(f"[EMBEDDER] calculate_match_score_fallback: Jaccard score={percentage_score:.2f}", flush=True)
    return round(percentage_score, 2)

def calculate_match_score_gemini(resume_text: str, job_description: str) -> float:
    """Use Gemini API to calculate semantic match score."""
    print("[EMBEDDER] calculate_match_score_gemini: using Gemini API...", flush=True)
    try:
        from app.services.ai import _call_gemini_api
        prompt = f"""
        You are an expert ATS (Applicant Tracking System) assistant.
        Compare the following resume text against the job description.
        Calculate a semantic similarity match score between 0.0 and 100.0, where:
        - 0.0 means completely unrelated
        - 100.0 means perfect alignment of skills, experience, and role.
        
        Provide only a JSON response with a single key "score" containing the float value. Do not explain your choice.
        
        Resume:
        {resume_text}
        
        Job Description:
        {job_description}
        """
        response_text = _call_gemini_api(prompt, json_mode=True)
        data = json.loads(response_text)
        score = float(data.get("score", 0.0))
        print(f"[EMBEDDER] calculate_match_score_gemini: Gemini score={score}", flush=True)
        return round(max(0.0, min(100.0, score)), 2)
    except Exception as e:
        print(f"[EMBEDDER] calculate_match_score_gemini failed: {e}", flush=True)
        # Fall back to pure-Python overlap
        return calculate_match_score_fallback(resume_text, job_description)

def calculate_match_score(resume_text: str, job_description: str) -> float:
    """Calculate semantic similarity score between resume and job description.
    Returns a percentage score between 0 and 100."""
    print(f"[EMBEDDER] calculate_match_score: started, resume len={len(resume_text)}, jd len={len(job_description)}", flush=True)
    
    # 1. Check if configured to use local embedder (SentenceTransformers)
    if settings.USE_LOCAL_EMBEDDER:
        print("[EMBEDDER] calculate_match_score: local embedder enabled", flush=True)
        try:
            model = get_embedding_model()
            print("[EMBEDDER] calculate_match_score: encoding resume...", flush=True)
            emb_resume = model.encode(resume_text, convert_to_tensor=True)
            print("[EMBEDDER] calculate_match_score: encoding jd...", flush=True)
            emb_jd = model.encode(job_description, convert_to_tensor=True)
            
            # Calculate cosine similarity
            from sentence_transformers import util
            print("[EMBEDDER] calculate_match_score: computing cosine similarity...", flush=True)
            similarity = util.cos_sim(emb_resume, emb_jd)
            score = float(similarity.item())
            print(f"[EMBEDDER] calculate_match_score: computed score={score}", flush=True)
            
            # Scale to 0-100
            percentage_score = max(0.0, min(100.0, score * 100.0))
            return round(percentage_score, 2)
        except Exception as e:
            print(f"[EMBEDDER] calculate_match_score: local embedder failed: {e}. Falling back to Gemini...", flush=True)
            return calculate_match_score_gemini(resume_text, job_description)
    else:
        # Default: Use Gemini API matcher to save RAM on Render Free tier
        return calculate_match_score_gemini(resume_text, job_description)


