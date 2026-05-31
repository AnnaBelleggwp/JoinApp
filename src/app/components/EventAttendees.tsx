import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import NavigationBar from "./NavigationBar";
import { eventApi } from "../../utils/api";
import { getCurrentUserId } from "../../utils/auth";

export default function EventAttendees() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attendees, setAttendees] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      loadEventAndAttendees();
    }
  }, [id]);

  const loadEventAndAttendees = async () => {
    try {
      setLoading(true);
      const eventData = await eventApi.get(id!);
      const currentUserId = getCurrentUserId();

      // Проверяем права доступа
      if (eventData.hideAttendees && eventData.organizerId !== currentUserId) {
        alert("Участники скрыты организатором");
        navigate(-1);
        return;
      }

      setEvent(eventData);

      // Генерируем список участников для демо
      const mockAttendees = Array.from(
        { length: Math.min(eventData.attendees, 50) },
        (_, i) => ({
          id: i.toString(),
          name: [
            "Александр Иванов",
            "Мария Петрова",
            "Дмитрий Козлов",
            "Анна Волкова",
            "Иван Сидоров",
            "Елена Тихонова",
            "Сергей Михайлов",
            "Ольга Николаева",
            "Петр Алексеев",
            "Наталья Соколова",
            "Андрей Павлов",
            "Екатерина Смирнова",
            "Владимир Кузнецов",
            "Татьяна Попова",
            "Михаил Васильев",
          ][i % 15] || `Участник ${i + 1}`,
          avatar: `https://i.pravatar.cc/150?img=${i + 1}`,
        })
      );

      setAttendees(mockAttendees);
    } catch (error) {
      console.error("Error loading attendees:", error);
      alert("Ошибка загрузки участников");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <NavigationBar title={`Участники (${event.attendees})`} showBack />

      <div className="px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-2xl rounded-2xl p-4 shadow-lg border border-white/20"
        >
          <h2 className="text-[19px] font-bold text-black mb-4">
            {event.title}
          </h2>

          <div className="space-y-3">
            {attendees.map((attendee, index) => (
              <motion.div
                key={attendee.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#f2f2f7]/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#c6c6c8] overflow-hidden flex-shrink-0">
                  <img
                    src={attendee.avatar}
                    alt={attendee.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[17px] text-black font-medium">
                    {attendee.name}
                  </p>
                  {index === 0 && (
                    <p className="text-[13px] text-[#ff9500]">Организатор</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
