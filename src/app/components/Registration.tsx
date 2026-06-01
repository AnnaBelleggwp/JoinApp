import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Upload, Check } from "lucide-react";
import { userApi } from "../../utils/api";
import { ensureCurrentUserId, markRegistrationComplete } from "../../utils/auth";
import { uploadImageAsset } from "../../utils/storage";

interface RegistrationProps {
  onComplete: () => void;
}

export default function Registration({ onComplete }: RegistrationProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    avatar: "",
    bio: "",
    birthYear: new Date().getFullYear() - 25,
    phone: "",
  });
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const input = e.currentTarget;
    const previousPreview = imagePreview;
    const previewUrl = URL.createObjectURL(file);

    setImagePreview(previewUrl);
    setUploadingImage(true);

    try {
      const avatarUrl = await uploadImageAsset(file, "avatar");
      setImagePreview(avatarUrl);
      setFormData((current) => ({ ...current, avatar: avatarUrl }));
    } catch (error) {
      console.error("Error uploading avatar:", error);
      setImagePreview(previousPreview);
      alert(error instanceof Error ? error.message : "Ошибка загрузки изображения");
    } finally {
      URL.revokeObjectURL(previewUrl);
      input.value = "";
      setUploadingImage(false);
    }
  };

  const checkUsername = async (username: string) => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const result = await userApi.checkUsername(username);
      setUsernameAvailable(result.available);
    } catch (error) {
      console.error("Error checking username:", error);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    // Очищаем от недопустимых символов
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setFormData({ ...formData, username: cleaned });
    checkUsername(cleaned);
  };

  const handleComplete = async () => {
    try {
      const currentUserId = await ensureCurrentUserId();
      await userApi.create({
        id: currentUserId,
        name: formData.name,
        username: formData.username,
        avatar: formData.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop",
        bio: formData.bio,
        birthYear: formData.birthYear,
        phone: formData.phone,
        availableForInvites: true,
      });

      await markRegistrationComplete();

      onComplete();
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Ошибка регистрации. Попробуйте еще раз.");
    }
  };

  const canProceedStep1 = formData.name.trim().length >= 2;
  const canProceedStep2 = formData.username.length >= 3 && usernameAvailable === true;
  const canProceedStep3 = true; // Аватар опционален

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#34C759] to-[#30D158] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Прогресс */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 mx-1 rounded-full transition-all ${
                  s <= step ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
          <p className="text-white/80 text-center text-[15px]">
            Шаг {step} из 4
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* Шаг 1: Имя */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-white/95 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl"
            >
              <h1 className="text-[28px] font-bold text-black mb-2">
                Как вас зовут?
              </h1>
              <p className="text-[15px] text-[#3c3c43]/60 mb-6">
                Это имя будет отображаться в вашем профиле
              </p>

              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Введите ваше имя"
                className="w-full text-[20px] text-black bg-[#f2f2f7] rounded-2xl px-5 py-4 outline-none border-2 border-transparent focus:border-[#34C759] transition-colors"
                autoFocus
              />

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => canProceedStep1 && setStep(2)}
                disabled={!canProceedStep1}
                className={`w-full mt-6 py-4 rounded-2xl text-[17px] font-bold flex items-center justify-center gap-2 ${
                  canProceedStep1
                    ? "bg-[#34C759] text-white"
                    : "bg-[#e5e5ea] text-[#3c3c43]/40"
                }`}
              >
                Продолжить
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}

          {/* Шаг 2: Username */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-white/95 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl"
            >
              <h1 className="text-[28px] font-bold text-black mb-2">
                Выберите username
              </h1>
              <p className="text-[15px] text-[#3c3c43]/60 mb-6">
                Используйте латиницу, цифры и подчеркивание
              </p>

              <div className="relative">
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="username"
                  className={`w-full text-[20px] text-black bg-[#f2f2f7] rounded-2xl px-5 py-4 outline-none border-2 transition-colors ${
                    usernameAvailable === true
                      ? "border-[#34C759]"
                      : usernameAvailable === false
                      ? "border-[#ff3b30]"
                      : "border-transparent"
                  }`}
                  autoFocus
                />
                {checkingUsername && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-[#34C759] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {usernameAvailable === true && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Check className="w-6 h-6 text-[#34C759]" />
                  </div>
                )}
              </div>

              {formData.username.length >= 3 && (
                <p
                  className={`mt-2 text-[13px] ${
                    usernameAvailable ? "text-[#34C759]" : "text-[#ff3b30]"
                  }`}
                >
                  {usernameAvailable
                    ? "✓ Username доступен"
                    : "✗ Username уже занят"}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-4 rounded-2xl text-[17px] font-semibold text-[#34C759] bg-[#f2f2f7]"
                >
                  Назад
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => canProceedStep2 && setStep(3)}
                  disabled={!canProceedStep2}
                  className={`flex-1 py-4 rounded-2xl text-[17px] font-bold flex items-center justify-center gap-2 ${
                    canProceedStep2
                      ? "bg-[#34C759] text-white"
                      : "bg-[#e5e5ea] text-[#3c3c43]/40"
                  }`}
                >
                  Продолжить
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Шаг 3: Фото */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-white/95 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl"
            >
              <h1 className="text-[28px] font-bold text-black mb-2">
                Добавьте фото
              </h1>
              <p className="text-[15px] text-[#3c3c43]/60 mb-6">
                Это необязательно, но фото помогает людям узнать вас
              </p>

              <label className={`block ${uploadingImage ? "cursor-wait" : "cursor-pointer"}`}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-[#34C759]">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-32 h-32 mx-auto rounded-full bg-[#f2f2f7] flex flex-col items-center justify-center border-2 border-dashed border-[#c6c6c8]">
                    <Upload className="w-8 h-8 text-[#3c3c43]/40 mb-2" />
                    <p className="text-[13px] text-[#3c3c43]/60">Загрузить</p>
                  </div>
                )}
              </label>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-4 rounded-2xl text-[17px] font-semibold text-[#34C759] bg-[#f2f2f7]"
                >
                  Назад
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStep(4)}
                  disabled={uploadingImage}
                  className={`flex-1 py-4 rounded-2xl text-white text-[17px] font-bold flex items-center justify-center gap-2 ${
                    uploadingImage ? "bg-[#e5e5ea]" : "bg-[#34C759]"
                  }`}
                >
                  {uploadingImage ? (
                    "Загрузка..."
                  ) : (
                    <>
                      Продолжить
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Шаг 4: Биография */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-white/95 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl"
            >
              <h1 className="text-[28px] font-bold text-black mb-2">
                Расскажите о себе
              </h1>
              <p className="text-[15px] text-[#3c3c43]/60 mb-6">
                Это поможет людям узнать вас лучше (необязательно)
              </p>

              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Например: Основатель стартапа | Люблю нетворкинг"
                className="w-full text-[17px] text-black bg-[#f2f2f7] rounded-2xl px-5 py-4 outline-none border-2 border-transparent focus:border-[#34C759] transition-colors resize-none"
                rows={4}
                maxLength={150}
              />
              <p className="text-[13px] text-[#3c3c43]/60 mt-2 text-right">
                {formData.bio.length}/150
              </p>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-4 rounded-2xl text-[17px] font-semibold text-[#34C759] bg-[#f2f2f7]"
                >
                  Назад
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleComplete}
                  className="flex-1 py-4 rounded-2xl bg-[#34C759] text-white text-[17px] font-bold"
                >
                  Завершить регистрацию
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
