import React, { useEffect, useState } from "react";
import axios from "axios";

const ChatSidebar = ({ user, onSelectChat }) => {
  const [historySummaries, setHistorySummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        // Mengambil ringkasan percakapan dari backend
        // Endpoint ini sekarang seharusnya mengembalikan data yang sudah dikelompokkan per conversation_id
        const res = await axios.get(`http://localhost:5000/history/user/${user.username}`);
        
        // Data yang diterima dari backend sudah berupa ringkasan percakapan
        // Kita hanya perlu memastikan formatnya sesuai dan mengurutkannya
        const fetchedSummaries = res.data.map(item => ({
            conversation_id: item.conversation_id,
            user: item.user, // Username pengguna
            created_at: item.created_at,
            firstMessageSnippet: item.first_message_snippet || "Percakapan tanpa judul" // Gunakan kolom baru
        }));

        // Urutkan berdasarkan waktu paling baru
        setHistorySummaries(fetchedSummaries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));

      } catch (err) {
        console.error("Gagal mengambil riwayat chat:", err);
        setError("Gagal memuat riwayat chat.");
      } finally {
        setLoading(false);
      }
    };

    if (user && user.username) {
      fetchHistory();
    }
  }, [user]);

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Memuat riwayat...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-4 bg-gray-100 flex-1 overflow-y-auto">
      <h2 className="text-xl font-bold mb-4 text-blue-700">Riwayat Chat Saya</h2>
      <div className="space-y-3">
        {historySummaries.length === 0 ? (
          <p className="text-gray-600 text-sm">Tidak ada riwayat chat untuk Anda.</p>
        ) : (
          historySummaries.map((summary, index) => (
            <div
              key={summary.conversation_id || index}
              className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:bg-blue-50 transition duration-150"
              onClick={() => onSelectChat(summary)} // summary sekarang berisi conversation_id
            >
              <p className="text-sm font-semibold text-gray-800 truncate">
                {summary.firstMessageSnippet}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(summary.created_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;