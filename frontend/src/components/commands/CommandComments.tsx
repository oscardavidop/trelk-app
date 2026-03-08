import { MessageCircle, ThumbsUp, Clock } from 'lucide-react';
import type { CommandComment } from '../../data/commandMocks';

interface Props {
  comments: CommandComment[];
}

export default function CommandComments({ comments }: Props) {
  if (!comments.length) return null;

  return (
    <section className="px-5 mt-5">
      <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
        <MessageCircle size={13} /> Comentarios ({comments.length})
      </h2>
      <div className="bg-tg-secondary rounded-[16px] border border-tg-border/20 overflow-hidden divide-y divide-tg-border/10">
        {comments.map((c) => (
          <div key={c.id} className="p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-tg-accent/15 flex items-center justify-center text-[11px] font-bold text-tg-accent">
                  {c.user[0]}
                </div>
                <span className="text-[13px] font-bold text-tg-text">{c.user}</span>
              </div>
              <div className="flex items-center gap-1 text-tg-hint">
                <Clock size={10} />
                <span className="text-[10px]">{c.date}</span>
              </div>
            </div>
            <p className="text-[12px] text-tg-hint leading-relaxed">{c.text}</p>
            <button className="mt-2 flex items-center gap-1 text-[11px] text-tg-hint/60 active:text-tg-accent transition-colors">
              <ThumbsUp size={11} />
              <span>{c.likes}</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
