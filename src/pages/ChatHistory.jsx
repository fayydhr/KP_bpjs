import React, { useEffect, useState } from "react";

function ChatHistory({ user }) {
  const [history, setHistory] = useState([]);
  const [groupedHistory, setGroupedHistory] = useState({});

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`http://localhost:5000/history?user_id=${user.id}`);
        const data = await res.json();
        setHistory(data.history || []); // Assuming the API returns an object with a 'history' key

        // Group messages by date
        const grouped = {};
        (data.history || []).forEach(chat => {
          const date = new Date(chat.timestamp).toLocaleDateString("id-ID", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          if (!grouped[date]) {
            grouped[date] = [];
          }
          grouped[date].push(chat);
        });
        setGroupedHistory(grouped);
      } catch (err) {
        console.error("Gagal mengambil riwayat chat:", err);
      }
    };

    fetchHistory();
  }, [user]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">📜 Riwayat Chat Anda</h2>
      <div className="space-y-4">
        {Object.keys(groupedHistory).length === 0 ? (
          <p>Tidak ada riwayat chat.</p>
        ) : (
          Object.keys(groupedHistory).sort((a, b) => new Date(a) - new Date(b)).map(date => (
            <div key={date}>
              <h3 className="text-lg font-semibold text-gray-800 my-4 text-center">{date}</h3>
              <div className="space-y-4">
                {groupedHistory[date].map((chat, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      chat.role === "user" ? "bg-blue-100 text-right" : "bg-gray-100 text-left"
                    }`}
                  >
                    <p className="text-sm text-gray-600">{chat.role === "user" ? "👤 Anda" : "🤖 Bot"}</p>
                    <p className="text-base">{chat.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(chat.timestamp).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ChatHistory;