"use client";
import { useState, useEffect } from "react";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });

  useEffect(() => {
    fetch("/api/user/profile").then(res => res.json()).then(data => {
      setProfile(data.profile);
      setForm({ name: data.profile.name, email: data.profile.email });
    });
  }, []);

  async function handleSave(e: any) {
    e.preventDefault();
    await fetch("/api/user/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditing(false);
  }

  if (!profile) return <div>Loading...</div>;
  return (
    <div className="tm-card p-6 max-w-lg mx-auto mt-10">
      <h2 className="text-xl font-bold mb-4">My Profile</h2>
      {editing ? (
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="tm-input" />
          <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="tm-input" />
          <button className="tm-btn tm-btn-primary" type="submit">Save</button>
        </form>
      ) : (
        <div>
          <div><b>Name:</b> {profile.name}</div>
          <div><b>Email:</b> {profile.email}</div>
          <div><b>Role:</b> {profile.role}</div>
          <button className="tm-btn mt-4" onClick={() => setEditing(true)}>Edit</button>
        </div>
      )}
    </div>
  );
}
