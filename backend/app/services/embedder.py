import numpy as np
import logging

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

def calculate_match_score(resume_text: str, job_description: str) -> float:
    """Calculate semantic similarity score between resume and job description.
    Returns a percentage score between 0 and 100."""
    print(f"[EMBEDDER] calculate_match_score: started, resume len={len(resume_text)}, jd len={len(job_description)}", flush=True)
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
        
        # Scale to 0-100 (handling negative cosine similarities if any)
        percentage_score = max(0.0, min(100.0, score * 100.0))
        return round(percentage_score, 2)
    except Exception as e:
        print(f"[EMBEDDER] calculate_match_score: failed with error: {e}", flush=True)
        return 0.0


