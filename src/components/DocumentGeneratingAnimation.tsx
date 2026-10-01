import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Scale,
  Shield,
  FileCheck2,
  CheckCircle2,
  Layers,
  Cpu,
  Feather
} from 'lucide-react';
import { DocumentWizardData } from '../types/document';

interface DocumentGeneratingAnimationProps {
  progress: number;
  wizardData: DocumentWizardData;
}

const GENERATION_STAGES = [
  {
    step: 1,
    title: 'Analyzing Parties & Jurisdiction Standing',
    desc: 'Verifying statutory legal standards and organizational authority',
    icon: Scale
  },
  {
    step: 2,
    title: 'Constructing Preambles & Formal Recitals',
    desc: 'Synthesizing valid legal consideration and background covenants',
    icon: Feather
  },
  {
    step: 3,
    title: 'Drafting Commercial Terms & Key Obligations',
    desc: 'Structuring performance benchmarks, deliverables & payment duties',
    icon: Layers
  },
  {
    step: 4,
    title: 'Calibrating Indemnity & Risk Allocation',
    desc: 'Enforcing mutual indemnification, confidentiality & liability caps',
    icon: Shield
  },
  {
    step: 5,
    title: 'Assembling Dual Execution & Signature Blocks',
    desc: 'Preparing authorized signatory blocks and attestation dates',
    icon: FileCheck2
  }
];

const LEGAL_CLAUSES_FEED = [
  '• Clause: Mutual Confidentiality & Non-Disclosure (3-Year Survival)',
  '• Clause: Statutory Governing Law & Venue Submission',
  '• Clause: Limitation of Consequential Damages & Liability Cap',
  '• Clause: Severability of Invalid Provisions & Integration',
  '• Clause: Notice Delivery & Material Breach Remedies',
  '• Clause: Independent Contractor Standing & No Partnership'
];

export const DocumentGeneratingAnimation: React.FC<DocumentGeneratingAnimationProps> = ({
  progress,
  wizardData
}) => {
  const [activeClauseIdx, setActiveClauseIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveClauseIdx((prev) => (prev + 1) % LEGAL_CLAUSES_FEED.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // Determine active stage based on progress
  const currentStageIdx = Math.min(
    Math.floor((progress / 100) * GENERATION_STAGES.length),
    GENERATION_STAGES.length - 1
  );

  return (
    <div className="w-full max-w-2xl mx-auto p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 animate-fadeIn">
      {/* Top Banner with pulsing insignia */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Scale className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Legal Document Synthesis Engine</span>
              <span className="text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                AI Active
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drafting a binding {wizardData.document_type || 'agreement'} for {wizardData.parties?.[0]?.name || 'Party A'} & {wizardData.parties?.[1]?.name || 'Party B'}
            </p>
          </div>
        </div>

        <div className="text-right font-mono">
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{progress}%</span>
          <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-sans font-medium">Completed</span>
        </div>
      </div>

      {/* Progress Bar with animated gradient */}
      <div className="space-y-2">
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-500 transition-all duration-300 shadow-sm relative overflow-hidden"
            style={{ width: `${Math.max(progress, 6)}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-0.5">
          <span className="flex items-center gap-1.5 font-medium">
            <Cpu className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            <span>{GENERATION_STAGES[currentStageIdx].title}...</span>
          </span>
          <span className="font-mono text-slate-400">Jurisdiction: {wizardData.jurisdiction || 'Delaware'}</span>
        </div>
      </div>

      {/* Stage Checklist */}
      <div className="grid grid-cols-1 gap-2.5 pt-1">
        {GENERATION_STAGES.map((stage, idx) => {
          const isDone = idx < currentStageIdx;
          const isCurrent = idx === currentStageIdx;
          const Icon = stage.icon;

          return (
            <div
              key={stage.step}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-xs ${
                isDone
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300'
                  : isCurrent
                  ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/60 text-slate-900 dark:text-white shadow-sm ring-1 ring-amber-400/20'
                  : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800/80 text-slate-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  isDone
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{stage.title}</div>
                <div
                  className={`text-[11px] truncate ${
                    isCurrent
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {stage.desc}
                </div>
              </div>

              {isCurrent && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 animate-pulse">
                  Drafting
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Live Legal Formulation Terminal stream */}
      <div className="p-3 rounded-xl bg-slate-950 text-slate-300 text-[11px] font-mono flex items-center justify-between border border-slate-800">
        <div className="flex items-center gap-2 overflow-hidden">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate text-slate-400">
            Formulating: <span className="text-amber-300">{LEGAL_CLAUSES_FEED[activeClauseIdx]}</span>
          </span>
        </div>
        <span className="text-slate-500 text-[10px] shrink-0 ml-2">Enforceability check OK</span>
      </div>
    </div>
  );
};
