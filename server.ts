import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';
import { Document as DocxDocument, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx';
import { jsPDF } from 'jspdf';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

app.use(express.json({ limit: '10mb' }));

interface Party {
  name: string;
  company?: string;
  role?: string;
  address?: string;
  email?: string;
  phone?: string;
}

interface Section {
  heading: string;
  content: string;
}

interface KeyTerm {
  term: string;
  details: string;
}

interface SignatureBlock {
  party_name: string;
  party_role?: string;
  party_company?: string;
  date_placeholder?: string;
  signature_line?: string;
}

interface StructuredDocument {
  id: string;
  title: string;
  document_type: string;
  effective_date: string;
  jurisdiction: string;
  parties: Party[];
  key_terms: KeyTerm[];
  sections: Section[];
  signature_blocks: SignatureBlock[];
  disclaimer: string;
  version: number;
  created_at: string;
  updated_at: string;
}

const DISCLAIMER_TEXT =
  "LegalEase AI generates documents for informational and drafting purposes. " +
  "Generated documents do not constitute formal legal counsel and may require " +
  "review by a qualified legal professional before execution.";

// In-memory document storage with versioning
const DOCUMENT_STORE: Map<string, StructuredDocument> = new Map();
const DOCUMENT_VERSIONS: Map<string, StructuredDocument[]> = new Map();

// Built-in Enterprise Templates
const DEFAULT_TEMPLATES = [
  {
    id: "freelance-contract",
    title: "Freelance Work Contract",
    category: "Contract",
    description: "Comprehensive independent contractor agreement covering project scope, deliverables, milestones, fee structure, IP assignment, and termination notice.",
    default_terms: [
      "Payment within 30 days of monthly invoice submission.",
      "Client retains all intellectual property and proprietary rights upon receipt of full payment.",
      "Independent contractor status; no employee benefits or withholding.",
      "Confidentiality obligations survive agreement termination for 3 years.",
      "Either party may terminate without cause with fifteen (15) days written notice."
    ],
    default_parties: [
      { name: "", company: "", role: "Contractor", address: "", email: "", phone: "" },
      { name: "", company: "", role: "Client", address: "", email: "", phone: "" }
    ],
    suggested_jurisdiction: "State of California"
  },
  {
    id: "nda",
    title: "Non-Disclosure Agreement (NDA)",
    category: "Agreement",
    description: "Mutual or unilateral confidentiality agreement safeguarding proprietary business secrets, trade secrets, software algorithms, customer lists, and financial statements.",
    default_terms: [
      "Strict non-disclosure of confidential business and technical information.",
      "Exclusions include publicly known information or legally compelled disclosures.",
      "Return or certified destruction of materials upon written demand.",
      "Obligations remain in full force and effect for five (5) years from disclosure.",
      "Right to injunctive relief without requirement to post bond in case of breach."
    ],
    default_parties: [
      { name: "", company: "", role: "Disclosing Party", address: "", email: "", phone: "" },
      { name: "", company: "", role: "Receiving Party", address: "", email: "", phone: "" }
    ],
    suggested_jurisdiction: "State of New York"
  },
  {
    id: "employment-contract",
    title: "Employment Contract",
    category: "Employment",
    description: "Standard full-time employment agreement establishing duties, base compensation, annual bonus eligibility, paid time off, IP assignment, and termination conditions.",
    default_terms: [
      "Annual base salary paid in accordance with standard bi-weekly payroll.",
      "Standard benefits package including 401(k) matching and health coverage.",
      "Work-for-hire assignment of all intellectual property created during employment.",
      "Non-solicitation of clients and staff for twelve (12) months post-termination.",
      "Employment is at-will; 30-day notice requested for executive transitions."
    ],
    default_parties: [
      { name: "", company: "", role: "Employer", address: "", email: "", phone: "" },
      { name: "", company: "", role: "Employee", address: "", email: "", phone: "" }
    ],
    suggested_jurisdiction: "State of Washington"
  },
  {
    id: "lease-agreement",
    title: "Commercial & Residential Lease Agreement",
    category: "Real Estate",
    description: "Comprehensive real estate lease covering demised premises, monthly rental payments, security deposit, maintenance responsibilities, utilities, and occupancy terms.",
    default_terms: [
      "Monthly rent due on the first calendar day of each month.",
      "Security deposit held in escrow account.",
      "Tenant responsible for utilities, internet, and interior maintenance.",
      "No subleasing or assignment without prior express written approval.",
      "Late fee of 5% assessed on payments received past 5 days grace period."
    ],
    default_parties: [
      { name: "", company: "", role: "Landlord", address: "", email: "", phone: "" },
      { name: "", company: "", role: "Tenant", address: "", email: "", phone: "" }
    ],
    suggested_jurisdiction: "Commonwealth of Massachusetts"
  },
  {
    id: "offer-letter",
    title: "Employment Offer Letter",
    category: "Employment",
    description: "Formal offer of employment summarizing job title, start date, compensation structure, equity participation, reporting line, and contingent screening requirements.",
    default_terms: [
      "Base salary per annum with target annual performance bonus.",
      "Eligibility for incentive stock options subject to standard vesting.",
      "Commencement date within thirty (30) calendar days of signed acceptance.",
      "Contingent upon successful background screening and I-9 eligibility verification."
    ],
    default_parties: [
      { name: "", company: "", role: "Employer", address: "", email: "", phone: "" },
      { name: "", company: "", role: "Candidate", address: "", email: "", phone: "" }
    ],
    suggested_jurisdiction: "State of Washington"
  },
  {
    id: "service-agreement",
    title: "Master Services Agreement (MSA)",
    category: "Contract",
    description: "Commercial services agreement with statements of work (SOW), warranties, service level agreements (SLA), limitation of liability, and indemnity provisions.",
    default_terms: [
      "Services performed in accordance with mutually executed Statements of Work (SOW).",
      "Payment due net 30 days from invoice date.",
      "Mutual indemnification for gross negligence and willful misconduct.",
      "Aggregate liability capped at total fees paid in preceding 12 months.",
      "Term of one year with automatic annual renewal unless cancelled 60 days prior."
    ],
    default_parties: [
      { name: "", company: "", role: "Service Provider", address: "", email: "", phone: "" },
      { name: "", company: "", role: "Client", address: "", email: "", phone: "" }
    ],
    suggested_jurisdiction: "State of Delaware"
  },
  {
    id: "general-agreement",
    title: "General Business Agreement",
    category: "General",
    description: "Adaptable bilateral legal agreement suitable for strategic partnerships, asset purchases, collaborations, and formal commercial relationships.",
    default_terms: [
      "Mutual commitments and obligations executed in good faith.",
      "Each party bears its own transactional and legal expenses.",
      "Confidentiality and non-disclosure obligations apply to all shared information.",
      "Disputes resolved through binding arbitration under AAA rules."
    ],
    default_parties: [
      { name: "", company: "", role: "Party A", address: "", email: "", phone: "" },
      { name: "", company: "", role: "Party B", address: "", email: "", phone: "" }
    ],
    suggested_jurisdiction: "State of Delaware"
  }
];

// No fake documents seeded; library starts clean and authentic
function seedInitialDoc() {
  // Empty by default - users create authentic documents
}
seedInitialDoc();

function generateDeterministicDocument(payload: any): StructuredDocument {
  const docId = 'doc_' + Math.random().toString(36).substring(2, 11);
  const docType = payload.document_type || 'General Agreement';
  const effectiveDate = payload.effective_date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const jurisdiction = payload.jurisdiction || 'State of Delaware';
  const parties: Party[] = payload.parties && payload.parties.length > 0 ? payload.parties : [
    { name: 'First Party', role: 'Party A', company: '' },
    { name: 'Second Party', role: 'Party B', company: '' }
  ];

  // Extract key terms
  const rawTerms: string[] = payload.terms || [];
  const keyTerms: KeyTerm[] = [];
  rawTerms.forEach((t, i) => {
    const clean = t.trim();
    if (!clean) return;
    if (clean.includes(':')) {
      const [term, details] = clean.split(':', 2);
      keyTerms.push({ term: term.trim(), details: details.trim() });
    } else {
      keyTerms.push({ term: `Term ${i + 1}`, details: clean });
    }
  });

  if (keyTerms.length === 0) {
    keyTerms.push({ term: "Effective Term", details: `Commencing on ${effectiveDate}` });
    keyTerms.push({ term: "Governing Law", details: jurisdiction });
  }

  const partiesStr = parties.map(p => `${p.name} (${p.role || 'Signatory'})${p.company ? ` on behalf of ${p.company}` : ''}`).join(' and ');

  const sections: Section[] = [
    {
      heading: "1. PREAMBLE & RECITALS",
      content: `This ${docType} (this "Agreement") is entered into and made effective as of ${effectiveDate} ("Effective Date"), by and between: ${partiesStr}.\n\nWHEREAS, the parties desire to formalize their binding legal rights, covenants, and responsibilities regarding ${docType.toLowerCase()}, and agree to be mutually bound by the terms set forth herein.`
    }
  ];

  if (docType.includes("NDA") || docType.includes("Non-Disclosure")) {
    sections.push({
      heading: "2. DEFINITION OF CONFIDENTIAL INFORMATION",
      content: "Confidential Information encompasses all proprietary, non-public, technical, financial, commercial, or operational data disclosed by either party, whether in tangible, intangible, oral, or electronic form."
    });
    sections.push({
      heading: "3. NON-DISCLOSURE OBLIGATIONS",
      content: "The Receiving Party agrees to maintain all Confidential Information in strict confidence and apply no less than reasonable standards of security to prevent unauthorized access, copying, or dissemination."
    });
  } else if (docType.includes("Employment") || docType.includes("Offer Letter")) {
    sections.push({
      heading: "2. POSITION, RESPONSIBILITIES & DUTIES",
      content: "The Employee agrees to faithfully perform the duties assigned to the position in accordance with the policies, operational guidelines, and professional standards of the Employer."
    });
    sections.push({
      heading: "3. COMPENSATION, BENEFITS & WITHHOLDING",
      content: "Compensation shall be paid in accordance with the standard payroll schedule, subject to all applicable statutory withholdings and deductions, in alignment with the Key Terms specified."
    });
  } else if (docType.includes("Lease")) {
    sections.push({
      heading: "2. DEMISED PREMISES & LEASEHOLD TERM",
      content: "The Landlord hereby demises and leases unto the Tenant, and Tenant accepts, the designated premises for legitimate occupancy subject to the covenants and regulations herein stipulated."
    });
    sections.push({
      heading: "3. RENT, SECURITY DEPOSIT & UTILITIES",
      content: "The Tenant covenants to pay the stipulated rent promptly on or before the due date. The security deposit shall be maintained in an escrow account as guarantee against damage."
    });
  } else {
    sections.push({
      heading: "2. SCOPE OF SERVICES & DELIVERABLES",
      content: `The parties agree that all services rendered under this ${docType} shall be executed with utmost professionalism, diligence, and in compliance with all relevant industry standards.`
    });
    sections.push({
      heading: "3. CONSIDERATION & PAYMENT SCHEDULE",
      content: "All fees, invoices, or financial consideration shall be settled within the timelines specified in the Key Terms summary. Reimbursable expenditures require prior written consent."
    });
  }

  // User agreed terms section
  if (rawTerms.length > 0) {
    const covenants = rawTerms.map((t, idx) => `4.${idx + 1} ${t.trim()}`).join('\n\n');
    sections.push({
      heading: "4. SPECIFIC OPERATIONAL COVENANTS",
      content: covenants
    });
  }

  sections.push({
    heading: "5. TERM AND TERMINATION",
    content: `This Agreement shall commence on ${effectiveDate} and remain in full force until fully performed or terminated in accordance with its provisions. In case of material breach, termination may occur upon written notice if uncured after fifteen (15) days.`
  });

  sections.push({
    heading: "6. GOVERNING LAW & JURISDICTION",
    content: `This Agreement and any dispute arising out of or related to it shall be governed by, and construed in accordance with, the laws of ${jurisdiction}, without giving effect to conflict of laws principles.`
  });

  const additionalNote = payload.additional_instructions ? ` Additional stipulations: ${payload.additional_instructions}` : '';
  sections.push({
    heading: "7. ENTIRE AGREEMENT & AMENDMENTS",
    content: `This Agreement constitutes the entire understanding between the parties with respect to the subject matter hereof and supersedes all prior representations, proposals, or understandings.${additionalNote}`
  });

  const signatureBlocks: SignatureBlock[] = parties.map(p => ({
    party_name: p.name,
    party_role: p.role || 'Authorized Signatory',
    party_company: p.company || '',
    date_placeholder: 'Date: ____________________',
    signature_line: 'Signature: ____________________'
  }));

  const now = new Date().toISOString();
  return {
    id: docId,
    title: docType.toUpperCase(),
    document_type: docType,
    effective_date: effectiveDate,
    jurisdiction: jurisdiction,
    parties,
    key_terms: keyTerms,
    sections,
    signature_blocks: signatureBlocks,
    disclaimer: DISCLAIMER_TEXT,
    version: 1,
    created_at: now,
    updated_at: now
  };
}

async function generateWithGroq(payload: any): Promise<StructuredDocument> {
  if (!GROQ_API_KEY || GROQ_API_KEY.startsWith('MY_') || GROQ_API_KEY === 'your_key_here') {
    throw new Error('No high-speed engine key configured');
  }

  const partiesStr = (payload.parties || []).map((p: any) => `- Name: ${p.name}, Role: ${p.role || 'Signatory'}, Organization: ${p.company || 'N/A'}, Address: ${p.address || 'N/A'}`).join('\n');
  const termsStr = (payload.terms || []).map((t: string) => `- ${t}`).join('\n');

  const systemPrompt = `You are a senior corporate counsel and enterprise legal document architect.
You MUST output ONLY a valid JSON object matching this schema without any markdown formatting or prose:
{
  "title": "${payload.document_type.toUpperCase()}",
  "document_type": "${payload.document_type}",
  "effective_date": "${payload.effective_date}",
  "jurisdiction": "${payload.jurisdiction || 'State of Delaware'}",
  "key_terms": [
    {"term": "Provision Name", "details": "Agreed details"}
  ],
  "sections": [
    {"heading": "1. PREAMBLE & RECITALS", "content": "Formal legal recital covenant text..."},
    {"heading": "2. ...", "content": "..."}
  ],
  "signature_blocks": [
    {"party_name": "Full Legal Name", "party_role": "Role", "party_company": "Company", "date_placeholder": "Date: ____________", "signature_line": "Signature: ____________"}
  ]
}`;

  const userPrompt = `Draft a comprehensive, legally binding, highly structured ${payload.document_type}.
Parameters:
- Document Type: ${payload.document_type}
- Effective Date: ${payload.effective_date}
- Jurisdiction: ${payload.jurisdiction || 'State of Delaware'}
- Language: ${payload.document_language || 'English'}
- Tone: ${payload.tone || 'Formal & Binding'}
- Parties:
${partiesStr}
- Agreed Terms:
${termsStr}
- Additional Instructions: ${payload.additional_instructions || 'None'}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Inference engine error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() || '';
  const parsed = JSON.parse(text);

  const docId = 'doc_' + Math.random().toString(36).substring(2, 11);
  const now = new Date().toISOString();

  return {
    id: docId,
    title: parsed.title || payload.document_type.toUpperCase(),
    document_type: payload.document_type,
    effective_date: payload.effective_date,
    jurisdiction: parsed.jurisdiction || payload.jurisdiction || 'State of Delaware',
    parties: payload.parties,
    key_terms: parsed.key_terms || [],
    sections: parsed.sections || [],
    signature_blocks: parsed.signature_blocks && parsed.signature_blocks.length > 0 ? parsed.signature_blocks : payload.parties.map((p: any) => ({
      party_name: p.name,
      party_role: p.role || 'Authorized Signatory',
      party_company: p.company || '',
      date_placeholder: 'Date: ____________________',
      signature_line: 'Signature: ____________________'
    })),
    disclaimer: DISCLAIMER_TEXT,
    version: 1,
    created_at: now,
    updated_at: now
  };
}

async function generateWithGemini(payload: any): Promise<StructuredDocument> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith('MY_GEMINI') || GEMINI_API_KEY === 'your_key_here') {
    return generateDeterministicDocument(payload);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const partiesStr = (payload.parties || []).map((p: any) => `- Name: ${p.name}, Role: ${p.role || 'Signatory'}, Organization: ${p.company || 'N/A'}, Address: ${p.address || 'N/A'}`).join('\n');
    const termsStr = (payload.terms || []).map((t: string) => `- ${t}`).join('\n');

    const prompt = `
You are a senior corporate counsel and legal document architect for LegalEase AI.
Generate a comprehensive, legally binding, highly structured ${payload.document_type}.

Parameters:
- Document Type: ${payload.document_type}
- Effective Date: ${payload.effective_date}
- Jurisdiction: ${payload.jurisdiction || 'State of Delaware'}
- Language: ${payload.document_language || 'English'}
- Tone: ${payload.tone || 'Formal & Binding'}
- Parties:
${partiesStr}
- Agreed Terms:
${termsStr}
- Additional Instructions: ${payload.additional_instructions || 'None'}

Factual Rules:
1. Preserve all provided names, dates, terms, and jurisdiction faithfully without inventing fake court citations or statutes.
2. Produce structured clauses with formal numbering, key terms table data, and dual signature blocks.
`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: "You are an enterprise legal document architect. You MUST return ONLY valid JSON matching the requested structure without markdown fences.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            document_type: { type: Type.STRING },
            effective_date: { type: Type.STRING },
            jurisdiction: { type: Type.STRING },
            key_terms: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  details: { type: Type.STRING }
                },
                required: ["term", "details"]
              }
            },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  heading: { type: Type.STRING },
                  content: { type: Type.STRING }
                },
                required: ["heading", "content"]
              }
            },
            signature_blocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  party_name: { type: Type.STRING },
                  party_role: { type: Type.STRING },
                  party_company: { type: Type.STRING },
                  date_placeholder: { type: Type.STRING },
                  signature_line: { type: Type.STRING }
                },
                required: ["party_name"]
              }
            }
          },
          required: ["title", "document_type", "effective_date", "sections"]
        }
      }
    });

    const text = response.text?.trim() || '';
    const parsed = JSON.parse(text);

    const docId = 'doc_' + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();

    return {
      id: docId,
      title: parsed.title || payload.document_type.toUpperCase(),
      document_type: payload.document_type,
      effective_date: payload.effective_date,
      jurisdiction: parsed.jurisdiction || payload.jurisdiction || 'State of Delaware',
      parties: payload.parties,
      key_terms: parsed.key_terms || [],
      sections: parsed.sections || [],
      signature_blocks: parsed.signature_blocks && parsed.signature_blocks.length > 0 ? parsed.signature_blocks : payload.parties.map((p: any) => ({
        party_name: p.name,
        party_role: p.role || 'Authorized Signatory',
        party_company: p.company || '',
        date_placeholder: 'Date: ____________________',
        signature_line: 'Signature: ____________________'
      })),
      disclaimer: DISCLAIMER_TEXT,
      version: 1,
      created_at: now,
      updated_at: now
    };
  } catch (err) {
    console.warn('[LegalEase AI] Gemini generation error, using deterministic generator:', err);
    return generateDeterministicDocument(payload);
  }
}

async function generateWithAI(payload: any): Promise<StructuredDocument> {
  // Tier 1: Try high-speed AI engine
  if (GROQ_API_KEY && !GROQ_API_KEY.startsWith('MY_')) {
    try {
      return await generateWithGroq(payload);
    } catch (err) {
      console.warn('[LegalEase AI] High-speed inference error, attempting secondary engine:', err);
    }
  }

  // Tier 2: Gemini API
  if (GEMINI_API_KEY && !GEMINI_API_KEY.startsWith('MY_')) {
    try {
      return await generateWithGemini(payload);
    } catch (err) {
      console.warn('[LegalEase AI] Secondary engine error, using deterministic generator:', err);
    }
  }

  // Tier 3: Deterministic legal document generator
  return generateDeterministicDocument(payload);
}

// -------------------------------------------------------------
// Document Exporters
// -------------------------------------------------------------

async function generateDocxBuffer(doc: StructuredDocument): Promise<Buffer> {
  const docxSections: any[] = [];

  // Title
  docxSections.push(
    new Paragraph({
      text: "LEGALEASE AI",
      heading: HeadingLevel.HEADING_3,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    new Paragraph({
      text: doc.title.toUpperCase(),
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 }
    }),
    new Paragraph({
      text: `Effective Date: ${doc.effective_date}   |   Governing Law: ${doc.jurisdiction}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 }
    })
  );

  // Key Terms Table
  if (doc.key_terms && doc.key_terms.length > 0) {
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: "PROVISION / TERM", bold: true, color: "FFFFFF" })] })],
            shading: { fill: "0F172A" }
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: "AGREED SPECIFICATIONS", bold: true, color: "FFFFFF" })] })],
            shading: { fill: "0F172A" }
          })
        ]
      }),
      ...doc.key_terms.map((kt, i) => new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: kt.term, bold: true })] })],
            shading: { fill: i % 2 === 0 ? "F8FAFC" : "FFFFFF" }
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ text: kt.details })],
            shading: { fill: i % 2 === 0 ? "F8FAFC" : "FFFFFF" }
          })
        ]
      }))
    ];

    docxSections.push(
      new Paragraph({ text: "KEY TERMS SUMMARY", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 } }),
      new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
      new Paragraph({ text: "", spacing: { after: 200 } })
    );
  }

  // Sections
  for (const sec of doc.sections) {
    docxSections.push(
      new Paragraph({
        text: sec.heading.toUpperCase(),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 100 }
      })
    );
    const paras = sec.content.split('\n\n');
    for (const p of paras) {
      if (p.trim()) {
        docxSections.push(
          new Paragraph({
            text: p.trim(),
            spacing: { after: 140 },
            alignment: AlignmentType.JUSTIFIED
          })
        );
      }
    }
  }

  // Signatures
  docxSections.push(
    new Paragraph({
      text: "IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.",
      spacing: { before: 300, after: 200 },
      children: [new TextRun({ text: "IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.", bold: true })]
    })
  );

  for (const sb of doc.signature_blocks) {
    docxSections.push(
      new Paragraph({
        children: [
          new TextRun({ text: sb.party_name.toUpperCase(), bold: true }),
          new TextRun({ text: sb.party_company ? ` (${sb.party_company})` : "" }),
          new TextRun({ text: `\nTitle: ${sb.party_role || 'Signatory'}` }),
          new TextRun({ text: "\n\nSignature: ____________________________________" }),
          new TextRun({ text: `\n${sb.date_placeholder || 'Date: ________________________'}\n\n` })
        ],
        spacing: { after: 160 }
      })
    );
  }

  docxSections.push(
    new Paragraph({
      text: `NOTICE: ${doc.disclaimer}`,
      spacing: { before: 300 },
      children: [new TextRun({ text: `NOTICE: ${doc.disclaimer}`, italics: true, color: "64748B" })]
    })
  );

  const docxFile = new DocxDocument({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
        }
      },
      children: docxSections
    }]
  });

  return await Packer.toBuffer(docxFile);
}

