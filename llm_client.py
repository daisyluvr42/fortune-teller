"""
Cached OpenAI-compatible client factory for reuse across requests.
"""
from __future__ import annotations

from functools import lru_cache
from openai import OpenAI


@lru_cache(maxsize=8)
def get_llm_client(api_key: str, base_url: str) -> OpenAI:
    """Return a cached OpenAI client for a given key/base URL pair."""
    return OpenAI(api_key=api_key, base_url=base_url)
