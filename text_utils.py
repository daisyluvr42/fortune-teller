"""
Text cleanup helpers shared by UI and PDF rendering.
"""
from __future__ import annotations

import re
import unicodedata

_MD_HEADER_RE = re.compile(r'^#{1,6}\s*(.+?)$', re.MULTILINE)
_MD_BOLD_ASTERISK_RE = re.compile(r'\*\*(.+?)\*\*')
_MD_BOLD_UNDERSCORE_RE = re.compile(r'__(.+?)__')
_MD_ITALIC_ASTERISK_RE = re.compile(r'(?<!\w)\*([^*\n]+?)\*(?!\w)')
_MD_ITALIC_UNDERSCORE_RE = re.compile(r'(?<!\w)_([^_\n]+?)_(?!\w)')
_MD_BULLET_RE = re.compile(r'^\s*[-*•]\s+', re.MULTILINE)
_MD_NUMBERED_RE = re.compile(r'^\s*(\d+)\.\s+', re.MULTILINE)
_MD_HEADER_TRANSLATION_RE = re.compile(r'^(#+\s+.*?)\s*\([^)]*\)', re.MULTILINE)
_MD_DOUBLE_NEWLINE_RE = re.compile(r'\n\n')
_MD_SINGLE_NEWLINE_RE = re.compile(r'\n')

_HTML_TAG_RE = re.compile(r'<[^>]+>')
_MD_PDF_HEADER_RE = re.compile(r'^#{1,6}\s*(.+?)$', re.MULTILINE)
_MD_PDF_BOLD_ASTERISK_RE = re.compile(r'\*\*(.+?)\*\*')
_MD_PDF_BOLD_UNDERSCORE_RE = re.compile(r'__(.+?)__')
_MD_PDF_ITALIC_ASTERISK_RE = re.compile(r'\*([^*\n]+?)\*')
_MD_PDF_ITALIC_UNDERSCORE_RE = re.compile(r'_([^_\n]+?)_')
_MD_PDF_BULLET_RE = re.compile(r'^\s*[-*•]\s+', re.MULTILINE)
_MD_PDF_EXTRA_NEWLINES_RE = re.compile(r'\n{3,}')
_MD_PDF_BLOCKQUOTE_RE = re.compile(r'^\s*>\s?', re.MULTILINE)
_MD_PDF_RULE_RE = re.compile(r'^\s*[-—–]{2,}\s*$', re.MULTILINE)
_MD_PDF_CODE_BLOCK_RE = re.compile(r'```.*?```', re.DOTALL)
_MD_PDF_INLINE_CODE_RE = re.compile(r'`([^`]+)`')


def clean_markdown_for_display(text: str) -> str:
    """
    Convert markdown formatting to HTML for proper display in Streamlit.
    Removes/converts: headers (#), bold (**), italic (*), bullet points, etc.
    """
    if not text:
        return text

    # Convert headers (## Title) to styled divs
    text = _MD_HEADER_RE.sub(
        r'<div style="font-size: 1.2em; font-weight: bold; color: #ffd700; margin: 15px 0 10px 0;">\1</div>',
        text,
    )

    # Convert bold (**text** or __text__)
    text = _MD_BOLD_ASTERISK_RE.sub(r'<strong>\1</strong>', text)
    text = _MD_BOLD_UNDERSCORE_RE.sub(r'<strong>\1</strong>', text)

    # Convert italic (*text* or _text_) - but not inside words
    text = _MD_ITALIC_ASTERISK_RE.sub(r'<em>\1</em>', text)
    text = _MD_ITALIC_UNDERSCORE_RE.sub(r'<em>\1</em>', text)

    # Convert bullet points to styled list items
    text = _MD_BULLET_RE.sub(r'<span style="color: #ffd700;">▸</span> ', text)

    # Convert numbered lists
    text = _MD_NUMBERED_RE.sub(r'<span style="color: #ffd700;">\1.</span> ', text)

    # Remove English translations in parentheses from headers (e.g., "#### 标题 (English)")
    text = _MD_HEADER_TRANSLATION_RE.sub(r'\1', text)

    # Add line breaks for markdown paragraphs
    text = _MD_DOUBLE_NEWLINE_RE.sub(r'<br><br>', text)
    text = _MD_SINGLE_NEWLINE_RE.sub(r'<br>', text)

    return text


