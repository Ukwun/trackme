import { writeActivityLog } from "./activity";

export async function logActivity({ userId, action, meta = {} }: { userId?: string | null, action: string, meta?: any }) {
  await writeActivityLog({
    userId: userId ?? null,
    action,
    meta,
  });
}
