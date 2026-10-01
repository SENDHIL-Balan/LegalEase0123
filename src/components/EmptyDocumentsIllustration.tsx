import React from 'react';

interface EmptyDocumentsIllustrationProps {
  className?: string;
}

export const EmptyDocumentsIllustration: React.FC<EmptyDocumentsIllustrationProps> = ({
  className = 'w-64 h-auto'
}) => {
  return (
    <div className={`relative flex items-center justify-center mx-auto select-none ${className}`}>
      <img
        src="/src/assets/empty-documents.svg"
        alt="Legal documents archive illustration"
        className="w-full h-auto max-w-[280px] drop-shadow-sm transition-transform duration-500 hover:scale-[1.02]"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
