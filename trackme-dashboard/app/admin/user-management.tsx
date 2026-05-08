import { useEffect, useState } from "react";
import { getPermissions } from "../../src/api/permissions";
import { useUser } from "@clerk/nextjs";

type User = {
  _id: string;
  email: string;
  role: string;
};

export default function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user: currentUser } = useUser();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/user");
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
  }, []);

  async function handleRoleChange(userId: string, role: string) {
    await fetch("/api/user", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, role }),
    });
    setUsers(users => users.map(u => u._id === userId ? { ...u, role } : u));
  }

  if (loading) return <div>Loading users...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

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
                  disabled={user._id === currentUser?.id}
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
