# Agent Step 1: Document Analyzer
# Extracts raw text from uploaded PDF, DOCX, or TXT files

import io
import PyPDF2
import docx

def extract_text_from_file(content: bytes, content_type: str, filename: str) -> str:
    if content_type == "application/pdf":
        return _extract_pdf(content)
    elif "wordprocessingml" in content_type:
        return _extract_docx(content)
    else:
        return content.decode("utf-8", errors="ignore")

def _extract_pdf(content: bytes) -> str:
    reader = PyPDF2.PdfReader(io.BytesIO(content))
    return "\n".join(page.extract_text() or "" for page in reader.pages)

def _extract_docx(content: bytes) -> str:
    doc = docx.Document(io.BytesIO(content))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
