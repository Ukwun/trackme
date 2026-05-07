"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    // Load preference
    fetch("/api/preferences").then(res => res.json()).then(data => {
      if (data.preferences?.theme) {
        setTheme(data.preferences.theme);
        document.documentElement.classList.toggle("light-mode", data.preferences.theme === "light");
      }
    });
  }, []);
  function toggleTheme() {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.classList.toggle("light-mode", newTheme === "light");
    fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: newTheme })
    });
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
