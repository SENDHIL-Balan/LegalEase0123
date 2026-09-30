from typing import Tuple
from backend.schemas.document import StructuredDocument
from document_generators.docx_generator import generate_docx
from document_generators.pdf_generator import generate_pdf
from document_generators.txt_generator import generate_txt

def export_document(doc: StructuredDocument, format_type: str) -> Tuple[bytes, str, str]:
    """
    Exports a structured document into the requested binary/text format.
    Returns: (bytes_content, media_type, filename)
    """
    clean_title = "".join(c for c in doc.title.lower().replace(" ", "_") if c.isalnum() or c == "_")[:40]
    fmt = format_type.lower().strip()

    if fmt == "pdf":
        data = generate_pdf(doc)
        return (data, "application/pdf", f"{clean_title}.pdf")
    elif fmt == "docx":
        data = generate_docx(doc)
        return (
            data,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            f"{clean_title}.docx"
        )
    elif fmt == "txt":
        text_str = generate_txt(doc)
        return (text_str.encode("utf-8"), "text/plain; charset=utf-8", f"{clean_title}.txt")
    else:
        raise ValueError(f"Unsupported export format: '{format_type}'. Expected 'pdf', 'docx', or 'txt'.")
