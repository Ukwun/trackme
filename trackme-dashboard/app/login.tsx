"use client";
import { useState } from "react";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    // Simulate login
    setTimeout(() => {
      setLoading(false);
      if (email === "admin@trackme.com" && password === "password") {
        window.location.href = "/";
      } else {
        setError("Invalid credentials");
      }
    }, 1200);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] relative overflow-hidden">
      {/* Animated World Map Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <svg width="100%" height="100%" viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-pulse-slow">
          <circle cx="400" cy="300" r="180" fill="#2563eb22">
            <animate attributeName="r" values="180;200;180" dur="6s" repeatCount="indefinite" />
          </circle>
          <circle cx="1000" cy="500" r="140" fill="#22d3ee22">
            <animate attributeName="r" values="140;170;140" dur="7s" repeatCount="indefinite" />
          </circle>
          <circle cx="800" cy="200" r="90" fill="#f59e4222">
            <animate attributeName="r" values="90;120;90" dur="8s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>
      {/* Glassmorphism Login Card */}
      <form onSubmit={handleLogin} className="relative z-10 w-full max-w-sm p-8 rounded-2xl shadow-2xl backdrop-blur-md bg-white/10 border border-white/20 flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-white text-center mb-2 tracking-widest">TRACKME</h1>
        <div className="flex flex-col gap-2">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="p-3 rounded bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="p-3 rounded bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>
        <button type="submit" className="w-full py-3 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-60" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
        {error && <div className="text-red-400 text-center text-sm mt-2">{error}</div>}
      </form>
    </div>
  );
}
