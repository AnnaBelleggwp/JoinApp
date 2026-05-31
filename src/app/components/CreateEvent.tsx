import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Upload, MapPin } from "lucide-react";
import NavigationBar from "./NavigationBar";
import { eventApi } from "../../utils/api";
import { getCurrentUserId } from "../../utils/auth";

export default function CreateEvent() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    date: "",
    time: "",
    category: "Бизнес",
    maxAttendees: 20,
    isPrivate: false,
    requiresApproval: false,
    hideAttendees: false,
    description: "",
    image: "",
  });
  const [imagePreview, setImagePreview] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState("");

  const checkDuplicates = async (title: string, location: string) => {
    if (title.length < 3 || location.length < 3) {
      setDuplicateWarning("");
      return;
    }

    try {
      const allEvents = await eventApi.getAll();
      const similar = allEvents.find(
        e => e.title.toLowerCase().includes(title.toLowerCase()) &&
        e.location.toLowerCase().includes(location.toLowerCase())
      );

      if (similar) {
        setDuplicateWarning(`Похожее событие: "${similar.title}"`);
      } else {
        setDuplicateWarning("");
      }
    } catch (error) {
      console.error("Error checking duplicates:", error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    // Проверка обязательных полей
    if (!formData.title || !formData.location || !formData.date || !formData.time) {
      alert("Заполните все обязательные поля");
      return;
    }

    try {
      const currentUserId = getCurrentUserId();
      // Создание события через API
      await eventApi.create({
        title: formData.title,
        location: formData.location,
        date: formData.date,
        time: formData.time,
        category: formData.category,
        maxAttendees: formData.maxAttendees,
        isPrivate: formData.isPrivate,
        requiresApproval: formData.requiresApproval,
        hideAttendees: formData.hideAttendees,
        description: formData.description,
        image: formData.image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1080",
        organizer: "Вы",
        organizerId: currentUserId,
        latitude: 55.7558 + (Math.random() - 0.5) * 0.1, // Небольшое смещение для разнообразия
        longitude: 37.6173 + (Math.random() - 0.5) * 0.1,
      });

      navigate("/my-events");
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Ошибка при создании события");
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f2f7] pb-20">
      <NavigationBar
        title="Создать событие"
        showBack
      />

      <div className="px-4 py-4 space-y-4">
        {/* Фото события */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-lg border border-white/20"
        >
          <label className="block cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative h-48">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-white" />
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center gap-3 text-[#3c3c43]/40">
                <Upload className="w-12 h-12" />
                <p className="text-[15px]">Загрузить фото события</p>
              </div>
            )}
          </label>
        </motion.div>

        {/* Наименование */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-lg border border-white/20"
        >
          <div className="px-4 py-3">
            <label className="text-[13px] text-[#3c3c43]/60 mb-2 block">
              Наименование события*
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                checkDuplicates(e.target.value, formData.location);
              }}
              className="w-full text-[17px] text-black bg-transparent border-none outline-none"
              placeholder="Встреча стартаперов"
            />
          </div>
        </motion.div>

        {/* Адрес */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-lg border border-white/20"
        >
          <div className="px-4 py-3">
            <label className="text-[13px] text-[#3c3c43]/60 mb-2 block">
              Адрес события*
            </label>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#34C759] flex-shrink-0" />
              <input
                type="text"
                value={formData.location}
                onChange={(e) => {
                  setFormData({ ...formData, location: e.target.value });
                  checkDuplicates(formData.title, e.target.value);
                }}
                className="flex-1 text-[17px] text-black bg-transparent border-none outline-none"
                placeholder="Кофейня «Точка», Покровка 12"
              />
            </div>
            {duplicateWarning && (
              <p className="text-[13px] text-[#ff9500] mt-2">⚠️ {duplicateWarning}</p>
            )}
          </div>
        </motion.div>

        {/* Дата и время */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-lg border border-white/20"
          >
            <div className="px-4 py-3">
              <label className="text-[13px] text-[#3c3c43]/60 mb-2 block">
                Дата*
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full text-[17px] text-black bg-transparent border-none outline-none"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-lg border border-white/20"
          >
            <div className="px-4 py-3">
              <label className="text-[13px] text-[#3c3c43]/60 mb-2 block">
                Время*
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full text-[17px] text-black bg-transparent border-none outline-none"
              />
            </div>
          </motion.div>
        </div>

        {/* Категория */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-lg border border-white/20"
        >
          <div className="px-4 py-3">
            <label className="text-[13px] text-[#3c3c43]/60 mb-2 block">
              Категория
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full text-[17px] text-black bg-transparent border-none outline-none"
            >
              <option value="Бизнес">Бизнес</option>
              <option value="IT">IT</option>
              <option value="Знакомства">Знакомства</option>
              <option value="Развлечения">Развлечения</option>
            </select>
          </div>
        </motion.div>

        {/* Максимум участников */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-lg border border-white/20"
        >
          <div className="px-4 py-3">
            <label className="text-[13px] text-[#3c3c43]/60 mb-2 block">
              Максимум участников
            </label>
            <input
              type="number"
              min="2"
              max="1000"
              value={formData.maxAttendees}
              onChange={(e) => setFormData({ ...formData, maxAttendees: parseInt(e.target.value) || 20 })}
              className="w-full text-[17px] text-black bg-transparent border-none outline-none"
            />
          </div>
        </motion.div>

        {/* Настройки доступа */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-lg border border-white/20"
        >
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[17px] text-black">Частное событие</p>
              <p className="text-[13px] text-[#3c3c43]/60">Доступно только по приглашению</p>
            </div>
            <button
              onClick={() => setFormData({ ...formData, isPrivate: !formData.isPrivate })}
              className={`w-[51px] h-[31px] rounded-full transition-colors relative ${
                formData.isPrivate ? "bg-[#34C759]" : "bg-[#e5e5ea]"
              }`}
            >
              <motion.div
                animate={{ x: formData.isPrivate ? 20 : 0 }}
                className="absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-sm"
              />
            </button>
          </div>

          <div className="border-t border-[#c6c6c8]/30 mx-4" />

          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[17px] text-black">Вход по подтверждению</p>
              <p className="text-[13px] text-[#3c3c43]/60">Требуется одобрение организатора</p>
            </div>
            <button
              onClick={() => setFormData({ ...formData, requiresApproval: !formData.requiresApproval })}
              className={`w-[51px] h-[31px] rounded-full transition-colors relative ${
                formData.requiresApproval ? "bg-[#34C759]" : "bg-[#e5e5ea]"
              }`}
            >
              <motion.div
                animate={{ x: formData.requiresApproval ? 20 : 0 }}
                className="absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-sm"
              />
            </button>
          </div>

          <div className="border-t border-[#c6c6c8]/30 mx-4" />

          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[17px] text-black">Скрывать участников</p>
              <p className="text-[13px] text-[#3c3c43]/60">Участников видит только организатор</p>
            </div>
            <button
              onClick={() => setFormData({ ...formData, hideAttendees: !formData.hideAttendees })}
              className={`w-[51px] h-[31px] rounded-full transition-colors relative ${
                formData.hideAttendees ? "bg-[#34C759]" : "bg-[#e5e5ea]"
              }`}
            >
              <motion.div
                animate={{ x: formData.hideAttendees ? 20 : 0 }}
                className="absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-sm"
              />
            </button>
          </div>
        </motion.div>

        {/* Описание */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-lg border border-white/20"
        >
          <div className="px-4 py-3">
            <label className="text-[13px] text-[#3c3c43]/60 mb-2 block">
              Описание события
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-[17px] text-black bg-transparent border-none outline-none resize-none"
              placeholder="Расскажите о событии..."
              rows={4}
            />
          </div>
        </motion.div>

        {/* Кнопка создания */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleCreate}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#34C759] to-[#30D158] text-white text-[17px] font-bold"
        >
          Создать событие
        </motion.button>
      </div>
    </div>
  );
}
