import React from 'react';

interface RobotAvatarProps {
  className?: string;
  size?: number;
}

export const RobotAvatar: React.FC<RobotAvatarProps> = ({
  className = '',
  size = 64
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none overflow-visible ${className}`}
    >
      <defs>
        {/* Glow Filters */}
        <filter id="neonGlowOrange" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neonGlowCyan" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="avatarShadow" x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#0284c7" floodOpacity="0.35" />
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000000" floodOpacity="0.25" />
        </filter>

        {/* Gradients */}
        <linearGradient id="helmetGrad" x1="100" y1="10" x2="100" y2="135" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="25%" stopColor="#0284c7" />
          <stop offset="70%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </linearGradient>

        <linearGradient id="helmetHighlight" x1="100" y1="12" x2="100" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#bae6fd" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="headphoneGradL" x1="15" y1="40" x2="45" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>

        <linearGradient id="headphoneGradR" x1="155" y1="40" x2="185" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>

        <radialGradient id="faceScreenGrad" cx="100" cy="85" r="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="75%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>

        <radialGradient id="chinGlow" cx="100" cy="115" r="35" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ea580c" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#f97316" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="bodyGrad" x1="100" y1="135" x2="100" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="40%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
      </defs>

      <g filter="url(#avatarShadow)">
        {/* ================= BODY / TORSO ================= */}
        {/* Lower torso */}
        <ellipse cx="100" cy="162" rx="42" ry="28" fill="url(#bodyGrad)" stroke="#0284c7" strokeWidth="1.5" />

        {/* Arms / shoulders */}
        <ellipse cx="58" cy="165" rx="14" ry="20" fill="#0f172a" stroke="#0284c7" strokeWidth="1.2" />
        <ellipse cx="142" cy="165" rx="14" ry="20" fill="#0f172a" stroke="#0284c7" strokeWidth="1.2" />

        {/* Chest core ring (orange neon & cyan) */}
        <circle cx="100" cy="162" r="16" fill="#020617" stroke="#ea580c" strokeWidth="2" filter="url(#neonGlowOrange)" />
        <circle cx="100" cy="162" r="10" stroke="#06b6d4" strokeWidth="2" fill="#0f172a" filter="url(#neonGlowCyan)" />
        <circle cx="100" cy="162" r="4.5" fill="#38bdf8" />

        {/* Neck collar connector */}
        <path d="M82 135 Q100 142 118 135 L116 142 Q100 148 84 142 Z" fill="#0284c7" />

        {/* ================= HEADPHONES (BACK ARC) ================= */}
        <path
          d="M32 78 C32 30 58 10 100 10 C142 10 168 30 168 78"
          stroke="#0284c7"
          strokeWidth="11"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M36 78 C36 34 60 14 100 14 C140 14 164 34 164 78"
          stroke="#38bdf8"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />

        {/* ================= HELMET (DOME) ================= */}
        <path
          d="M38 78 C38 34 65 14 100 14 C135 14 162 34 162 78 C162 108 140 135 100 135 C60 135 38 108 38 78 Z"
          fill="url(#helmetGrad)"
        />

        {/* Dome Glass Highlight */}
        <ellipse cx="100" cy="30" rx="42" ry="14" fill="url(#helmetHighlight)" />

        {/* Helmet Rim Trim */}
        <path
          d="M44 80 C44 42 68 22 100 22 C132 22 156 42 156 80 C156 106 135 130 100 130 C65 130 44 106 44 80 Z"
          stroke="#38bdf8"
          strokeWidth="1.2"
          fill="none"
          opacity="0.6"
        />

        {/* ================= VISOR / FACE SCREEN ================= */}
        <rect
          x="48"
          y="44"
          width="104"
          height="76"
          rx="36"
          fill="url(#faceScreenGrad)"
          stroke="#0284c7"
          strokeWidth="2"
        />

        {/* Visor internal warm glow from smile / cheeks */}
        <ellipse cx="100" cy="100" rx="36" ry="18" fill="url(#chinGlow)" />

        {/* ================= EYES ================= */}
        {/* LEFT EYE */}
        <g>
          {/* Orange outer neon ring */}
          <circle cx="78" cy="74" r="19" stroke="#f97316" strokeWidth="3.2" fill="#0c1322" filter="url(#neonGlowOrange)" />
          {/* Cyan inner neon ring */}
          <circle cx="78" cy="74" r="12" stroke="#06b6d4" strokeWidth="3" fill="#020617" filter="url(#neonGlowCyan)" />
          {/* Specular eye highlight dot */}
          <circle cx="74" cy="69" r="3.2" fill="#ffffff" />
          <circle cx="81" cy="77" r="1.5" fill="#ffffff" opacity="0.8" />
        </g>

        {/* RIGHT EYE */}
        <g>
          {/* Orange outer neon ring */}
          <circle cx="122" cy="74" r="19" stroke="#f97316" strokeWidth="3.2" fill="#0c1322" filter="url(#neonGlowOrange)" />
          {/* Cyan inner neon ring */}
          <circle cx="122" cy="74" r="12" stroke="#06b6d4" strokeWidth="3" fill="#020617" filter="url(#neonGlowCyan)" />
          {/* Specular eye highlight dot */}
          <circle cx="118" cy="69" r="3.2" fill="#ffffff" />
          <circle cx="125" cy="77" r="1.5" fill="#ffffff" opacity="0.8" />
        </g>

        {/* ================= CUTE SMILE ================= */}
        <path
          d="M86 98 Q100 114 114 98 Q100 106 86 98 Z"
          fill="#ffffff"
          stroke="#fed7aa"
          strokeWidth="0.8"
        />

        {/* ================= HEADPHONE EAR CUPS (FRONT) ================= */}
        {/* Left Ear Cushion & Cup */}
        <g>
          <ellipse cx="28" cy="78" rx="13" ry="26" fill="url(#headphoneGradL)" stroke="#38bdf8" strokeWidth="1.5" />
          <ellipse cx="30" cy="78" rx="7" ry="19" fill="#0369a1" />
          <ellipse cx="30" cy="78" rx="3.5" ry="12" fill="#0284c7" />
          <path d="M22 62 Q24 78 22 94" stroke="#e0f2fe" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        </g>

        {/* Right Ear Cushion & Cup */}
        <g>
          <ellipse cx="172" cy="78" rx="13" ry="26" fill="url(#headphoneGradR)" stroke="#38bdf8" strokeWidth="1.5" />
          <ellipse cx="170" cy="78" rx="7" ry="19" fill="#0369a1" />
          <ellipse cx="170" cy="78" rx="3.5" ry="12" fill="#0284c7" />
          <path d="M178 62 Q176 78 178 94" stroke="#e0f2fe" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        </g>
      </g>
    </svg>
  );
};
