"use client";
import { useEffect, useState } from "react";
import { getPermissions } from "../../src/api/permissions";
import { getClientSession } from "../../src/lib/clientAuth";
import { EmptyState, LoadingState, OperationalState, UnauthorizedState } from "../../src/components/ui/OperationalState";

type User = {
  _id: string;
  email: string;
  role: string;
};

export default function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState(() => ({ token: null as string | null, role: null as string | null, userId: null as string | null }));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setSession(getClientSession());
    sync();
    window.addEventListener("tm-auth-changed", sync);
    return () => window.removeEventListener("tm-auth-changed", sync);
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        if (!session.token) {
          setUsers([]);
          setError("Authentication token missing");
          return;
        }
        const res = await fetch("/api/user", {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch users");
        setUsers(data.users);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [session.token]);

  async function handleRoleChange(userId: string, role: string) {
    if (!session.token) return;
    await fetch("/api/user", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ userId, role }),
    });
    setUsers(users => users.map(u => u._id === userId ? { ...u, role } : u));
  }

  if (session.role !== "super_admin") {
    return <UnauthorizedState detail="Only super admin can manage platform user roles." />;
  }

  if (loading) return <LoadingState title="Loading user directory..." />;
  if (error) return <OperationalState title="Unable to load users" detail={error} tone="danger" />;
  if (users.length === 0) {
    return <EmptyState title="No users found" detail="Register users to begin role-based operations." />;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin User Management</h1>
      <table className="w-full border">
        <thead>
          <tr>
            <th className="border px-2 py-1">User ID</th>
            <th className="border px-2 py-1">Email</th>
            <th className="border px-2 py-1">Role</th>
            <th className="border px-2 py-1">Permissions</th>
            <th className="border px-2 py-1">Change Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id}>
              <td className="border px-2 py-1">{user._id}</td>
              <td className="border px-2 py-1">{user.email}</td>
              <td className="border px-2 py-1">{user.role}</td>
              <td className="border px-2 py-1 text-xs">{getPermissions(user.role).join(", ")}</td>
              <td className="border px-2 py-1">
                <select
                  value={user.role}
                  onChange={e => handleRoleChange(user._id, e.target.value)}
                  disabled={user._id === session.userId}
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
