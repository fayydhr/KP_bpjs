import React, { useState } from "react";
import axios from "axios";

const UploadPdfPage = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus("");
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus("Pilih file PDF terlebih dahulu");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://localhost:5000/upload_pdf", formData);
      setStatus(`✅ ${res.data.message}`);
    } catch (err) {
      setStatus(`❌ ${err.response?.data?.error || "Gagal upload file"}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 to-indigo-500 px-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
        <h2 className="text-xl font-bold text-indigo-700 mb-4">📄 Upload Dokumen SOP</h2>

        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="mb-4 block w-full"
        />

        <button
          onClick={handleUpload}
          className="bg-indigo-600 text-white px-6 py-2 rounded-full hover:bg-indigo-700"
        >
          Upload
        </button>

        {status && (
          <p className="mt-4 text-sm text-gray-700">{status}</p>
        )}
      </div>
    </div>
  );
};

export default UploadPdfPage;
