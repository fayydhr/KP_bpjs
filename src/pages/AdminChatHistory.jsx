import React, { useEffect, useState } from "react";
import axios from "axios"; // Added axios import for consistency

function AdminChatHistory({ user }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user.role !== "admin") {
        setError("Anda tidak memiliki izin untuk melihat halaman ini.");
        setLoading(false);
        return;
    }

    const fetchAdminHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`http://localhost:5000/admin/history?role=${user.role}`);
        setHistory(res.data.history || []);
      } catch (err) {
        console.error("Gagal mengambil riwayat chat admin:", err);
        setError(`Gagal memuat riwayat chat admin: ${err.response?.data?.error || err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminHistory();
  }, [user]);

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Memuat riwayat chat admin...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto bg-gray-100 min-h-screen">
      <h2 className="text-3xl font-bold mb-6 text-red-700">🧑‍💼 Riwayat Semua Chat (Admin)</h2>
      <div className="space-y-4">
        {history.length === 0 ? (
          <p className="text-gray-600 text-base">Tidak ada riwayat chat yang tersedia untuk admin.</p>
        ) : (
          history.map((chat, index) => (
            <div
              key={index}
              className={`p-5 border rounded-lg shadow-sm transition duration-150 ${
                chat.role === "user" ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                <span className="font-semibold text-gray-700">🧾 User ID: {chat.user_id}</span>
                <span className="text-gray-500">{new Date(chat.timestamp).toLocaleString()}</span>
              </div>
              <p className="text-base font-semibold mb-1 text-gray-900">{chat.role === "user" ? "👤 User" : "🤖 Bot"}</p>
              <p className="text-gray-800 whitespace-pre-wrap">{chat.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AdminChatHistory;