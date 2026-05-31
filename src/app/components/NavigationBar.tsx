import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";

interface NavigationBarProps {
  title: string;
  showBack?: boolean;
  rightButton?: React.ReactNode;
}

export default function NavigationBar({ title, showBack, rightButton }: NavigationBarProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white/70 backdrop-blur-2xl border-b border-white/20 sticky top-0 z-50 shadow-[0_2px_20px_rgba(0,0,0,0.05)]">
      <div className="h-11 flex items-center justify-between px-4">
        <div className="w-20">
          {showBack && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className="flex items-center text-[#007aff] -ml-2 gap-0.5"
            >
              <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
              <span className="text-[17px] font-medium">Назад</span>
            </motion.button>
          )}
        </div>
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[17px] font-semibold text-center flex-1"
        >
          {title}
        </motion.h1>
        <div className="w-20 flex justify-end">{rightButton}</div>
      </div>
    </div>
  );
}
