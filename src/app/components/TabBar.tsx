import { Calendar, MessageCircle, CalendarCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";

export default function TabBar() {
  const location = useLocation();

  const tabs = [
    { path: "/", icon: Calendar, label: "Главная" },
    { path: "/my-events", icon: CalendarCheck, label: "Мои события" },
    { path: "/chats", icon: MessageCircle, label: "Чаты", badge: 7 },
  ];

  return (
    <div className="bg-white/70 backdrop-blur-2xl border-t border-white/20 px-2 pb-safe sticky bottom-0 shadow-[0_-2px_20px_rgba(0,0,0,0.08)]">
      <div className="flex justify-around items-center h-[60px]">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className="flex flex-col items-center justify-center flex-1 relative"
            >
              <motion.div
                animate={{
                  scale: isActive ? 1 : 1,
                  y: isActive ? -2 : 0,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="relative"
              >
                {/* Активный фон */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 -m-2 bg-gradient-to-br from-[#34C759]/8 to-[#30D158]/8 rounded-xl"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                
                <div className="relative flex flex-col items-center gap-1 px-3 py-1">
                  <div className="relative">
                    <Icon
                      className={`w-6 h-6 transition-colors ${
                        isActive ? "text-[#34C759]" : "text-[#8e8e93]"
                      }`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    
                    {/* Badge */}
                    {tab.badge && tab.badge > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-br from-[#ff2d55] to-[#ff6482] rounded-full flex items-center justify-center px-1"
                      >
                        <span className="text-[11px] font-bold text-white">
                          {tab.badge > 9 ? "9+" : tab.badge}
                        </span>
                      </motion.div>
                    )}
                  </div>
                  
                  <motion.span
                    animate={{
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? "#34C759" : "#8e8e93",
                    }}
                    className="text-[11px]"
                  >
                    {tab.label}
                  </motion.span>
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}