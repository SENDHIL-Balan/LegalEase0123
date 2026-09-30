import os
from fpdf import FPDF
from backend.config import LOGO_PATH, DISCLAIMER_TEXT
from backend.schemas.document import StructuredDocument

class LegalEasePDF(FPDF):
    def __init__(self, doc_data: StructuredDocument):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.doc_data = doc_data
        self.set_margins(left=20, top=20, right=20)
        self.set_auto_page_break(auto=True, margin=22)

    def header(self):
        # Draw logo or brand bar
        if os.path.exists(LOGO_PATH):
            try:
                self.image(str(LOGO_PATH), x=20, y=12, w=55)
            except Exception:
                self._draw_text_logo()
        else:
            self._draw_text_logo()

        # Document type indicator on top right
        self.set_xy(100, 15)
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(100, 116, 139) # slate-500
        self.cell(90, 5, f"LEGALEASE AI · {self.doc_data.document_type.upper()}", align="R")
        
        # Subtle horizontal rule
        self.set_draw_color(226, 232, 240)
        self.set_line_width(0.3)
        self.line(20, 26, 190, 26)
        self.ln(12)

    def _draw_text_logo(self):
        self.set_xy(20, 13)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(15, 23, 42)
        self.cell(40, 6, "LegalEase AI", align="L")

    def footer(self):
        self.set_y(-18)
        # Subtle separator
        self.set_draw_color(226, 232, 240)
        self.set_line_width(0.3)
        self.line(20, self.get_y(), 190, self.get_y())
        
        self.set_y(-14)
        self.set_font("Helvetica", "", 7.5)
        self.set_text_color(148, 163, 184) # slate-400
        self.cell(
            120, 4,
            "Confidential · LegalEase AI Document Generator · Informational & Drafting Purview",
            align="L"
        )
        self.cell(50, 4, f"Page {self.page_no()} of {{nb}}", align="R")

