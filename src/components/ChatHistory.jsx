import React, { useEffect, useState } from "react";
import axios from "axios";

const ChatHistory = () => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get("http://localhost:5000/history");
        setHistory(res.data);
      } catch (err) {
        console.error("Gagal mengambil riwayat chat:", err);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">📜 Riwayat Chat</h2>
      <div className="space-y-4">
        {history.length === 0 ? (
          <p>Tidak ada riwayat chat.</p>
        ) : (
          history.map((item, index) => (
            <div key={index} className="bg-white p-4 shadow rounded">
              <p><strong>🧑 User:</strong> {item.user}</p>
              <p><strong>🤖 Bot:</strong> {item.bot}</p>
              <p className="text-sm text-gray-500">🕒 {new Date(item.created_at).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatHistory;