function generatePdfBuffer(doc: StructuredDocument): Buffer {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = 22;

  // Header Brand
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text("LEGALEASE AI", margin, y);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`ENTERPRISE LEGAL INSTRUMENT · v${doc.version}`, pageWidth - margin, y, { align: 'right' });
  y += 4;

  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Title
  pdf.setFont('times', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(15, 23, 42);
  pdf.text(doc.title.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 7;

  // Subtitle
  pdf.setFont('times', 'italic');
  pdf.setFontSize(10);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Effective Date: ${doc.effective_date}   |   Governing Law: ${doc.jurisdiction}`, pageWidth / 2, y, { align: 'center' });
  y += 12;

  // Parties Box
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  const partyHeight = 10 + (doc.parties.length * 6);
  pdf.rect(margin, y, contentWidth, partyHeight, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text("PARTIES TO THIS AGREEMENT:", margin + 4, y + 6);

  let pY = y + 12;
  for (const p of doc.parties) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(180, 83, 9);
    pdf.text(`[${(p.role || 'PARTY').toUpperCase()}] `, margin + 6, pY);

    pdf.setFont('times', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(30, 41, 59);
    const pDetails = `${p.name}${p.company ? ` (${p.company})` : ''}${p.address ? ` · ${p.address}` : ''}`;
    pdf.text(pDetails, margin + 28, pY);
    pY += 6;
  }
  y += partyHeight + 8;

  // Key Terms Table
  if (doc.key_terms && doc.key_terms.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text("KEY TERMS & SPECIFICATIONS", margin, y);
    y += 5;

    // Header
    pdf.setFillColor(15, 23, 42);
    pdf.rect(margin, y, contentWidth, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.text("PROVISION", margin + 4, y + 5);
    pdf.text("AGREED SPECIFICATIONS", margin + 50, y + 5);
    y += 7;

    for (let i = 0; i < doc.key_terms.length; i++) {
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
  for (const sec of doc.sections) {
    if (y > 250) {
      pdf.addPage();
      y = 24;
    }

    pdf.setFont('times', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text(sec.heading.toUpperCase(), margin, y);
    y += 6;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(30, 41, 59);

    const paras = sec.content.split('\n\n');
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
  if (y > 230) {
    pdf.addPage();
    y = 24;
  }
  pdf.setFont('times', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text("IN WITNESS WHEREOF, the Parties have caused this Agreement to be executed.", margin, y);
  y += 8;

  for (const sb of doc.signature_blocks) {
    if (y > 250) {
      pdf.addPage();
      y = 24;
    }
    pdf.setFont('times', 'bold');
    pdf.setFontSize(9.5);
    pdf.text(sb.party_name.toUpperCase(), margin, y);
    y += 4.5;
    if (sb.party_company) {
      pdf.setFont('times', 'normal');
      pdf.setFontSize(8.5);
      pdf.text(`For: ${sb.party_company}`, margin, y);
      y += 4;
    }
    y += 8;
    pdf.text("Signature: ____________________________________", margin, y);
    y += 5;
    pdf.text(sb.date_placeholder || "Date: ________________________", margin, y);
    y += 8;
  }

  // Footer on all pages
  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    pdf.setPage(page);
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, 282, pageWidth - margin, 282);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text("LegalEase AI · Confidential & Generated for Drafting Purposes", margin, 287);
    pdf.text(`Page ${page} of ${totalPages}`, pageWidth - margin, 287, { align: 'right' });
  }

  const pdfOutput = pdf.output('arraybuffer');
  return Buffer.from(pdfOutput);
}

function generateTxtString(doc: StructuredDocument): string {
  const divider = "=".repeat(78);
  const subDivider = "-".repeat(78);
  const lines: string[] = [
    divider,
    doc.title.toUpperCase().padStart((78 + doc.title.length) / 2).padEnd(78),
    divider,
    "",
    `EFFECTIVE DATE: ${doc.effective_date}`,
    `GOVERNING LAW / JURISDICTION: ${doc.jurisdiction}`,
    `DOCUMENT TYPE: ${doc.document_type}`,
    `DOCUMENT ID: ${doc.id} (Version ${doc.version})`,
    "",
    subDivider,
    "PARTIES TO THIS INSTRUMENT:",
    subDivider,
    ...doc.parties.map((p, idx) => `Party ${idx + 1} [${(p.role || 'PARTY').toUpperCase()}]: ${p.name}${p.company ? ` (${p.company})` : ''}${p.address ? ` · Address: ${p.address}` : ''}${p.email ? ` · Email: ${p.email}` : ''}`),
    ""
  ];

  if (doc.key_terms && doc.key_terms.length > 0) {
    lines.push(subDivider, "KEY TERMS & COVENANTS SUMMARY:", subDivider);
    doc.key_terms.forEach(kt => lines.push(`• ${kt.term}: ${kt.details}`));
    lines.push("");
  }

  lines.push(subDivider, "TERMS AND CONDITIONS:", subDivider, "");
  for (const sec of doc.sections) {
    lines.push(sec.heading.toUpperCase());
    lines.push("~".repeat(sec.heading.length));
    lines.push(sec.content);
    lines.push("");
  }

  lines.push(subDivider, "SIGNATURES & EXECUTION:", subDivider);
  lines.push("IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.\n");
  for (const sb of doc.signature_blocks) {
    lines.push(`FOR: ${sb.party_name.toUpperCase()}${sb.party_company ? ` (${sb.party_company})` : ''}`);
    lines.push(`Title: ${sb.party_role || 'Signatory'}`);
    lines.push("Signature: ____________________________________");
    lines.push(sb.date_placeholder || "Date:      ________________________");
    lines.push("");
  }

  lines.push(divider);
  lines.push(`NOTICE: ${doc.disclaimer}`);
  lines.push("Generated via LegalEase AI Enterprise Platform");
  lines.push(divider);

  return lines.join("\n");
}

// -------------------------------------------------------------
// API Routes
// -------------------------------------------------------------

app.get(['/health', '/api/health'], (req, res) => {
  const hasGemini = Boolean(GEMINI_API_KEY && !GEMINI_API_KEY.startsWith('MY_GEMINI') && GEMINI_API_KEY !== 'your_key_here');
  res.json({
    status: 'healthy',
    service: 'LegalEase AI Engine',
    version: '2.4.0',
    gemini: {
      configured: hasGemini,
      model: GEMINI_MODEL
    },
    platform: 'Enterprise SaaS'
  });
});

app.get(['/templates', '/api/templates'], (req, res) => {
  res.json(DEFAULT_TEMPLATES);
});

app.get(['/documents', '/api/documents'], (req, res) => {
  const docs = Array.from(DOCUMENT_STORE.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  res.json(docs);
});

app.get('/api/documents/:id', (req, res) => {
  const doc = DOCUMENT_STORE.get(req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, error: 'Document not found' });
  }
  const versions = DOCUMENT_VERSIONS.get(req.params.id) || [];
  res.json({ success: true, document: doc, total_versions: versions.length });
});

app.post(['/generate', '/documents', '/api/documents/generate'], async (req, res) => {
  try {
    const { document_type, parties, terms, effective_date, jurisdiction } = req.body;
    if (!document_type || !parties || parties.length === 0) {
      return res.status(422).json({ success: false, error: 'Missing document type or parties' });
    }

    const doc = await generateWithAI(req.body);
    DOCUMENT_STORE.set(doc.id, doc);
    DOCUMENT_VERSIONS.set(doc.id, [JSON.parse(JSON.stringify(doc))]);

    res.json({ success: true, document: doc });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err?.message || 'Generation failed' } });
  }
});

// Helper for deterministic fallback when Gemini API encounters rate limits
function generateFallbackLegalReply(query: string, docCtx?: any): string {
  const q = query.toLowerCase();
  const docTitle = docCtx?.title ? ` for "${docCtx.title}"` : '';

  if (q.includes('indemn') || q.includes('hold harmless')) {
    return `### Standard Mutual Indemnification Clause${docTitle}\n\n` +
      `**"Each Party ('Indemnifying Party') agrees to defend, indemnify, and hold harmless the other Party, its affiliates, directors, officers, and employees against any third-party claims, liabilities, losses, damages, and reasonable legal expenses arising directly from: (a) any material breach of this Agreement; (b) gross negligence or willful misconduct; or (c) violation of applicable statutory laws."**\n\n` +
      `**Key Recommendations:**\n` +
      `• *Limitation of Liability Alignment:* Ensure aggregate indemnity is tied to your contractual liability cap.\n` +
      `• *Notice Requirement:* Require written notification within thirty (30) days of any claim.\n` +
      `• *Carve-Outs:* Standard carve-outs include damages arising from the other party's independent negligence.`;
  }

  if (q.includes('terminat') || q.includes('cancel') || q.includes('breach')) {
    return `### Termination & Cure Period Guidelines${docTitle}\n\n` +
      `**Recommended Clause:**\n` +
      `*"Either Party may terminate this Agreement immediately upon written notice if: (a) the other Party commits a material breach and fails to cure such breach within thirty (30) days of receiving written notice; or (b) the other Party becomes insolvent, enters liquidation, or ceases ordinary business operations."*\n\n` +
      `**Drafting Checklist:**\n` +
      `1. Specify whether **Termination for Convenience** is permitted (e.g., 30 or 60 days advance written notice).\n` +
      `2. State post-termination obligations clearly (payment for work rendered, return of confidential assets).\n` +
      `3. Confirm survival clauses: Confidentiality, Intellectual Property, and Indemnification should explicitly survive termination.`;
  }

  if (q.includes('payment') || q.includes('invoice') || q.includes('fee') || q.includes('compensation')) {
    return `### Recommended Commercial Payment Provision${docTitle}\n\n` +
      `**"Invoices shall be rendered upon completion of designated project milestones or on a calendar monthly basis. Client covenants to remit payment within thirty (30) days of receipt ('Net 30'). Any undisputed overdue balance shall accrue simple interest at 1.5% per month or the maximum rate permissible by law."**\n\n` +
      `**Best Practices:**\n` +
      `• Explicitly outline the procedure for disputed invoice portions.\n` +
      `• State who bears transactional or currency conversion fees.\n` +
      `• Reimbursable out-of-pocket expenses should require prior written approval.`;
  }

  if (q.includes('confidential') || q.includes('nda') || q.includes('secret')) {
    return `### Confidentiality Protection Clause${docTitle}\n\n` +
      `**"Receiving Party agrees to preserve the strict confidentiality of all proprietary, technical, and commercial data disclosed by Disclosing Party for a period of three (3) years from disclosure, exercising no less than reasonable commercial care."**\n\n` +
      `**Standard Exclusions (Carve-outs):**\n` +
      `• Information already public through no fault of Receiving Party.\n` +
      `• Information already known prior to receipt.\n` +
      `• Disclosures compelled by lawful court order (with advance notice to Disclosing Party).`;
  }

  if (q.includes('jurisdiction') || q.includes('governing law') || q.includes('court') || q.includes('arbitrat')) {
    const defaultJurisdiction = docCtx?.jurisdiction || "State of Delaware";
    return `### Governing Law & Dispute Resolution Analysis\n\n` +
      `**Current Standard Selection:** ${defaultJurisdiction}\n\n` +
      `• **State of Delaware:** Premier jurisdiction for corporate and commercial litigation; renowned Court of Chancery provides rapid, predictable resolutions.\n` +
      `• **State of California:** Favorable for technology agreements, but enforces statutory prohibitions on post-employment non-compete clauses.\n` +
      `• **State of New York:** Favored for high-value financial, banking, and commercial contracts with deep precedents.\n\n` +
      `**Recommended Provision:**\n` +
      `*"This Agreement shall be governed by, and construed in accordance with, the laws of ${defaultJurisdiction}, without regard to conflicts of laws principles. The parties agree to preliminary good-faith mediation prior to commencing binding legal arbitration."*`;
  }

  // Default contextual legal guidance
  return `### LegalEase AI Counsel Synthesis${docTitle}\n\n` +
    `Thank you for your inquiry regarding: **"${query}"**\n\n` +
    `**Strategic Legal Counsel Guidance:**\n` +
    `1. **Clarity & Enforceability:** Ensure all obligations, milestones, and reciprocal duties are articulated with objective metrics rather than vague qualitative descriptors.\n` +
    `2. **Remedies & Liabilities:** Explicitly state the available remedies in the event of default or non-performance, including cure notice timeframes.\n` +
    `3. **Signatory Authority:** Verify that all executing signatories possess verified corporate authority to legally bind their respective entities.\n\n` +
    `*Notice: Generated by LegalEase AI Enterprise Platform. Automated guidance is intended for informational drafting assistance; review with licensed legal counsel before formal execution.*`;
}

