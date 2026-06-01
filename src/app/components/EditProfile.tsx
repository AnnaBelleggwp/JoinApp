import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { AlertCircle, Upload } from "lucide-react";
import NavigationBar from "./NavigationBar";
import { getCurrentUserId } from "../../utils/auth";
import { userApi, type User } from "../../utils/api";
import { deleteStorageAsset, uploadImageAsset } from "../../utils/storage";

export default function EditProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    birthYear: new Date().getFullYear() - 25,
    bio: "",
    avatar: "",
  });
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const currentUserId = getCurrentUserId();
        const currentProfile = await userApi.get(currentUserId);

        if (!active) return;
        setProfile(currentProfile);
        setFormData({
          name: currentProfile.name,
          username: currentProfile.username,
          birthYear: currentProfile.birthYear,
          bio: currentProfile.bio,
          avatar: currentProfile.avatar,
        });
        setImagePreview(currentProfile.avatar);
      } catch (error) {
        console.error("Error loading profile:", error);
        if (active) {
          alert("Не удалось загрузить профиль");
          navigate(-1);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProfile();
    return () => {
      active = false;
    };
  }, [navigate]);

  const checkUsername = async (username: string) => {
    if (username === profile?.username) {
      setUsernameError("");
      return true;
    }

    if (username.length < 3) {
      setUsernameError("Минимум 3 символа");
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
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setFormData({ ...formData, username: cleaned });
    if (cleaned.length >= 3) {
      checkUsername(cleaned);
    } else if (cleaned.length > 0) {
      setUsernameError("Минимум 3 символа");
    } else {
      setUsernameError("");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSave = async () => {
    if (!profile || uploadingImage || usernameError || formData.username.length < 3 || formData.name.trim().length < 2) return;

    setIsSaving(true);

    try {
      await userApi.update(profile.id, {
        name: formData.name.trim(),
        username: formData.username,
        birthYear: formData.birthYear,
        bio: formData.bio,
        avatar: formData.avatar,
      });
      if (formData.avatar && formData.avatar !== profile.avatar) {
        deleteStorageAsset(profile.avatar).catch((error) => {
          console.warn("Could not delete previous avatar:", error);
        });
      }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f7]">
        <NavigationBar title="Редактировать профиль" showBack />
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <NavigationBar
        title="Редактировать профиль"
        showBack
        rightButton={
          <button
            onClick={handleSave}
            disabled={
              isSaving || uploadingImage || !!usernameError || formData.username.length < 3 || formData.name.trim().length < 2
            }
            className={`text-[17px] font-semibold ${
              isSaving || uploadingImage || usernameError || formData.username.length < 3 || formData.name.trim().length < 2
                ? "text-[#3c3c43]/40"
                : "text-[#34C759]"
            }`}
          >
            {isSaving || uploadingImage ? "..." : "Готово"}
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Фото профиля */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-lg border border-white/20"
        >
          <label className={`block px-4 py-5 ${uploadingImage ? "cursor-wait" : "cursor-pointer"}`}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarUpload}
              disabled={uploadingImage}
              className="hidden"
            />
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full overflow-hidden bg-[#f2f2f7] border border-[#c6c6c8]/40 flex-shrink-0">
                {imagePreview ? (
                  <img src={imagePreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Upload className="w-7 h-7 text-[#3c3c43]/40" />
                  </div>
                )}
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[17px] text-black">Фото профиля</p>
                <p className="text-[13px] text-[#3c3c43]/60">JPG, PNG или WebP до 5 МБ</p>
              </div>
            </div>
          </label>
        </motion.div>

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
            {!usernameError && formData.username.length >= 3 && formData.username !== profile?.username && (
              <p className="text-[13px] text-[#34C759] mt-2">Доступно</p>
            )}
            <p className="text-[13px] text-[#3c3c43]/60 mt-1">
              Минимум 3 символа, только латиница, цифры и _
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
