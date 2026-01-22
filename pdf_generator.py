"""
PDF Report Generator for Fortune Teller App.
Uses ReportLab for creating professional PDF reports with Chinese text support.
"""

import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfbase.ttfonts import TTFont
from pathlib import Path
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from text_utils import clean_text_for_pdf

# Register preferred Chinese font (local OTF), fallback to CID font.
_FONT_PATH = Path(__file__).resolve().parent / "assets" / "fonts" / "NotoSansCJKsc-Regular.otf"
_FONT_MEDIUM_PATH = Path(__file__).resolve().parent / "assets" / "fonts" / "NotoSansCJKsc-Medium.otf"
CHINESE_FONT_TITLE = None
try:
    if _FONT_PATH.exists():
        pdfmetrics.registerFont(TTFont("NotoSansCJKsc", str(_FONT_PATH)))
        CHINESE_FONT = "NotoSansCJKsc"
        if _FONT_MEDIUM_PATH.exists():
            pdfmetrics.registerFont(TTFont("NotoSansCJKsc-Medium", str(_FONT_MEDIUM_PATH)))
            CHINESE_FONT_TITLE = "NotoSansCJKsc-Medium"
    else:
        raise FileNotFoundError(_FONT_PATH)
except Exception:
    try:
        pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
        CHINESE_FONT = 'STSong-Light'
        CHINESE_FONT_TITLE = 'STSong-Light'
    except Exception:
        # Fallback to Helvetica (won't display Chinese properly, but won't crash)
        CHINESE_FONT = 'Helvetica'
        CHINESE_FONT_TITLE = 'Helvetica'

if CHINESE_FONT_TITLE is None:
    CHINESE_FONT_TITLE = CHINESE_FONT