def clean_text_for_pdf(text: str) -> str:
    """
    Clean markdown formatting from text for PDF display.
    Converts markdown to plain text.
    """
    if not text:
        return text

    text = text.replace('\r\n', '\n').replace('\r', '\n')

    # Remove HTML tags
    text = _HTML_TAG_RE.sub('', text)

    # Strip emojis/symbols that CID fonts cannot render reliably
    filtered_chars = []
    for ch in text:
        category = unicodedata.category(ch)
        if category in ("So", "Sk", "Cs") or ch in ("\ufe0f", "\u200d"):
            continue
        filtered_chars.append(ch)
    text = "".join(filtered_chars)

    # Remove invisible characters and normalize spacing
    text = text.replace('\ufeff', '').replace('\u200b', '').replace('\u2060', '')
    text = text.replace('\u3000', ' ')

    # Replace triangle bullets with simple bullet
    text = text.replace('▲', '·').replace('▼', '·').replace('►', '·').replace('◄', '·')
    text = text.replace('△', '·').replace('▽', '·').replace('▷', '·').replace('◁', '·')
    text = text.replace('▸', '·').replace('▹', '·').replace('◂', '·').replace('◃', '·')
    text = text.replace('▴', '·').replace('▵', '·').replace('▾', '·').replace('▿', '·')
    text = text.replace('◆', '·').replace('◇', '·').replace('★', '·').replace('☆', '·')
    text = text.replace('●', '·').replace('○', '·').replace('■', '·').replace('□', '·')

    # Remove code blocks and blockquotes
    text = _MD_PDF_CODE_BLOCK_RE.sub('', text)
    text = _MD_PDF_RULE_RE.sub('', text)
    text = _MD_PDF_BLOCKQUOTE_RE.sub('', text)
    text = _MD_PDF_INLINE_CODE_RE.sub(r'\1', text)

    # Convert markdown headers to plain text with unique marker and newlines
    # Allow leading whitespace
    text = re.sub(r'^\s*#{1,6}\s*(.+?)$', r'\n\n##HEADER##\1\n\n', text, flags=re.MULTILINE)

    # Remove bold/italic markers
    text = _MD_PDF_BOLD_ASTERISK_RE.sub(r'\1', text)
    text = _MD_PDF_BOLD_UNDERSCORE_RE.sub(r'\1', text)
    text = _MD_PDF_ITALIC_ASTERISK_RE.sub(r'\1', text)
    text = _MD_PDF_ITALIC_UNDERSCORE_RE.sub(r'\1', text)

    # Convert bullet points
    text = _MD_PDF_BULLET_RE.sub(r'· ', text)

    # Normalize spaces per line
    lines = []
    for line in text.split('\n'):
        lines.append(re.sub(r'[ \t]+', ' ', line).strip())
    text = '\n'.join(lines)

    # Remove unintended spacing between CJK characters and punctuation
    # NOTE: We use [ \t]+ instead of \s+ to avoid eating newlines (paragraph breaks)
    text = re.sub(r'([\u4e00-\u9fff])[ \t]+([\u4e00-\u9fff])', r'\1\2', text)
    text = re.sub(r'([\u4e00-\u9fff])[ \t]+([，。！？；：、”’》）】])', r'\1\2', text)
    text = re.sub(r'([“‘《（【])[ \t]+([\u4e00-\u9fff])', r'\1\2', text)
    text = re.sub(r'([“‘])[ \t]+', r'\1', text)
    text = re.sub(r'[ \t]+([”’])', r'\1', text)

    # Add thin space between CJK and Latin/digits for better readability
    text = re.sub(r'([\u4e00-\u9fff])([A-Za-z0-9])', r'\1 \2', text)
    text = re.sub(r'([A-Za-z0-9])([\u4e00-\u9fff])', r'\1 \2', text)

    # Clean up extra newlines
    text = _MD_PDF_EXTRA_NEWLINES_RE.sub('\n\n', text)

    return text.strip()
