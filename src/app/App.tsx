import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { initializeData } from "../utils/initData";
import Registration from "./components/Registration";
import Onboarding from "./components/Onboarding";
import "leaflet/dist/leaflet.css";
import "../styles/leaflet-custom.css";

export default function App() {
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRegistrationStatus();
  }, []);

  const checkRegistrationStatus = () => {
    try {
      const registered = localStorage.getItem("user_registered") === "true";
      const onboarded = localStorage.getItem("onboarding_completed") === "true";

      console.log("Registration status:", { registered, onboarded });

      setIsRegistered(registered);
      setOnboardingCompleted(onboarded);
      setLoading(false);

      // Инициализация данных только если зарегистрирован
      if (registered) {
        initializeData();
      }
    } catch (error) {
      console.error("Error checking registration:", error);
      setLoading(false);
    }
  };

  const handleRegistrationComplete = () => {
    console.log("Registration completed");
    setIsRegistered(true);
  };

  const handleOnboardingComplete = () => {
    console.log("Onboarding completed");
    setOnboardingCompleted(true);
    initializeData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Если не зарегистрирован, показываем регистрацию
  if (!isRegistered) {
    console.log("Showing registration");
    return <Registration onComplete={handleRegistrationComplete} />;
  }

  // Если не прошел онбординг, показываем онбординг
  if (!onboardingCompleted) {
    console.log("Showing onboarding");
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // Иначе показываем основное приложение
  console.log("Showing main app");
  return <RouterProvider router={router} />;
}
