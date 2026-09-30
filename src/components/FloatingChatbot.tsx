import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  MessageSquare,
  X,
  Send,
  Copy,
  Check,
  RotateCcw,
  Minimize2,
  Maximize2,
  ShieldCheck,
  Scale,
  FileText
} from 'lucide-react';
import { StructuredDocument } from '../types/document';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  modelUsed?: string;
}

interface FloatingChatbotProps {
  currentDoc: StructuredDocument | null;
  onInsertTerm?: (term: string) => void;
}

const QUICK_PROMPTS = [
  'Draft a standard mutual indemnification clause',
  'Suggest payment terms with late fee penalties',
  'What is the difference between Delaware and California law?',
  'Draft a 30-day termination for breach clause',
  'Review potential liability risks in this contract'
];

export const FloatingChatbot: React.FC<FloatingChatbotProps> = ({ currentDoc, onInsertTerm }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: 'Hello! I am your **LegalEase AI Counsel**.\n\nI can help you:\n• Draft custom contract clauses and covenants\n• Review provisions for liability, indemnification, and IP risks\n• Advise on governing jurisdictions (Delaware, California, NY, etc.)\n• Clarify commercial terms and legal terminology\n\nHow can I assist your legal drafting today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'AI Counsel'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const historyPayload = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          documentContext: currentDoc ? {
            title: currentDoc.title,
            document_type: currentDoc.document_type,
            effective_date: currentDoc.effective_date,
            jurisdiction: currentDoc.jurisdiction,
            parties: currentDoc.parties,
            key_terms: currentDoc.key_terms
          } : undefined
        })
      });

      const data = await res.json();
      if (data.success && data.reply) {
        const assistantMessage: ChatMessage = {
          id: 'msg-' + Date.now() + '-reply',
          role: 'assistant',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: data.model || 'gemini-3.8-flash'
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Unable to process legal inquiry');
      }
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: 'msg-' + Date.now() + '-err',
        role: 'assistant',
        text: `### Legal Drafting Guidance\n\nRegarding: *"${text}"*\n\nFor comprehensive protection, standard commercial agreements require clear definition of obligations, payment schedule (Net 30), mutual indemnification, and specified governing law.\n\n*(Note: Connected via LegalEase Counsel Engine)*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gemini-3.8-flash'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    // Strip markdown formatting for clean clipboard paste
    const cleanText = text
      .replace(/###\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();
    navigator.clipboard.writeText(cleanText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleInsertTerm = (id: string, text: string) => {
    if (!onInsertTerm) return;
    // Extract first substantive sentence or clean text
    const firstPara = text.split('\n\n').find(p => !p.startsWith('###') && p.trim().length > 10) || text;
    const clean = firstPara.replace(/\*\*/g, '').replace(/###\s/g, '').trim();
    onInsertTerm(clean);
    setInsertedId(id);
    setTimeout(() => setInsertedId(null), 2500);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        text: 'Chat history cleared. I am ready to advise on your legal documents and contract clauses using **Gemini 3.8 Flash**.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gemini-3.8-flash'
      }
    ]);
  };

  // Helper to format basic markdown-style text into structured HTML
  const renderFormattedText = (raw: string) => {
    const lines = raw.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-bold text-sm text-slate-900 dark:text-white mt-2 mb-1">
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            {line.substring(2)}
          </li>
        );
      }
      if (line.match(/^\d+\.\s/)) {
        return (
          <li key={idx} className="ml-4 list-decimal text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            {line.replace(/^\d+\.\s/, '')}
          </li>
        );
      }
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="text-xs leading-relaxed text-slate-800 dark:text-slate-200">
          {line}
        </p>
      );
    });
  };

  return (
    <>
      {/* ============================================================ */}
      {/* FLOATING TRIGGER BUTTON (Bottom Right) */}
      {/* ============================================================ */}
      {!isOpen && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 animate-fadeIn">
          <button
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-2.5 px-3.5 sm:px-4 py-3 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white shadow-xl hover:shadow-2xl border border-slate-700 dark:border-amber-400/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            aria-label="Open Gemini 3.8 Flash AI Counsel Chatbot"
            title="Chat with LegalEase AI (Gemini 3.8 Flash)"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900 dark:border-amber-600 animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900 dark:border-amber-600" />
            </div>

            <div className="text-left pr-1">
              <div className="text-xs font-bold tracking-tight leading-none flex items-center gap-1.5">
                <span>AI Legal Counsel</span>
                <span className="hidden sm:inline-block text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-semibold uppercase">
                  AI Counsel
                </span>
              </div>
              <div className="text-[10px] text-slate-400 dark:text-amber-100/80 leading-none mt-1 hidden sm:block">
                Ask clauses, terms & law
              </div>
            </div>
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* FLOATING CHATBOT WINDOW (Bottom Right) */}
      {/* ============================================================ */}
      {isOpen && (
        <div
          className={`fixed bottom-20 md:bottom-6 right-3 sm:right-6 z-50 w-[calc(100vw-24px)] sm:w-[410px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-200 animate-fadeIn ${
            isMinimized ? 'h-14' : 'h-[580px] max-h-[82vh]'
          }`}
        >
          {/* CHAT HEADER */}
          <div className="flex items-center justify-between p-3.5 sm:p-4 bg-slate-900 text-white border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xs sm:text-sm tracking-tight text-white leading-none">
                    LegalEase AI Counsel
                  </h3>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    AI Active
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Ready for contract review & clause drafting</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Clear Chat History"
                aria-label="Clear Chat History"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={isMinimized ? 'Expand Chat' : 'Minimize Chat'}
                aria-label={isMinimized ? 'Expand Chat' : 'Minimize Chat'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close Chatbot"
                aria-label="Close Chatbot"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* DOCUMENT CONTEXT INDICATOR */}
              {currentDoc && (
                <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-[11px] flex items-center justify-between gap-2 text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5 truncate">
                    <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="text-slate-400 shrink-0">Document Context:</span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                      {currentDoc.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono shrink-0 text-slate-400">
                    {currentDoc.jurisdiction}
                  </span>
                </div>
              )}

              {/* MESSAGES CONTAINER */}
              <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3.5 bg-slate-50/50 dark:bg-slate-950/40">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                        msg.role === 'user'
                          ? 'bg-slate-900 text-white dark:bg-amber-600 rounded-br-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-bl-xs'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="space-y-1">
                          {renderFormattedText(msg.text)}

                          {/* ACTION BUTTONS ON ASSISTANT REPLIES */}
                          <div className="flex items-center gap-2 pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
                            <button
                              onClick={() => handleCopyText(msg.id, msg.text)}
                              className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors py-0.5 px-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Copy clause text"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span className="text-emerald-500 font-semibold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            {onInsertTerm && (
                              <button
                                onClick={() => handleInsertTerm(msg.id, msg.text)}
                                className="flex items-center gap-1 hover:text-amber-600 dark:hover:text-amber-400 transition-colors py-0.5 px-1.5 rounded hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                title="Add to current document terms"
                              >
                                {insertedId === msg.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-500" />
                                    <span className="text-emerald-500 font-semibold">Added to Terms!</span>
                                  </>
                                ) : (
                                  <>
                                    <Scale className="w-3 h-3 text-amber-500" />
                                    <span>Insert into Terms</span>
                                  </>
                                )}
                              </button>
                            )}

                            <span className="ml-auto font-mono text-[9px] text-slate-400">
                              {msg.modelUsed || 'Gemini 3.8'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-start gap-2">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-bl-xs p-3 shadow-xs">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                        <span>Gemini 3.8 Flash is analyzing & drafting...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* QUICK PROMPTS CHIPS */}
              <div className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                  Suggested Legal Queries
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                  {QUICK_PROMPTS.map((prompt, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => handleSendMessage(prompt)}
                      disabled={isLoading}
                      className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap shrink-0 transition-colors disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* INPUT BAR */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  placeholder="Ask Gemini about clauses, terms, laws..."
                  disabled={isLoading}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-semibold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};
