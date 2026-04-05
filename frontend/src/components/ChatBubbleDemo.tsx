import { motion } from 'framer-motion';
import { Check, CheckCheck } from 'lucide-react';

interface ChatMessage {
  text: string;
  isBot?: boolean;
  delay?: number;
}

interface ChatBubbleDemoProps {
  messages: ChatMessage[];
  botName?: string;
}

/**
 * Animated chat simulation showing a user message and bot response.
 * Used in empty states to show example interactions.
 */
export default function ChatBubbleDemo({ messages, botName = 'TrelkBot' }: ChatBubbleDemoProps) {
  let cumulativeDelay = 0;

  return (
    <div className="w-full max-w-[280px] mx-auto space-y-2">
      {messages.map((msg, i) => {
        const delay = cumulativeDelay + (msg.delay ?? (i === 0 ? 0.3 : 0.8));
        cumulativeDelay = delay + 0.3;

        if (msg.isBot) {
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay, duration: 0.35, ease: 'easeOut' }}
              className="flex items-end gap-2"
            >
              {/* Bot avatar */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: delay - 0.15, type: 'spring', stiffness: 500, damping: 25 }}
                className="w-7 h-7 rounded-full bg-tg-accent/15 border border-tg-accent/20 flex items-center justify-center flex-shrink-0"
              >
                <span className="text-[10px] font-extrabold text-tg-accent">T</span>
              </motion.div>
              <div className="flex flex-col max-w-[85%]">
                <span className="text-[10px] font-bold text-tg-accent/60 pl-1 mb-0.5">{botName}</span>
                <div className="bg-tg-secondary/80 border border-tg-border/25 rounded-[14px] rounded-bl-[4px] px-3.5 py-2.5 shadow-sm">
                  <p className="text-[13px] text-tg-text leading-relaxed">{msg.text}</p>
                </div>
              </div>
            </motion.div>
          );
        }

        // User message
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 16, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay, duration: 0.35, ease: 'easeOut' }}
            className="flex justify-end"
          >
            <div className="bg-tg-accent rounded-[14px] rounded-br-[4px] px-3.5 py-2.5 max-w-[85%] shadow-sm">
              <p className="text-[13px] text-white font-medium leading-relaxed">{msg.text}</p>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <span className="text-[10px] text-white/50">
                  {new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: delay + 0.4 }}
                >
                  <CheckCheck size={12} className="text-white/60" />
                </motion.div>
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Typing indicator for last bot message */}
      {messages.length > 0 && messages[messages.length - 1].isBot && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: cumulativeDelay - 0.5, duration: 0.2 }}
          className="flex items-end gap-2"
        >
          <div className="w-7 h-7 rounded-full bg-tg-accent/15 border border-tg-accent/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-extrabold text-tg-accent">T</span>
          </div>
          <div className="bg-tg-secondary/60 border border-tg-border/20 rounded-[14px] rounded-bl-[4px] px-4 py-3">
            <div className="flex gap-1">
              {[0, 1, 2].map((dot) => (
                <motion.div
                  key={dot}
                  className="w-[6px] h-[6px] rounded-full bg-tg-hint/40"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.2 }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
