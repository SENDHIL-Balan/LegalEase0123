import io
import os
from pathlib import Path
from typing import Optional
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

from backend.config import LOGO_PATH, DISCLAIMER_TEXT
from backend.schemas.document import StructuredDocument

def _set_cell_background(cell, hex_color: str):
    """Sets background fill color for a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def _set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Sets cell internal padding in twips (1/20th of a point)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for margin_name, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{margin_name}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def generate_docx(doc_data: StructuredDocument) -> bytes:
    """
    Generates a production-grade, beautifully formatted DOCX legal contract.
    Features:
    - LegalEase AI logo & brand header
    - Formatted title & metadata table
    - Key Terms summary table with navy styling
    - Structured clauses with Times New Roman typography
    - Formal signature blocks
    - Branded footer on all pages
    """
    doc = Document()

    # 1. Page Margins (1 inch all around)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

        # Configure Header & Footer
        footer = section.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        f_run = f_p.add_run(
            f"LegalEase AI · Enterprise Legal Document Workspace · {doc_data.document_type} · Version {doc_data.version}\n"
            f"Confidential · Generated for Informational & Drafting Purposes"
        )
        f_run.font.name = "Times New Roman"
        f_run.font.size = Pt(8.5)
        f_run.font.color.rgb = RGBColor(120, 144, 156)

    # 2. Brand Logo & Header
    if os.path.exists(LOGO_PATH):
        try:
            logo_p = doc.add_paragraph()
            logo_p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            logo_p.paragraph_format.space_after = Pt(12)
            logo_run = logo_p.add_run()
            logo_run.add_picture(str(LOGO_PATH), width=Inches(2.5))
        except Exception:
            pass

    # 3. Document Title
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_p.paragraph_format.space_before = Pt(8)
    title_p.paragraph_format.space_after = Pt(4)
    title_run = title_p.add_run(doc_data.title.upper())
    title_run.font.name = "Times New Roman"
    title_run.font.size = Pt(20)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(15, 23, 42) # Deep navy

    # Subtitle / Effective Date
    date_p = doc.add_paragraph()
    date_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    date_p.paragraph_format.space_after = Pt(18)
    date_run = date_p.add_run(f"Effective Date: {doc_data.effective_date}  |  Jurisdiction: {doc_data.jurisdiction}")
    date_run.font.name = "Times New Roman"
    date_run.font.size = Pt(10)
    date_run.font.italic = True
    date_run.font.color.rgb = RGBColor(71, 85, 105)

    # 4. Parties Callout Box
    parties_table = doc.add_table(rows=1, cols=1)
    parties_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    parties_table.autofit = False
    parties_cell = parties_table.cell(0, 0)
    parties_cell.width = Inches(6.5)
    _set_cell_background(parties_cell, "F8FAFC")
    _set_cell_margins(parties_cell, top=140, bottom=140, left=180, right=180)

    p_header = parties_cell.paragraphs[0]
    p_header.paragraph_format.space_after = Pt(6)
    p_hrun = p_header.add_run("PARTIES TO THIS AGREEMENT")
    p_hrun.font.name = "Times New Roman"
    p_hrun.font.size = Pt(10)
    p_hrun.font.bold = True
    p_hrun.font.color.rgb = RGBColor(15, 23, 42)

    for i, p in enumerate(doc_data.parties):
        p_row = parties_cell.add_paragraph()
        p_row.paragraph_format.space_after = Pt(3)
        role_label = f"[{p.role.upper()}]: " if p.role else f"[PARTY {chr(65+i)}]: "
        r_run = p_row.add_run(role_label)
        r_run.font.name = "Times New Roman"
        r_run.font.bold = True
        r_run.font.size = Pt(9.5)
        r_run.font.color.rgb = RGBColor(180, 83, 9) # gold / amber

        details = f"{p.name}"
        if p.company:
            details += f" ({p.company})"
        if p.address:
            details += f" · Address: {p.address}"
        if p.email:
            details += f" · Email: {p.email}"
        d_run = p_row.add_run(details)
        d_run.font.name = "Times New Roman"
        d_run.font.size = Pt(9.5)
        d_run.font.color.rgb = RGBColor(51, 65, 85)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # 5. Key Terms Table (if terms exist)
    if doc_data.key_terms:
        terms_head_p = doc.add_paragraph()
        terms_head_p.paragraph_format.space_before = Pt(8)
        terms_head_p.paragraph_format.space_after = Pt(6)
        th_run = terms_head_p.add_run("KEY TERMS SUMMARY")
        th_run.font.name = "Times New Roman"
        th_run.font.size = Pt(11)
        th_run.font.bold = True
        th_run.font.color.rgb = RGBColor(15, 23, 42)

        terms_table = doc.add_table(rows=len(doc_data.key_terms) + 1, cols=2)
        terms_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        terms_table.autofit = False

        # Header Row
        hdr_c0 = terms_table.cell(0, 0)
        hdr_c1 = terms_table.cell(0, 1)
        hdr_c0.width = Inches(2.0)
        hdr_c1.width = Inches(4.5)
        _set_cell_background(hdr_c0, "0F172A") # Navy
        _set_cell_background(hdr_c1, "0F172A")
        _set_cell_margins(hdr_c0, top=120, bottom=120, left=140, right=140)
        _set_cell_margins(hdr_c1, top=120, bottom=120, left=140, right=140)

        t_h0 = hdr_c0.paragraphs[0].add_run("PROVISION / COVENANT")
        t_h0.font.name = "Times New Roman"
        t_h0.font.size = Pt(9.5)
        t_h0.font.bold = True
        t_h0.font.color.rgb = RGBColor(255, 255, 255)

        t_h1 = hdr_c1.paragraphs[0].add_run("AGREED SPECIFICATIONS")
        t_h1.font.name = "Times New Roman"
        t_h1.font.size = Pt(9.5)
        t_h1.font.bold = True
        t_h1.font.color.rgb = RGBColor(255, 255, 255)

        for row_idx, item in enumerate(doc_data.key_terms, start=1):
            bg_col = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
            c0 = terms_table.cell(row_idx, 0)
            c1 = terms_table.cell(row_idx, 1)
            c0.width = Inches(2.0)
            c1.width = Inches(4.5)
            _set_cell_background(c0, bg_col)
            _set_cell_background(c1, bg_col)
            _set_cell_margins(c0, top=100, bottom=100, left=140, right=140)
            _set_cell_margins(c1, top=100, bottom=100, left=140, right=140)

            t_r0 = c0.paragraphs[0].add_run(item.term)
            t_r0.font.name = "Times New Roman"
            t_r0.font.size = Pt(9.5)
            t_r0.font.bold = True
            t_r0.font.color.rgb = RGBColor(30, 41, 59)

            t_r1 = c1.paragraphs[0].add_run(item.details)
            t_r1.font.name = "Times New Roman"
            t_r1.font.size = Pt(9.5)
            t_r1.font.color.rgb = RGBColor(51, 65, 85)

        doc.add_paragraph().paragraph_format.space_after = Pt(14)

    # 6. Main Document Sections
    for sec in doc_data.sections:
        h_p = doc.add_paragraph()
        h_p.paragraph_format.space_before = Pt(12)
        h_p.paragraph_format.space_after = Pt(4)
        h_p.paragraph_format.keep_with_next = True
        h_run = h_p.add_run(sec.heading.upper())
        h_run.font.name = "Times New Roman"
        h_run.font.size = Pt(12)
        h_run.font.bold = True
        h_run.font.color.rgb = RGBColor(15, 23, 42)

        # Paragraphs within section content
        paragraphs = sec.content.split("\n\n")
        for para_text in paragraphs:
            clean_text = para_text.strip()
            if not clean_text:
                continue
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(6)
            p.paragraph_format.line_spacing = 1.15
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            run = p.add_run(clean_text)
            run.font.name = "Times New Roman"
            run.font.size = Pt(10.5)
            run.font.color.rgb = RGBColor(30, 41, 59)

    # 7. Signature Blocks
    sig_intro_p = doc.add_paragraph()
    sig_intro_p.paragraph_format.space_before = Pt(20)
    sig_intro_p.paragraph_format.space_after = Pt(14)
    sig_intro_p.paragraph_format.keep_with_next = True
    si_run = sig_intro_p.add_run(
        "IN WITNESS WHEREOF, the Parties hereto have executed this Agreement as of the Effective Date written above."
    )
    si_run.font.name = "Times New Roman"
    si_run.font.size = Pt(10)
    si_run.font.bold = True
    si_run.font.color.rgb = RGBColor(15, 23, 42)

    # Two column signatures if 2 parties, or stacked
    num_sigs = len(doc_data.signature_blocks)
    if num_sigs >= 2:
        sig_table = doc.add_table(rows=1, cols=2)
        sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        sig_table.autofit = False
        for i, sblock in enumerate(doc_data.signature_blocks[:2]):
            scell = sig_table.cell(0, i)
            scell.width = Inches(3.2)
            _set_cell_margins(scell, top=80, bottom=80, left=80, right=80)
            sp = scell.paragraphs[0]
            sp.paragraph_format.space_after = Pt(4)
            s_name = sp.add_run(f"{sblock.party_name.upper()}\n")
            s_name.font.name = "Times New Roman"
            s_name.font.size = Pt(10)
            s_name.font.bold = True
            if sblock.party_company:
                sp.add_run(f"On behalf of: {sblock.party_company}\n").font.name = "Times New Roman"
            if sblock.party_role:
                sp.add_run(f"Role: {sblock.party_role}\n").font.name = "Times New Roman"

            # Signature line
            sp.add_run("\n\n___________________________________\n").font.name = "Times New Roman"
            sp.add_run("Authorized Signature\n\n").font.name = "Times New Roman"
            sp.add_run("Date: ________________________\n").font.name = "Times New Roman"
    else:
        for sblock in doc_data.signature_blocks:
            sp = doc.add_paragraph()
            sp.paragraph_format.space_before = Pt(12)
            sp.paragraph_format.space_after = Pt(4)
            s_name = sp.add_run(f"{sblock.party_name.upper()}\n")
            s_name.font.name = "Times New Roman"
            s_name.font.bold = True
            if sblock.party_company:
                sp.add_run(f"On behalf of: {sblock.party_company}\n")
            sp.add_run("\n\n___________________________________\n")
            sp.add_run("Authorized Signature\n")
            sp.add_run("Date: ________________________\n")

    # 8. Disclaimer
    disc_p = doc.add_paragraph()
    disc_p.paragraph_format.space_before = Pt(24)
    disc_p.paragraph_format.space_after = Pt(0)
    disc_run = disc_p.add_run(f"NOTICE: {doc_data.disclaimer}")
    disc_run.font.name = "Times New Roman"
    disc_run.font.size = Pt(8)
    disc_run.font.italic = True
    disc_run.font.color.rgb = RGBColor(148, 163, 184)

    # Save to buffer
    target_stream = io.BytesIO()
    doc.save(target_stream)
    return target_stream.getvalue()
