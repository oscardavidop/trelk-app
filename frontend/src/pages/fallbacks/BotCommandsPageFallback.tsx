
export default function BotCommandsPageFallback() {
  return (
    <div 
      className="pb-28 relative max-w-[480px] mx-auto w-full animate-pulse" 
      aria-hidden="true"
    >
      {/* 1. Fake StickyHeader */}
      <div className="pt-6 pb-4 px-5 mb-2">
        <div className="h-7 w-1/3 bg-tg-text/15 rounded-md mb-2" />
        <div className="h-4 w-1/2 bg-tg-text/10 rounded-md" />
      </div>

      {/* 2. Fake Trending Section (Carrusel) */}
      <section className="px-5 mt-5">
        <div className="flex items-center mb-4 pl-1">
          <div className="h-4 w-24 bg-tg-text/15 rounded-md" />
        </div>
        
        <div className="flex gap-3 overflow-hidden -mx-5 pl-5 pr-5">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="flex-shrink-0 w-[140px] bg-tg-secondary/50 border border-tg-border/20 rounded-[20px] p-4 flex flex-col"
            >
              <div className="w-[42px] h-[42px] rounded-[14px] bg-tg-text/10 mb-3" />
              <div className="h-4 w-3/4 bg-tg-text/15 rounded-md mb-2" />
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-tg-text/10 rounded-md" />
                <div className="h-3 w-2/3 bg-tg-text/10 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Fake Popular Commands (Lista Vertical) */}
      <section className="px-5 mt-6">
        <div className="flex items-center mb-4 pl-1">
          <div className="h-4 w-32 bg-tg-text/15 rounded-md" />
        </div>
        
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="w-full h-[72px] bg-tg-secondary/50 border border-tg-border/20 rounded-[20px] p-3.5 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-tg-text/15 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-tg-text/15 rounded-md" />
                <div className="h-3 w-2/3 bg-tg-text/10 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Fake Categories (Grid 2x2) */}
      <section className="px-5 mt-8">
        <div className="flex items-center mb-4 pl-1">
          <div className="h-4 w-28 bg-tg-text/15 rounded-md" />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className="bg-tg-secondary/50 border border-tg-border/20 rounded-[20px] p-4 flex flex-col"
            >
              <div className="w-[42px] h-[42px] rounded-[14px] bg-tg-text/10 mb-3" />
              <div className="h-4 w-2/3 bg-tg-text/15 rounded-md mb-1.5" />
              <div className="h-3 w-1/2 bg-tg-text/10 rounded-md" />
            </div>
          ))}
        </div>
      </section>

      {/* 5. Fake View All Button */}
      <section className="px-5 mt-8 pb-4">
        <div className="w-full h-12 rounded-[20px] bg-tg-accent/5 border border-tg-accent/10" />
      </section>
      
    </div>
  );
}