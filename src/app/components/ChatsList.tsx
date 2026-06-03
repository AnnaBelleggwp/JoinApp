import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { motion } from "motion/react";
import NavigationBar from "./NavigationBar";
import SearchModal from "./SearchModal";
import { chatApi, userApi, type Chat, type User } from "../../utils/api";
import { getCurrentUserId } from "../../utils/auth";
import { subscribeToChatList } from "../../utils/realtime";

export default function ChatsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadChats = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const currentUserId = getCurrentUserId();
      console.log(`Loading chats for user ${currentUserId}`);
      const [data, profile] = await Promise.all([
        chatApi.getAll(currentUserId),
        userApi.get(currentUserId),
      ]);
      console.log(`Loaded ${data.length} chats:`, data);
      setChats(data);
      setCurrentUser(profile);
    } catch (error) {
      console.error("Error loading chats:", error);
      alert(`Ошибка загрузки чатов: ${error}`);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  useEffect(() => {
    const currentUserId = getCurrentUserId();
    let unsubscribe: (() => void) | undefined;
    let active = true;

    subscribeToChatList(currentUserId, () => {
      if (active) void loadChats(false);
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
  }, [loadChats]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length >= 2) {
      try {
        const users = await userApi.search(query);
        console.log("Found users:", users);
        // Здесь можно показать результаты поиска
      } catch (error) {
        console.error("Error searching users:", error);
      }
    }
  };

  const filteredChats = chats.filter(chat =>
    chat && chat.name && chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f2f2f7] to-white">
      <NavigationBar
        title="Чаты"
        rightButton={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSearch(true)}
              className="text-[#34C759] p-1"
            >
              <Search className="w-5 h-5" />
            </button>
            <Link to="/settings">
              <button className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#34C759]/20">
                <img
                  src={currentUser?.avatar || ""}
                  alt={currentUser?.name || "Профиль"}
                  className="w-full h-full object-cover"
                />
              </button>
            </Link>
          </div>
        }
      />

      {/* Список чатов */}
      <div className="px-4 pt-3 pb-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[17px] text-[#3c3c43]/60">
              {searchQuery ? "Чаты не найдены" : "Нет чатов"}
            </p>
          </div>
        ) : (
          filteredChats.map((chat, index) => (
          <motion.div
            key={chat.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link to={`/chat/${chat.id}`}>
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="bg-white/90 backdrop-blur-2xl rounded-2xl p-4 shadow-lg border border-white/20"
              >
                <div className="flex gap-3">
                  {/* Аватар */}
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-[#c6c6c8]">
                      <img
                        src={chat.avatar}
                        alt={chat.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Онлайн индикатор */}
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#34c759] border-2 border-white rounded-full" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-[17px] font-semibold text-black">
                        {chat.name}
                      </h3>
                      <span className="text-[15px] text-[#3c3c43]/60 flex-shrink-0 ml-2">
                        {chat.time}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[15px] text-[#3c3c43]/60 line-clamp-1 flex-1">
                        {chat.lastMessage}
                      </p>
                      {chat.unread > 0 && (
                        <div className="bg-gradient-to-br from-[#34C759] to-[#30D158] text-white text-[13px] font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center ml-2 flex-shrink-0 px-1.5">
                          {chat.unread}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.div>
          ))
        )}
      </div>

      {/* Модальное окно поиска */}
      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        placeholder="Название события или имя пользователя"
      />
    </div>
  );
}
