"""Small reportlab helpers shared by the receipt and the dashboard reports."""
import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

PRIMARY = colors.HexColor('#8B5CF6')
INK = colors.HexColor('#16161f')
MUTED = colors.HexColor('#6b6b80')
LINE = colors.HexColor('#dcdce6')
ZEBRA = colors.HexColor('#f5f5fa')

_base = getSampleStyleSheet()
STYLES = {
    'logo': ParagraphStyle('logo', parent=_base['Title'], fontName='Courier-Bold', fontSize=20, textColor=PRIMARY, alignment=0, spaceAfter=2),
    'title': ParagraphStyle('title', parent=_base['Heading1'], fontName='Helvetica-Bold', fontSize=16, textColor=INK, spaceAfter=4),
    'meta': ParagraphStyle('meta', parent=_base['Normal'], fontName='Helvetica', fontSize=9.5, textColor=MUTED, leading=14),
    'body': ParagraphStyle('body', parent=_base['Normal'], fontName='Helvetica', fontSize=10, textColor=INK, leading=14),
    'note': ParagraphStyle('note', parent=_base['Normal'], fontName='Helvetica-Oblique', fontSize=9, textColor=MUTED, leading=13),
    'cell': ParagraphStyle('cell', parent=_base['Normal'], fontName='Helvetica', fontSize=9, textColor=INK, leading=11),
}


def rupees(n):
    return f'Rs {int(n):,}'


def table(header, rows, col_widths, right_cols=()):
    """A zebra-striped data table. Text cells are wrapped in Paragraphs so long titles never overflow."""
    data = [header] + [[Paragraph(str(c), STYLES['cell']) if isinstance(c, str) and i not in right_cols else c for i, c in enumerate(r)] for r in rows]
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), INK), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'), ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LINEBELOW', (0, 1), (-1, -1), 0.25, LINE), ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, ZEBRA]),
    ]
    for c in right_cols:
        style.append(('ALIGN', (c, 0), (c, -1), 'RIGHT'))
    t.setStyle(TableStyle(style))
    return t


def build_pdf(title, meta_lines, flowables, footer='Pixel Forge · Demo transaction, no real money was charged'):
    """Assemble an A4 PDF: logo, title, meta lines, then the given flowables. Returns bytes."""
    buf = io.BytesIO()

    def on_page(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(18 * mm, 10 * mm, footer)
        canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f'Page {doc.page}')
        canvas.restoreState()

    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=18 * mm, title=title, author='Pixel Forge')
    story = [Paragraph('PIXEL FORGE', STYLES['logo']), HRFlowable(width='100%', thickness=2, color=PRIMARY, spaceAfter=8),
             Paragraph(title, STYLES['title'])]
    story += [Paragraph(line, STYLES['meta']) for line in meta_lines]
    story.append(Spacer(1, 10))
    story += flowables
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return buf.getvalue()
