"use client";
import { useEffect, useState } from "react";

export default function UserManagement({ token }: { token: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/user", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Failed to fetch users");
    setUsers(data.users || []);
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, []);

  async function handleRoleChange(userId: string, role: string) {
    setLoading(true);
    setError("");
    const res = await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, role }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Failed to update role");
    fetchUsers();
  }

  return (
    <div className="tm-card p-4">
      <div className="font-semibold mb-2">User Management</div>
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      {loading && <div>Loading...</div>}
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Email</th>
            <th className="text-left">Role</th>
            <th className="text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id}>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>
                <select
                  value={u.role}
                  onChange={e => handleRoleChange(u._id, e.target.value)}
                  className="border rounded p-1"
                  disabled={loading}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                  <option value="super_admin">super_admin</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
