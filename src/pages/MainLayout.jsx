import React, { useState } from "react";
import ChatPage from "../pages/ChatPage";
import ChatSidebar from "../components/ChatSidebar"; // Renamed and modified ChatHistory
import PDFUploadPage from "../components/PDFUpload";
import AdminChatHistory from "../pages/AdminChatHistory"; // The admin specific history page
import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating unique IDs

const MainLayout = ({ user, handleLogout }) => {
  const [chatLog, setChatLog] = useState([]);
  const [activePage, setActivePage] = useState("chat"); // Controls main content area
  // State to manage the ID of the current conversation
  const [currentConversationId, setCurrentConversationId] = useState(uuidv4());
  // To eventually load specific chats (frontend simulation for now)
  const [selectedChatSummary, setSelectedChatSummary] = useState(null);

  // Function to simulate loading a past chat (backend limitation acknowledged)
  const handleSelectChat = (chatSummary) => {
    setSelectedChatSummary(chatSummary);
    // In a real scenario, you'd fetch the full chat log for this conversation_id
    // For now, we'll just display a message about the selected chat
    setChatLog([
      { sender: "bot", content: `Anda memilih riwayat chat dari: "${chatSummary.user}" pada ${new Date(chatSummary.created_at).toLocaleString()}.` },
      { sender: "bot", content: "Fungsi memuat riwayat percakapan lengkap akan tersedia setelah backend diupdate dengan ID percakapan." }
    ]);
    setCurrentConversationId(chatSummary.conversation_id || uuidv4()); // Use existing ID or generate new
    setActivePage("chat");
  };

  const handleNewChat = () => {
    setChatLog([]); // Clear current chat for a new one
    setSelectedChatSummary(null); // Clear selected summary
    setCurrentConversationId(uuidv4()); // Generate a brand new ID for the new chat
    setActivePage("chat");
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      {/* Sidebar */}
      <div className="w-64 bg-blue-800 text-white flex flex-col p-4 shadow-lg">
        <h2 className="text-2xl font-bold mb-6 border-b border-blue-600 pb-3">BPJS Chatbot</h2>
        <nav className="flex-1 space-y-2">
          <button
            onClick={handleNewChat}
            className="w-full text-left px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 flex items-center space-x-2 text-lg font-medium"
          >
            <span className="text-xl">💬</span>
            <span>Obrolan Baru</span>
          </button>
          <button
            onClick={() => setActivePage("myHistory")}
            className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-2 ${
              activePage === "myHistory" ? "bg-blue-600" : "hover:bg-blue-700"
            }`}
          >
            <span className="text-lg">📜</span>
            <span>Riwayat Chat Saya</span>
          </button>
          {user.role === "admin" && (
            <>
              <button
                onClick={() => setActivePage("upload")}
                className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-2 ${
                  activePage === "upload" ? "bg-blue-600" : "hover:bg-blue-700"
                }`}
              >
                <span className="text-lg">📤</span>
                <span>Unggah PDF</span>
              </button>
              <button
                onClick={() => setActivePage("adminHistory")}
                className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-2 ${
                  activePage === "adminHistory" ? "bg-blue-600" : "hover:bg-blue-700"
                }`}
              >
                <span className="text-lg">📂</span>
                <span>Semua Chat (Admin)</span>
              </button>
            </>
          )}
        </nav>
        <div className="mt-auto pt-4 border-t border-blue-600">
          <p className="text-sm">Logged in as: <strong className="font-medium">{user.username} ({user.role})</strong></p>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 mt-2 rounded-lg bg-red-600 hover:bg-red-700 flex items-center space-x-2 text-lg font-medium"
          >
            <span className="text-xl">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-gray-100">
        {activePage === "chat" && (
          <ChatPage
            user={user}
            chatLog={chatLog}
            setChatLog={setChatLog}
            currentConversationId={currentConversationId} // Pass conversation ID
            selectedChatSummary={selectedChatSummary}
          />
        )}
        {activePage === "myHistory" && <ChatSidebar user={user} onSelectChat={handleSelectChat} />}
        {activePage === "upload" && user.role === "admin" && <PDFUploadPage user={user} />}
        {activePage === "adminHistory" && user.role === "admin" && <AdminChatHistory user={user} />}
      </div>
    </div>
  );
};

export default MainLayout;