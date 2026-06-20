import os
import sys

print("Pre-downloading SentenceTransformer model 'all-MiniLM-L6-v2'...")
try:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("all-MiniLM-L6-v2")
    print("Model downloaded and cached successfully!")
except Exception as e:
    print(f"Failed to pre-download model: {e}", file=sys.stderr)
    sys.exit(1)
