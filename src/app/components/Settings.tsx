import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, User, Bell, Lock, HelpCircle, LogOut, Trash2, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import NavigationBar from "./NavigationBar";
import { userProfile } from "../data/mockData";
import { getCurrentUserId } from "../../utils/auth";

export default function Settings() {
  const navigate = useNavigate();
  const [availableForInvites, setAvailableForInvites] = useState(userProfile.availableForInvites);
  const [hideMyEvents, setHideMyEvents] = useState(false);

  useEffect(() => {
    const currentUserId = getCurrentUserId();
    const hideEvents = localStorage.getItem(`user:${currentUserId}:hideEvents`) === "true";
    setHideMyEvents(hideEvents);
  }, []);

  const toggleInvites = () => {
    const newValue = !availableForInvites;
    setAvailableForInvites(newValue);
    userProfile.availableForInvites = newValue;
  };

  const toggleHideMyEvents = () => {
    const newValue = !hideMyEvents;
    setHideMyEvents(newValue);
    const currentUserId = getCurrentUserId();
    localStorage.setItem(`user:${currentUserId}:hideEvents`, newValue.toString());
  };

  const resetApp = () => {
    if (!confirm("Очистить все данные и перезапустить приложение?")) {
      return;
    }

    localStorage.clear();
    window.location.reload();
  };

  const resetOnboarding = () => {
    if (!confirm("Сбросить онбординг и регистрацию?")) {
      return;
    }

    localStorage.removeItem("user_registered");
    localStorage.removeItem("onboarding_completed");
    window.location.reload();
  };

  const settingsSections = [
    {
      title: "Профиль",
      items: [
        { icon: User, label: "Редактировать профиль", value: "", action: () => navigate("/edit-profile") },
      ]
    },
    {
      title: "Настройки",
      items: [
        { icon: Bell, label: "Уведомления", value: "" },
      ]
    },
    {
      title: "Конфиденциальность",
      items: [
        { icon: Lock, label: "Доступен к приглашению", value: "", toggle: true, checked: availableForInvites, onToggle: toggleInvites },
        { icon: EyeOff, label: "Скрывать мои события", value: "", toggle: true, checked: hideMyEvents, onToggle: toggleHideMyEvents },
      ]
    },
    {
      items: [
        { icon: HelpCircle, label: "Помощь", value: "" },
      ]
    },
    {
      items: [
        { icon: LogOut, label: "Выйти", value: "", danger: true },
      ]
    },
    {
      title: "Dev Tools",
      items: [
        { icon: Trash2, label: "Сбросить регистрацию", value: "", action: resetOnboarding, danger: true },
        { icon: Trash2, label: "Очистить все данные", value: "", action: resetApp, danger: true },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <NavigationBar title="Настройки" showBack />

      {/* Профиль */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-6"
      >
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-[#c6c6c8] mb-3">
            <img
              src={userProfile.avatar}
              alt={userProfile.name}
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-[22px] font-bold text-black mb-1">{userProfile.name}</h2>
          <p className="text-[15px] text-[#3c3c43]/60 mb-1">@{userProfile.username}</p>
          <p className="text-[15px] text-[#3c3c43]/60">{userProfile.phone}</p>
        </div>
      </motion.div>

      {/* Секции настроек */}
      <div className="space-y-4 px-4 pb-8">
        {settingsSections.map((section, sectionIndex) => (
          <motion.div
            key={sectionIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.1 }}
          >
            {section.title && (
              <p className="text-[13px] text-[#3c3c43]/60 px-4 mb-2 uppercase tracking-wide">
                {section.title}
              </p>
            )}
            <div className="bg-white/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-lg border border-white/20">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <div key={itemIndex}>
                    <button
                      onClick={item.action || item.onToggle}
                      className="w-full px-4 py-3.5 flex items-center justify-between active:bg-[#d1d1d6]/30"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          item.danger
                            ? "bg-[#ff3b30]/10"
                            : "bg-[#34C759]/10"
                        }`}>
                          <Icon className={`w-4 h-4 ${
                            item.danger ? "text-[#ff3b30]" : "text-[#34C759]"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className={`text-[17px] ${
                            item.danger ? "text-[#ff3b30]" : "text-black"
                          }`}>
                            {item.label}
                          </p>
                          {item.value && (
                            <p className="text-[15px] text-[#3c3c43]/60 truncate">
                              {item.value}
                            </p>
                          )}
                        </div>
                      </div>
                      {item.toggle ? (
                        <div
                          className={`w-[51px] h-[31px] rounded-full transition-colors relative ${
                            item.checked ? "bg-[#34C759]" : "bg-[#e5e5ea]"
                          }`}
                        >
                          <motion.div
                            animate={{ x: item.checked ? 20 : 0 }}
                            className="absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-sm"
                          />
                        </div>
                      ) : !item.danger && (
                        <ChevronRight className="w-5 h-5 text-[#3c3c43]/40 flex-shrink-0" />
                      )}
                    </button>
                    {itemIndex < section.items.length - 1 && (
                      <div className="ml-14 border-b border-[#c6c6c8]/50" />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
