import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { motion } from "motion/react";
import { notificationApi } from "../../utils/api";
import { getCurrentUserId } from "../../utils/auth";
import { subscribeToNotifications } from "../../utils/realtime";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    try {
      const currentUserId = getCurrentUserId();
      const count = await notificationApi.getUnreadCount(currentUserId);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error loading notification count:", error);
    }
  }, []);

  useEffect(() => {
    void loadUnreadCount();
  }, [loadUnreadCount]);

  useEffect(() => {
    const currentUserId = getCurrentUserId();
    let unsubscribe: (() => void) | undefined;
    let active = true;

    subscribeToNotifications(currentUserId, () => {
      if (active) void loadUnreadCount();
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
  }, [loadUnreadCount]);

  return (
    <Link to="/notifications" className="relative p-1 text-[#34C759]">
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-br from-[#ff2d55] to-[#ff6482] rounded-full flex items-center justify-center px-1"
        >
          <span className="text-[11px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        </motion.div>
      )}
    </Link>
  );
}