// -------------------------------------------------------------
// AI Chatbot Route
// -------------------------------------------------------------
app.post(['/chat', '/api/chat'], async (req, res) => {
  try {
    const { message, history = [], documentContext } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const systemInstruction = `You are LegalEase AI Counsel, an expert corporate legal advisor and contract architect.
Your responsibilities:
1. Provide accurate, practical legal insights, contract clause drafting, risk analysis, and negotiation advice.
2. If document context is given, directly reference the contract title, parties, terms, effective date, and clauses to provide tailored, context-aware advice.
3. Be professional, structured, and concise. Use clear formatting, bullet points, and actionable clause recommendations.
4. Always conclude with a brief professional notice that guidance is automated drafting assistance and formal contracts should be reviewed by qualified legal counsel.`;

    let contextualUserPrompt = message;
    if (documentContext && documentContext.title) {
      contextualUserPrompt = `[Active Workspace Document Context:
Title: ${documentContext.title}
Document Type: ${documentContext.document_type || 'N/A'}
Effective Date: ${documentContext.effective_date || 'N/A'}
Jurisdiction: ${documentContext.jurisdiction || 'N/A'}
Parties: ${(documentContext.parties || []).map((p: any) => `${p.name} (${p.role || 'Signatory'})`).join(', ')}
Agreed Terms Summary: ${(documentContext.key_terms || []).map((k: any) => `${k.term}: ${k.details}`).join('; ')}
]

User Inquiry: ${message}`;
    }

    // Tier 1: Primary High-Speed AI Engine
    if (GROQ_API_KEY && !GROQ_API_KEY.startsWith('MY_') && GROQ_API_KEY !== 'your_key_here') {
      try {
        const groqMessages: any[] = [{ role: 'system', content: systemInstruction }];
        if (Array.isArray(history)) {
          for (const item of history.slice(-6)) {
            if (item && item.text) {
              groqMessages.push({
                role: item.role === 'user' ? 'user' : 'assistant',
                content: item.text
              });
            }
          }
        }
        groqMessages.push({ role: 'user', content: contextualUserPrompt });

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: groqMessages,
            temperature: 0.7
          })
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const reply = groqData.choices?.[0]?.message?.content?.trim();
          if (reply) {
            return res.json({ success: true, reply, model: 'LegalEase AI Counsel' });
          }
        }
      } catch (highSpeedErr) {
        console.warn('[LegalEase AI] Primary inference engine error, failing over to secondary:', highSpeedErr);
      }
    }

    // Tier 2: Secondary AI Engine
    const effectiveGeminiKey = GEMINI_API_KEY;
    if (effectiveGeminiKey && !effectiveGeminiKey.startsWith('MY_GEMINI') && effectiveGeminiKey !== 'your_key_here') {
      try {
        const ai = new GoogleGenAI({ apiKey: effectiveGeminiKey });

        const contents: any[] = [];
        if (Array.isArray(history)) {
          for (const item of history.slice(-6)) {
            if (item && item.text) {
              contents.push({
                role: item.role === 'user' ? 'user' : 'model',
                parts: [{ text: item.text }]
              });
            }
          }
        }

        contents.push({
          role: 'user',
          parts: [{ text: contextualUserPrompt }]
        });

        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          }
        });

        const reply = response.text || 'I analyzed your inquiry, but could not produce a response text.';
        return res.json({ success: true, reply, model: 'LegalEase AI Counsel' });
      } catch (geminiError: any) {
        console.warn('[LegalEase AI] Secondary engine error, using intelligent fallback:', geminiError?.message || geminiError);
      }
    }

    // Tier 3: Deterministic Legal Counsel Fallback
    const fallbackReply = generateFallbackLegalReply(message, documentContext);
    return res.json({ success: true, reply: fallbackReply, model: 'LegalEase AI Counsel' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Chat processing error' });
  }
});

