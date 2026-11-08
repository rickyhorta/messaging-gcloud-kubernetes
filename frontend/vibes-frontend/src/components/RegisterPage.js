import React, { useState } from "react";

function RegisterPage({ onShowLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const BASE_URL = "/api/auth";

  const handleRegister = async () => {
    setError("");
    setSuccess("");

    if (!username.trim()) {
      setError("Please choose a username.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `Registration failed (${response.status})`);
      }

      setSuccess("Account created! Redirecting to login...");
      setTimeout(() => onShowLogin(), 1500);
    } catch (err) {
      if (err instanceof TypeError) {
        setError("Cannot reach the server. Is the backend running?");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>
          <span className="welcome-text">Join</span>
        </h1>
        <h2>
          <span className="app-name">VIBES</span>
        </h2>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRegister()}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRegister()}
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRegister()}
        />

        {error && (
          <p style={{ color: "#fe5252", fontSize: "0.9rem", margin: "8px 0" }}>
            {error}
          </p>
        )}
        {success && (
          <p style={{ color: "#5acb6d", fontSize: "0.9rem", margin: "8px 0" }}>
            {success}
          </p>
        )}

        <button
          className="login-button"
          onClick={handleRegister}
          disabled={loading || !!success}
        >
          {loading ? "Creating account..." : "Register"}
        </button>

        <p>
          Already have an account?{" "}
          <span
            className="register-link"
            style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={onShowLogin}
          >
            Log In
          </span>
        </p>
      </header>
    </div>
  );
}

export default RegisterPage;
