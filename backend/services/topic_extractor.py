# Agent Step 2: Topic Extractor
# Uses KeyBERT for semantic keyword extraction with NLP fallback

from typing import List

def extract_topics(text: str, top_n: int = 10) -> List[str]:
    try:
        from keybert import KeyBERT
        kw_model = KeyBERT()
        keywords = kw_model.extract_keywords(
            text,
            keyphrase_ngram_range=(1, 2),
            stop_words="english",
            top_n=top_n,
        )
        return [kw[0] for kw in keywords]
    except Exception:
        return _fallback_extraction(text, top_n)

def _fallback_extraction(text: str, top_n: int) -> List[str]:
    """Simple frequency-based fallback if KeyBERT fails."""
    import re
    from collections import Counter

    STOPWORDS = {"the", "a", "an", "is", "in", "on", "at", "to", "and", "or",
                 "of", "for", "with", "this", "that", "it", "be", "are", "was"}

    words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
    filtered = [w for w in words if w not in STOPWORDS]
    common = Counter(filtered).most_common(top_n)
    return [word for word, _ in common]
