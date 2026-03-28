
export default function CommandsHubFallback() {
  return (
    <div 
      className="pb-24 relative max-w-[480px] mx-auto w-full animate-pulse" 
      aria-hidden="true"
    >
      {/* 1. Fake StickyHeader */}
      <div className="pt-6 pb-4 px-5 mb-2">
        <div className="h-7 w-1/3 bg-tg-text/15 rounded-md mb-2" />
        <div className="h-4 w-1/2 bg-tg-text/10 rounded-md" />
      </div>

      {/* 2. Fake Explore Bot Commands (Premium Banner) */}
      <section className="mt-4 px-5">
        <div className="w-full bg-tg-secondary/50 border border-tg-border/20 rounded-[24px] p-4 flex items-center gap-4">
          <div className="w-[52px] h-[52px] rounded-[16px] bg-tg-text/15 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-2/3 bg-tg-text/15 rounded-md" />
            <div className="h-4 w-1/2 bg-tg-text/10 rounded-md" />
          </div>
          <div className="w-8 h-8 rounded-full bg-tg-text/10 flex-shrink-0" />
        </div>
      </section>

      {/* 3. Fake Utilidades (Bento Grid) */}
      <section className="mt-5 px-5">
        <div className="grid grid-cols-2 gap-3">
          {/* Card 1 */}
          <div className="p-3.5 rounded-[20px] bg-tg-secondary/50 border border-tg-border/20 flex items-center gap-3">
            <div className="w-[42px] h-[42px] rounded-2xl bg-tg-text/15 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-full bg-tg-text/15 rounded-md" />
              <div className="h-3 w-2/3 bg-tg-text/10 rounded-md" />
            </div>
          </div>
          {/* Card 2 */}
          <div className="p-3.5 rounded-[20px] bg-tg-secondary/50 border border-tg-border/20 flex items-center gap-3">
            <div className="w-[42px] h-[42px] rounded-2xl bg-tg-text/15 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-full bg-tg-text/15 rounded-md" />
              <div className="h-3 w-2/3 bg-tg-text/10 rounded-md" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Fake Premium Commands (Carrusel Horizontal) */}
      <section className="mt-8">
        <div className="flex items-center justify-between px-6 mb-3">
          <div className="h-3 w-32 bg-tg-text/15 rounded-md" />
          <div className="h-3 w-16 bg-tg-text/10 rounded-md" />
        </div>
        
        {/* Horizontal Scroll Area Fake */}
        <div className="flex gap-3 overflow-hidden px-5 pb-4">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="flex-shrink-0 w-[160px] bg-tg-secondary/50 border border-tg-border/20 p-4 rounded-[20px] flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-[42px] h-[42px] rounded-[12px] bg-tg-text/15" />
                <div className="w-10 h-4 rounded-full bg-tg-text/10" /> {/* Fake Badge */}
              </div>
              <div className="h-4 w-3/4 bg-tg-text/15 rounded-md mb-2" />
              <div className="h-3 w-full bg-tg-text/10 rounded-md mb-1" />
              <div className="h-3 w-1/2 bg-tg-text/10 rounded-md" />
            </div>
          ))}
        </div>
      </section>

      {/* 5. Fake Custom Commands (Lista Estilo iOS) */}
      <section className="mt-6 px-5 pb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-28 bg-tg-text/15 rounded-md" />
          <div className="h-3 w-16 bg-tg-text/10 rounded-md" />
        </div>

        <div className="rounded-[20px] bg-tg-secondary/50 border border-tg-border/20 overflow-hidden">
          <div className="flex flex-col">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className={`w-full flex items-center gap-3.5 p-3.5 ${i !== 4 ? 'border-b border-tg-border/10' : ''}`}
              >
                <div className="w-[34px] h-[34px] rounded-[10px] bg-tg-text/15 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-1/3 bg-tg-text/15 rounded-md" />
                  <div className="h-3 w-1/4 bg-tg-text/10 rounded-md" />
                </div>
                <div className="w-4 h-4 rounded bg-tg-text/10 flex-shrink-0" /> {/* Fake Chevron */}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}