def create_styles():
    """Create custom paragraph styles for the PDF."""
    styles = getSampleStyleSheet()
    
    # Title style
    styles.add(ParagraphStyle(
        name='ChineseTitle',
        fontName=CHINESE_FONT_TITLE,
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
        fontName=CHINESE_FONT_TITLE,
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
    story.append(Paragraph("八字命理分析报告", styles['ChineseTitle']))
    story.append(Paragraph(
        f"生成时间：{datetime.now().strftime('%Y年%m月%d日 %H:%M')}",
        styles['ChineseSubtitle']
    ))
    story.append(Spacer(1, 10))
    
    # ========== User Info Section ==========
    story.append(Paragraph("基本信息", styles['ChineseSectionHeader']))
    
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
    story.append(Paragraph("八字排盘", styles['ChineseSectionHeader']))
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


def generate_report_images_from_pdf(pdf_bytes: bytes, scale: float = 2.0) -> list:
    """
    Convert PDF bytes into a list of PNG images.

    Returns:
        List of (filename, png_bytes).
    """
    try:
        import fitz  # PyMuPDF
    except Exception as exc:
        raise RuntimeError("PyMuPDF not installed. Please add PyMuPDF to requirements.") from exc

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    images = []
    for page_index in range(doc.page_count):
        page = doc.load_page(page_index)
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
        images.append((f"report_page_{page_index + 1}.png", pix.tobytes("png")))
    doc.close()
    return images


def generate_grouped_report_pdf(
    bazi_result: str,
    time_info: str,
    gender: str,
    birthplace: str,
    responses: list,
    birth_datetime: str = None,
    pattern_info: dict = None,
    fortune_cycles: dict = None,
) -> bytes:
    """
    Generate a PDF where sections are grouped into dedicated pages for image export.
    """
    buffer = io.BytesIO()
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

    def safe_text(value, fallback: str = "—", allow_zero: bool = True) -> str:
        if value is None:
            return fallback
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped or stripped.lower() == "none":
                return fallback
            return stripped
        if not allow_zero and value == 0:
            return fallback
        return str(value)

    def format_age(value) -> str:
        age = safe_text(value, allow_zero=False)
        return f"{age}岁" if age != "—" else "—"

    def add_response_block(title: str, text: str) -> None:
        story.append(Paragraph(f"【{title}】", styles['ChineseSectionHeader']))
        clean_response = clean_text_for_pdf(text)
        paragraphs = clean_response.split('\n\n')
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            if para.startswith('•'):
                story.append(Paragraph(para, styles['ChineseInfo']))
            else:
                story.append(Paragraph(para, styles['ChineseBody']))
        story.append(Spacer(1, 12))

    # Title
    story.append(Paragraph("🔮 八字命理分析报告", styles['ChineseTitle']))
    story.append(Paragraph(
        f"生成时间：{datetime.now().strftime('%Y年%m月%d日 %H:%M')}",
        styles['ChineseSubtitle']
    ))
    story.append(Spacer(1, 10))

    # Page 1: Basic info + chart
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
    story.append(Spacer(1, 12))

    story.append(Paragraph("🎴 八字排盘", styles['ChineseSectionHeader']))
    story.append(Paragraph(bazi_result, styles['ChineseBazi']))
    story.append(Spacer(1, 12))

    response_map = {}
    for topic_key, topic_display, response_text in responses:
        clean_topic = topic_display.replace("📌 ", "").replace("💬 ", "").strip()
        response_map[topic_key] = (clean_topic, response_text)

    story.append(PageBreak())

    # Page 2: Overall
    if "整体命格" in response_map:
        title, text = response_map["整体命格"]
        add_response_block(title, text)
    else:
        story.append(Paragraph("暂无整体命格分析。", styles['ChineseInfo']))

    story.append(PageBreak())

    # Page 3: Professional chart details
    story.append(Paragraph("专业排盘详情", styles['ChineseSectionHeader']))
    if pattern_info:
        auxiliary = pattern_info.get("auxiliary", {})
        pillars = [
            ("年柱", pattern_info.get("year_pillar", "??")),
            ("月柱", pattern_info.get("month_pillar", "??")),
            ("日柱", pattern_info.get("day_pillar", "??")),
            ("时柱", pattern_info.get("hour_pillar", "??")),
        ]
        ten_gods = pattern_info.get("ten_gods", {})
        hidden = pattern_info.get("hidden_stems", {})
        twelve_stages = auxiliary.get("twelve_stages", {})
        nayin = auxiliary.get("nayin", {})
        kong_wang = auxiliary.get("kong_wang", [])
        shen_sha = auxiliary.get("shen_sha", [])

        header = ["项目"] + [p[0] for p in pillars]
        rows = [
            ["主星",
             ten_gods.get("年干", "—"),
             ten_gods.get("月干", "—"),
             "日主",
             ten_gods.get("时干", "—")],
            ["天干"] + [p[1][:1] if p[1] else "—" for p in pillars],
            ["地支"] + [p[1][1:] if len(p[1]) > 1 else "—" for p in pillars],
            ["藏干",
             "、".join(hidden.get("年支藏干", [])) or "—",
             "、".join(hidden.get("月支藏干", [])) or "—",
             "、".join(hidden.get("日支藏干", [])) or "—",
             "、".join(hidden.get("时支藏干", [])) or "—"],
            ["十二长生",
             twelve_stages.get("year_stage", "—"),
             twelve_stages.get("month_stage", "—"),
             twelve_stages.get("day_stage", "—"),
             twelve_stages.get("hour_stage", "—")],
            ["纳音",
             nayin.get("year", "—"),
             nayin.get("month", "—"),
             nayin.get("day", "—"),
             nayin.get("hour", "—")],
            ["空亡", "、".join(kong_wang) or "—", "", "", ""],
            ["神煞", "、".join(shen_sha) or "—", "", "", ""],
        ]

        table = Table([header] + rows, colWidths=[3*cm] + [3*cm]*4)
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), CHINESE_FONT),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F5F5F5')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#666666')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(table)
        story.append(Spacer(1, 12))

        if fortune_cycles:
            start_info = fortune_cycles.get("start_info", {})
            start_year = safe_text(start_info.get("year"), allow_zero=False)
            start_month = safe_text(start_info.get("month"), allow_zero=False)
            start_day = safe_text(start_info.get("day"), allow_zero=False)
            start_age = safe_text(start_info.get("age"), allow_zero=False)
            start_table = Table([
                ["起运时间", f"{start_year}年{start_month}月{start_day}天",
                 "起运年龄", f"{start_age}岁" if start_age != "—" else "—"]
            ], colWidths=[3*cm, 6*cm, 3*cm, 3*cm])
            start_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), CHINESE_FONT),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FAFAFA')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            story.append(start_table)
            story.append(Spacer(1, 10))

            da_yun = fortune_cycles.get("da_yun", [])
            if da_yun:
                header = ["大运"] + [safe_text(item.get("start_year")) for item in da_yun[:10]]
                ages = ["年龄"] + [format_age(item.get("start_age")) for item in da_yun[:10]]
                gz = ["干支"] + [safe_text(item.get("gan_zhi")) for item in da_yun[:10]]
                table = Table([header, ages, gz], colWidths=[3*cm] + [2.2*cm]*10)
                table.setStyle(TableStyle([
                    ('FONTNAME', (0, 0), (-1, -1), CHINESE_FONT),
                    ('FONTSIZE', (0, 0), (-1, -1), 8),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FAFAFA')),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ]))
                story.append(table)
                story.append(Spacer(1, 10))

            liu_nian = fortune_cycles.get("liu_nian", [])
            if liu_nian:
                header = ["流年"] + [safe_text(item.get("year")) for item in liu_nian[:10]]
                gz = ["干支"] + [safe_text(item.get("gan_zhi")) for item in liu_nian[:10]]
                ages = ["年龄"] + [format_age(item.get("age")) for item in liu_nian[:10]]
                table = Table([header, gz, ages], colWidths=[3*cm] + [2.2*cm]*10)
                table.setStyle(TableStyle([
                    ('FONTNAME', (0, 0), (-1, -1), CHINESE_FONT),
                    ('FONTSIZE', (0, 0), (-1, -1), 8),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FAFAFA')),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ]))
                story.append(table)
                story.append(Spacer(1, 10))

            liu_yue = fortune_cycles.get("liu_yue", [])
            if liu_yue:
                header = ["流月"]
                gz = ["干支"]
                for idx, item in enumerate(liu_yue[:12], start=1):
                    month_value = item.get("month")
                    if month_value is None or str(month_value).strip().lower() in ("", "none"):
                        month_value = idx
                    month_text = safe_text(month_value, allow_zero=False)
                    header.append(f"{month_text}月" if month_text != "—" else "—")
                    gz.append(safe_text(item.get("gan_zhi")))
                table = Table([header, gz], colWidths=[3*cm] + [1.6*cm]*12)
                table.setStyle(TableStyle([
                    ('FONTNAME', (0, 0), (-1, -1), CHINESE_FONT),
                    ('FONTSIZE', (0, 0), (-1, -1), 8),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FAFAFA')),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ]))
                story.append(table)
    else:
        story.append(Paragraph("暂无专业细盘数据。", styles['ChineseInfo']))

    story.append(PageBreak())

    # Other analysis pages
    topic_order = [
        "事业运势",
        "感情运势",
        "健康建议",
        "开运建议",
        "大运流年",
        "大师解惑",
        "oracle",
    ]
    for topic_key in topic_order:
        if topic_key not in response_map:
            continue
        title, text = response_map[topic_key]
        add_response_block(title, text)
        story.append(PageBreak())

    # Remove trailing page break if exists
    if story and isinstance(story[-1], PageBreak):
        story.pop()

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def generate_grouped_report_images(
    bazi_result: str,
    time_info: str,
    gender: str,
    birthplace: str,
    responses: list,
    birth_datetime: str = None,
    pattern_info: dict = None,
    fortune_cycles: dict = None,
    scale: float = 2.0,
) -> list:
    pdf_bytes = generate_grouped_report_pdf(
        bazi_result=bazi_result,
        time_info=time_info,
        gender=gender,
        birthplace=birthplace,
        responses=responses,
        birth_datetime=birth_datetime,
        pattern_info=pattern_info,
        fortune_cycles=fortune_cycles,
    )
    return generate_report_images_from_pdf(pdf_bytes, scale=scale)


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
