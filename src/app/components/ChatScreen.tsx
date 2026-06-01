import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, Smile, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import NavigationBar from "./NavigationBar";
import { chatApi, userApi, type Chat, type Message, type User } from "../../utils/api";
import { getCurrentUserId } from "../../utils/auth";
import { uploadChatImageAttachment } from "../../utils/storage";

interface MessageWithUser extends Message {
  user?: User;
}

export default function ChatScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<MessageWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (id) {
      loadChat();
      loadMessages();
    }
  }, [id]);

  const loadChat = async () => {
    try {
      console.log("Loading chat with ID:", id);
      const chatData = await chatApi.get(id!);
      console.log("Loaded chat data:", chatData);
      if (!chatData) {
        console.error("Chat not found in storage");
      }
      setChat(chatData);
    } catch (error) {
      console.error("Error loading chat:", error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const currentUserId = getCurrentUserId();
      console.log(`Loading messages for chat ${id}, user ${currentUserId}`);
      const data = await chatApi.getMessages(id!, currentUserId);
      console.log(`Loaded ${data.length} messages:`, data);

      // Загружаем информацию о пользователях
      const messagesWithUsers = await Promise.all(
        data.map(async (msg) => {
          if (msg.userId && !msg.isMine) {
            try {
              const user = await userApi.get(msg.userId);
              return { ...msg, user };
            } catch (error) {
              console.error("Error loading user for message:", error);
              return msg;
            }
          }
          return msg;
        })
      );

      setMessages(messagesWithUsers);
    } catch (error) {
      console.error("Error loading messages:", error);
      alert(`Ошибка загрузки сообщений: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !id) return;

    console.log(`Sending message to chat ${id}: "${inputValue}"`);

    try {
      const currentUserId = getCurrentUserId();
      const newMessage = await chatApi.sendMessage(id, {
        text: inputValue,
        isMine: true,
      }, currentUserId);

      console.log("Message sent successfully:", newMessage);
      setMessages(prevMessages => [...prevMessages, newMessage]);
      setInputValue("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert(`Ошибка отправки сообщения: ${error}`);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    const input = e.currentTarget;
    setUploadingImage(true);

    try {
      const attachmentPath = await uploadChatImageAttachment(file, id);
      const currentUserId = getCurrentUserId();
      const newMessage = await chatApi.sendMessage(id, {
        text: "",
        kind: "image",
        attachmentPath,
        attachmentUrl: attachmentPath.startsWith("data:") ? attachmentPath : undefined,
        isMine: true,
      }, currentUserId);

      setMessages((prevMessages) => [...prevMessages, newMessage]);
    } catch (error) {
      console.error("Error sending image:", error);
      alert(error instanceof Error ? error.message : `Ошибка отправки изображения: ${error}`);
    } finally {
      input.value = "";
      setUploadingImage(false);
    }
  };

  if (!chat) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f2f2f7] to-white flex items-center justify-center">
        <p className="text-[17px] text-[#3c3c43]/60">Чат не найден</p>
      </div>
    );
  }

  const handleAvatarClick = () => {
    if (chat.isEventChat && chat.eventId) {
      // Для чата события переходим к событию
      navigate(`/event/${chat.eventId}`);
    } else {
      if (chat.peerUserId) {
        navigate(`/user/${chat.peerUserId}`);
        return;
      }

      const firstMessageFromPeer = messages.find((message) => !message.isMine && message.userId);
      if (firstMessageFromPeer?.userId) navigate(`/user/${firstMessageFromPeer.userId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f2f2f7] to-white flex flex-col">
      <NavigationBar
        title={chat.name}
        showBack
        rightButton={
          <button
            onClick={handleAvatarClick}
            className="w-8 h-8 rounded-full overflow-hidden border border-[#c6c6c8]/50"
          >
            <img
              src={chat.avatar}
              alt={chat.name}
              className="w-full h-full object-cover"
            />
          </button>
        }
      />

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-12 h-12 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-[17px] text-[#3c3c43]/60">Нет сообщений</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`flex ${message.isMine ? "justify-end" : "justify-start"} gap-2`}
            >
              {/* Аватарка для чужих сообщений */}
              {!message.isMine && message.user && (
                <button
                  onClick={() => navigate(`/user/${message.userId}`)}
                  className="flex-shrink-0"
                >
                  <img
                    src={message.user.avatar}
                    alt={message.user.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                </button>
              )}

              <div className={`max-w-[75%] ${message.isMine ? "items-end" : "items-start"} flex flex-col`}>
                {!message.isMine && message.sender && (
                  <p className="text-[13px] font-medium text-[#3c3c43]/60 mb-1 px-3">
                    {message.sender}
                  </p>
                )}
                <div
                  className={`rounded-[20px] ${
                    message.isMine
                      ? "bg-gradient-to-br from-[#34C759] to-[#30D158] text-white rounded-br-sm"
                      : "bg-white text-black border border-[#c6c6c8]/30 rounded-bl-sm"
                  } ${message.kind === "image" ? "overflow-hidden p-1" : "px-4 py-2.5"}`}
                >
                  {message.kind === "image" && message.attachmentUrl ? (
                    <img
                      src={message.attachmentUrl}
                      alt="Вложение"
                      className="max-h-72 w-full rounded-[16px] object-cover"
                    />
                  ) : (
                    <p className="text-[17px] leading-snug">{message.text}</p>
                  )}
                </div>
                <p className="text-[13px] text-[#3c3c43]/50 mt-1 px-3">
                  {message.time}
                </p>
              </div>
            </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода */}
      <div className="border-t border-white/20 px-4 py-3 bg-white/70 backdrop-blur-2xl shadow-[0_-2px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-end gap-2">
          <label className={`w-9 h-9 rounded-full bg-[#e5e5ea] flex items-center justify-center flex-shrink-0 ${
            uploadingImage ? "cursor-wait" : "cursor-pointer"
          }`}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              disabled={uploadingImage}
              className="hidden"
            />
            {uploadingImage ? (
              <div className="w-5 h-5 border-2 border-[#34C759] border-t-transparent rounded-full animate-spin" />
            ) : (
              <ImageIcon className="w-5 h-5 text-[#34C759]" />
            )}
          </label>
          
          <div className="flex-1 bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/30 px-4 py-2 flex items-center gap-2 min-h-[40px]">
            <input
              type="text"
              placeholder="Сообщение"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              className="bg-transparent border-none outline-none text-[17px] placeholder:text-[#3c3c43]/40 flex-1"
            />
            <button className="p-1">
              <Smile className="w-5 h-5 text-[#3c3c43]/40" />
            </button>
          </div>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              inputValue.trim()
                ? "bg-gradient-to-br from-[#34C759] to-[#30D158]"
                : "bg-[#e5e5ea]"
            }`}
          >
            <Send 
              className={`w-5 h-5 ${
                inputValue.trim() ? "text-white" : "text-[#3c3c43]/40"
              }`}
              fill="currentColor"
            />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
