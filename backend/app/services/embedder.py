from sentence_transformers import SentenceTransformer, util
import numpy as np
import logging

logger = logging.getLogger(__name__)

# Cache model instance to avoid reloading it on every request
_model = None

def get_embedding_model() -> SentenceTransformer:
    """Load and return the all-MiniLM-L6-v2 SentenceTransformer model."""
    global _model
    if _model is None:
        try:
            logger.info("Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
            _model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("SentenceTransformer model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load SentenceTransformer model: {e}")
            raise e
    return _model

def calculate_match_score(resume_text: str, job_description: str) -> float:
    """Calculate semantic similarity score between resume and job description.
    Returns a percentage score between 0 and 100."""
    try:
        model = get_embedding_model()
        # Encode inputs
        emb_resume = model.encode(resume_text, convert_to_tensor=True)
        emb_jd = model.encode(job_description, convert_to_tensor=True)
        
        # Calculate cosine similarity
        similarity = util.cos_sim(emb_resume, emb_jd)
        score = float(similarity.item())
        
        # Scale to 0-100 (handling negative cosine similarities if any)
        percentage_score = max(0.0, min(100.0, score * 100.0))
        return round(percentage_score, 2)
    except Exception as e:
        logger.error(f"Error calculating similarity match score: {e}")
        return 0.0
