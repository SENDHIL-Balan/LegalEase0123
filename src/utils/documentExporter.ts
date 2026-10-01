import { jsPDF } from 'jspdf';
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel
} from 'docx';
import { StructuredDocument } from '../types/document';

/**
 * Downloads a Blob directly to the client's device with proper MIME type and filename.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
  }, 200);
}

/**
 * Generates and downloads a real, professional PDF legal instrument.
 */
export function exportDocumentAsPdf(doc: StructuredDocument): void {
  const safeTitle = (doc.title || 'legal_document')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 32);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 22;

  // Header Brand
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text('LEGALEASE AI', margin, y);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`ENTERPRISE LEGAL INSTRUMENT · v${doc.version || 1}`, pageWidth - margin, y, { align: 'right' });
  y += 4;

  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Title
  pdf.setFont('times', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(15, 23, 42);
  pdf.text((doc.title || 'LEGAL AGREEMENT').toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 7;

  // Subtitle
  pdf.setFont('times', 'italic');
  pdf.setFontSize(10);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Effective Date: ${doc.effective_date}   |   Governing Law: ${doc.jurisdiction}`, pageWidth / 2, y, {
    align: 'center'
  });
  y += 12;

  // Parties Box
  if (doc.parties && doc.parties.length > 0) {
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    const partyHeight = 10 + doc.parties.length * 6.5;
    pdf.rect(margin, y, contentWidth, partyHeight, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text('PARTIES TO THIS AGREEMENT:', margin + 4, y + 6);

    let pY = y + 12;
    for (const p of doc.parties) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(180, 83, 9);
      pdf.text(`[${(p.role || 'PARTY').toUpperCase()}] `, margin + 6, pY);

      pdf.setFont('times', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(30, 41, 59);
      const pDetails = `${p.name || 'Authorized Signatory'}${p.company ? ` (${p.company})` : ''}${
        p.address ? ` · ${p.address}` : ''
      }`;
      pdf.text(pDetails, margin + 28, pY);
      pY += 6;
    }
    y += partyHeight + 8;
  }

  // Key Terms Table
  if (doc.key_terms && doc.key_terms.length > 0) {
    if (y > 240) {
      pdf.addPage();
      y = 24;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text('KEY TERMS & SPECIFICATIONS', margin, y);
    y += 5;

    // Header
    pdf.setFillColor(15, 23, 42);
    pdf.rect(margin, y, contentWidth, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.text('PROVISION', margin + 4, y + 5);
    pdf.text('AGREED SPECIFICATIONS', margin + 50, y + 5);
    y += 7;

    for (let i = 0; i < doc.key_terms.length; i++) {
      if (y > 265) {
        pdf.addPage();
        y = 24;
      }
      const kt = doc.key_terms[i];
      pdf.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255);
      pdf.rect(margin, y, contentWidth, 6.5, 'FD');
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('times', 'bold');
      pdf.setFontSize(8);
      pdf.text(kt.term.substring(0, 26), margin + 4, y + 4.5);

      pdf.setFont('times', 'normal');
      pdf.setTextColor(51, 65, 85);
      pdf.text(kt.details.substring(0, 75), margin + 50, y + 4.5);
      y += 6.5;
    }
    y += 8;
  }

  // Sections
  for (const sec of doc.sections || []) {
    if (y > 240) {
      pdf.addPage();
      y = 24;
    }

    pdf.setFont('times', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text((sec.heading || '').toUpperCase(), margin, y);
    y += 6;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(30, 41, 59);

    const paras = (sec.content || '').split('\n\n');
    for (const p of paras) {
      if (!p.trim()) continue;
      const lines = pdf.splitTextToSize(p.trim(), contentWidth);
      for (const line of lines) {
        if (y > 270) {
          pdf.addPage();
          y = 24;
        }
        pdf.text(line, margin, y);
        y += 4.8;
      }
      y += 2.5;
    }
    y += 3;
  }

  // Signatures
  if (y > 220) {
    pdf.addPage();
    y = 24;
  }
  pdf.setFont('times', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text('IN WITNESS WHEREOF, the Parties have caused this Agreement to be executed.', margin, y);
  y += 8;

  for (const sb of doc.signature_blocks || []) {
    if (y > 245) {
      pdf.addPage();
      y = 24;
    }
    pdf.setFont('times', 'bold');
    pdf.setFontSize(9.5);
    pdf.text((sb.party_name || 'SIGNATORY').toUpperCase(), margin, y);
    y += 4.5;
    if (sb.party_company) {
      pdf.setFont('times', 'normal');
      pdf.setFontSize(8.5);
      pdf.text(`For: ${sb.party_company}`, margin, y);
      y += 4;
    }
    y += 8;
    pdf.text('Signature: ____________________________________', margin, y);
    y += 5;
    pdf.text(sb.date_placeholder || 'Date: ________________________', margin, y);
    y += 8;
  }

  // Running Footer on every page
  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    pdf.setPage(page);
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, 282, pageWidth - margin, 282);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text('LegalEase AI · Enterprise Legal Document', margin, 287);
    pdf.text(`Page ${page} of ${totalPages}`, pageWidth - margin, 287, { align: 'right' });
  }

  // Trigger real PDF download
  pdf.save(`${safeTitle}.pdf`);
}

/**
 * Generates and downloads a real Microsoft Word .docx document.
 */
export async function exportDocumentAsDocx(doc: StructuredDocument): Promise<void> {
  const safeTitle = (doc.title || 'legal_document')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 32);

  const docxSections: any[] = [
    new Paragraph({
      text: (doc.title || 'LEGAL AGREEMENT').toUpperCase(),
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 }
    }),
    new Paragraph({
      text: `Effective Date: ${doc.effective_date}   |   Governing Law: ${doc.jurisdiction}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 }
    })
  ];

  // Key Terms Table
  if (doc.key_terms && doc.key_terms.length > 0) {
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: 'PROVISION / TERM', bold: true, color: 'FFFFFF' })] })],
            shading: { fill: '0F172A' }
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: 'AGREED SPECIFICATIONS', bold: true, color: 'FFFFFF' })] })],
            shading: { fill: '0F172A' }
          })
        ]
      }),
      ...doc.key_terms.map((kt, i) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: kt.term, bold: true })] })],
              shading: { fill: i % 2 === 0 ? 'F8FAFC' : 'FFFFFF' }
            }),
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: kt.details })],
              shading: { fill: i % 2 === 0 ? 'F8FAFC' : 'FFFFFF' }
            })
          ]
        })
      )
    ];

    docxSections.push(
      new Paragraph({ text: 'KEY TERMS SUMMARY', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 } }),
      new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
      new Paragraph({ text: '', spacing: { after: 200 } })
    );
  }

  // Sections
  for (const sec of doc.sections || []) {
    docxSections.push(
      new Paragraph({
        text: (sec.heading || '').toUpperCase(),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 }
      })
    );
    const paragraphs = (sec.content || '').split('\n\n');
    for (const p of paragraphs) {
      if (p.trim()) {
        docxSections.push(
          new Paragraph({
            text: p.trim(),
            spacing: { after: 140 }
          })
        );
      }
    }
  }

  // Signatures
  docxSections.push(
    new Paragraph({
      text: 'IN WITNESS WHEREOF, the Parties have executed this Agreement.',
      spacing: { before: 300, after: 200 }
    })
  );

  for (const sb of doc.signature_blocks || []) {
    docxSections.push(
      new Paragraph({
        children: [
          new TextRun({ text: sb.party_name || 'Authorized Signatory', bold: true }),
          new TextRun({ text: sb.party_company ? ` (${sb.party_company})` : '', italics: true }),
          new TextRun({ text: ` - ${sb.party_role || 'Signatory'}` })
        ],
        spacing: { before: 140, after: 60 }
      }),
      new Paragraph({ text: 'Signature: ____________________________________', spacing: { after: 60 } }),
      new Paragraph({ text: sb.date_placeholder || 'Date: ________________________', spacing: { after: 160 } })
    );
  }

  // Disclaimer
  docxSections.push(
    new Paragraph({
      children: [new TextRun({ text: `DISCLAIMER: ${doc.disclaimer}`, italics: true, size: 16 })],
      spacing: { before: 400 }
    })
  );

  const wordDoc = new DocxDocument({
    sections: [{ properties: {}, children: docxSections }]
  });

  const blob = await Packer.toBlob(wordDoc);
  downloadBlob(blob, `${safeTitle}.docx`);
}

