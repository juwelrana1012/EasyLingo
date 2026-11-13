import React from 'react';

interface LogoProps {
  showTagline?: boolean;
  taglineText?: string;
}

export const PROFILE_AVATAR_SRC =
  '/assets/aistudio/file_00000000f83c8211a0735acd33bdd7a8_5d6fa9b0.png';

export function Logo({ showTagline = false, taglineText = 'Learn • Translate • Grow' }: LogoProps) {
  return (
    <div className="flex items-center gap-2.5 shrink-0 select-none">
      <div
        className="h-10 w-10 rounded-full overflow-hidden shrink-0 shadow-sm"
        aria-hidden="true"
      >
        <img
          src={PROFILE_AVATAR_SRC}
          alt="EasyLingo"
          className="w-full h-full object-cover object-center scale-[1.03]"
        />
      </div>
      <div className="flex flex-col leading-none text-left">
        <span className="text-lg font-extrabold tracking-tight lb-text whitespace-nowrap">
          Easy<span style={{ color: 'var(--lb-primary)' }}>Lingo</span>
        </span>
        {showTagline && (
          <span className="text-[11px] font-medium lb-muted mt-0.5 whitespace-nowrap">
            {taglineText}
          </span>
        )}
      </div>
    </div>
  );
}
