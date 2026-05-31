import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { AlertCircle } from "lucide-react";
import NavigationBar from "./NavigationBar";
import { userProfile } from "../data/mockData";
import { userApi } from "../../utils/api";

export default function EditProfile() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: userProfile.name,
    username: userProfile.username,
    birthYear: userProfile.birthYear,
    bio: userProfile.bio,
  });
  const [usernameError, setUsernameError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const checkUsername = async (username: string) => {
    if (username === userProfile.username) {
      setUsernameError("");
      return true;
    }

    if (username.length < 4) {
      setUsernameError("Минимум 4 символа");
      return false;
    }

    try {
      // Проверка через API
      const result = await userApi.checkUsername(username);

      if (!result.available) {
        setUsernameError("Имя пользователя занято");
        return false;
      }

      setUsernameError("");
      return true;
    } catch (error) {
      console.error("Error checking username:", error);
      setUsernameError("Ошибка проверки");
      return false;
    }
  };

  const handleUsernameChange = (value: string) => {
    const cleaned = value.replace(/[^a-zA-Z0-9_]/g, '');
    setFormData({ ...formData, username: cleaned });
    if (cleaned.length >= 4) {
      checkUsername(cleaned);
    } else if (cleaned.length > 0) {
      setUsernameError("Минимум 4 символа");
    } else {
      setUsernameError("");
    }
  };

  const handleSave = async () => {
    if (usernameError || formData.username.length < 4) return;

    setIsSaving(true);

    try {
      // Сохранение через API
      await userApi.update(userProfile.id, formData);

      // Обновляем локальные данные
      Object.assign(userProfile, formData);

      navigate(-1);
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Ошибка сохранения профиля");
    } finally {
      setIsSaving(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <NavigationBar
        title="Редактировать профиль"
        showBack
        rightButton={
          <button
            onClick={handleSave}
            disabled={isSaving || !!usernameError || formData.username.length < 4}
            className={`text-[17px] font-semibold ${
              isSaving || usernameError || formData.username.length < 4
                ? "text-[#3c3c43]/40"
                : "text-[#34C759]"
            }`}
          >
            {isSaving ? "..." : "Готово"}
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Имя и Фамилия */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-lg border border-white/20"
        >
          <div className="px-4 py-3">
            <label className="text-[13px] text-[#3c3c43]/60 mb-2 block">
              Имя и Фамилия
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full text-[17px] text-black bg-transparent border-none outline-none"
              placeholder="Введите имя и фамилию"
            />
          </div>
        </motion.div>

        {/* Имя пользователя */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-lg border border-white/20"
        >
          <div className="px-4 py-3">
            <label className="text-[13px] text-[#3c3c43]/60 mb-2 block">
              Имя пользователя
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className="flex-1 text-[17px] text-black bg-transparent border-none outline-none"
                placeholder="username"
              />
              {usernameError && (
                <AlertCircle className="w-5 h-5 text-[#ff3b30] flex-shrink-0" />
              )}
            </div>
            {usernameError && (
              <p className="text-[13px] text-[#ff3b30] mt-2">{usernameError}</p>
            )}
            {!usernameError && formData.username.length >= 4 && formData.username !== userProfile.username && (
              <p className="text-[13px] text-[#34C759] mt-2">Доступно</p>
            )}
            <p className="text-[13px] text-[#3c3c43]/60 mt-1">
              Минимум 4 символа, только латиница, цифры и _
            </p>
          </div>
        </motion.div>

        {/* Год рождения */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-lg border border-white/20"
        >
          <div className="px-4 py-3">
            <label className="text-[13px] text-[#3c3c43]/60 mb-2 block">
              Год рождения
            </label>
            <select
              value={formData.birthYear}
              onChange={(e) => setFormData({ ...formData, birthYear: parseInt(e.target.value) })}
              className="w-full text-[17px] text-black bg-transparent border-none outline-none"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* О себе */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-lg border border-white/20"
        >
          <div className="px-4 py-3">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[13px] text-[#3c3c43]/60">
                О себе
              </label>
              <span className="text-[13px] text-[#3c3c43]/60">
                {formData.bio.length}/255
              </span>
            </div>
            <textarea
              value={formData.bio}
              onChange={(e) => {
                if (e.target.value.length <= 255) {
                  setFormData({ ...formData, bio: e.target.value });
                }
              }}
              className="w-full text-[17px] text-black bg-transparent border-none outline-none resize-none"
              placeholder="Расскажите о себе..."
              rows={4}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
