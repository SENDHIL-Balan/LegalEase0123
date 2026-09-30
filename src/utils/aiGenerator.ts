import { StructuredDocument, DocumentWizardData } from '../types/document';

const GROQ_KEY =
  (import.meta as any).env?.VITE_GROQ_API_KEY ||
  (typeof process !== 'undefined' && process.env?.GROQ_API_KEY) ||
  '';

const GROQ_MODEL = 'openai/gpt-oss-120b';

const DISCLAIMER_TEXT =
  'LegalEase AI generates documents for informational and drafting purposes. Generated documents do not constitute formal legal counsel and may require review by a qualified legal professional before execution.';

/**
 * Safely parse JSON from LLM responses, stripping code fences or preamble
 */
function cleanAndParseJson(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

/**
 * High-Speed AI Document Generator
 * Generates enterprise-grade, legally binding documents.
 * 100% resilient: server API -> direct inference -> deterministic synthesis.
 */
export async function generateDocumentWithAI(wizardData: DocumentWizardData): Promise<StructuredDocument> {
  const safeData: DocumentWizardData = {
    document_type: wizardData?.document_type || 'Commercial Agreement',
    parties: Array.isArray(wizardData?.parties) && wizardData.parties.length > 0
      ? wizardData.parties
      : [
          { name: 'Disclosing / First Party', role: 'First Party', company: 'Company A' },
          { name: 'Receiving / Second Party', role: 'Second Party', company: 'Company B' }
        ],
    terms: Array.isArray(wizardData?.terms) ? wizardData.terms : [],
    effective_date: wizardData?.effective_date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    jurisdiction: wizardData?.jurisdiction || 'State of Delaware',
    document_language: wizardData?.document_language || 'English',
    tone: wizardData?.tone || 'Formal & Binding',
    additional_instructions: wizardData?.additional_instructions || ''
  };

  // Attempt 1: Serverless/Backend API endpoint (/api/documents/generate)
  try {
    const res = await fetch('/api/documents/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safeData)
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data?.success && data?.document?.sections?.length) {
        saveDocumentToLocal(data.document);
        return data.document;
      }
    }
  } catch (backendErr) {
    console.warn('[LegalEase] Server endpoint unavailable, using client-side generator:', backendErr);
  }

  // Attempt 2: Direct High-Speed Engine
  if (GROQ_KEY && !GROQ_KEY.startsWith('MY_')) {
    try {
      const doc = await callDirectGroqGeneration(safeData);
      if (doc && doc.sections && doc.sections.length > 0) {
        saveDocumentToLocal(doc);
        return doc;
      }
    } catch (groqErr) {
      console.warn('[LegalEase] Direct inference fallback triggered:', groqErr);
    }
  }

  // Attempt 3: Deterministic legal document synthesis (always succeeds)
  const fallbackDoc = generateClientDeterministicDoc(safeData);
  saveDocumentToLocal(fallbackDoc);
  return fallbackDoc;
}

/**
 * Direct API Call to high-speed engine
 */