def generate_pdf(doc_data: StructuredDocument) -> bytes:
    """
    Renders the structured legal document into a professional, enterprise-grade PDF.
    """
    pdf = LegalEasePDF(doc_data)
    pdf.alias_nb_pages()
    pdf.add_page()

    # 1. Document Title
    pdf.set_y(32)
    pdf.set_font("Times", "B", 18)
    pdf.set_text_color(15, 23, 42) # Deep navy
    pdf.cell(170, 9, doc_data.title.upper(), align="C", new_x="LMARGIN", new_y="NEXT")

    # Subtitle / Date / Jurisdiction
    pdf.set_font("Times", "I", 9.5)
    pdf.set_text_color(71, 85, 105)
    sub = f"Effective Date: {doc_data.effective_date}   |   Governing Law: {doc_data.jurisdiction}"
    pdf.cell(170, 5, sub, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # 2. Parties Box
    pdf.set_fill_color(248, 250, 252) # slate-50
    pdf.set_draw_color(226, 232, 240) # slate-200
    pdf.set_line_width(0.4)
    
    # Calculate box height based on parties
    party_lines_count = sum(2 + (1 if p.company else 0) + (1 if p.address else 0) for p in doc_data.parties)
    box_height = max(24, 8 + party_lines_count * 4.5)
    start_y = pdf.get_y()
    pdf.rect(20, start_y, 170, box_height, style="FD")

    pdf.set_xy(24, start_y + 3)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(162, 5, "PARTIES TO THIS INSTRUMENT:", new_x="LMARGIN", new_y="NEXT")
    
    for i, p in enumerate(doc_data.parties):
        pdf.set_x(26)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(180, 83, 9) # gold/amber
        role = p.role.upper() if p.role else f"PARTY {chr(65+i)}"
        pdf.write(4.5, f"[{role}] ")
        
        pdf.set_font("Times", "", 9)
        pdf.set_text_color(30, 41, 59)
        desc = p.name
        if p.company:
            desc += f", on behalf of {p.company}"
        if p.address:
            desc += f" (Address: {p.address})"
        if p.email:
            desc += f" [Email: {p.email}]"
        pdf.write(4.5, desc + "\n")

    pdf.set_y(start_y + box_height + 5)

    # 3. Key Terms Summary Table
    if doc_data.key_terms:
        pdf.set_font("Helvetica", "B", 9.5)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(170, 6, "KEY TERMS & PROVISIONS SUMMARY", new_x="LMARGIN", new_y="NEXT")
        
        # Table Header
        pdf.set_fill_color(15, 23, 42) # Navy
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 8)
        pdf.cell(50, 7, "  PROVISION / TERM", fill=True, border=1)
        pdf.cell(120, 7, "  AGREED SPECIFICATION", fill=True, border=1, new_x="LMARGIN", new_y="NEXT")

        # Table Rows
        for idx, kt in enumerate(doc_data.key_terms):
            fill = (idx % 2 == 1)
            pdf.set_fill_color(248, 250, 252) if fill else pdf.set_fill_color(255, 255, 255)
            pdf.set_text_color(15, 23, 42)
            pdf.set_font("Times", "B", 8.5)
            pdf.cell(50, 7, f"  {kt.term[:30]}", border=1, fill=fill)
            
            pdf.set_font("Times", "", 8.5)
            pdf.set_text_color(51, 65, 85)
            # Truncate or fit line safely
            details_str = kt.details.replace("\n", " ")
            if len(details_str) > 85:
                details_str = details_str[:82] + "..."
            pdf.cell(120, 7, f"  {details_str}", border=1, fill=fill, new_x="LMARGIN", new_y="NEXT")
        
        pdf.ln(5)

    # 4. Sections
    for sec in doc_data.sections:
        # Check space for heading + 2 lines
        if pdf.get_y() > 245:
            pdf.add_page()

        pdf.set_font("Times", "B", 11)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(170, 7, sec.heading.upper(), new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("Times", "", 10)
        pdf.set_text_color(30, 41, 59)
        
        paragraphs = sec.content.split("\n\n")
        for p_text in paragraphs:
            clean_p = p_text.strip()
            if not clean_p:
                continue
            # Output multi_cell with 5mm line height
            pdf.multi_cell(170, 5.2, clean_p, align="J")
            pdf.ln(2.5)
        pdf.ln(2)

    # 5. Signatures
    if pdf.get_y() > 220:
        pdf.add_page()
    else:
        pdf.ln(4)

    pdf.set_font("Times", "B", 9.5)
    pdf.set_text_color(15, 23, 42)
    pdf.multi_cell(
        170, 5,
        "IN WITNESS WHEREOF, the Parties hereto have caused this Agreement to be executed by their duly authorized representatives.",
        align="L"
    )
    pdf.ln(6)

    # Two column signatures if 2 parties
    num_sigs = len(doc_data.signature_blocks)
    if num_sigs >= 2:
        y_before = pdf.get_y()
        # Party 1
        s1 = doc_data.signature_blocks[0]
        pdf.set_xy(20, y_before)
        pdf.set_font("Times", "B", 9)
        pdf.cell(78, 5, s1.party_name.upper(), new_x="LEFT", new_y="NEXT")
        pdf.set_font("Times", "", 8.5)
        if s1.party_company:
            pdf.cell(78, 4.5, f"For: {s1.party_company}", new_x="LEFT", new_y="NEXT")
        if s1.party_role:
            pdf.cell(78, 4.5, f"Title: {s1.party_role}", new_x="LEFT", new_y="NEXT")
        pdf.ln(8)
        pdf.cell(78, 4.5, "Signature: __________________________", new_x="LEFT", new_y="NEXT")
        pdf.cell(78, 4.5, "Date: _______________________________", new_x="LEFT", new_y="NEXT")

        # Party 2
        s2 = doc_data.signature_blocks[1]
        pdf.set_xy(110, y_before)
        pdf.set_font("Times", "B", 9)
        pdf.cell(78, 5, s2.party_name.upper(), new_x="LEFT", new_y="NEXT")
        pdf.set_font("Times", "", 8.5)
        if s2.party_company:
            pdf.set_x(110)
            pdf.cell(78, 4.5, f"For: {s2.party_company}", new_x="LEFT", new_y="NEXT")
        if s2.party_role:
            pdf.set_x(110)
            pdf.cell(78, 4.5, f"Title: {s2.party_role}", new_x="LEFT", new_y="NEXT")
        pdf.set_x(110)
        pdf.ln(8)
        pdf.set_x(110)
        pdf.cell(78, 4.5, "Signature: __________________________", new_x="LEFT", new_y="NEXT")
        pdf.set_x(110)
        pdf.cell(78, 4.5, "Date: _______________________________", new_x="LEFT", new_y="NEXT")
    else:
        for s in doc_data.signature_blocks:
            pdf.set_font("Times", "B", 9)
            pdf.cell(170, 5, s.party_name.upper(), new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Times", "", 8.5)
            if s.party_company:
                pdf.cell(170, 4.5, f"For: {s.party_company}", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(6)
            pdf.cell(170, 4.5, "Signature: _____________________________________", new_x="LMARGIN", new_y="NEXT")
            pdf.cell(170, 4.5, "Date: __________________________________________", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(4)

    # 6. Disclaimer at bottom
    pdf.ln(8)
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(148, 163, 184)
    pdf.multi_cell(170, 3.5, f"LEGAL NOTICE: {doc_data.disclaimer}", align="L")

    return bytes(pdf.output())
