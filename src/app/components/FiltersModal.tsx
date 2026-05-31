import { motion } from "motion/react";
import { X } from "lucide-react";

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  attendeesFilter: string;
  setAttendeesFilter: (filter: string) => void;
  onApply: () => void;
  onReset: () => void;
}

export default function FiltersModal({
  isOpen,
  onClose,
  selectedCategory,
  setSelectedCategory,
  dateFilter,
  setDateFilter,
  attendeesFilter,
  setAttendeesFilter,
  onApply,
  onReset,
}: FiltersModalProps) {
  if (!isOpen) return null;

  const categories = ["Все", "Бизнес", "IT", "Знакомства", "Развлечения"];
  const dateOptions = ["Все даты", "Сегодня", "На этой неделе", "В этом месяце"];
  const attendeesOptions = ["Любое количество", "Менее 15", "15-25", "Более 25"];

  return (
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
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto"
      >
        <div className="bg-white/95 backdrop-blur-2xl rounded-t-[32px] shadow-[0_-8px_32px_rgba(0,0,0,0.12)] border-t border-white/20">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
            <h2 className="text-[22px] font-bold text-black">Фильтры</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-[#3c3c43]" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Категория */}
            <div>
              <label className="text-[13px] font-semibold text-[#3c3c43]/60 uppercase tracking-wide mb-3 block">
                Категория
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-[15px] font-medium transition-all ${
                      selectedCategory === cat
                        ? "bg-[#34C759] text-white shadow-lg shadow-[#34C759]/30"
                        : "bg-white/80 backdrop-blur-xl text-[#3c3c43] border border-black/10"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Дата */}
            <div>
              <label className="text-[13px] font-semibold text-[#3c3c43]/60 uppercase tracking-wide mb-3 block">
                Дата
              </label>
              <div className="space-y-2">
                {dateOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setDateFilter(option)}
                    className={`w-full px-4 py-3 rounded-2xl text-[17px] text-left transition-all ${
                      dateFilter === option
                        ? "bg-[#34C759]/10 text-[#34C759] font-semibold border border-[#34C759]/20"
                        : "bg-white/80 backdrop-blur-xl text-black border border-black/5"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Количество участников */}
            <div>
              <label className="text-[13px] font-semibold text-[#3c3c43]/60 uppercase tracking-wide mb-3 block">
                Количество участников
              </label>
              <div className="space-y-2">
                {attendeesOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setAttendeesFilter(option)}
                    className={`w-full px-4 py-3 rounded-2xl text-[17px] text-left transition-all ${
                      attendeesFilter === option
                        ? "bg-[#34C759]/10 text-[#34C759] font-semibold border border-[#34C759]/20"
                        : "bg-white/80 backdrop-blur-xl text-black border border-black/5"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-black/5 bg-white/50 backdrop-blur-xl flex gap-3">
            <button
              onClick={onReset}
              className="flex-1 py-3 rounded-full text-[17px] font-semibold text-[#34C759] bg-white/80 backdrop-blur-xl border border-[#34C759]/20"
            >
              Сбросить
            </button>
            <button
              onClick={onApply}
              className="flex-1 py-3 rounded-full text-[17px] font-bold text-white bg-gradient-to-r from-[#34C759] to-[#30D158] shadow-lg shadow-[#34C759]/30"
            >
              Применить
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
