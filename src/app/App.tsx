import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { initializeData } from "../utils/initData";
import Registration from "./components/Registration";
import Onboarding from "./components/Onboarding";
import AuthScreen from "./components/AuthScreen";
import { getJoinDataSource } from "../utils/dataSource";
import { getAppBootstrapStatus } from "../utils/auth";
import "leaflet/dist/leaflet.css";
import "../styles/leaflet-custom.css";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRegistrationStatus();
  }, []);

  const checkRegistrationStatus = async () => {
    try {
      const { authenticated, registered, onboarded } = await getAppBootstrapStatus();

      console.log("Registration status:", { authenticated, registered, onboarded });

      setIsAuthenticated(authenticated);
      setIsRegistered(registered);
      setOnboardingCompleted(onboarded);
      setLoading(false);

      // Инициализация данных только если зарегистрирован
      if (registered && getJoinDataSource() !== "supabase") {
        initializeData();
      }
    } catch (error) {
      console.error("Error checking registration:", error);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  const handleAuthComplete = () => {
    void checkRegistrationStatus();
  };

  const handleRegistrationComplete = () => {
    console.log("Registration completed");
    setIsAuthenticated(true);
    setIsRegistered(true);
  };

  const handleOnboardingComplete = () => {
    console.log("Onboarding completed");
    setOnboardingCompleted(true);
    if (getJoinDataSource() !== "supabase") {
      initializeData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (getJoinDataSource() === "supabase" && !isAuthenticated) {
    return <AuthScreen onComplete={handleAuthComplete} />;
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
