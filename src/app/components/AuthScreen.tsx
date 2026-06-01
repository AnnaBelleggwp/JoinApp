import { useState } from "react";
import { Lock, Mail, UserPlus, LogIn } from "lucide-react";
import { motion } from "motion/react";
import { signInWithEmail, signUpWithEmail } from "../../utils/auth";

interface AuthScreenProps {
  onComplete: () => void;
}

type AuthMode = "sign-in" | "sign-up";

export default function AuthScreen({ onComplete }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = email.trim().includes("@") && password.length >= 6 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setError("");

    try {
      const credentials = { email, password };
      if (mode === "sign-up") {
        await signUpWithEmail(credentials);
      } else {
        await signInWithEmail(credentials);
      }

      onComplete();
    } catch (submitError) {
      console.error("Auth error:", submitError);
      setError(submitError instanceof Error ? submitError.message : "Не удалось войти");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f2f7] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl"
      >
        <div className="flex bg-[#f2f2f7] rounded-2xl p-1 mb-8">
          <button
            onClick={() => setMode("sign-up")}
            className={`flex-1 h-11 rounded-xl text-[15px] font-bold transition-colors ${
              mode === "sign-up" ? "bg-white text-black shadow-sm" : "text-[#3c3c43]/60"
            }`}
          >
            Регистрация
          </button>
          <button
            onClick={() => setMode("sign-in")}
            className={`flex-1 h-11 rounded-xl text-[15px] font-bold transition-colors ${
              mode === "sign-in" ? "bg-white text-black shadow-sm" : "text-[#3c3c43]/60"
            }`}
          >
            Вход
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-black mb-2">
            {mode === "sign-up" ? "Создайте аккаунт" : "Войдите в аккаунт"}
          </h1>
          <p className="text-[15px] text-[#3c3c43]/60">
            {mode === "sign-up"
              ? "После создания аккаунта вы заполните профиль."
              : "Введите email и пароль, чтобы продолжить."}
          </p>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="sr-only">Email</span>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3c3c43]/50" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@example.com"
                autoComplete="email"
                className="w-full h-14 bg-[#f2f2f7] rounded-2xl pl-12 pr-4 text-[17px] text-black outline-none border-2 border-transparent focus:border-[#34C759]"
              />
            </div>
          </label>

          <label className="block">
            <span className="sr-only">Пароль</span>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3c3c43]/50" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Пароль"
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                className="w-full h-14 bg-[#f2f2f7] rounded-2xl pl-12 pr-4 text-[17px] text-black outline-none border-2 border-transparent focus:border-[#34C759]"
              />
            </div>
          </label>
        </div>

        {error && (
          <p className="mt-4 text-[14px] text-[#ff3b30] leading-snug">
            {error}
          </p>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={submit}
          disabled={!canSubmit}
          className={`w-full mt-6 h-14 rounded-2xl text-[17px] font-bold flex items-center justify-center gap-2 ${
            canSubmit ? "bg-[#34C759] text-white" : "bg-[#e5e5ea] text-[#3c3c43]/40"
          }`}
        >
          {mode === "sign-up" ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
          {submitting ? "Подождите..." : mode === "sign-up" ? "Создать аккаунт" : "Войти"}
        </motion.button>
      </motion.div>
    </div>
  );
}
