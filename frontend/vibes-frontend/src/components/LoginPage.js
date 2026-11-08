import React, { useState } from "react";

function LoginPage({ onLoginSuccess, onRegister }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

 const BASE_URL = "/api/auth";

const handleLogin = async () => {
  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data = await response.json();

    // ✅ Guarda o token completo (Bearer + token)
    localStorage.setItem("token", `${data.token_type} ${data.access_token}`);

    onLoginSuccess(`${data.token_type} ${data.access_token}`);
  } catch (error) {
    alert(error.message);
    setPassword(""); // Clear the password field on error
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>
          <span className="welcome-text">Welcome to</span>
        </h1>
        <h2>
          <span className="app-name">VIBES</span>
        </h2>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        <button className="login-button" onClick={handleLogin}>
          Log In
        </button>

        <p>
          or{" "}
          <span className="register-link" onClick={onRegister}>
            Register
          </span>
        </p>
      </header>
    </div>
  );
}

export default LoginPage;
