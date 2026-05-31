import { createBrowserRouter } from "react-router-dom";
import Root from "./components/Root";
import EventsList from "./components/EventsList";
import MyEvents from "./components/MyEvents";
import ChatsList from "./components/ChatsList";
import ChatScreen from "./components/ChatScreen";
import EventDetails from "./components/EventDetails";
import EventAttendees from "./components/EventAttendees";
import EventMap from "./components/EventMap";
import EventRequests from "./components/EventRequests";
import UserProfile from "./components/UserProfile";
import Settings from "./components/Settings";
import EditProfile from "./components/EditProfile";
import CreateEvent from "./components/CreateEvent";
import EditEvent from "./components/EditEvent";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: EventsList },
      { path: "my-events", Component: MyEvents },
      { path: "chats", Component: ChatsList },
      { path: "chat/:id", Component: ChatScreen },
      { path: "event/:id", Component: EventDetails },
      { path: "event/:id/attendees", Component: EventAttendees },
      { path: "event/:id/map", Component: EventMap },
      { path: "event/:id/requests", Component: EventRequests },
      { path: "user/:userId", Component: UserProfile },
      { path: "edit-event/:id", Component: EditEvent },
      { path: "settings", Component: Settings },
      { path: "edit-profile", Component: EditProfile },
      { path: "create-event", Component: CreateEvent },
    ],
  },
]);