/**
 * Downloads plain text .txt format ONLY when explicitly selected.
 */
export function exportDocumentAsTxt(doc: StructuredDocument): void {
  const safeTitle = (doc.title || 'legal_document')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 32);

  const divider = '='.repeat(78);
  const subDivider = '-'.repeat(78);
  const lines: string[] = [
    divider,
    doc.title.toUpperCase().padStart((78 + doc.title.length) / 2).padEnd(78),
    divider,
    '',
    `EFFECTIVE DATE: ${doc.effective_date}`,
    `GOVERNING LAW / JURISDICTION: ${doc.jurisdiction}`,
    `DOCUMENT TYPE: ${doc.document_type}`,
    `DOCUMENT ID: ${doc.id} (Version ${doc.version || 1})`,
    '',
    subDivider,
    'PARTIES TO THIS INSTRUMENT:',
    subDivider,
    ...(doc.parties || []).map(
      (p, idx) =>
        `Party ${idx + 1} [${(p.role || 'PARTY').toUpperCase()}]: ${p.name}${p.company ? ` (${p.company})` : ''}${
          p.address ? ` · Address: ${p.address}` : ''
        }${p.email ? ` · Email: ${p.email}` : ''}`
    ),
    ''
  ];

  if (doc.key_terms && doc.key_terms.length > 0) {
    lines.push(subDivider, 'KEY TERMS & COVENANTS SUMMARY:', subDivider);
    doc.key_terms.forEach((kt) => lines.push(`• ${kt.term}: ${kt.details}`));
    lines.push('');
  }

  lines.push(subDivider, 'TERMS AND CONDITIONS:', subDivider, '');
  for (const sec of doc.sections || []) {
    lines.push((sec.heading || '').toUpperCase());
    lines.push('~'.repeat(sec.heading.length));
    lines.push(sec.content || '');
    lines.push('');
  }

  lines.push(subDivider, 'EXECUTION & SIGNATURES:', subDivider, '');
  for (const sb of doc.signature_blocks || []) {
    lines.push(`Party: ${sb.party_name} (${sb.party_company || 'Authorized'})`);
    lines.push(`Capacity: ${sb.party_role || 'Signatory'}`);
    lines.push(sb.signature_line || 'Signature: ____________________________________');
    lines.push(sb.date_placeholder || 'Date: ________________________');
    lines.push('');
  }

  lines.push(divider, `NOTICE: ${doc.disclaimer}`, divider);

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `${safeTitle}.txt`);
}

/**
 * Universal export orchestrator
 */
export async function exportDocument(
  doc: StructuredDocument,
  format: 'docx' | 'pdf' | 'txt'
): Promise<void> {
  if (format === 'pdf') {
    exportDocumentAsPdf(doc);
  } else if (format === 'docx') {
    await exportDocumentAsDocx(doc);
  } else {
    exportDocumentAsTxt(doc);
  }
}
