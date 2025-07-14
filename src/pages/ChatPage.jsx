import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

const ChatPage = ({ user, chatLog, setChatLog, currentConversationId, selectedChatSummary }) => {
  const [mode, setMode] = useState("sql");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Scroll to the bottom of the chat log when messages are added
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  useEffect(() => {
    const loadSelectedChat = async () => {
      if (selectedChatSummary && selectedChatSummary.conversation_id) {
        setLoading(true);
        try {
          const res = await axios.get(`http://localhost:5000/chat/conversation/${selectedChatSummary.conversation_id}`);
          const loadedLog = res.data.flatMap(item => {
            const messages = [];
            if (item.user_question) { // User's message
              messages.push({ sender: "user", content: item.user_question });
            }
            if (item.bot) { // Bot's response
              messages.push({ sender: "bot", content: item.bot });
            }
            return messages;
          });
          setChatLog(loadedLog);
        } catch (err) {
          console.error("Gagal memuat detail percakapan:", err);
          setChatLog([
            { sender: "bot", content: `❌ Gagal memuat riwayat percakapan: ${err.response?.data?.error || err.message}` }
          ]);
        } finally {
          setLoading(false);
        }
      } else if (chatLog.length === 0) { // Only show welcome message if no chat is loaded or selected
        setChatLog([
          { sender: "bot", content: "Selamat datang di BPJS Chatbot! 🎉\n\nSaya asisten virtual Anda untuk informasi BPJS.\n\nAnda dapat memilih mode 'Database Query' untuk mencari data pengguna, keluhan, atau rujukan medis, atau mode 'Dokumen SOP' untuk mendapatkan informasi dari dokumen prosedur BPJS." }
        ]);
      }
    };

    loadSelectedChat();
  }, [selectedChatSummary]); // Rerun when a new chat summary is selected

  const handleSend = async () => {
    if (!message.trim() || loading) return;

    const userMsg = { sender: "user", content: message };
    setChatLog((prev) => [...prev, userMsg]);
    setMessage("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:5000/chat", {
        command: `/${mode} ${message}`,
        username: user.username,
        conversation_id: currentConversationId, // Send the current conversation ID
      });
      const botMsg = { sender: "bot", content: res.data.response };
      setChatLog((prev) => [...prev, botMsg]);
    } catch (err) {
      const errMsg = { sender: "bot", content: `❌ Terjadi kesalahan: ${err.response?.data?.error || err.message}` };
      setChatLog((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-white flex flex-col p-6">
      <div className="w-full h-[85vh] bg-white shadow-xl rounded-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-5 relative">
          <div className="absolute top-5 right-5 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <h1 className="text-xl font-bold">🏥 BPJS Chatbot</h1>
          <p className="text-sm text-white/90">Asisten Virtual untuk Informasi BPJS</p>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-100 space-y-3">
          {chatLog.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex items-start gap-2 max-w-[70%]`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 ${
                    msg.sender === "user" ? "bg-indigo-500" : "bg-blue-600"
                  }`}
                >
                  {msg.sender === "user" ? "👤" : "🤖"}
                </div>
                <div
                  className={`p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.sender === "user"
                      ? "bg-indigo-500 text-white rounded-br-sm"
                      : "bg-white text-gray-800 border rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-gray-600 text-sm">
              <span>🤖 Bot sedang mengetik...</span>
              <span className="animate-pulse">...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Mode selector & input */}
        <div className="p-4 bg-white border-t">
          <div className="flex gap-2 mb-3 flex-wrap">
            <button
              className={`px-4 py-1 border-2 text-sm rounded-full transition duration-200 ${
                mode === "sql"
                  ? "bg-blue-600 text-white border-blue-600 shadow-md"
                  : "text-blue-600 border-blue-600 hover:bg-blue-50"
              }`}
              onClick={() => setMode("sql")}
            >
              🗃️ Database Query
            </button>
            <button
              className={`px-4 py-1 border-2 text-sm rounded-full transition duration-200 ${
                mode === "pdf"
                  ? "bg-blue-600 text-white border-blue-600 shadow-md"
                  : "text-blue-600 border-blue-600 hover:bg-blue-50"
              }`}
              onClick={() => setMode("pdf")}
            >
              📄 Dokumen SOP
            </button>
          </div>

          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder={
                mode === "sql"
                  ? "Contoh: Tampilkan data user dengan NIK 1234567890123456"
                  : "Contoh: Bagaimana cara mengajukan klaim BPJS?"
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-3 rounded-full shadow-md hover:from-blue-700 hover:to-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;