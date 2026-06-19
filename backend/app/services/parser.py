import pdfplumber
import logging

logger = logging.getLogger(__name__)

def extract_text_from_pdf(file_path: str) -> str:
    """Extract raw text from a PDF file using pdfplumber.
    Handles corrupted files or parsing exceptions gracefully by returning an empty string."""
    extracted_pages = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    extracted_pages.append(text)
    except Exception as e:
        logger.error(f"Failed to extract text from PDF at {file_path}: {e}")
        return ""
    return "\n".join(extracted_pages)
