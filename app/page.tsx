import { KanbanApp } from "@/components/kanban/kanban-app";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getBoardData } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  await ensureDatabaseReady();
  const board = await getBoardData({
    includeHidden: false,
    includeArchived: false,
  });

  return <KanbanApp initialBoard={board} initialAdmin={false} mode="public" />;
}
