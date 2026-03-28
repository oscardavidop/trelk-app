
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { modalVariants, overlayVariants, MOTION } from '../design';

// -- Confirm Modal Premium --
export function ConfirmModal({
    title,
    message,
    confirmLabel,
    confirmColor,
    onConfirm,
    onCancel,
}: {
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor?: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const { t } = useTranslation();
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onCancel();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onCancel]);

    const modalContent = (
        <motion.div
            variants={overlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md px-5"
        >
            <motion.div
                ref={modalRef}
                variants={modalVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="relative bg-tg-secondary/95 backdrop-blur-xl border border-tg-border/30 rounded-[24px] p-6 max-w-[400px] w-full shadow-[0_12px_40px_rgba(0,0,0,0.3)] flex flex-col max-h-[80vh] overflow-hidden"
            >
                {/* Top shine */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <h3 className="text-[20px] font-bold text-tg-text mb-3 flex-shrink-0 leading-tight">
                    {title}
                </h3>

                <div className="overflow-y-auto mb-6 pr-2 custom-scrollbar">
                    <p className="text-[14px] font-medium text-tg-hint leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className="flex gap-3 mt-auto flex-shrink-0">
                    <motion.button
                        whileTap={MOTION.tap}
                        onClick={onCancel}
                        className="flex-1 py-3.5 rounded-[16px] bg-tg-surface text-tg-text text-[15px] font-semibold transition-colors"
                    >
                        {t('common:cancel', 'Cancel')}
                    </motion.button>
                    <motion.button
                        whileTap={MOTION.tap}
                        onClick={onConfirm}
                        className="flex-1 py-3.5 rounded-[16px] text-white text-[15px] font-bold shadow-sm"
                        style={{ background: confirmColor || 'var(--tg-accent)' }}
                    >
                        {confirmLabel}
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );

    return createPortal(modalContent, document.body);
}