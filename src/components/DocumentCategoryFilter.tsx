import React from 'react';
import {
  FileText,
  Briefcase,
  Layers,
  Building2,
  ShieldCheck,
  Filter,
  X,
  Sparkles
} from 'lucide-react';
import { StructuredDocument } from '../types/document';

export type DocumentCategory = 'all' | 'contract' | 'agreement' | 'employment' | 'corporate' | 'ip';

export interface CategoryOption {
  id: DocumentCategory;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: {
    badgeBg: string;
    badgeText: string;
    activeBg: string;
    activeText: string;
  };
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: 'all',
    label: 'All Documents',
    description: 'Every legal instrument in your library',
    icon: Layers,
    color: {
      badgeBg: 'bg-slate-100 dark:bg-slate-800',
      badgeText: 'text-slate-700 dark:text-slate-300',
      activeBg: 'bg-slate-900 dark:bg-amber-600',
      activeText: 'text-white'
    }
  },
  {
    id: 'contract',
    label: 'Contract',
    description: 'Independent contractor, vendor, and service contracts',
    icon: FileText,
    color: {
      badgeBg: 'bg-blue-50 dark:bg-blue-950/60',
      badgeText: 'text-blue-700 dark:text-blue-300',
      activeBg: 'bg-blue-600 dark:bg-blue-600',
      activeText: 'text-white'
    }
  },
  {
    id: 'agreement',
    label: 'Agreement',
    description: 'NDAs, partnerships, consulting, and covenants',
    icon: ShieldCheck,
    color: {
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
      activeBg: 'bg-emerald-600 dark:bg-emerald-600',
      activeText: 'text-white'
    }
  },
  {
    id: 'employment',
    label: 'Employment',
    description: 'Offers, contractor terms, hiring, and severance',
    icon: Briefcase,
    color: {
      badgeBg: 'bg-purple-50 dark:bg-purple-950/60',
      badgeText: 'text-purple-700 dark:text-purple-300',
      activeBg: 'bg-purple-600 dark:bg-purple-600',
      activeText: 'text-white'
    }
  },
  {
    id: 'corporate',
    label: 'Corporate',
    description: 'Operating agreements, bylaws, resolutions & governance',
    icon: Building2,
    color: {
      badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
      badgeText: 'text-amber-800 dark:text-amber-300',
      activeBg: 'bg-amber-600 dark:bg-amber-600',
      activeText: 'text-white'
    }
  },
  {
    id: 'ip',
    label: 'Intellectual Property',
    description: 'Proprietary rights, licensing & assignments',
    icon: Sparkles,
    color: {
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60',
      badgeText: 'text-indigo-700 dark:text-indigo-300',
      activeBg: 'bg-indigo-600 dark:bg-indigo-600',
      activeText: 'text-white'
    }
  }
];

/**
 * Categorizes a document based on its type and title.
 */
export function getDocumentCategory(doc: StructuredDocument): DocumentCategory {
  const text = `${doc.document_type || ''} ${doc.title || ''}`.toLowerCase();

  // Employment matches
  if (
    text.includes('employment') ||
    text.includes('contractor') ||
    text.includes('offer letter') ||
    text.includes('severance') ||
    text.includes('internship') ||
    text.includes('non-compete') ||
    text.includes('non-solicitation') ||
    text.includes('employee')
  ) {
    return 'employment';
  }

  // Corporate & Governance matches
  if (
    text.includes('operating') ||
    text.includes('bylaw') ||
    text.includes('shareholder') ||
    text.includes('resolution') ||
    text.includes('incorporation') ||
    text.includes('governance') ||
    text.includes('partnership')
  ) {
    return 'corporate';
  }

  // Intellectual Property matches
  if (
    text.includes('license') ||
    text.includes('licensing') ||
    text.includes('intellectual property') ||
    text.includes('ip assignment') ||
    text.includes('proprietary') ||
    text.includes('trademark') ||
    text.includes('patent') ||
    text.includes('software')
  ) {
    return 'ip';
  }

  // Contract matches
  if (text.includes('contract') || text.includes('procurement') || text.includes('vendor')) {
    return 'contract';
  }

  // Agreement matches
  if (
    text.includes('agreement') ||
    text.includes('nda') ||
    text.includes('non-disclosure') ||
    text.includes('consulting') ||
    text.includes('memorandum') ||
    text.includes('mou') ||
    text.includes('confidentiality') ||
    text.includes('settlement')
  ) {
    return 'agreement';
  }

  return 'contract';
}

interface DocumentCategoryFilterProps {
  selectedCategory: DocumentCategory;
  onSelectCategory: (category: DocumentCategory) => void;
  documents: StructuredDocument[];
}

export const DocumentCategoryFilter: React.FC<DocumentCategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  documents
}) => {
  // Compute count of documents for each category
  const counts = React.useMemo(() => {
    const result: Record<DocumentCategory, number> = {
      all: documents.length,
      contract: 0,
      agreement: 0,
      employment: 0,
      corporate: 0,
      ip: 0
    };

    for (const doc of documents) {
      const cat = getDocumentCategory(doc);
      if (result[cat] !== undefined) {
        result[cat]++;
      }
    }
    return result;
  }, [documents]);

  const activeCategoryOption = CATEGORY_OPTIONS.find((c) => c.id === selectedCategory) || CATEGORY_OPTIONS[0];

  return (
    <div className="space-y-3">
      {/* Category Filter Chips / Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 pl-1 pr-2 shrink-0">
          <Filter className="w-3.5 h-3.5" />
          <span>Category:</span>
        </div>

        {CATEGORY_OPTIONS.map((opt) => {
          const isSelected = selectedCategory === opt.id;
          const count = counts[opt.id] || 0;
          const IconComponent = opt.icon;

          return (
            <button
              key={opt.id}
              onClick={() => onSelectCategory(opt.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-amber-600 dark:text-white shadow-sm ring-2 ring-slate-900/10 dark:ring-amber-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
              <span>{opt.label}</span>
              <span
                className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full font-semibold ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        {selectedCategory !== 'all' && (
          <button
            onClick={() => onSelectCategory('all')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Reset filter"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Filter status summary bar when a category is selected */}
      {selectedCategory !== 'all' && (
        <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Showing {counts[selectedCategory]} of {documents.length} documents
            </span>
            <span className="text-slate-400 dark:text-slate-600">·</span>
            <span className="text-slate-500 dark:text-slate-400">
              Filter: <strong className="text-slate-800 dark:text-slate-200">{activeCategoryOption.label}</strong>
            </span>
          </div>

          <button
            onClick={() => onSelectCategory('all')}
            className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
          >
            Show All
          </button>
        </div>
      )}
    </div>
  );
};
