import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, ChevronRight, MessageCircle, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import NavigationBar from "./NavigationBar";
import { notificationApi, type Notification } from "../../utils/api";
import { getCurrentUserId } from "../../utils/auth";
import { subscribeToNotifications } from "../../utils/realtime";

function notificationIcon(type: Notification["type"]) {
  if (type === "message") return MessageCircle;
  if (type === "event_request") return UserPlus;
  return Bell;
}

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = getCurrentUserId();

  const loadNotifications = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const data = await notificationApi.getAll(currentUserId);
      setNotifications(data);
    } catch (error) {
      console.error("Error loading notifications:", error);
      alert("Ошибка загрузки уведомлений");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;

    subscribeToNotifications(currentUserId, () => {
      if (active) void loadNotifications(false);
    }).then((cleanup) => {
      if (active) {
        unsubscribe = cleanup;
      } else {
        cleanup();
      }
    });

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, [currentUserId, loadNotifications]);

  const handleOpenNotification = async (notification: Notification) => {
    if (!notification.readAt) {
      await notificationApi.markRead(notification.id);
      void loadNotifications(false);
    }

    const eventId = typeof notification.data.eventId === "string" ? notification.data.eventId : null;
    if (eventId) {
      if (notification.type === "event_request") {
        navigate(`/event/${eventId}/requests`);
        return;
      }
      navigate(`/event/${eventId}`);
    }
  };

  const handleMarkAllRead = async () => {
    await notificationApi.markAllRead(currentUserId);
    void loadNotifications(false);
  };

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f2f2f7] to-white">
      <NavigationBar
        title="Уведомления"
        showBack
        rightButton={
          unreadCount > 0 ? (
            <button onClick={handleMarkAllRead} className="text-[#34C759] p-1">
              <CheckCheck className="w-5 h-5" />
            </button>
          ) : null
        }
      />

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 bg-[#e5e5ea] rounded-full flex items-center justify-center">
              <Bell className="w-10 h-10 text-[#3c3c43]/40" />
            </div>
            <p className="text-[17px] text-[#3c3c43]/60">Уведомлений пока нет</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification, index) => {
              const Icon = notificationIcon(notification.type);
              const unread = !notification.readAt;

              return (
                <motion.button
                  key={notification.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={() => handleOpenNotification(notification)}
                  className="w-full bg-white/90 backdrop-blur-2xl rounded-2xl p-4 shadow-sm border border-white/20 text-left"
                >
                  <div className="flex gap-3">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                        unread ? "bg-[#34C759]" : "bg-[#e5e5ea]"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${unread ? "text-white" : "text-[#3c3c43]/60"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <p className={`text-[16px] ${unread ? "font-bold text-black" : "font-semibold text-black"}`}>
                          {notification.title}
                        </p>
                        {unread && <span className="mt-1.5 w-2 h-2 bg-[#34C759] rounded-full flex-shrink-0" />}
                      </div>
                      {notification.body && (
                        <p className="text-[14px] text-[#3c3c43]/70 mt-1 line-clamp-2">
                          {notification.body}
                        </p>
                      )}
                      <p className="text-[13px] text-[#3c3c43]/50 mt-2">
                        {formatNotificationTime(notification.createdAt)}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#3c3c43]/30 mt-3 flex-shrink-0" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
