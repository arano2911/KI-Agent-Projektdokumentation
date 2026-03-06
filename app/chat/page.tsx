import { Header } from "@/components/layout/header";
import { ChatWindow } from "@/components/chat/chat-window";

export const revalidate = 0;

export default function ChatPage() {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <ChatWindow />
    </div>
  );
}