app.put('/api/documents/:id', (req, res) => {
  const doc = DOCUMENT_STORE.get(req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, error: 'Document not found' });
  }

  const { title, effective_date, jurisdiction, sections, key_terms, parties } = req.body;
  const updated: StructuredDocument = {
    ...doc,
    title: title ?? doc.title,
    effective_date: effective_date ?? doc.effective_date,
    jurisdiction: jurisdiction ?? doc.jurisdiction,
    sections: sections ?? doc.sections,
    key_terms: key_terms ?? doc.key_terms,
    parties: parties ?? doc.parties,
    version: doc.version + 1,
    updated_at: new Date().toISOString()
  };

  DOCUMENT_STORE.set(updated.id, updated);
  const versions = DOCUMENT_VERSIONS.get(doc.id) || [];
  versions.push(JSON.parse(JSON.stringify(updated)));
  DOCUMENT_VERSIONS.set(doc.id, versions);

  res.json({ success: true, document: updated });
});

app.delete('/api/documents/:id', (req, res) => {
  if (!DOCUMENT_STORE.has(req.params.id)) {
    return res.status(404).json({ success: false, error: 'Document not found' });
  }
  DOCUMENT_STORE.delete(req.params.id);
  DOCUMENT_VERSIONS.delete(req.params.id);
  res.json({ success: true, message: 'Document deleted' });
});

