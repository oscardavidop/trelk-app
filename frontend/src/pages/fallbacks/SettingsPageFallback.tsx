
export default function SettingsPageFallback() {
  return (
    <div 
      className="pb-28 relative max-w-[480px] mx-auto w-full animate-pulse" 
      aria-hidden="true"
    >
      {/* 1. Fake StickyHeader */}
      <div className="pt-6 pb-4 px-5 flex items-center gap-4 mb-2">
        <div className="w-[42px] h-[42px] rounded-[14px] bg-tg-text/10 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-5 w-1/2 bg-tg-text/15 rounded-md" />
          <div className="h-4 w-3/4 bg-tg-text/10 rounded-md" />
        </div>
      </div>

      {/* 2. Fake Section 1 (ej: Language) - 2 rows */}
      <div className="mt-4 px-5">
        {/* Section Title */}
        <div className="h-3 w-24 bg-tg-text/15 rounded-md mb-3 ml-1" />
        {/* Settings Box */}
        <div className="bg-tg-secondary/50 rounded-[20px] border border-tg-border/20 overflow-hidden flex flex-col">
          <div className="h-14 border-b border-tg-border/10 flex items-center justify-between px-4">
            <div className="h-4 w-1/2 bg-tg-text/10 rounded-md" />
            <div className="h-6 w-10 bg-tg-text/10 rounded-full" /> {/* Fake Toggle */}
          </div>
          <div className="h-14 flex items-center justify-between px-4">
            <div className="h-4 w-1/3 bg-tg-text/10 rounded-md" />
            <div className="h-4 w-4 bg-tg-text/10 rounded-full" /> {/* Fake Chevron/Arrow */}
          </div>
        </div>
      </div>

      {/* 3. Fake Section 2 (ej: Response Preferences) - 3 rows */}
      <div className="mt-8 px-5">
        <div className="h-3 w-40 bg-tg-text/15 rounded-md mb-3 ml-1" />
        <div className="bg-tg-secondary/50 rounded-[20px] border border-tg-border/20 overflow-hidden flex flex-col">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-14 flex items-center justify-between px-4 ${i !== 3 ? 'border-b border-tg-border/10' : ''}`}>
              <div className="h-4 w-2/5 bg-tg-text/10 rounded-md" />
              <div className="h-6 w-10 bg-tg-text/10 rounded-full" /> {/* Fake Toggle */}
            </div>
          ))}
        </div>
        {/* Fake Help Text */}
        <div className="mt-3 ml-2 space-y-1.5">
          <div className="h-3 w-[90%] bg-tg-text/10 rounded-md" />
          <div className="h-3 w-[60%] bg-tg-text/10 rounded-md" />
        </div>
      </div>

      {/* 4. Fake Section 3 (ej: Date and Time) - 3 rows */}
      <div className="mt-6 px-5">
        <div className="h-3 w-32 bg-tg-text/15 rounded-md mb-3 ml-1" />
        <div className="bg-tg-secondary/50 rounded-[20px] border border-tg-border/20 overflow-hidden flex flex-col">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-14 flex items-center justify-between px-4 ${i !== 3 ? 'border-b border-tg-border/10' : ''}`}>
              <div className="h-4 w-1/3 bg-tg-text/10 rounded-md" />
              <div className="h-4 w-1/4 bg-tg-text/10 rounded-md" /> {/* Fake Dropdown Value */}
            </div>
          ))}
        </div>
        <div className="mt-3 ml-2 h-3 w-[80%] bg-tg-text/10 rounded-md" />
      </div>

      {/* 5. Fake Section 4 (ej: Privacy) - cut off slightly to show scrolling */}
      <div className="mt-6 px-5 opacity-60">
        <div className="h-3 w-28 bg-tg-text/15 rounded-md mb-3 ml-1" />
        <div className="bg-tg-secondary/50 rounded-[20px] border border-tg-border/20 overflow-hidden flex flex-col">
          <div className="h-14 flex items-center justify-between px-4 border-b border-tg-border/10">
            <div className="h-4 w-1/2 bg-tg-text/10 rounded-md" />
            <div className="h-6 w-10 bg-tg-text/10 rounded-full" />
          </div>
          <div className="h-14 flex items-center justify-between px-4">
            <div className="h-4 w-2/5 bg-tg-text/10 rounded-md" />
            <div className="h-6 w-10 bg-tg-text/10 rounded-full" />
          </div>
        </div>
      </div>

    </div>
  );
}