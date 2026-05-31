import { motion, AnimatePresence } from "motion/react";
import { X, Copy, Check } from "lucide-react";
import { useState } from "react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/event/${eventId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 1500);
  };

  const handleShareVK = () => {
    const vkUrl = `https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(eventTitle)}`;
    window.open(vkUrl, '_blank', 'width=600,height=400');
  };

  const handleShareTelegram = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(eventTitle)}`;
    window.open(telegramUrl, '_blank');
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-0 left-0 right-0 z-50"
          >
            <div className="bg-white/95 backdrop-blur-2xl rounded-t-3xl shadow-2xl border-t border-white/20 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-[#c6c6c8]/30 flex items-center justify-between">
                <h3 className="text-[19px] font-bold text-black">Поделиться событием</h3>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-[#f2f2f7] rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-[#3c3c43]/60" />
                </button>
              </div>

              {/* Options */}
              <div className="p-4 space-y-3">
                {/* VK */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleShareVK}
                  className="w-full bg-[#0077FF] text-white rounded-2xl p-4 flex items-center gap-3 hover:bg-[#0066DD] transition-colors"
                >
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#0077FF">
                      <path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2zm3.15 14.1c-.45.45-1.09.67-1.92.67h-.86c-.54 0-.81-.09-1.14-.42-.33-.33-.73-.84-1.11-1.38-.95-1.35-1.42-1.64-1.89-1.64-.12 0-.26.03-.38.08v2.45c0 .54-.17.71-.71.71h-1.13c-.74 0-3.19-.09-5.49-2.48C1.45 11.78.02 8.59 0 8.52c0-.18.06-.35.33-.35h1.67c.27 0 .36.13.46.36.14.33 1.03 2.64 2.5 4.11.46.46.67.62.92.62.12 0 .29-.05.29-.48V9.39c-.03-.93-.54-1.01-.54-1.34 0-.11.09-.22.23-.22h2.62c.22 0 .3.12.3.34v3.62c0 .22.1.3.17.3.12 0 .22-.08.45-.31 1.37-1.55 2.35-3.95 2.35-3.95.07-.15.19-.29.4-.29h1.67c.33 0 .4.17.33.4-.11.37-1.51 3.49-1.51 3.49-.1.17-.14.25 0 .45.1.15.43.42.65.67.68.76 1.2 1.4 1.34 1.84.14.45-.07.67-.52.67z"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[17px] font-semibold">ВКонтакте</p>
                    <p className="text-[13px] text-white/80">Поделиться в VK</p>
                  </div>
                </motion.button>

                {/* Telegram */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleShareTelegram}
                  className="w-full bg-[#0088cc] text-white rounded-2xl p-4 flex items-center gap-3 hover:bg-[#0077bb] transition-colors"
                >
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#0088cc">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.61 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.48 1.02-.73 3.99-1.73 6.65-2.87 7.98-3.42 3.8-1.58 4.59-1.85 5.1-1.86.11 0 .37.03.53.17.14.12.17.28.19.41.01.09.03.32.01.49z"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[17px] font-semibold">Telegram</p>
                    <p className="text-[13px] text-white/80">Отправить в Telegram</p>
                  </div>
                </motion.button>

                {/* Copy Link */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCopyLink}
                  className="w-full bg-white/90 backdrop-blur-xl border border-[#c6c6c8]/30 rounded-2xl p-4 flex items-center gap-3 hover:bg-white transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-[#34C759] to-[#30D158] rounded-full flex items-center justify-center">
                    {copied ? (
                      <Check className="w-6 h-6 text-white" />
                    ) : (
                      <Copy className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[17px] font-semibold text-black">
                      {copied ? "Ссылка скопирована!" : "Скопировать ссылку"}
                    </p>
                    <p className="text-[13px] text-[#3c3c43]/60">
                      {copied ? "Готово" : "Поделиться ссылкой"}
                    </p>
                  </div>
                </motion.button>
              </div>

              {/* Safe area */}
              <div className="h-6" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