app.all(['/api/documents/:id/export/:format', '/documents/:id/export/:format'], async (req, res) => {
  const doc = DOCUMENT_STORE.get(req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, error: 'Document not found' });
  }

  const format = req.params.format.toLowerCase();
  const safeTitle = doc.title.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 32);

  try {
    if (format === 'docx') {
      const buffer = await generateDocxBuffer(doc);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.docx"`);
      return res.send(buffer);
    } else if (format === 'pdf') {
      const buffer = generatePdfBuffer(doc);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.pdf"`);
      return res.send(buffer);
    } else if (format === 'txt') {
      const text = generateTxtString(doc);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.txt"`);
      return res.send(text);
    } else {
      return res.status(400).json({ success: false, error: 'Format must be docx, pdf, or txt' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Export error' });
  }
});

app.post('/api/export-direct/:format', async (req, res) => {
  const doc: StructuredDocument = req.body;
  const format = req.params.format.toLowerCase();
  const safeTitle = (doc.title || 'document').toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 32);

  try {
    if (format === 'docx') {
      const buffer = await generateDocxBuffer(doc);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.docx"`);
      return res.send(buffer);
    } else if (format === 'pdf') {
      const buffer = generatePdfBuffer(doc);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.pdf"`);
      return res.send(buffer);
    } else if (format === 'txt') {
      const text = generateTxtString(doc);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.txt"`);
      return res.send(text);
    } else {
      return res.status(400).json({ success: false, error: 'Format must be docx, pdf, or txt' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Export error' });
  }
});

// Vite Integration
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LegalEase AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
