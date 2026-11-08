import React, { useState, useEffect } from "react";
import "./App.css";
import LoginPage from "./components/LoginPage";
import ChatPage from "./components/ChatPage";
import RegisterPage from "./components/RegisterPage";

function App() {
  // view: "login" | "chat" | "register"
  const [view, setView] = useState("login");
  const [token, setToken] = useState(null);

  // On mount, check if a token exists (e.g., after reload)
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      setView("chat");
    }
  }, []);

  const handleLoginSuccess = (accessToken) => {
    // Save the token to localStorage
    localStorage.setItem("token", accessToken);
    setToken(accessToken);
    setView("chat");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setView("login");
  };

  if (view === "register") {
    return <RegisterPage onShowLogin={() => setView("login")} />;
  }
  if (view === "login") {
    return <LoginPage onLoginSuccess={handleLoginSuccess} onRegister={() => setView("register")} />;
  }
  return <ChatPage token={token} onLogout={handleLogout} />;
  
}

export default App;
