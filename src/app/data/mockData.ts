export type ParticipationStatus = "none" | "joined" | "pending" | "rejected";

export interface EventRequest {
  id: string;
  eventId: string;
  userId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
  maxAttendees: number;
  isJoined: boolean;
  participationStatus: ParticipationStatus;
  description: string;
  organizer: string;
  organizerId: string;
  image: string;
  category: string;
  latitude: number;
  longitude: number;
  isPrivate?: boolean;
  requiresApproval?: boolean;
  hideAttendees?: boolean;
  pendingRequestsCount?: number;
}

export interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  isEventChat?: boolean;
  eventId?: string;
}

export interface Message {
  id: string;
  text: string;
  time: string;
  isMine: boolean;
  sender?: string;
  userId?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  phone: string;
  birthYear: number;
  availableForInvites: boolean;
}

export const userProfile: UserProfile = {
  id: "me",
  name: "Иван Петров",
  username: "ivan_petrov",
  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
  bio: "Основатель стартапа | Люблю нетворкинг",
  phone: "+7 (999) 123-45-67",
  birthYear: 1995,
  availableForInvites: true
};

// Существующие имена пользователей для проверки уникальности
export const existingUsernames = [
  "ivan_petrov",
  "maria_petrova",
  "alex_ivanov",
  "dmitry_kozlov",
  "anna_volkova"
];

export const events: Event[] = [
  {
    id: "1",
    title: "Встреча стартаперов Москвы",
    date: "15 апреля",
    time: "19:00",
    location: "Кофейня «Точка», Покровка 12",
    attendees: 12,
    maxAttendees: 20,
    isJoined: false,
    participationStatus: "none",
    description: "Встреча для основателей стартапов и тех, кто хочет создать свой проект. Обсудим идеи, поделимся опытом.",
    organizer: "Александр Иванов",
    organizerId: "user2",
    image: "https://images.unsplash.com/photo-1763739530672-4aadafbd81ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMG5ldHdvcmtpbmclMjBldmVudCUyMHBlb3BsZSUyMHRhbGtpbmd8ZW58MXx8fHwxNzc1OTcwMjkzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "Бизнес",
    latitude: 55.7558,
    longitude: 37.6173
  },
  {
    id: "2",
    title: "Нетворкинг для IT-специалистов",
    date: "17 апреля",
    time: "18:30",
    location: "Impact Hub, Трубная 21",
    attendees: 24,
    maxAttendees: 30,
    isJoined: true,
    participationStatus: "joined",
    description: "Открытая встреча для разработчиков, дизайнеров и продакт-менеджеров.",
    organizer: "Мария Петрова",
    organizerId: "user3",
    image: "https://images.unsplash.com/photo-1659044537787-a2ac4ce1d427?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFydHVwJTIwbWVldHVwJTIwY293b3JraW5nJTIwc3BhY2V8ZW58MXx8fHwxNzc1OTcwMjk0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "IT",
    latitude: 55.7635,
    longitude: 37.6242
  },
  {
    id: "3",
    title: "Вечер знакомств 25+",
    date: "18 апреля",
    time: "20:00",
    location: "Бар «Стрелка», Берсеневская наб. 14",
    attendees: 18,
    maxAttendees: 25,
    isJoined: false,
    participationStatus: "none",
    description: "Неформальная встреча для тех, кто хочет познакомиться с новыми людьми в дружеской атмосфере.",
    organizer: "Екатерина Смирнова",
    organizerId: "user4",
    image: "https://images.unsplash.com/photo-1760446582797-f63680a14ab8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXIlMjBldmVuaW5nJTIwZHJpbmtzJTIwcGVvcGxlfGVufDF8fHx8MTc3NTk3MDI5NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "Знакомства",
    latitude: 55.7423,
    longitude: 37.6065
  },
  {
    id: "4",
    title: "Бизнес-завтрак для маркетологов",
    date: "20 апреля",
    time: "09:00",
    location: "The Loft, Новинский бульвар 8",
    attendees: 8,
    maxAttendees: 15,
    isJoined: false,
    participationStatus: "none",
    description: "Утренний нетворкинг для маркетологов и специалистов по рекламе.",
    organizer: "Дмитрий Козлов",
    organizerId: "user5",
    image: "https://images.unsplash.com/photo-1765795019773-3330d68f238a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGJyZWFrZmFzdCUyMG1vZGVybiUyMGNhZmV8ZW58MXx8fHwxNzc1OTcwMjk1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "Бизнес",
    latitude: 55.7539,
    longitude: 37.5874
  },
  {
    id: "5",
    title: "Настольные игры и общение",
    date: "21 апреля",
    time: "17:00",
    location: "Антикафе «Циферблат», Тверская 12",
    attendees: 15,
    maxAttendees: 20,
    isJoined: true,
    participationStatus: "joined",
    description: "Играем в настолки и знакомимся с новыми людьми.",
    organizer: "Анна Волкова",
    organizerId: "user6",
    image: "https://images.unsplash.com/photo-1677094365560-9f88ce594e7c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib2FyZCUyMGdhbWVzJTIwZnJpZW5kcyUyMHBsYXlpbmd8ZW58MXx8fHwxNzc1OTcwMjk1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "Развлечения",
    latitude: 55.7647,
    longitude: 37.6055
  },
];

export const chats: Chat[] = [
  {
    id: "1",
    name: "Нетворкинг для IT",
    avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100&h=100&fit=crop",
    lastMessage: "Привет! Увидимся завтра?",
    time: "14:32",
    unread: 2
  },
  {
    id: "2",
    name: "Александр Иванов",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    lastMessage: "Отлично, жду на встрече!",
    time: "Вчера",
    unread: 0
  },
  {
    id: "3",
    name: "Настольные игры",
    avatar: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=100&h=100&fit=crop",
    lastMessage: "Кто принесет Монополию?",
    time: "Вчера",
    unread: 5
  },
  {
    id: "4",
    name: "Мария Петрова",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    lastMessage: "Спасибо за контакты!",
    time: "Пн",
    unread: 0
  },
];

export const messages: Message[] = [
  {
    id: "1",
    text: "Привет! Ты идёшь на встречу завтра?",
    time: "14:30",
    isMine: false,
    sender: "Александр"
  },
  {
    id: "2",
    text: "Да, конечно! Буду в 19:00",
    time: "14:31",
    isMine: true
  },
  {
    id: "3",
    text: "Отлично, жду на встрече!",
    time: "14:32",
    isMine: false,
    sender: "Александр"
  },
];