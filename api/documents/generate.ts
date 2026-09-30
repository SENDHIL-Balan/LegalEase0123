export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const GROQ_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '';
  const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

  let payload = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = {};
    }
  }
  payload = payload || {};
  const docType = payload.document_type || 'Legal Agreement';
  const partiesList = Array.isArray(payload.parties) && payload.parties.length > 0
    ? payload.parties
    : [
        { name: 'Party A', role: 'First Party', company: 'Company A' },
        { name: 'Party B', role: 'Second Party', company: 'Company B' }
      ];

  try {
    if (GROQ_KEY && !GROQ_KEY.startsWith('MY_')) {
      const partiesStr = partiesList
        .map(
          (p: any, i: number) =>
            `Party ${i + 1}: ${p.name || 'Signatory'} (${p.role || 'Party'}), Organization: ${
              p.company || 'Individual'
            }, Address: ${p.address || 'N/A'}`
        )
        .join('\n');

      const termsStr = (payload.terms || []).map((t: string, i: number) => `${i + 1}. ${t}`).join('\n');

      const systemPrompt = `You are a senior corporate counsel and enterprise legal document architect.
You MUST output ONLY a valid JSON object matching this schema without any markdown fences:
{
  "title": "${docType.toUpperCase()}",
  "document_type": "${docType}",
  "effective_date": "${payload.effective_date || 'Effective Date'}",
  "jurisdiction": "${payload.jurisdiction || 'State of Delaware'}",
  "key_terms": [
    {"term": "Provision Name", "details": "Agreed details"}
  ],
  "sections": [
    {"heading": "1. PREAMBLE & RECITALS", "content": "Formal legal recital text..."},
    {"heading": "2. ...", "content": "..."}
  ],
  "signature_blocks": [
    {"party_name": "Full Legal Name", "party_role": "Role", "party_company": "Company", "date_placeholder": "Date: ____________", "signature_line": "Signature: ____________"}
  ]
}`;

      const userPrompt = `Draft a comprehensive, legally binding, highly structured ${docType}.
Parameters:
- Document Type: ${docType}
- Effective Date: ${payload.effective_date || 'Effective Date'}
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

      if (response.ok) {
        const data = await response.json();
        let text = data.choices?.[0]?.message?.content?.trim() || '';
        if (text.startsWith('```')) {
          text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        }
        const firstB = text.indexOf('{');
        const lastB = text.lastIndexOf('}');
        if (firstB !== -1 && lastB !== -1 && lastB > firstB) {
          text = text.substring(firstB, lastB + 1);
        }
        const parsed = JSON.parse(text);

        const docId = 'doc_' + Math.random().toString(36).substring(2, 11);
        const now = new Date().toISOString();

        const doc = {
          id: docId,
          title: parsed.title || docType.toUpperCase(),
          document_type: docType,
          effective_date: payload.effective_date || 'Effective Date',
          jurisdiction: parsed.jurisdiction || payload.jurisdiction || 'State of Delaware',
          parties: partiesList,
          key_terms: parsed.key_terms || [],
          sections: parsed.sections || [],
          signature_blocks:
            parsed.signature_blocks && parsed.signature_blocks.length > 0
              ? parsed.signature_blocks
              : partiesList.map((p: any) => ({
                  party_name: p.name || 'Authorized Signatory',
                  party_role: p.role || 'Signatory',
                  party_company: p.company || '',
                  date_placeholder: 'Date: ____________________',
                  signature_line: 'Signature: ____________________'
                })),
          disclaimer:
            'LegalEase AI generates documents for informational and drafting purposes. Generated documents do not constitute formal legal counsel.',
          version: 1,
          created_at: now,
          updated_at: now
        };

        return res.status(200).json({ success: true, document: doc });
      }
    }
  } catch (err: any) {
    console.error('Serverless generation error:', err);
  }

  // Fallback deterministic document
  const docId = 'doc_' + Math.random().toString(36).substring(2, 11);
  const now = new Date().toISOString();
  const p1 = partiesList[0] || { name: 'Party A' };
  const p2 = partiesList[1] || { name: 'Party B' };

  const fallbackDoc = {
    id: docId,
    title: payload.document_type.toUpperCase(),
    document_type: payload.document_type,
    effective_date: payload.effective_date || new Date().toLocaleDateString('en-US'),
    jurisdiction: payload.jurisdiction || 'State of Delaware',
    parties: payload.parties,
    key_terms: [
      { term: 'Agreement Type', details: payload.document_type },
      { term: 'Effective Date', details: payload.effective_date || 'Upon Execution' },
      { term: 'Governing Jurisdiction', details: payload.jurisdiction || 'State of Delaware' }
    ],
    sections: [
      {
        heading: '1. PREAMBLE & RECITALS',
        content: `This ${payload.document_type} is entered into as of ${payload.effective_date || 'the Effective Date'}, between ${p1.name} and ${p2.name}.`
      },
      {
        heading: '2. COVENANTS & TERMS',
        content: payload.terms && payload.terms.length > 0
          ? `The parties agree to the following terms:\n${payload.terms.map((t: string) => `• ${t}`).join('\n')}`
          : 'The parties agree to perform their reciprocal duties in good faith.'
      },
      {
        heading: '3. GOVERNING LAW & EXECUTION',
        content: `This agreement is governed by the laws of ${payload.jurisdiction || 'State of Delaware'}.`
      }
    ],
    signature_blocks: payload.parties.map((p: any) => ({
      party_name: p.name,
      party_role: p.role || 'Authorized Signatory',
      party_company: p.company || '',
      date_placeholder: 'Date: ____________________',
      signature_line: 'Signature: ____________________'
    })),
    disclaimer: 'LegalEase AI generated for informational purposes.',
    version: 1,
    created_at: now,
    updated_at: now
  };

  return res.status(200).json({ success: true, document: fallbackDoc });
}
