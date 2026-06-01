import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Check, X, User } from "lucide-react";
import { motion } from "motion/react";
import NavigationBar from "./NavigationBar";
import { requestApi, eventApi, EventRequest, User as UserType } from "../../utils/api";
import { getCurrentUserId } from "../../utils/auth";

export default function EventRequests() {
  const { id } = useParams();
  const [requests, setRequests] = useState<Array<EventRequest & { user: UserType }>>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState("");

  useEffect(() => {
    loadRequests();
  }, [id]);

  const loadRequests = async () => {
    try {
      setLoading(true);

      // Проверяем что пользователь - организатор
      const event = await eventApi.get(id!);
      const currentUserId = getCurrentUserId();
      setEventTitle(event.title);

      if (event.organizerId !== currentUserId) {
        alert("Только организатор может просматривать заявки");
        window.history.back();
        return;
      }

      const data = await requestApi.getForEvent(id!);
      // Показываем только pending заявки
      setRequests(data.filter(r => r.status === "pending"));
    } catch (error) {
      console.error("Error loading requests:", error);
      alert("Ошибка загрузки заявок");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      setProcessing(requestId);
      await requestApi.approve(requestId, id!);
      await loadRequests();
      alert("Заявка одобрена!");
    } catch (error) {
      console.error("Error approving request:", error);
      alert("Ошибка одобрения заявки");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      setProcessing(requestId);
      await requestApi.reject(requestId);
      await loadRequests();
      alert("Заявка отклонена");
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("Ошибка отклонения заявки");
    } finally {
      setProcessing(null);
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
    <div className="min-h-screen bg-gradient-to-b from-[#f2f2f7] to-white">
      <NavigationBar title={eventTitle ? `Заявки: ${eventTitle}` : "Заявки на событие"} showBack />

      <div className="px-4 py-4">
        {requests.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 bg-[#e5e5ea] rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-[#3c3c43]/40" />
            </div>
            <p className="text-[17px] text-[#3c3c43]/60">Нет новых заявок</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/90 backdrop-blur-2xl rounded-2xl p-4 shadow-lg border border-white/20"
              >
                <Link to={`/user/${request.userId}`} className="flex items-center gap-3 mb-4">
                  <img
                    src={request.user.avatar}
                    alt={request.user.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="text-[17px] font-bold text-black">
                      {request.user.name}
                    </h3>
                    <p className="text-[15px] text-[#3c3c43]/60">
                      @{request.user.username}
                    </p>
                    {request.user.bio && (
                      <p className="text-[13px] text-[#3c3c43]/80 mt-1 line-clamp-1">
                        {request.user.bio}
                      </p>
                    )}
                  </div>
                </Link>

                <div className="flex gap-3">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleReject(request.id)}
                    disabled={processing === request.id}
                    className="flex-1 py-3 rounded-xl bg-[#f2f2f7] text-[#3c3c43] text-[15px] font-semibold flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Отклонить
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleApprove(request.id)}
                    disabled={processing === request.id}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#34C759] to-[#30D158] text-white text-[15px] font-semibold flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Одобрить
                  </motion.button>
                </div>

                {processing === request.id && (
                  <div className="mt-2 text-center">
                    <div className="inline-block w-5 h-5 border-2 border-[#34C759] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
