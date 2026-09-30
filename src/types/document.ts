export interface Party {
  name: string;
  company?: string;
  role?: string;
  address?: string;
  email?: string;
  phone?: string;
}

export interface Section {
  heading: string;
  content: string;
}

export interface KeyTerm {
  term: string;
  details: string;
}

export interface SignatureBlock {
  party_name: string;
  party_role?: string;
  party_company?: string;
  date_placeholder?: string;
  signature_line?: string;
}

export interface StructuredDocument {
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

export interface TemplateDefinition {
  id: string;
  title: string;
  category: string;
  description: string;
  default_terms: string[];
  default_parties: Party[];
  suggested_jurisdiction: string;
}

export interface DocumentWizardData {
  document_type: string;
  parties: Party[];
  terms: string[];
  effective_date: string;
  jurisdiction: string;
  additional_instructions: string;
  document_language: string;
  tone: string;
}

export const BUILTIN_TEMPLATES: TemplateDefinition[] = [
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
      "Annual base salary paid in accordance with standard payroll schedule.",
      "Standard benefits package including health coverage and retirement plan.",
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
      "Security deposit held in dedicated escrow account.",
      "Tenant responsible for utilities, internet, and interior maintenance.",
      "No subleasing or assignment without prior express written approval.",
      "Late fee assessed on payments received past grace period."
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
      "Base compensation per annum with target annual performance bonus.",
      "Eligibility for incentive equity options subject to vesting schedule.",
      "Commencement date within thirty (30) days of signed acceptance.",
      "Contingent upon successful background screening and eligibility verification."
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
