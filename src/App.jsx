import React, { useState, useEffect } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MainLayout from "./pages/MainLayout"; // Updated import path

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("login");

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    localStorage.setItem("user", JSON.stringify(loggedInUser));
    setPage("chat"); // Redirect to chat page on login
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    setPage("login");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex space-x-4 absolute top-4 right-4">
          <button
            onClick={() => setPage("login")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              page === "login" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            🔓 Login
          </button>
          <button
            onClick={() => setPage("register")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              page === "register" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            📝 Register
          </button>
        </div>
        {page === "login" ? <Login onLogin={handleLogin} /> : <Register />}
      </div>
    );
  }

  return (
    <MainLayout user={user} handleLogout={handleLogout} />
  );
}

export default App;