import React, { useState } from "react";
import axios from "axios";

const PDFUpload = ({ user }) => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  if (user.role !== "admin") return null;

  const handleUpload = async () => {
    if (!file) {
      setMessage("Pilih file PDF terlebih dahulu");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://localhost:5000/upload_pdf", formData);
      setMessage(`✅ ${res.data.message}`);
      setFile(null); // Clear file input after successful upload
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.error || "Gagal upload file"}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-indigo-100 px-4 py-6">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center border border-gray-200">
        <h2 className="text-2xl font-bold text-indigo-700 mb-6">📤 Unggah Dokumen SOP (Admin)</h2>

        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-6 block w-full text-sm text-gray-700
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />

        <button
          onClick={handleUpload}
          className="bg-indigo-600 text-white px-8 py-3 rounded-full hover:bg-indigo-700 transition duration-200 shadow-md text-lg font-semibold"
          disabled={!file}
        >
          Unggah File
        </button>

        {message && (
          <p className={`mt-4 text-sm font-medium ${message.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default PDFUpload;