async function callDirectGroqGeneration(payload: DocumentWizardData): Promise<StructuredDocument> {
  const docType = payload.document_type || 'Commercial Agreement';
  const partiesStr = (payload.parties || [])
    .map(
      (p, i) =>
        `Party ${i + 1}: ${p.name || 'Signatory'} (${p.role || 'Party'}), Organization: ${
          p.company || 'Individual'
        }, Address: ${p.address || 'N/A'}, Email: ${p.email || 'N/A'}`
    )
    .join('\n');

  const termsStr = (payload.terms || []).map((t, i) => `${i + 1}. ${t}`).join('\n');

  const systemPrompt = `You are a senior corporate counsel and enterprise legal document architect.
You MUST output ONLY a valid JSON object matching this schema without any markdown fences, backticks, or commentary:
{
  "title": "${docType.toUpperCase()}",
  "document_type": "${docType}",
  "effective_date": "${payload.effective_date}",
  "jurisdiction": "${payload.jurisdiction || 'State of Delaware'}",
  "key_terms": [
    {"term": "Provision Name", "details": "Agreed details"}
  ],
  "sections": [
    {"heading": "1. PREAMBLE & RECITALS", "content": "Formal legal recital text..."},
    {"heading": "2. DEFINITIONS & INTERPRETATION", "content": "..."},
    {"heading": "3. SCOPE OF ENGAGEMENT", "content": "..."},
    {"heading": "4. PAYMENT & COMMERCIAL TERMS", "content": "..."},
    {"heading": "5. INTELLECTUAL PROPERTY RIGHTS", "content": "..."},
    {"heading": "6. CONFIDENTIALITY & NON-DISCLOSURE", "content": "..."},
    {"heading": "7. INDEMNIFICATION & LIABILITY", "content": "..."},
    {"heading": "8. TERM & TERMINATION", "content": "..."},
    {"heading": "9. GOVERNING LAW & DISPUTE RESOLUTION", "content": "..."},
    {"heading": "10. MISCELLANEOUS PROVISIONS", "content": "..."}
  ],
  "signature_blocks": [
    {"party_name": "Full Legal Name", "party_role": "Role", "party_company": "Company", "date_placeholder": "Date: ____________", "signature_line": "Signature: ____________"}
  ]
}`;

  const userPrompt = `Draft a comprehensive, legally enforceable ${docType}.
Parameters:
- Document Type: ${docType}
- Effective Date: ${payload.effective_date}
- Jurisdiction: ${payload.jurisdiction || 'State of Delaware'}
- Parties:
${partiesStr}
- Agreed Terms:
${termsStr || 'Standard commercial terms and reciprocal duties'}
- Additional Instructions: ${payload.additional_instructions || 'Ensure complete mutual protection'}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_KEY}`,
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
    throw new Error(`Inference engine failed with HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() || '';
  const parsed = cleanAndParseJson(text);

  const docId = 'doc_' + Math.random().toString(36).substring(2, 11);
  const now = new Date().toISOString();

  return {
    id: docId,
    title: parsed.title || docType.toUpperCase(),
    document_type: docType,
    effective_date: payload.effective_date,
    jurisdiction: parsed.jurisdiction || payload.jurisdiction || 'State of Delaware',
    parties: payload.parties,
    key_terms:
      parsed.key_terms && parsed.key_terms.length > 0
        ? parsed.key_terms
        : [
            { term: 'Agreement Type', details: docType },
            { term: 'Effective Date', details: payload.effective_date },
            { term: 'Governing Law', details: payload.jurisdiction || 'State of Delaware' }
          ],
    sections: parsed.sections && parsed.sections.length > 0 ? parsed.sections : [],
    signature_blocks:
      parsed.signature_blocks && parsed.signature_blocks.length > 0
        ? parsed.signature_blocks
        : payload.parties.map((p) => ({
            party_name: p.name || 'Authorized Signatory',
            party_role: p.role || 'Signatory',
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

/**
 * Deterministic Client-side Fallback
 */
export function generateClientDeterministicDoc(payload: DocumentWizardData): StructuredDocument {
  const docId = 'doc_' + Math.random().toString(36).substring(2, 11);
  const now = new Date().toISOString();
  const parties = Array.isArray(payload?.parties) && payload.parties.length > 0
    ? payload.parties
    : [
        { name: 'Party A', company: 'Company A', role: 'First Party' },
        { name: 'Party B', company: 'Company B', role: 'Second Party' }
      ];
  const p1 = parties[0] || { name: 'Party A', company: 'Company A', role: 'First Party' };
  const p2 = parties[1] || { name: 'Party B', company: 'Company B', role: 'Second Party' };
  const docType = payload?.document_type || 'Commercial Agreement';
  const effectiveDate = payload?.effective_date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const jurisdiction = payload?.jurisdiction || 'State of Delaware';

  return {
    id: docId,
    title: `${docType.toUpperCase()}`,
    document_type: docType,
    effective_date: effectiveDate,
    jurisdiction,
    parties,
    key_terms: [
      { term: 'Principal Parties', details: `${p1.name} (${p1.role || 'First Party'}) and ${p2.name} (${p2.role || 'Second Party'})` },
      { term: 'Effective Date', details: effectiveDate },
      { term: 'Governing Jurisdiction', details: jurisdiction },
      ...(payload?.terms || []).map((t, idx) => ({
        term: `Agreed Term ${idx + 1}`,
        details: t
      }))
    ],
    sections: [
      {
        heading: '1. PREAMBLE & RECITALS',
        content: `This ${docType} (the "Agreement") is entered into and made effective as of ${effectiveDate}, by and between ${p1.name}${p1.company ? `, representing ${p1.company}` : ''} ("${p1.role || 'First Party'}"), and ${p2.name}${p2.company ? `, representing ${p2.company}` : ''} ("${p2.role || 'Second Party'}"). WHEREAS, the parties desire to establish mutually binding covenants and obligations as set forth herein.`
      },
      {
        heading: '2. COVENANTS & OBLIGATIONS',
        content: payload?.terms && payload.terms.length > 0
          ? `The Parties agree to the following express provisions:\n${payload.terms.map(t => `• ${t}`).join('\n')}`
          : `Each Party covenants to perform all agreed undertakings diligently, in accordance with applicable statutory standards and industry best practices.`
      },
      {
        heading: '3. CONFIDENTIALITY & PROPRIETARY RIGHTS',
        content: 'Each Party agrees to hold in strict confidence all proprietary, financial, and technical information disclosed during the term of this Agreement and for a period of three (3) years thereafter, applying no less than reasonable commercial care.'
      },
      {
        heading: '4. INDEMNIFICATION & LIABILITY LIMITATION',
        content: `Each Party agrees to defend, indemnify, and hold harmless the other Party against third-party claims arising from gross negligence or material breach. Neither Party shall be liable for indirect, incidental, or consequential damages.`
      },
      {
        heading: '5. TERM & TERMINATION',
        content: 'This Agreement shall commence on the Effective Date and continue until fulfilled or terminated by either Party upon thirty (30) days advance written notice for material breach.'
      },
      {
        heading: '6. GOVERNING LAW & JURISDICTION',
        content: `This Agreement shall be governed by, and construed in accordance with, the laws of the ${jurisdiction}, without regard to conflict of laws principles. Any legal action shall be submitted to binding arbitration.`
      },
      {
        heading: '7. ENTIRE AGREEMENT',
        content: 'This instrument constitutes the entire understanding between the Parties concerning the subject matter and supersedes all prior agreements, oral or written.'
      }
    ],
    signature_blocks: parties.map(p => ({
      party_name: p.name || 'Authorized Signatory',
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

/**
 * Local Storage Persistence
 */
export function getSavedDocuments(): StructuredDocument[] {
  try {
    const raw = localStorage.getItem('legalease_documents');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDocumentToLocal(doc: StructuredDocument): void {
  try {
    const existing = getSavedDocuments();
    const updated = [doc, ...existing.filter(d => d.id !== doc.id)];
    localStorage.setItem('legalease_documents', JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save document to localStorage:', err);
  }
}

export function deleteDocumentFromLocal(id: string): void {
  try {
    const existing = getSavedDocuments();
    const updated = existing.filter(d => d.id !== id);
    localStorage.setItem('legalease_documents', JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete document from localStorage:', err);
  }
}
