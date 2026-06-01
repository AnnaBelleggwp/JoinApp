import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { Upload, MapPin } from "lucide-react";
import NavigationBar from "./NavigationBar";
import { eventApi } from "../../utils/api";
import { getCurrentUserId } from "../../utils/auth";
import { deleteStorageAsset, uploadImageAsset } from "../../utils/storage";

export default function EditEvent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
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
  const [originalImage, setOriginalImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const event = await eventApi.get(id!);
      const currentUserId = getCurrentUserId();

      // Проверяем, что пользователь - организатор
      if (event.organizerId !== currentUserId) {
        alert("Только создатель может редактировать событие");
        navigate(-1);
        return;
      }

      setFormData({
        title: event.title,
        location: event.location,
        date: event.dateValue || event.date,
        time: event.timeValue || event.time,
        category: event.category,
        maxAttendees: event.maxAttendees,
        isPrivate: event.isPrivate || false,
        requiresApproval: event.requiresApproval || false,
        hideAttendees: event.hideAttendees || false,
        description: event.description,
        image: event.image,
      });
      setImagePreview(event.image);
      setOriginalImage(event.image);
    } catch (error) {
      console.error("Error loading event:", error);
      alert("Ошибка загрузки события");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const input = e.currentTarget;
    const previousPreview = imagePreview;
    const previewUrl = URL.createObjectURL(file);

    setImagePreview(previewUrl);
    setUploadingImage(true);

    try {
      const imageUrl = await uploadImageAsset(file, "event-cover");
      setImagePreview(imageUrl);
      setFormData((current) => ({ ...current, image: imageUrl }));
    } catch (error) {
      console.error("Error uploading event image:", error);
      setImagePreview(previousPreview);
      alert(error instanceof Error ? error.message : "Ошибка загрузки изображения");
    } finally {
      URL.revokeObjectURL(previewUrl);
      input.value = "";
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (uploadingImage) {
      alert("Дождитесь завершения загрузки изображения");
      return;
    }

    if (!formData.title || !formData.location || !formData.date || !formData.time) {
      alert("Заполните все обязательные поля");
      return;
    }

    try {
      const currentUserId = getCurrentUserId();
      await eventApi.update(id!, formData, currentUserId);
      if (formData.image && formData.image !== originalImage) {
        deleteStorageAsset(originalImage).catch((error) => {
          console.warn("Could not delete previous event image:", error);
        });
      }
      navigate(-1);
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Ошибка при обновлении события");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Вы уверены, что хотите удалить событие?")) {
      return;
    }

    try {
      const currentUserId = getCurrentUserId();
      await eventApi.delete(id!, currentUserId);
      navigate("/my-events");
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Ошибка при удалении события");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] pb-20">
      <NavigationBar
        title="Редактировать событие"
        showBack
        rightButton={
          <button
            onClick={handleSave}
            disabled={uploadingImage}
            className={`text-[17px] font-semibold ${uploadingImage ? "text-[#3c3c43]/30" : "text-[#34C759]"}`}
          >
            {uploadingImage ? "Загрузка..." : "Готово"}
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Фото */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-lg border border-white/20"
        >
          <label className={`block ${uploadingImage ? "cursor-wait" : "cursor-pointer"}`}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              disabled={uploadingImage}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative h-48">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  {uploadingImage ? (
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 text-white" />
                  )}
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center gap-3">
                <Upload className="w-12 h-12 text-[#3c3c43]/40" />
                <p className="text-[15px] text-[#3c3c43]/40">Загрузить фото</p>
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
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="flex-1 text-[17px] text-black bg-transparent border-none outline-none"
                placeholder="Кофейня «Точка», Покровка 12"
              />
            </div>
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

        {/* Кнопка удаления */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleDelete}
          className="w-full py-4 rounded-2xl bg-[#ff3b30] text-white text-[17px] font-bold"
        >
          Удалить событие
        </motion.button>
      </div>
    </div>
  );
}
