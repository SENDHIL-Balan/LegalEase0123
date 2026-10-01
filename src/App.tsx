import React, { useState, useEffect } from 'react';
import {
  Scale,
  FileText,
  Plus,
  Clock,
  Settings,
  HelpCircle,
  FolderOpen,
  LayoutTemplate,
  Download,
  Edit3,
  CheckCircle2,
  Trash2,
  Share2,
  Sun,
  Moon,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Save,
  X,
  Code2,
  Search,
  Check,
  Building2,
  User,
  MapPin,
  Mail,
  Phone,
  FileCheck,
  Calendar,
  AlertCircle,
  Menu,
  Terminal,
  Cpu,
  Loader2
} from 'lucide-react';

import {
  StructuredDocument,
  DocumentWizardData,
  Party,
  Section,
  KeyTerm,
  TemplateDefinition,
  BUILTIN_TEMPLATES
} from './types/document';
import { FloatingChatbot } from './components/FloatingChatbot';
import {
  generateDocumentWithAI,
  generateClientDeterministicDoc,
  getSavedDocuments,
  saveDocumentToLocal,
  deleteDocumentFromLocal
} from './utils/aiGenerator';
import { exportDocument } from './utils/documentExporter';
import {
  DocumentCategoryFilter,
  DocumentCategory,
  getDocumentCategory,
  CATEGORY_OPTIONS
} from './components/DocumentCategoryFilter';
import { EmptyDocumentsIllustration } from './components/EmptyDocumentsIllustration';
import { DocumentGeneratingAnimation } from './components/DocumentGeneratingAnimation';

const EMPTY_WIZARD_DATA: DocumentWizardData = {
  document_type: '',
  parties: [
    { name: '', company: '', role: '', address: '', email: '', phone: '' },
    { name: '', company: '', role: '', address: '', email: '', phone: '' }
  ],
  terms: [],
  effective_date: '',
  jurisdiction: '',
  additional_instructions: '',
  document_language: 'English',
  tone: 'Formal & Binding'
};

const DOCUMENT_TYPES = [
  {
    type: 'Freelance Work Contract',
    category: 'Contract',
    desc: 'Structured independent contractor agreement covering deliverables, milestones, fee structure, IP ownership, and termination.',
    popular: true
  },
  {
    type: 'Non-Disclosure Agreement (NDA)',
    category: 'Agreement',
    desc: 'Bilateral or unilateral confidentiality covenant protecting proprietary business trade secrets, algorithms, and disclosures.',
    popular: true
  },
  {
    type: 'Employment Contract',
    category: 'Employment',
    desc: 'Full-time employment agreement establishing duties, base compensation, annual bonus, benefits, and at-will terms.',
    popular: true
  },
  {
    type: 'Commercial & Residential Lease',
    category: 'Real Estate',
    desc: 'Real estate lease covering demised premises, monthly rental rates, security deposits, maintenance, and covenants.'
  },
  {
    type: 'Employment Offer Letter',
    category: 'Employment',
    desc: 'Executive or professional offer letter summarizing starting salary, equity options, reporting line, and contingent screening.'
  },
  {
    type: 'Master Services Agreement (MSA)',
    category: 'Contract',
    desc: 'Comprehensive B2B commercial agreement with statements of work (SOW), warranties, service levels, and liability caps.'
  },
  {
    type: 'General Business Agreement',
    category: 'General',
    desc: 'Flexible bilateral legal contract for joint ventures, strategic partnerships, asset transfers, or collaborations.'
  }
];

