import { cookies } from "next/headers";

import { KanbanApp } from "@/components/kanban/kanban-app";
import { ADMIN_COOKIE_NAME, isValidAdminSession } from "@/lib/auth/session";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getBoardData } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await ensureDatabaseReady();

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const isAdmin = await isValidAdminSession(token);

  const board = await getBoardData({
    includeHidden: isAdmin,
    includeArchived: false,
  });

  return <KanbanApp initialBoard={board} initialAdmin={isAdmin} mode="admin" />;
}

