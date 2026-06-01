import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Users, MessageCircle, MapPin, ChevronRight } from "lucide-react";
import { markOnboardingComplete } from "../../utils/auth";

const onboardingSteps = [
  {
    icon: Calendar,
    title: "Находите события",
    description: "Просматривайте события по интересам и присоединяйтесь к тем, которые вам нравятся",
    color: "from-[#34C759] to-[#30D158]",
  },
  {
    icon: Users,
    title: "Знакомьтесь с людьми",
    description: "Встречайте единомышленников на мероприятиях и расширяйте свою сеть контактов",
    color: "from-[#007AFF] to-[#5AC8FA]",
  },
  {
    icon: MessageCircle,
    title: "Общайтесь в чатах",
    description: "У каждого события есть свой чат, где участники могут обсудить детали",
    color: "from-[#FF9500] to-[#FFB340]",
  },
  {
    icon: MapPin,
    title: "Создавайте события",
    description: "Организуйте свои встречи и приглашайте других участников",
    color: "from-[#FF3B30] to-[#FF453A]",
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  const handleNext = () => {
    if (completing) return;

    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      void handleComplete();
    }
  };

  const handleSkip = () => {
    void handleComplete();
  };

  const handleComplete = async () => {
    if (completing) return;

    setCompleting(true);
    try {
      await markOnboardingComplete();
      onComplete();
    } catch (error) {
      console.error("Error completing onboarding:", error);
      alert("Не удалось завершить онбординг. Попробуйте еще раз.");
      setCompleting(false);
    }
  };

  const step = onboardingSteps[currentStep];
  const Icon = step.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f2f2f7] to-white flex flex-col">
      {/* Кнопка пропустить */}
      <div className="p-4 flex justify-end">
        <button
          onClick={handleSkip}
          disabled={completing}
          className="text-[17px] font-semibold text-[#3c3c43]/60"
        >
          Пропустить
        </button>
      </div>

      {/* Контент */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center"
          >
            {/* Иконка */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className={`w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shadow-2xl`}
            >
              <Icon className="w-16 h-16 text-white" />
            </motion.div>

            {/* Заголовок */}
            <h1 className="text-[32px] font-bold text-black mb-4">
              {step.title}
            </h1>

            {/* Описание */}
            <p className="text-[17px] text-[#3c3c43]/80 leading-relaxed px-4">
              {step.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Индикаторы и кнопки */}
      <div className="p-8">
        {/* Точки-индикаторы */}
        <div className="flex justify-center gap-2 mb-8">
          {onboardingSteps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? "w-8 bg-[#34C759]"
                  : "w-2 bg-[#c6c6c8]"
              }`}
            />
          ))}
        </div>

        {/* Кнопка далее */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleNext}
          disabled={completing}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#34C759] to-[#30D158] text-white text-[17px] font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
        >
          {currentStep === onboardingSteps.length - 1 ? "Начать" : "Далее"}
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
