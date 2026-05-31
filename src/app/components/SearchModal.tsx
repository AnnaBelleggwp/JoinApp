import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Search } from "lucide-react";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  placeholder?: string;
}

export default function SearchModal({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  placeholder = "Поиск событий...",
}: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Небольшая задержка чтобы анимация успела завершиться
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-0 right-0 z-50 p-4"
          >
            <div className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-[#c6c6c8]/30">
                <div className="flex items-center gap-3">
                  <Search className="w-5 h-5 text-[#34C759]" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 text-[17px] text-black placeholder:text-[#3c3c43]/40 outline-none bg-transparent"
                  />
                  <button
                    onClick={onClose}
                    className="p-1 hover:bg-[#f2f2f7] rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-[#3c3c43]/60" />
                  </button>
                </div>
              </div>

              {/* Info */}
              {searchQuery.length === 0 && (
                <div className="p-4 text-center">
                  <p className="text-[15px] text-[#3c3c43]/60">
                    {placeholder === "Поиск событий..."
                      ? "Введите название события для поиска"
                      : "Введите название события или имя пользователя"}
                  </p>
                </div>
              )}

              {searchQuery.length > 0 && (
                <div className="p-4">
                  <p className="text-[13px] text-[#3c3c43]/60">
                    Поиск: "{searchQuery}"
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
