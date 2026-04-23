# Agent Step 3: Topic Validator (Decision Step)
# Compares user-selected topics against extracted topics

from typing import List, Dict

def validate_topics(user_topics: List[str], extracted_topics: List[str]) -> Dict:
    extracted_lower = [t.lower() for t in extracted_topics]

    included = []
    ignored = []

    for topic in user_topics:
        if topic.lower() in extracted_lower:
            included.append(topic)
        else:
            ignored.append(topic)

    return {
        "included_topics": included,
        "ignored_topics": ignored,
    }
