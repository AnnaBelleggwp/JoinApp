import { motion, AnimatePresence } from "motion/react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: "green" | "red";
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Подтвердить",
  cancelText = "Отмена",
  confirmColor = "green",
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[85%] max-w-sm"
          >
            <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
              {/* Content */}
              <div className="p-6 text-center">
                <h3 className="text-[19px] font-bold text-black mb-2">
                  {title}
                </h3>
                <p className="text-[15px] text-[#3c3c43]/80 leading-relaxed">
                  {message}
                </p>
              </div>

              {/* Buttons */}
              <div className="border-t border-[#c6c6c8]/30 flex">
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 text-[17px] font-semibold text-[#3c3c43] hover:bg-[#f2f2f7] transition-colors"
                >
                  {cancelText}
                </button>
                <div className="w-px bg-[#c6c6c8]/30" />
                <button
                  onClick={handleConfirm}
                  className={`flex-1 py-3.5 text-[17px] font-bold transition-colors ${
                    confirmColor === "green"
                      ? "text-[#34C759] hover:bg-[#34C759]/10"
                      : "text-[#ff3b30] hover:bg-[#ff3b30]/10"
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
