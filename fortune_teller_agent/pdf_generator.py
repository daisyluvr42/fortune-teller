"""
PDF Report Generator for Fortune Teller App.
Uses ReportLab for creating professional PDF reports with Chinese text support.
"""

import io
import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
import re

# Register Chinese CID font (built-in, no external file needed)
try:
    pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
    CHINESE_FONT = 'STSong-Light'
except Exception:
    # Fallback to Helvetica (won't display Chinese properly, but won't crash)
    CHINESE_FONT = 'Helvetica'


def clean_text_for_pdf(text: str) -> str:
    """
    Clean markdown formatting from text for PDF display.
    Converts markdown to plain text.
    """
    if not text:
        return text
    
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    
    # Convert markdown headers to plain text with newlines
    text = re.sub(r'^#{1,6}\s*(.+?)$', r'\n\1\n', text, flags=re.MULTILINE)
    
    # Remove bold/italic markers
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'__(.+?)__', r'\1', text)
    text = re.sub(r'\*([^*\n]+?)\*', r'\1', text)
    text = re.sub(r'_([^_\n]+?)_', r'\1', text)
    
    # Convert bullet points
    text = re.sub(r'^\s*[-*•]\s+', r'• ', text, flags=re.MULTILINE)
    
    # Clean up extra newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text.strip()


def create_styles():
    """Create custom paragraph styles for the PDF."""
    styles = getSampleStyleSheet()
    
    # Title style
    styles.add(ParagraphStyle(
        name='ChineseTitle',
        fontName=CHINESE_FONT,
        fontSize=24,
        leading=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#8B4513'),
        spaceAfter=20,
    ))
    
    # Subtitle style
    styles.add(ParagraphStyle(
        name='ChineseSubtitle',
        fontName=CHINESE_FONT,
        fontSize=14,
        leading=18,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#666666'),
        spaceAfter=30,
    ))
    
    # Section header style
    styles.add(ParagraphStyle(
        name='ChineseSectionHeader',
        fontName=CHINESE_FONT,
        fontSize=16,
        leading=22,
        alignment=TA_LEFT,
        textColor=colors.HexColor('#B8860B'),
        spaceBefore=20,
        spaceAfter=10,
        borderWidth=0,
        borderColor=colors.HexColor('#FFD700'),
        borderPadding=5,
        leftIndent=0,
    ))
    
    # Body text style
    styles.add(ParagraphStyle(
        name='ChineseBody',
        fontName=CHINESE_FONT,
        fontSize=11,
        leading=18,
        alignment=TA_JUSTIFY,
        textColor=colors.HexColor('#333333'),
        spaceAfter=12,
        firstLineIndent=22,
    ))
    
    # Info text style (smaller, for metadata)
    styles.add(ParagraphStyle(
        name='ChineseInfo',
        fontName=CHINESE_FONT,
        fontSize=10,
        leading=14,
        alignment=TA_LEFT,
        textColor=colors.HexColor('#666666'),
        spaceAfter=6,
    ))
    
    # Bazi display style
    styles.add(ParagraphStyle(
        name='ChineseBazi',
        fontName=CHINESE_FONT,
        fontSize=18,
        leading=24,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#2C3E50'),
        spaceBefore=15,
        spaceAfter=15,
    ))
    
    return styles


def generate_report_pdf(
    bazi_result: str,
    time_info: str,
    gender: str,
    birthplace: str,
    responses: list,
    birth_datetime: str = None,
) -> bytes:
    """
    Generate a PDF report containing all fortune analysis results.
    
    Args:
        bazi_result: The calculated Bazi string (e.g., "甲子 乙丑 丙寅 丁卯")
        time_info: Time calculation info
        gender: User's gender
        birthplace: User's birthplace
        responses: List of (topic_key, topic_display, response_text) tuples
        birth_datetime: Birth date and time string
        
    Returns:
        PDF file as bytes
    """
    buffer = io.BytesIO()
    
    # Create PDF document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
    )
    
    styles = create_styles()
    story = []
    
    # ========== Title Section ==========
    story.append(Paragraph("🔮 八字命理分析报告", styles['ChineseTitle']))
    story.append(Paragraph(
        f"生成时间：{datetime.now().strftime('%Y年%m月%d日 %H:%M')}",
        styles['ChineseSubtitle']
    ))
    story.append(Spacer(1, 10))
    
    # ========== User Info Section ==========
    story.append(Paragraph("📋 基本信息", styles['ChineseSectionHeader']))
    
    info_data = [
        ["性别", gender],
        ["出生地点", birthplace if birthplace != "未指定" else "未指定（使用北京时间）"],
    ]
    if birth_datetime:
        info_data.insert(0, ["出生时间", birth_datetime])
    if time_info:
        info_data.append(["时间校正", time_info])
    
    info_table = Table(info_data, colWidths=[3*cm, 12*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), CHINESE_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#333333')),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 15))
    
    # ========== Bazi Display ==========
    story.append(Paragraph("🎴 八字排盘", styles['ChineseSectionHeader']))
    story.append(Paragraph(bazi_result, styles['ChineseBazi']))
    story.append(Spacer(1, 20))
    
    # ========== Analysis Responses ==========
    if responses:
        story.append(Paragraph("📜 命理分析", styles['ChineseSectionHeader']))
        story.append(Spacer(1, 10))
        
        for i, (topic_key, topic_display, response_text) in enumerate(responses):
            # Clean up topic display
            clean_topic = topic_display.replace("📌 ", "").replace("💬 ", "")
            
            # Add topic header
            story.append(Paragraph(
                f"【{clean_topic}】",
                styles['ChineseSectionHeader']
            ))
            
            # Clean and add response text
            clean_response = clean_text_for_pdf(response_text)
            
            # Split into paragraphs for better formatting
            paragraphs = clean_response.split('\n\n')
            for para in paragraphs:
                para = para.strip()
                if para:
                    # Handle bullet points specially
                    if para.startswith('•'):
                        story.append(Paragraph(para, styles['ChineseInfo']))
                    else:
                        story.append(Paragraph(para, styles['ChineseBody']))
            
            story.append(Spacer(1, 15))
            
            # Add page break after every 2 responses (except last)
            if (i + 1) % 2 == 0 and i < len(responses) - 1:
                story.append(PageBreak())
    
    # ========== Footer ==========
    story.append(Spacer(1, 30))
    story.append(Paragraph(
        "— 本报告由「命理大师」AI 生成，仅供参考 —",
        styles['ChineseSubtitle']
    ))
    
    # Build PDF
    doc.build(story)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes


if __name__ == "__main__":
    # Test PDF generation
    test_responses = [
        ("整体命格", "📌 整体命格", "这是一段测试文本，用于验证PDF生成功能。\n\n您的八字格局整体呈现**木火通明**之象，日主甲木生于寅月，得令而旺。"),
        ("事业运势", "📌 事业运势", "事业方面，您适合从事与木、火相关的行业，如教育、文化、科技等领域。"),
    ]
    
    pdf_bytes = generate_report_pdf(
        bazi_result="甲寅 丙寅 甲子 乙丑",
        time_info="真太阳时 +8分钟",
        gender="男",
        birthplace="北京",
        responses=test_responses,
        birth_datetime="1990年2月15日 14:30",
    )
    
    with open("test_report.pdf", "wb") as f:
        f.write(pdf_bytes)
    print(f"Test PDF generated: {len(pdf_bytes)} bytes")
