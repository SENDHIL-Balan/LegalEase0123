from backend.schemas.document import StructuredDocument

def generate_txt(doc_data: StructuredDocument) -> str:
    """
    Renders structured document as clean, standardized plain text.
    """
    lines = []
    divider = "=" * 78
    sub_divider = "-" * 78

    lines.append(divider)
    lines.append(doc_data.title.center(78))
    lines.append(divider)
    lines.append("")
    lines.append(f"EFFECTIVE DATE: {doc_data.effective_date}")
    lines.append(f"GOVERNING LAW / JURISDICTION: {doc_data.jurisdiction}")
    lines.append(f"DOCUMENT TYPE: {doc_data.document_type}")
    lines.append(f"DOCUMENT ID: {doc_data.id} (Version {doc_data.version})")
    lines.append("")
    lines.append(sub_divider)
    lines.append("PARTIES TO THIS INSTRUMENT:")
    lines.append(sub_divider)
    for i, p in enumerate(doc_data.parties, start=1):
        role_str = f" [{p.role.upper()}]" if p.role else ""
        lines.append(f"Party {i}{role_str}: {p.name}")
        if p.company:
            lines.append(f"  Organization: {p.company}")
        if p.address:
            lines.append(f"  Address:      {p.address}")
        if p.email:
            lines.append(f"  Email:        {p.email}")
        if p.phone:
            lines.append(f"  Phone:        {p.phone}")
        lines.append("")

    if doc_data.key_terms:
        lines.append(sub_divider)
        lines.append("KEY TERMS & COVENANTS SUMMARY:")
        lines.append(sub_divider)
        for kt in doc_data.key_terms:
            lines.append(f"• {kt.term}: {kt.details}")
        lines.append("")

    lines.append(sub_divider)
    lines.append("TERMS AND CONDITIONS:")
    lines.append(sub_divider)
    lines.append("")

    for sec in doc_data.sections:
        lines.append(sec.heading.upper())
        lines.append("~" * len(sec.heading))
        lines.append(sec.content)
        lines.append("")

    lines.append(sub_divider)
    lines.append("SIGNATURES & EXECUTION:")
    lines.append(sub_divider)
    lines.append(
        "IN WITNESS WHEREOF, the Parties hereto have executed this Agreement as of the Effective Date written above."
    )
    lines.append("")

    for sb in doc_data.signature_blocks:
        lines.append(f"FOR AND ON BEHALF OF: {sb.party_name.upper()}")
        if sb.party_company:
            lines.append(f"Company: {sb.party_company}")
        if sb.party_role:
            lines.append(f"Title:   {sb.party_role}")
        lines.append("")
        lines.append("Signature: ___________________________________________")
        lines.append(sb.date_placeholder or "Date:      ___________________________________________")
        lines.append("")

    lines.append(divider)
    lines.append(f"DISCLAIMER NOTICE: {doc_data.disclaimer}")
    lines.append("Generated via LegalEase AI (https://legalease.ai)")
    lines.append(divider)

    return "\n".join(lines)