export default function App() {
  const [activeNav, setActiveNav] = useState<'dashboard' | 'create' | 'documents' | 'templates' | 'settings'>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('legalease_theme') === 'dark';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Documents state
  const [documents, setDocuments] = useState<StructuredDocument[]>([]);
  const [currentDoc, setCurrentDoc] = useState<StructuredDocument | null>(null);
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('all');

  // Wizard state - Starts completely clean without fake pre-filled data
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardData, setWizardData] = useState<DocumentWizardData>(EMPTY_WIZARD_DATA);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [validationError, setValidationError] = useState<string>('');
  const [attemptedSubmit, setAttemptedSubmit] = useState<boolean>(false);

  // Strict step validation checkers
  const isStep1Valid = Boolean(wizardData.document_type && wizardData.document_type.trim());

  const isStep2Valid = Boolean(
    wizardData.parties &&
    wizardData.parties.length >= 2 &&
    wizardData.parties.every(p => Boolean(p.name && p.name.trim() && p.role && p.role.trim()))
  );

  const isStep3Valid = Boolean(
    wizardData.terms &&
    wizardData.terms.map(t => t.trim()).filter(Boolean).length > 0
  );

  const isStep4Valid = Boolean(
    wizardData.effective_date &&
    wizardData.effective_date.trim() &&
    wizardData.jurisdiction &&
    wizardData.jurisdiction.trim()
  );

  const isStepAccessible = (step: number): boolean => {
    if (step === 1) return true;
    if (step === 2) return isStep1Valid;
    if (step === 3) return isStep1Valid && isStep2Valid;
    if (step === 4) return isStep1Valid && isStep2Valid && isStep3Valid;
    if (step === 5) return isStep1Valid && isStep2Valid && isStep3Valid && isStep4Valid;
    if (step === 6) return Boolean(currentDoc || editableDoc);
    return false;
  };

  const validateStep = (stepNumber: number): boolean => {
    setValidationError('');

    if (stepNumber === 1) {
      if (!isStep1Valid) {
        setValidationError('Please select a document type to proceed.');
        return false;
      }
      return true;
    }

    if (stepNumber === 2) {
      if (!wizardData.parties || wizardData.parties.length < 2) {
        setValidationError('At least two parties (Party A and Party B) are required to draft a binding agreement.');
        return false;
      }
      for (let i = 0; i < wizardData.parties.length; i++) {
        const p = wizardData.parties[i];
        const partyLabel = `Party ${String.fromCharCode(65 + i)}`;
        if (!p.name || !p.name.trim()) {
          setValidationError(`Please fill in the Full Legal Name for ${partyLabel}. All parties must be filled.`);
          return false;
        }
        if (!p.role || !p.role.trim()) {
          setValidationError(`Please fill in the Role / Designation for ${partyLabel} (e.g. Contractor, Client, Employer, Tenant).`);
          return false;
        }
      }
      return true;
    }

    if (stepNumber === 3) {
      if (!isStep3Valid) {
        setValidationError('Please enter at least one agreed contractual term or condition before proceeding.');
        return false;
      }
      return true;
    }

    if (stepNumber === 4) {
      if (!wizardData.effective_date || !wizardData.effective_date.trim()) {
        setValidationError('Please specify the Effective Date before proceeding.');
        return false;
      }
      if (!wizardData.jurisdiction || !wizardData.jurisdiction.trim()) {
        setValidationError('Please select or specify the Governing Jurisdiction.');
        return false;
      }
      return true;
    }

    return true;
  };

  const [processingStep, setProcessingStep] = useState<number | null>(null);

  const handleContinueToStep = (fromStep: number, targetStep: number) => {
    setAttemptedSubmit(true);
    if (!validateStep(fromStep)) {
      return;
    }
    setValidationError('');
    setAttemptedSubmit(false);
    setProcessingStep(targetStep);
    setTimeout(() => {
      setWizardStep(targetStep);
      setProcessingStep(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 380);
  };

  const handleStartNewBlankDocument = () => {
    setWizardData({
      document_type: '',
      parties: [
        { name: '', company: '', role: '', address: '', email: '', phone: '' },
        { name: '', company: '', role: '', address: '', email: '', phone: '' }
      ],
      terms: [],
      effective_date: '',
      jurisdiction: '',
      additional_instructions: '',
      document_language: 'English',
      tone: 'Formal & Binding'
    });
    setValidationError('');
    setAttemptedSubmit(false);
    setWizardStep(1);
    setActiveNav('create');
  };

  // Workspace edit state
  const [editMode, setEditMode] = useState(false);
  const [editableDoc, setEditableDoc] = useState<StructuredDocument | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const handleInsertTermFromChat = (term: string) => {
    setWizardData(prev => ({
      ...prev,
      terms: [...prev.terms, term]
    }));
    showToast('Clause inserted into document terms!', 'success');
  };

  // Modals
  const [showPythonHub, setShowPythonHub] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  // Load documents and templates on mount
  useEffect(() => {
    fetchDocuments();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('legalease_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('legalease_theme', 'light');
    }
  }, [darkMode]);

  const fetchDocuments = async () => {
    const localDocs = getSavedDocuments();
    try {
      const res = await fetch('/api/documents');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const merged = [...data];
          for (const ld of localDocs) {
            if (!merged.some(m => m.id === ld.id)) {
              merged.push(ld);
            }
          }
          setDocuments(merged);
          if (merged.length > 0 && !currentDoc) {
            setCurrentDoc(merged[0]);
            setEditableDoc(JSON.parse(JSON.stringify(merged[0])));
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Backend documents unavailable, using local library');
    }

    if (localDocs.length > 0) {
      setDocuments(localDocs);
      if (!currentDoc) {
        setCurrentDoc(localDocs[0]);
        setEditableDoc(JSON.parse(JSON.stringify(localDocs[0])));
      }
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setTemplates(data);
        return;
      }
    } catch (e) {
      console.warn('Using built-in templates fallback');
    }
    setTemplates(BUILTIN_TEMPLATES);
  };

  // Start Generation Flow
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationProgress(15);

    const stepInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev < 40) return prev + 12;
        if (prev < 70) return prev + 8;
        if (prev < 90) return prev + 4;
        return prev;
      });
    }, 280);

    try {
      const doc = await generateDocumentWithAI(wizardData);

      setGenerationProgress(100);
      await new Promise(resolve => setTimeout(resolve, 400));
      clearInterval(stepInterval);

      setDocuments(prev => [doc, ...prev.filter(d => d.id !== doc.id)]);
      setCurrentDoc(doc);
      setEditableDoc(JSON.parse(JSON.stringify(doc)));
      setUnsavedChanges(false);
      setEditMode(false);
      setWizardStep(6);
      showToast('Legal instrument successfully generated!', 'success');
    } catch {
      clearInterval(stepInterval);
      setGenerationProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300));
      const fallback = generateClientDeterministicDoc(wizardData);
      saveDocumentToLocal(fallback);
      setDocuments(prev => [fallback, ...prev.filter(d => d.id !== fallback.id)]);
      setCurrentDoc(fallback);
      setEditableDoc(JSON.parse(JSON.stringify(fallback)));
      setUnsavedChanges(false);
      setEditMode(false);
      setWizardStep(6);
      showToast('Legal instrument generated successfully!', 'success');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save changes to current document
  const handleSaveChanges = async () => {
    if (!editableDoc) return;
    const updatedDoc: StructuredDocument = {
      ...editableDoc,
      version: editableDoc.version + 1,
      updated_at: new Date().toISOString()
    };
    saveDocumentToLocal(updatedDoc);

    try {
      const res = await fetch(`/api/documents/${editableDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editableDoc.title,
          effective_date: editableDoc.effective_date,
          jurisdiction: editableDoc.jurisdiction,
          sections: editableDoc.sections,
          key_terms: editableDoc.key_terms,
          parties: editableDoc.parties
        })
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && data.document) {
          saveDocumentToLocal(data.document);
        }
      }
    } catch {
      // Local save already succeeded
    }

    setCurrentDoc(updatedDoc);
    setEditableDoc(JSON.parse(JSON.stringify(updatedDoc)));
    setUnsavedChanges(false);
    setEditMode(false);
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    setSaveSuccessNotice(`Saved as Version ${updatedDoc.version}`);
    showToast(`Document successfully saved as Version ${updatedDoc.version}`, 'success');
    setTimeout(() => setSaveSuccessNotice(''), 4000);
  };

  // Export document (docx, pdf, txt)
  const handleExport = async (format: 'docx' | 'pdf' | 'txt') => {
    const docToExport = editableDoc || currentDoc;
    if (!docToExport) return;

    setDownloadingFormat(format);
    const safeTitle = (docToExport.title || 'legal_document').toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 32);

    try {
      // 1. Direct high-fidelity client export (real PDF, real DOCX, or TXT)
      await exportDocument(docToExport, format);
      showToast(`Exported ${safeTitle}.${format}`, 'success');
    } catch (clientErr) {
      console.warn('Client export warning, trying server export fallback:', clientErr);
      try {
        const endpoint = `/api/export-direct/${format}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(docToExport)
        });

        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${safeTitle}.${format}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          showToast(`Exported ${safeTitle}.${format}`, 'success');
          return;
        }
      } catch (serverErr: any) {
        showToast(`Export error: ${serverErr?.message || 'Failed to export document'}`, 'error');
      }
    } finally {
      setDownloadingFormat(null);
    }
  };

  // Use a template
  const handleUseTemplate = (tmpl: TemplateDefinition) => {
    setWizardData({
      document_type: tmpl.title,
      parties: tmpl.default_parties,
      terms: tmpl.default_terms,
      effective_date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      jurisdiction: tmpl.suggested_jurisdiction,
      additional_instructions: '',
      document_language: 'English',
      tone: 'Formal & Binding'
    });
    setWizardStep(2);
    setActiveNav('create');
  };

  // Delete document
  const handleDeleteDocument = async (id: string) => {
    deleteDocumentFromLocal(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (currentDoc?.id === id) {
      const remaining = documents.filter(d => d.id !== id);
      if (remaining.length > 0) {
        setCurrentDoc(remaining[0]);
        setEditableDoc(JSON.parse(JSON.stringify(remaining[0])));
      } else {
        setCurrentDoc(null);
        setEditableDoc(null);
      }
    }
    showToast('Document deleted from library', 'info');

    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    } catch {
      // Local removal complete
    }
  };

  // Filtered documents
  const filteredDocs = documents.filter(d => {
    const matchesSearch =
      !searchQuery.trim() ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.document_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.parties.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || getDocumentCategory(d) === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>

      {/* FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-md animate-fadeIn">
          <div className={`p-4 rounded-xl shadow-xl border flex items-center justify-between gap-3 text-xs font-semibold ${
            toast.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/95 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
              : toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/95 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-slate-900 dark:bg-slate-800 text-white border-slate-700'
          }`}>
            <div className="flex items-center gap-2.5">
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
              {toast.type === 'info' && <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />}
              <span className="leading-snug">{toast.message}</span>
            </div>
            <button onClick={() => setToast(null)} className="p-1 hover:opacity-75 shrink-0" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MOBILE TOPBAR */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between p-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div
          onClick={() => setActiveNav('dashboard')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-amber-500 font-bold shadow-xs">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight leading-none block">LegalEase AI</span>
            <span className="text-[10px] text-amber-600 dark:text-amber-500 font-semibold uppercase tracking-wider">Enterprise</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER BACKDROP */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR NAVIGATION (Desktop static, Mobile slide-over) */}
      <aside className={`
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        fixed md:static inset-y-0 left-0 z-50 md:z-10
        w-72 max-w-[85vw] md:w-64 lg:w-72
        bg-white dark:bg-slate-900
        border-r border-slate-200 dark:border-slate-800
        flex flex-col justify-between
        p-4 lg:p-5
        h-full md:min-h-screen
        transition-transform duration-200 ease-in-out
        overflow-y-auto
        shadow-2xl md:shadow-none
      `}>
        <div>
          {/* Mobile Drawer Header with Close Button */}
          <div className="flex md:hidden items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-amber-500 font-bold">
                <Scale className="w-4 h-4" />
              </div>
              <span className="font-bold text-base">LegalEase AI</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Desktop Brand header */}
          <div className="hidden md:flex items-center justify-between pb-6 mb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-amber-500 shadow-sm border border-slate-800">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-lg tracking-tight leading-none">LegalEase AI</div>
                <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-500 tracking-wider uppercase mt-1">Enterprise Workspace</div>
              </div>
            </div>
          </div>

          {/* Quick Create CTA */}
          <button
            onClick={() => {
              handleStartNewBlankDocument();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 mb-5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-semibold text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Document</span>
          </button>

          {/* Nav links */}
          <nav className="space-y-1">
            <button
              onClick={() => { setActiveNav('dashboard'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeNav === 'dashboard'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => { setActiveNav('create'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeNav === 'create'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Edit3 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Document Wizard</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Step {wizardStep}</span>
            </button>

            <button
              onClick={() => { setActiveNav('documents'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeNav === 'documents'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <FolderOpen className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>My Documents</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                {documents.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveNav('templates'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeNav === 'templates'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutTemplate className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Templates</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                7
              </span>
            </button>

            <div className="pt-4 pb-2">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3">
                System & Architecture
              </span>
            </div>

            <button
              onClick={() => { setShowPythonHub(true); setMobileMenuOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Python & FastAPI Hub</span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50">
                ACTIVE
              </span>
            </button>

            <button
              onClick={() => { setActiveNav('settings'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeNav === 'settings'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Footer info & theme toggle */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Theme</span>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {darkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={() => setShowDisclaimer(true)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          >
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>Legal Disclaimer</span>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </button>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 px-2 leading-relaxed">
            AI Core: Google Gemini Active<br />
            FastAPI & python-docx Ready
          </div>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* TOP WORKSPACE BAR */}
        <header className="sticky top-0 z-20 hidden md:flex items-center justify-between px-8 py-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Workspace</div>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 capitalize">
              {activeNav === 'create' ? `Document Wizard (Step ${wizardStep} of 6)` : activeNav}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccessNotice && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/40">
                <Check className="w-3.5 h-3.5" />
                {saveSuccessNotice}
              </span>
            )}

            <button
              onClick={() => setShowPythonHub(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              <span>Python Backend Specs</span>
            </button>
          </div>
        </header>

        {/* WORKSPACE CONTENT BODY */}
        <div className="p-3.5 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full pb-24 md:pb-10">

          {/* ==================================================== */}
          {/* VIEW: DASHBOARD */}
          {/* ==================================================== */}
          {activeNav === 'dashboard' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Header greeting */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Good morning, Legal Counsel
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    What would you like to create or manage today?
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setWizardStep(1);
                      setActiveNav('create');
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-semibold text-sm shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Document</span>
                  </button>
                </div>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
                <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Documents Created</div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white mt-2 font-mono">{documents.length}</div>
                  <div className="text-xs text-slate-500 mt-1">All versions preserved</div>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Drafts</div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white mt-2 font-mono">1</div>
                  <div className="text-xs text-amber-600 dark:text-amber-500 mt-1">Ready for synthesis</div>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Standard Templates</div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white mt-2 font-mono">7</div>
                  <div className="text-xs text-slate-500 mt-1">Enterprise audited</div>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Compliance Status</div>
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 font-mono">100%</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Disclaimers enforced</div>
                </div>
              </div>

              {/* Quick Start Templates */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Quick Start Agreements
                  </h2>
                  <button
                    onClick={() => setActiveNav('templates')}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-500 hover:underline flex items-center gap-1"
                  >
                    View all 7 templates <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {DOCUMENT_TYPES.slice(0, 4).map((dt, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setWizardData(prev => ({ ...prev, document_type: dt.type }));
                        setWizardStep(2);
                        setActiveNav('create');
                      }}
                      className="cursor-pointer p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 shadow-sm transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-1">
                          {dt.category}
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
                          {dt.type}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                          {dt.desc}
                        </p>
                      </div>
                      <div className="flex items-center text-xs font-medium text-slate-700 dark:text-slate-300 mt-4 group-hover:translate-x-0.5 transition-transform">
                        <span>Draft document</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-1 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Documents Table */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Recent Legal Documents
                  </h2>
                  <button
                    onClick={() => setActiveNav('documents')}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                  >
                    Browse library ({documents.length})
                  </button>
                </div>

                {documents.length > 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      {documents.slice(0, 5).map(doc => (
                        <div
                          key={doc.id}
                          className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                                {doc.title}
                              </span>
                              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                                v{doc.version}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="font-medium text-amber-700 dark:text-amber-500">{doc.document_type}</span>
                              <span>·</span>
                              <span>Parties: {doc.parties.map(p => p.name).filter(Boolean).join(' & ') || 'Pending'}</span>
                              <span>·</span>
                              <span>Effective: {doc.effective_date}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                            <button
                              onClick={() => {
                                setCurrentDoc(doc);
                                setEditableDoc(JSON.parse(JSON.stringify(doc)));
                                setWizardStep(6);
                                setActiveNav('create');
                              }}
                              className="flex-1 sm:flex-initial px-3.5 py-2 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center"
                            >
                              Open Workspace
                            </button>
                            <button
                              onClick={() => {
                                setCurrentDoc(doc);
                                handleExport('docx');
                              }}
                              title="Download Word Document"
                              className="p-2 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                    <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">No documents yet</h3>
                    <p className="text-xs text-slate-500 mt-1">Create your first legal document with LegalEase AI.</p>
                    <button
                      onClick={() => {
                        setWizardStep(1);
                        setActiveNav('create');
                      }}
                      className="mt-4 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 text-white text-xs font-semibold"
                    >
                      + Create Document
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* VIEW: CREATE DOCUMENT (6-STEP WIZARD) */}
          {/* ==================================================== */}
          {activeNav === 'create' && (
            <div className="space-y-6 animate-fadeIn">

              {/* Stepper Header */}
              <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 lg:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                {/* Mobile Stepper Summary & Progress Bar */}
                <div className="flex items-center justify-between md:hidden">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 dark:bg-amber-600 text-white flex items-center justify-center text-xs font-bold font-mono">
                      {wizardStep}
                    </span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {[
                        'Document Type',
                        'Parties Involved',
                        'Terms & Conditions',
                        'Effective Date & Law',
                        'Review & Synthesize',
                        'Workspace Preview'
                      ][wizardStep - 1] || 'Wizard'}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-500">
                    Step {wizardStep} of 6
                  </span>
                </div>

                <div className="md:hidden w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-900 dark:bg-amber-500 h-full transition-all duration-300"
                    style={{ width: `${(wizardStep / 6) * 100}%` }}
                  />
                </div>

                {/* Horizontal Step Buttons (swipeable/scrollable) */}
                <div className="flex items-center overflow-x-auto pb-1 gap-2 text-xs font-medium no-scrollbar">
                  {[
                    { step: 1, label: 'Document Type' },
                    { step: 2, label: 'Parties' },
                    { step: 3, label: 'Terms & Conditions' },
                    { step: 4, label: 'Effective Date' },
                    { step: 5, label: 'Review' },
                    { step: 6, label: 'Workspace' }
                  ].map(s => {
                    const accessible = isStepAccessible(s.step);
                    return (
                      <button
                        key={s.step}
                        onClick={() => {
                          if (s.step > wizardStep) {
                            for (let st = 1; st < s.step; st++) {
                              if (!validateStep(st)) {
                                setAttemptedSubmit(true);
                                return;
                              }
                            }
                          }
                          if (s.step === 6 && !currentDoc && !editableDoc) {
                            setValidationError('Workspace is accessible once a document has been generated.');
                            return;
                          }
                          setValidationError('');
                          setAttemptedSubmit(false);
                          setWizardStep(s.step);
                        }}
                        className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all shrink-0 ${
                          wizardStep === s.step
                            ? 'bg-slate-900 dark:bg-amber-600 text-white font-semibold shadow-xs'
                            : accessible
                            ? wizardStep > s.step
                              ? 'text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            : 'text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] border border-current font-mono">
                          {wizardStep > s.step ? '✓' : s.step}
                        </span>
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 1: CHOOSE DOCUMENT TYPE */}
              {wizardStep === 1 && (
                <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 lg:p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Step 1: Choose Document Type
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Select the category of legal contract or agreement to draft.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                    {DOCUMENT_TYPES.map((dt, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setWizardData(prev => ({ ...prev, document_type: dt.type }));
                          if (validationError) setValidationError('');
                        }}
                        className={`cursor-pointer p-4 sm:p-5 rounded-xl border transition-all flex flex-col justify-between ${
                          wizardData.document_type === dt.type
                            ? 'border-slate-900 dark:border-amber-500 ring-2 ring-slate-900/10 dark:ring-amber-500/20 bg-slate-50/50 dark:bg-slate-800/40'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                              {dt.category}
                            </span>
                            {wizardData.document_type === dt.type && (
                              <CheckCircle2 className="w-4 h-4 text-slate-900 dark:text-amber-500" />
                            )}
                          </div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            {dt.type}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed line-clamp-3">
                            {dt.desc}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {wizardData.document_type === dt.type ? 'Selected' : 'Click to select'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {validationError && (
                    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-500 text-center sm:text-left">
                      {isStep1Valid ? `Selected: ${wizardData.document_type}` : 'Select a document type to continue'}
                    </span>
                    <button
                      disabled={!isStep1Valid || processingStep === 2}
                      onClick={() => handleContinueToStep(1, 2)}
                      className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all ${
                        isStep1Valid && processingStep !== 2
                          ? 'bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white cursor-pointer shadow-sm active:scale-95'
                          : processingStep === 2
                          ? 'bg-slate-900 dark:bg-amber-600 text-white ring-2 ring-amber-400/50 scale-[0.98]'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {processingStep === 2 ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                          <span>Verifying & Proceeding...</span>
                        </>
                      ) : (
                        <>
                          <span>Continue to Parties</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: PARTIES */}
              {wizardStep === 2 && (
                <div className="bg-white dark:bg-slate-900 p-6 lg:p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Step 2: Parties Involved
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Define the legal entities participating in this <strong>{wizardData.document_type}</strong>.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setWizardData(prev => ({
                          ...prev,
                          parties: [
                            ...prev.parties,
                            { name: '', company: '', role: 'Signatory', address: '', email: '', phone: '' }
                          ]
                        }));
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Party</span>
                    </button>
                  </div>

                  <div className="space-y-6">
                    {wizardData.parties.map((party, idx) => {
                      const nameHasError = attemptedSubmit && !party.name?.trim();
                      const roleHasError = attemptedSubmit && !party.role?.trim();

                      return (
                        <div
                          key={idx}
                          className={`p-5 rounded-xl border bg-slate-50/50 dark:bg-slate-800/30 space-y-4 transition-colors ${
                            nameHasError || roleHasError
                              ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-500/20'
                              : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-md bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center text-xs font-bold font-mono">
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                Party {String.fromCharCode(65 + idx)} {party.role ? `(${party.role})` : ''}
                              </span>
                            </div>
                            {wizardData.parties.length > 2 && (
                              <button
                                onClick={() => {
                                  setWizardData(prev => ({
                                    ...prev,
                                    parties: prev.parties.filter((_, i) => i !== idx)
                                  }));
                                }}
                                className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Full Legal Name *
                              </label>
                              <input
                                type="text"
                                value={party.name ?? ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setWizardData(prev => ({
                                    ...prev,
                                    parties: prev.parties.map((p, i) => i === idx ? { ...p, name: val } : p)
                                  }));
                                  if (validationError) setValidationError('');
                                }}
                                placeholder="Enter individual or legal entity name"
                                className={`w-full px-3.5 py-2.5 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 caret-slate-900 dark:caret-amber-400 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 ${
                                  nameHasError
                                    ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500'
                                    : 'border-slate-300 dark:border-slate-700 focus:ring-slate-900 dark:focus:ring-amber-500'
                                }`}
                              />
                              {nameHasError && (
                                <span className="text-[11px] text-rose-500 font-semibold mt-1 block">
                                  Full Legal Name is required *
                                </span>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Company / Organization
                              </label>
                              <input
                                type="text"
                                value={party.company ?? ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setWizardData(prev => ({
                                    ...prev,
                                    parties: prev.parties.map((p, i) => i === idx ? { ...p, company: val } : p)
                                  }));
                                }}
                                placeholder="Optional (e.g. Acme Corp)"
                                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 caret-slate-900 dark:caret-amber-400 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-amber-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Role / Designation *
                              </label>
                              <input
                                type="text"
                                value={party.role ?? ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setWizardData(prev => ({
                                    ...prev,
                                    parties: prev.parties.map((p, i) => i === idx ? { ...p, role: val } : p)
                                  }));
                                  if (validationError) setValidationError('');
                                }}
                                placeholder="e.g. Contractor, Client, Employer, Tenant"
                                className={`w-full px-3.5 py-2.5 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 caret-slate-900 dark:caret-amber-400 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 ${
                                  roleHasError
                                    ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500'
                                    : 'border-slate-300 dark:border-slate-700 focus:ring-slate-900 dark:focus:ring-amber-500'
                                }`}
                              />
                              {roleHasError && (
                                <span className="text-[11px] text-rose-500 font-semibold mt-1 block">
                                  Role / Designation is required *
                                </span>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Registered Address
                              </label>
                              <input
                                type="text"
                                value={party.address ?? ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setWizardData(prev => ({
                                    ...prev,
                                    parties: prev.parties.map((p, i) => i === idx ? { ...p, address: val } : p)
                                  }));
                                }}
                                placeholder="City, State, Zip (Optional)"
                                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 caret-slate-900 dark:caret-amber-400 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-amber-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Email Address
                              </label>
                              <input
                                type="email"
                                value={party.email ?? ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setWizardData(prev => ({
                                    ...prev,
                                    parties: prev.parties.map((p, i) => i === idx ? { ...p, email: val } : p)
                                  }));
                                }}
                                placeholder="contact@email.com (Optional)"
                                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 caret-slate-900 dark:caret-amber-400 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-amber-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Phone Number
                              </label>
                              <input
                                type="text"
                                value={party.phone ?? ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setWizardData(prev => ({
                                    ...prev,
                                    parties: prev.parties.map((p, i) => i === idx ? { ...p, phone: val } : p)
                                  }));
                                }}
                                placeholder="(555) 000-0000 (Optional)"
                                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 caret-slate-900 dark:caret-amber-400 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-amber-500"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {validationError && (
                    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setValidationError('');
                        setAttemptedSubmit(false);
                        setWizardStep(1);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 order-2 sm:order-1"
                    >
                      ← Back
                    </button>
                    <button
                      disabled={!isStep2Valid || processingStep === 3}
                      onClick={() => handleContinueToStep(2, 3)}
                      className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all order-1 sm:order-2 ${
                        isStep2Valid && processingStep !== 3
                          ? 'bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white cursor-pointer shadow-sm active:scale-95'
                          : processingStep === 3
                          ? 'bg-slate-900 dark:bg-amber-600 text-white ring-2 ring-amber-400/50 scale-[0.98]'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {processingStep === 3 ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                          <span>Verifying & Proceeding...</span>
                        </>
                      ) : (
                        <>
                          <span>Continue to Terms & Conditions</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: TERMS & CONDITIONS */}
              {wizardStep === 3 && (
                <div className="bg-white dark:bg-slate-900 p-6 lg:p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Step 3: Agreed Terms & Conditions
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Add individual contractual covenants, payment conditions, or obligations.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setWizardData(prev => ({
                          ...prev,
                          terms: [...prev.terms, '']
                        }));
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Term</span>
                    </button>
                  </div>

                  {/* Terms list */}
                  <div className="space-y-3">
                    {wizardData.terms.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                        <p className="text-xs text-slate-500 dark:text-slate-400">No terms added yet.</p>
                        <button
                          onClick={() => setWizardData(prev => ({ ...prev, terms: [''] }))}
                          className="mt-2 text-xs font-semibold text-slate-900 dark:text-amber-500 hover:underline"
                        >
                          + Add your first contractual term
                        </button>
                      </div>
                    ) : (
                      wizardData.terms.map((term, tIdx) => (
                        <div key={tIdx} className="flex items-center gap-2 sm:gap-3">
                          <span className="w-10 sm:w-16 text-xs font-mono font-semibold text-slate-400 text-left sm:text-right shrink-0">
                            #{(tIdx + 1).toString().padStart(2, '0')}
                          </span>
                          <input
                            type="text"
                            value={term}
                            onChange={e => {
                              const val = e.target.value;
                              setWizardData(prev => ({
                                ...prev,
                                terms: prev.terms.map((t, i) => i === tIdx ? val : t)
                              }));
                              if (validationError) setValidationError('');
                            }}
                            placeholder="e.g. Payment must be made within 30 days of invoice."
                            className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 caret-slate-900 dark:caret-amber-400 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-amber-500"
                          />
                          <button
                            onClick={() => {
                              setWizardData(prev => ({
                                ...prev,
                                terms: prev.terms.filter((_, i) => i !== tIdx)
                              }));
                            }}
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0"
                            title="Delete term"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Semicolon paste importer */}
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Paste Semicolon-Separated Terms (Bulk Import)
                      </span>
                      <span className="text-[11px] text-slate-400">Optional</span>
                    </div>
                    <textarea
                      placeholder="Payment within 30 days; Confidentiality must be maintained; Either party may terminate with 15 days notice."
                      rows={2}
                      id="bulk-terms-input"
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 caret-slate-900 dark:caret-amber-400 text-base sm:text-xs font-mono focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        const el = document.getElementById('bulk-terms-input') as HTMLTextAreaElement;
                        if (el && el.value.trim()) {
                          const parsed = el.value.split(';').map(s => s.trim()).filter(Boolean);
                          setWizardData(prev => ({ ...prev, terms: [...prev.terms, ...parsed] }));
                          el.value = '';
                          if (validationError) setValidationError('');
                        }
                      }}
                      className="w-full sm:w-auto px-4 py-2 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors"
                    >
                      Import Pasted Terms
                    </button>
                  </div>

                  {validationError && (
                    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setValidationError('');
                        setAttemptedSubmit(false);
                        setWizardStep(2);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 order-2 sm:order-1"
                    >
                      ← Back
                    </button>
                    <button
                      disabled={!isStep3Valid || processingStep === 4}
                      onClick={() => handleContinueToStep(3, 4)}
                      className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all order-1 sm:order-2 ${
                        isStep3Valid && processingStep !== 4
                          ? 'bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white cursor-pointer shadow-sm active:scale-95'
                          : processingStep === 4
                          ? 'bg-slate-900 dark:bg-amber-600 text-white ring-2 ring-amber-400/50 scale-[0.98]'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {processingStep === 4 ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                          <span>Verifying & Proceeding...</span>
                        </>
                      ) : (
                        <>
                          <span>Continue to Effective Date</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: EFFECTIVE DATE & GOVERNANCE */}
              {wizardStep === 4 && (
                <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 lg:p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Step 4: Effective Date & Governance
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Configure execution timing, governing law, and drafting tone.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Effective Date *
                      </label>
                      <input
                        type="text"
                        value={wizardData.effective_date}
                        onChange={e => {
                          setWizardData(prev => ({ ...prev, effective_date: e.target.value }));
                          if (validationError) setValidationError('');
                        }}
                        placeholder="e.g. April 15, 2025"
                        className={`w-full px-3.5 py-2.5 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 caret-slate-900 dark:caret-amber-400 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 ${
                          attemptedSubmit && !wizardData.effective_date.trim()
                            ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500'
                            : 'border-slate-300 dark:border-slate-700 focus:ring-slate-900 dark:focus:ring-amber-500'
                        }`}
                      />
                      {attemptedSubmit && !wizardData.effective_date.trim() && (
                        <span className="text-[11px] text-rose-500 font-semibold mt-1 block">
                          Effective Date is required *
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Governing Jurisdiction / Law *
                      </label>
                      <select
                        value={wizardData.jurisdiction}
                        onChange={e => {
                          setWizardData(prev => ({ ...prev, jurisdiction: e.target.value }));
                          if (validationError) setValidationError('');
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 ${
                          attemptedSubmit && !wizardData.jurisdiction.trim()
                            ? 'border-rose-500 ring-1 ring-rose-500'
                            : 'border-slate-300 dark:border-slate-700 focus:ring-slate-900 dark:focus:ring-amber-500'
                        }`}
                      >
                        <option value="">-- Select Governing Jurisdiction --</option>
                        <option value="State of California">State of California</option>
                        <option value="State of Delaware">State of Delaware</option>
                        <option value="State of New York">State of New York</option>
                        <option value="State of Texas">State of Texas</option>
                        <option value="State of Washington">State of Washington</option>
                        <option value="Commonwealth of Massachusetts">Commonwealth of Massachusetts</option>
                        <option value="United Kingdom / England & Wales">United Kingdom / England & Wales</option>
                        <option value="General / Mutual Jurisdiction">General / Mutual Jurisdiction</option>
                      </select>
                      {attemptedSubmit && !wizardData.jurisdiction.trim() && (
                        <span className="text-[11px] text-rose-500 font-semibold mt-1 block">
                          Governing Jurisdiction is required *
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Document Language
                      </label>
                      <select
                        value={wizardData.document_language}
                        onChange={e => setWizardData(prev => ({ ...prev, document_language: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-amber-500"
                      >
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Drafting Tone
                      </label>
                      <select
                        value={wizardData.tone}
                        onChange={e => setWizardData(prev => ({ ...prev, tone: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-amber-500"
                      >
                        <option value="Formal & Binding">Formal & Binding (Strict Legal Standard)</option>
                        <option value="Collaborative Standard">Collaborative Standard (Commercial Balanced)</option>
                        <option value="Executive Concise">Executive Concise (Plain Language Legal)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Optional Advanced Instructions & Special Clauses
                    </label>
                    <textarea
                      value={wizardData.additional_instructions}
                      onChange={e => setWizardData(prev => ({ ...prev, additional_instructions: e.target.value }))}
                      placeholder="E.g., Include mandatory confidential arbitration in San Francisco; include 12-month non-solicitation."
                      rows={3}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 caret-slate-900 dark:caret-amber-400 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-amber-500"
                    />
                  </div>

                  {validationError && (
                    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setValidationError('');
                        setAttemptedSubmit(false);
                        setWizardStep(3);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 order-2 sm:order-1"
                    >
                      ← Back
                    </button>
                    <button
                      disabled={!isStep4Valid || processingStep === 5}
                      onClick={() => handleContinueToStep(4, 5)}
                      className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all order-1 sm:order-2 ${
                        isStep4Valid && processingStep !== 5
                          ? 'bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white cursor-pointer shadow-sm active:scale-95'
                          : processingStep === 5
                          ? 'bg-slate-900 dark:bg-amber-600 text-white ring-2 ring-amber-400/50 scale-[0.98]'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {processingStep === 5 ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                          <span>Verifying & Proceeding...</span>
                        </>
                      ) : (
                        <>
                          <span>Review Before Generation</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: REVIEW BEFORE AI GENERATION */}
              {wizardStep === 5 && (
                <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 lg:p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Step 5: Review Before AI Generation
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Verify all contract parameters before invoking the LegalEase AI synthesis model.
                    </p>
                  </div>

                  {/* Missing fields alert if user bypassed any steps */}
                  {(!isStep1Valid || !isStep2Valid || !isStep3Valid || !isStep4Valid) && (
                    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs space-y-2">
                      <div className="font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span>All document parameters must be completed before generation:</span>
                      </div>
                      <ul className="space-y-1 pl-6 list-disc">
                        {!isStep1Valid && (
                          <li>
                            <button onClick={() => setWizardStep(1)} className="underline font-semibold hover:opacity-80">
                              Step 1: Choose a Document Type
                            </button>
                          </li>
                        )}
                        {!isStep2Valid && (
                          <li>
                            <button onClick={() => setWizardStep(2)} className="underline font-semibold hover:opacity-80">
                              Step 2: Enter Legal Names and Roles for all parties
                            </button>
                          </li>
                        )}
                        {!isStep3Valid && (
                          <li>
                            <button onClick={() => setWizardStep(3)} className="underline font-semibold hover:opacity-80">
                              Step 3: Enter at least one contractual term or condition
                            </button>
                          </li>
                        )}
                        {!isStep4Valid && (
                          <li>
                            <button onClick={() => setWizardStep(4)} className="underline font-semibold hover:opacity-80">
                              Step 4: Specify Effective Date and Governing Jurisdiction
                            </button>
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Summary Card */}
                  <div className="p-5 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-6">
                    <div>
                      <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                        Document Specification
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
                        {wizardData.document_type || 'Unspecified Document Type'}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-4 text-xs">
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400 block text-[11px]">Effective Date</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                            {wizardData.effective_date || <span className="text-rose-500 italic">Required</span>}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400 block text-[11px]">Jurisdiction</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                            {wizardData.jurisdiction || <span className="text-rose-500 italic">Required</span>}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400 block text-[11px]">Language</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">{wizardData.document_language}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400 block text-[11px]">Tone</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">{wizardData.tone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
                        Participating Parties ({wizardData.parties.length})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {wizardData.parties.map((p, i) => (
                          <div key={i} className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                              <span>{p.name || <span className="text-rose-500 italic">Name missing</span>}</span>
                              <span className="font-normal text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {p.role || 'Role missing'}
                              </span>
                            </div>
                            {p.company && <div className="text-slate-600 dark:text-slate-400">Organization: {p.company}</div>}
                            {p.address && <div className="text-slate-500 break-words">Address: {p.address}</div>}
                            {p.email && <div className="text-slate-500 break-all">Email: {p.email}</div>}
                            {p.phone && <div className="text-slate-500">Phone: {p.phone}</div>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
                        Agreed Terms ({wizardData.terms.filter(t => t.trim()).length})
                      </div>
                      {wizardData.terms.filter(t => t.trim()).length === 0 ? (
                        <p className="text-xs text-rose-500 italic">No agreed contractual terms entered.</p>
                      ) : (
                        <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                          {wizardData.terms.filter(t => t.trim()).map((t, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="font-mono text-slate-400 font-semibold">{idx + 1}.</span>
                              <span className="leading-relaxed">{t}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {wizardData.additional_instructions && (
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="text-xs font-semibold text-slate-900 dark:text-white mb-1">
                          Special Instructions
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {wizardData.additional_instructions}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Generation loading indicator & Animation */}
                  {isGenerating ? (
                    <div className="py-2">
                      <DocumentGeneratingAnimation
                        progress={generationProgress}
                        wizardData={wizardData}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => setWizardStep(4)}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 order-2 sm:order-1"
                      >
                        ← Edit Inputs
                      </button>
                      <button
                        disabled={!isStep1Valid || !isStep2Valid || !isStep3Valid || !isStep4Valid || isGenerating}
                        onClick={handleGenerate}
                        className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg font-bold text-sm shadow-md transition-all order-1 sm:order-2 ${
                          isStep1Valid && isStep2Valid && isStep3Valid && isStep4Valid && !isGenerating
                            ? 'bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white cursor-pointer active:scale-95'
                            : isGenerating
                            ? 'bg-amber-600 text-white ring-2 ring-amber-400/50 scale-[0.98]'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Synthesizing Legal Document...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span>Generate Legal Document</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 6: DOCUMENT WORKSPACE & PREVIEW */}
              {wizardStep === 6 && (currentDoc || editableDoc) && (
                <div className="space-y-6">

                  {/* Workspace Bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            {(editableDoc || currentDoc)?.title}
                          </h2>
                          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            v{(editableDoc || currentDoc)?.version}
                          </span>
                          {unsavedChanges && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Unsaved Changes
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {(editableDoc || currentDoc)?.document_type} · Effective: {(editableDoc || currentDoc)?.effective_date}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {editMode ? (
                        <>
                          <button
                            onClick={handleSaveChanges}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Changes (v{((editableDoc || currentDoc)?.version || 1) + 1})</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditableDoc(JSON.parse(JSON.stringify(currentDoc)));
                              setUnsavedChanges(false);
                              setEditMode(false);
                            }}
                            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditMode(true)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Document</span>
                          </button>
                          <button
                            onClick={() => {
                              setWizardStep(1);
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-xs font-semibold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>New Document</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Main Grid: Document Paper on Left, Download & Metadata Panel on Right */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left Column: Visual Document Paper or Editor */}
                    <div className="lg:col-span-8">
                      {editMode && editableDoc ? (
                        /* IN-PLACE DOCUMENT EDITOR */
                        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-lg text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                            <span>You are in editing mode. Changes made will increment the version upon saving.</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Document Title
                              </label>
                              <input
                                type="text"
                                value={editableDoc.title}
                                onChange={e => {
                                  setEditableDoc(prev => prev ? ({ ...prev, title: e.target.value }) : null);
                                  setUnsavedChanges(true);
                                }}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 caret-slate-900 dark:caret-amber-400 text-sm font-bold"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Effective Date
                              </label>
                              <input
                                type="text"
                                value={editableDoc.effective_date}
                                onChange={e => {
                                  setEditableDoc(prev => prev ? ({ ...prev, effective_date: e.target.value }) : null);
                                  setUnsavedChanges(true);
                                }}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 caret-slate-900 dark:caret-amber-400 text-sm font-medium"
                              />
                            </div>
                          </div>

                          {/* Editable Sections */}
                          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                              Contract Sections ({editableDoc.sections.length})
                            </h3>
                            {editableDoc.sections.map((sec, sIdx) => (
                              <div key={sIdx} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 space-y-2">
                                <input
                                  type="text"
                                  value={sec.heading}
                                  onChange={e => {
                                    const newSecs = [...editableDoc.sections];
                                    newSecs[sIdx].heading = e.target.value;
                                    setEditableDoc(prev => prev ? ({ ...prev, sections: newSecs }) : null);
                                    setUnsavedChanges(true);
                                  }}
                                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 font-bold text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 caret-slate-900 dark:caret-amber-400"
                                />
                                <textarea
                                  value={sec.content}
                                  rows={5}
                                  onChange={e => {
                                    const newSecs = [...editableDoc.sections];
                                    newSecs[sIdx].content = e.target.value;
                                    setEditableDoc(prev => prev ? ({ ...prev, sections: newSecs }) : null);
                                    setUnsavedChanges(true);
                                  }}
                                  className="w-full p-3 rounded border border-slate-300 dark:border-slate-700 text-xs font-legal leading-relaxed bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 caret-slate-900 dark:caret-amber-400"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* REALISTIC LEGAL DOCUMENT PAPER */
                        <div className="bg-white dark:bg-slate-900 p-4 sm:p-8 lg:p-14 rounded-xl border border-slate-300 dark:border-slate-800 shadow-md font-legal text-slate-900 dark:text-slate-100 select-text leading-relaxed">
                          {/* Brand watermark indicator */}
                          <div className="text-center pb-5 sm:pb-6 border-b border-slate-200 dark:border-slate-800 mb-6 sm:mb-8">
                            <div className="text-[10px] sm:text-xs font-sans font-bold tracking-widest text-slate-400 uppercase">
                              LegalEase AI · Enterprise Legal Document Workspace
                            </div>
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight mt-2 sm:mt-3 text-slate-900 dark:text-white uppercase">
                              {(editableDoc || currentDoc)?.title}
                            </h1>
                            <div className="text-[11px] sm:text-xs font-sans text-slate-500 italic mt-2">
                              Effective Date: {(editableDoc || currentDoc)?.effective_date} &nbsp;|&nbsp; Governing Jurisdiction: {(editableDoc || currentDoc)?.jurisdiction}
                            </div>
                          </div>

                          {/* Parties Box */}
                          <div className="font-sans text-xs bg-slate-50 dark:bg-slate-800/50 p-3.5 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-800 mb-6 sm:mb-8 space-y-2">
                            <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] sm:text-[11px]">
                              Parties to this Agreement:
                            </div>
                            {(editableDoc || currentDoc)?.parties.map((p, i) => (
                              <div key={i} className="text-slate-700 dark:text-slate-300 text-xs">
                                <span className="font-bold text-amber-700 dark:text-amber-500">[{p.role?.toUpperCase() || `PARTY ${String.fromCharCode(65+i)}`}]: </span>
                                <span className="font-semibold">{p.name}</span>
                                {p.company && <span>, on behalf of <em>{p.company}</em></span>}
                                {p.address && <span className="text-slate-500 block sm:inline sm:before:content-['·_']">Address: {p.address}</span>}
                                {p.email && <span className="text-slate-500 block sm:inline sm:before:content-['·_']">Email: {p.email}</span>}
                              </div>
                            ))}
                          </div>

                          {/* Key Terms Table */}
                          {(editableDoc || currentDoc)?.key_terms && (editableDoc || currentDoc)!.key_terms.length > 0 && (
                            <div className="mb-6 sm:mb-8 font-sans">
                              <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] sm:text-[11px] mb-2">
                                Key Terms & Specifications Summary:
                              </div>
                              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto -mx-1 sm:mx-0">
                                <table className="w-full min-w-[320px] text-xs">
                                  <thead>
                                    <tr className="bg-slate-900 text-white">
                                      <th className="p-2 sm:p-2.5 text-left font-bold w-1/3">Provision / Term</th>
                                      <th className="p-2 sm:p-2.5 text-left font-bold">Agreed Specification</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {(editableDoc || currentDoc)!.key_terms.map((kt, i) => (
                                      <tr key={i} className={i % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-900'}>
                                        <td className="p-2 sm:p-2.5 font-bold text-slate-900 dark:text-white">{kt.term}</td>
                                        <td className="p-2 sm:p-2.5 text-slate-700 dark:text-slate-300">{kt.details}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Sections */}
                          <div className="space-y-6">
                            {(editableDoc || currentDoc)?.sections.map((sec, idx) => (
                              <div key={idx} className="space-y-2">
                                <h3 className="font-bold text-base text-slate-900 dark:text-white uppercase tracking-wide border-b border-slate-100 dark:border-slate-800 pb-1">
                                  {sec.heading}
                                </h3>
                                <div className="text-[15px] sm:text-base text-slate-800 dark:text-slate-200 space-y-3 text-justify leading-relaxed">
                                  {sec.content.split('\n\n').map((para, pIdx) => (
                                    <p key={pIdx}>{para.trim()}</p>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Signatures */}
                          <div className="mt-12 pt-8 border-t-2 border-slate-900 dark:border-slate-700">
                            <p className="font-bold text-sm text-slate-900 dark:text-white mb-8">
                              IN WITNESS WHEREOF, the Parties have caused this Agreement to be executed by their duly authorized representatives.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 font-sans">
                              {(editableDoc || currentDoc)?.signature_blocks.map((sb, i) => (
                                <div key={i} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 space-y-1">
                                  <div className="font-bold text-sm text-slate-900 dark:text-white uppercase">
                                    {sb.party_name}
                                  </div>
                                  {sb.party_company && (
                                    <div className="text-xs text-slate-600 dark:text-slate-400">For: {sb.party_company}</div>
                                  )}
                                  <div className="text-xs text-slate-500">Title: {sb.party_role || 'Signatory'}</div>
                                  <div className="mt-8 border-b border-slate-900 dark:border-slate-600 w-3/4"></div>
                                  <div className="text-[11px] text-slate-500 pt-1">Authorized Signature</div>
                                  <div className="text-xs text-slate-500 pt-3">Date: ________________________</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Disclaimer notice */}
                          <div className="mt-12 pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] font-sans text-slate-400 dark:text-slate-500 italic">
                            LEGAL NOTICE: {(editableDoc || currentDoc)?.disclaimer}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Download Center & Metadata Panel */}
                    <div className="lg:col-span-4 space-y-6">

                      {/* Download Center Card */}
                      <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <div>
                          <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                            Export Center
                          </div>
                          <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                            Download Document
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Export standard legal formats for printing, editing, or digital execution.
                          </p>
                        </div>

                        <div className="space-y-2.5">
                          {/* DOCX button */}
                          <button
                            onClick={() => handleExport('docx')}
                            disabled={downloadingFormat === 'docx'}
                            className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                                W
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white">DOCX (Word)</div>
                                <div className="text-[11px] text-slate-500">Fully editable with Terms table</div>
                              </div>
                            </div>
                            <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
                          </button>

                          {/* PDF button */}
                          <button
                            onClick={() => handleExport('pdf')}
                            disabled={downloadingFormat === 'pdf'}
                            className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                                PDF
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white">PDF Document</div>
                                <div className="text-[11px] text-slate-500">Branded with running headers</div>
                              </div>
                            </div>
                            <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
                          </button>

                          {/* TXT button */}
                          <button
                            onClick={() => handleExport('txt')}
                            disabled={downloadingFormat === 'txt'}
                            className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs font-mono">
                                TXT
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white">Plain Text</div>
                                <div className="text-[11px] text-slate-500">Clean ASCII formatting</div>
                              </div>
                            </div>
                            <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
                          </button>
                        </div>
                      </div>

                      {/* Document Details & Metadata Card */}
                      <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Instrument Metadata
                        </div>

                        <div className="space-y-3 text-xs">
                          <div>
                            <span className="text-slate-400 block">Document ID</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold break-all">
                              {(editableDoc || currentDoc)?.id}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-slate-400 block">Version</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                v{(editableDoc || currentDoc)?.version}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Sections</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {(editableDoc || currentDoc)?.sections.length} clauses
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="text-slate-400 block">Created Timestamp</span>
                            <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                              {(editableDoc || currentDoc)?.created_at.substring(0, 19).replace('T', ' ')}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block">Last Modified</span>
                            <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                              {(editableDoc || currentDoc)?.updated_at.substring(0, 19).replace('T', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* VIEW: MY DOCUMENTS */}
          {/* ==================================================== */}
          {activeNav === 'documents' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Document Library
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Manage, review, version, and export all generated legal instruments.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="w-4 h-4 absolute left-3 top-3 sm:top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search title, party, or type..."
                      className="pl-9 pr-4 py-2.5 sm:py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 caret-slate-900 dark:caret-amber-400 text-base sm:text-xs font-medium w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-amber-500"
                    />
                  </div>

                  <button
                    onClick={() => {
                      handleStartNewBlankDocument();
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 text-white font-semibold text-xs shadow-sm w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Document</span>
                  </button>
                </div>
              </div>

              {/* DOCUMENT CATEGORY FILTER COMPONENT */}
              <DocumentCategoryFilter
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                documents={documents}
              />

              {filteredDocs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredDocs.map(doc => (
                    <div
                      key={doc.id}
                      className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                              {doc.document_type}
                            </span>
                            {(() => {
                              const cat = getDocumentCategory(doc);
                              const catOpt = CATEGORY_OPTIONS.find(c => c.id === cat);
                              if (!catOpt || catOpt.id === 'all') return null;
                              return (
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${catOpt.color.badgeBg} ${catOpt.color.badgeText}`}>
                                  {catOpt.label}
                                </span>
                              );
                            })()}
                          </div>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                            v{doc.version}
                          </span>
                        </div>

                        <h3 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1">
                          {doc.title}
                        </h3>

                        <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <div><strong>Parties:</strong> {doc.parties.map(p => p.name).join(' & ')}</div>
                          <div><strong>Effective:</strong> {doc.effective_date}</div>
                          <div><strong>Jurisdiction:</strong> {doc.jurisdiction}</div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <button
                          onClick={() => {
                            setCurrentDoc(doc);
                            setEditableDoc(JSON.parse(JSON.stringify(doc)));
                            setWizardStep(6);
                            setActiveNav('create');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-amber-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                        >
                          Open Workspace
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setCurrentDoc(doc);
                              handleExport('docx');
                            }}
                            title="Download Word Document"
                            className="p-1.5 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            title="Delete Document"
                            className="p-1.5 rounded text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 px-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <EmptyDocumentsIllustration className="w-64 max-w-xs mx-auto mb-2" />
                  <div className="max-w-md mx-auto space-y-1.5">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {selectedCategory !== 'all'
                        ? `No ${CATEGORY_OPTIONS.find(c => c.id === selectedCategory)?.label || ''} documents found`
                        : 'Your Document Archive is Ready'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {selectedCategory !== 'all'
                        ? `You don't have any legal instruments categorized under ${CATEGORY_OPTIONS.find(c => c.id === selectedCategory)?.label || ''}.`
                        : 'Draft enterprise-grade agreements, contracts, NDAs, and corporate covenants with AI assistance in minutes.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    {selectedCategory !== 'all' || searchQuery ? (
                      <button
                        onClick={() => {
                          setSelectedCategory('all');
                          setSearchQuery('');
                        }}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        Reset Filters
                      </button>
                    ) : (
                      <button
                        onClick={handleStartNewBlankDocument}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create First Document</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* VIEW: TEMPLATES */}
          {/* ==================================================== */}
          {activeNav === 'templates' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Curated Legal Templates
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  Start from enterprise-tested legal instrument templates crafted by legal architects.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {(templates.length > 0 ? templates : BUILTIN_TEMPLATES).map((tmpl: TemplateDefinition, idx: number) => (
                  <div
                    key={idx}
                    className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-400 dark:hover:border-slate-700 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                          {tmpl.category}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {tmpl.default_terms.length} covenants
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        {tmpl.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                        {tmpl.description}
                      </p>

                      <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">Pre-Configured Covenants:</div>
                        <ul className="list-disc list-inside space-y-0.5">
                          {tmpl.default_terms.slice(0, 3).map((t: string, tI: number) => (
                            <li key={tI} className="truncate">{t}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleUseTemplate(tmpl)}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-semibold text-xs transition-colors"
                      >
                        <span>Use This Template</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* VIEW: SETTINGS */}
          {/* ==================================================== */}
          {activeNav === 'settings' && (
            <div className="space-y-6 max-w-3xl animate-fadeIn">
              <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Settings & Preferences
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  Manage LegalEase AI workspace defaults and AI engine options.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Appearance & Theme</h3>
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => setDarkMode(false)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold ${
                        !darkMode
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>Light Theme</span>
                    </button>
                    <button
                      onClick={() => setDarkMode(true)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold ${
                        darkMode
                          ? 'border-amber-500 bg-amber-600 text-white'
                          : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>Dark Theme</span>
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Google Gemini AI Engine</h3>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Configured Model</label>
                      <input
                        type="text"
                        value="gemini-3.8-flash"
                        disabled
                        className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 w-full md:w-80"
                      />
                      <span className="text-[11px] text-slate-400 block mt-1">Configured via GEMINI_MODEL in environment</span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>API credentials securely managed server-side. No user keys exposed in client bundles.</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Privacy & Telemetry</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    LegalEase AI treats contract terms and party identities with strict confidentiality.
                    No contract clauses or personal contact records are logged to third-party ad networks or telemetry.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ==================================================== */}
      {/* MODAL: PYTHON & FASTAPI ARCHITECTURE HUB */}
      {/* ==================================================== */}
      {showPythonHub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Python & FastAPI Architecture Hub
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dual-Stack Verification & Python Environment Specifications
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPythonHub(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                  1. Dual-Stack Enterprise Implementation
                </h4>
                <p className="leading-relaxed">
                  As requested in the project specification, LegalEase AI includes the complete, tested Python backend and Streamlit frontend alongside the modern web interface:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                    <span className="font-bold block text-slate-900 dark:text-white font-mono">backend/main.py</span>
                    <span className="text-[11px] text-slate-500">FastAPI application with CORS, DocumentRequest schemas, and /api/documents routes.</span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                    <span className="font-bold block text-slate-900 dark:text-white font-mono">frontend/app.py</span>
                    <span className="text-[11px] text-slate-500">Enterprise Streamlit interface with custom CSS, multi-step stepper, and download center.</span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                    <span className="font-bold block text-slate-900 dark:text-white font-mono">document_generators/</span>
                    <span className="text-[11px] text-slate-500">Dedicated python-docx, fpdf2, and TXT modules producing formatted legal documents.</span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                    <span className="font-bold block text-slate-900 dark:text-white font-mono">tests/ (Pytest)</span>
                    <span className="text-[11px] text-slate-500">9 automated test cases covering endpoints, generator formatting, and versioning.</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                  2. Command-Line Execution Instructions
                </h4>
                <div className="bg-slate-950 text-slate-200 p-4 rounded-lg font-mono text-[11px] space-y-2 border border-slate-800">
                  <div className="text-slate-400"># Start Python FastAPI backend:</div>
                  <div className="text-emerald-400">python3 -m uvicorn backend.main:app --port 8000</div>
                  <div className="text-slate-400 pt-2"># Start Streamlit frontend:</div>
                  <div className="text-emerald-400">streamlit run frontend/app.py --server.port 8501</div>
                  <div className="text-slate-400 pt-2"># Run the pytest test suite:</div>
                  <div className="text-emerald-400">python3 -m pytest tests/</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowPythonHub(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-amber-600 text-white font-semibold text-xs"
              >
                Close Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: LEGAL DISCLAIMER */}
      {/* ==================================================== */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Legal Notice & Regulatory Disclaimer
                </h3>
                <span className="text-xs text-slate-500">LegalEase AI Enterprise purviews</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              LegalEase AI provides automated document drafting and legal information synthesis.
              LegalEase AI does NOT provide formal legal representation, attorney services, or formal legal advice.
            </p>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Contractual enforceability and statutory requirements vary across governing jurisdictions.
              Users are advised to have any generated instrument reviewed by licensed legal counsel prior to formal execution.
            </p>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowDisclaimer(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-amber-600 text-white font-semibold text-xs"
              >
                Understood & Acknowledged
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-lg safe-area-pb">
        <button
          onClick={() => { setActiveNav('dashboard'); setMobileMenuOpen(false); }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-medium transition-colors ${
            activeNav === 'dashboard'
              ? 'text-slate-900 dark:text-amber-500 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => { setActiveNav('create'); setMobileMenuOpen(false); }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-medium transition-colors relative ${
            activeNav === 'create'
              ? 'text-slate-900 dark:text-amber-500 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Edit3 className="w-5 h-5 mb-0.5" />
          <span>Wizard</span>
          <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-slate-900 dark:bg-amber-600 text-white text-[9px] font-bold flex items-center justify-center">
            {wizardStep}
          </span>
        </button>

        <button
          onClick={() => {
            handleStartNewBlankDocument();
            setMobileMenuOpen(false);
          }}
          className="flex flex-col items-center justify-center -mt-5 bg-slate-900 dark:bg-amber-600 text-white w-12 h-12 rounded-full shadow-lg border-2 border-white dark:border-slate-900 hover:scale-105 active:scale-95 transition-transform"
          aria-label="Create Document"
          title="Create Document"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button
          onClick={() => { setActiveNav('documents'); setMobileMenuOpen(false); }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-medium transition-colors relative ${
            activeNav === 'documents'
              ? 'text-slate-900 dark:text-amber-500 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <FolderOpen className="w-5 h-5 mb-0.5" />
          <span>Library</span>
          {documents.length > 0 && (
            <span className="absolute top-0 right-2 px-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] font-mono font-bold">
              {documents.length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveNav('templates'); setMobileMenuOpen(false); }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-medium transition-colors ${
            activeNav === 'templates'
              ? 'text-slate-900 dark:text-amber-500 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <LayoutTemplate className="w-5 h-5 mb-0.5" />
          <span>Templates</span>
        </button>
      </nav>

      {/* FLOATING CHATBOT (Bottom Right, powered by Gemini 3.8 Flash) */}
      <FloatingChatbot
        currentDoc={editableDoc || currentDoc}
        onInsertTerm={handleInsertTermFromChat}
      />
    </div>
  );
}
