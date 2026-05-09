"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("dark");
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncAuth = () => {
      setAuthToken(window.localStorage.getItem("tm_auth_token"));
    };
    syncAuth();
    window.addEventListener("tm-auth-changed", syncAuth);
    return () => window.removeEventListener("tm-auth-changed", syncAuth);
  }, []);

  useEffect(() => {
    if (!authToken) return;
    // Load preference
    fetch("/api/preferences", {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.preferences?.theme) {
          setTheme(data.preferences.theme);
          document.documentElement.classList.toggle("light-mode", data.preferences.theme === "light");
        }
      })
      .catch(() => undefined);
  }, [authToken]);

  function toggleTheme() {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.classList.toggle("light-mode", newTheme === "light");
    if (!authToken) return;

    fetch("/api/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ theme: newTheme })
    }).catch(() => undefined);
  }
  return (
    <button
      className="tm-btn-primary px-3 py-1 rounded-full text-xs fixed top-4 right-4 z-50"
      onClick={toggleTheme}
      aria-label="Toggle dark/light mode"
    >
      {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}
