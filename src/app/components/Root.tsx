import { Outlet, useLocation } from "react-router-dom";
import TabBar from "./TabBar";

export default function Root() {
  const location = useLocation();
  
  // Скрываем TabBar на экранах чата, деталей события, настроек и форм
  const hideTabBar = location.pathname.startsWith('/chat/') ||
                     location.pathname.startsWith('/event/') ||
                     location.pathname.startsWith('/edit-event/') ||
                     location.pathname === '/settings' ||
                     location.pathname === '/edit-profile' ||
                     location.pathname === '/create-event';

  return (
    <div className="min-h-screen bg-[#f2f2f7] flex flex-col max-w-[430px] mx-auto">
      <div className="flex-1 pb-safe">
        <Outlet />
      </div>
      {!hideTabBar && <TabBar />}
    </div>
  );
}