import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "../lib/db/client";
import { ensureDatabaseReady } from "../lib/db/init";
import { boardSettings, columns, tasks } from "../lib/db/schema";

const initialColumns = [
  { title: "Planning", color: "#93c5fd" },
  { title: "Building", color: "#fcd34d" },
  { title: "Testing", color: "#c4b5fd" },
  { title: "Live", color: "#6ee7b7" },
];

const sampleTasks = [
  {
    externalRef: "sample-planning-website-audit",
    columnSlug: "planning",
    title: "Website Analytics Audit",
    description:
      "Map funnel drop-offs and define event instrumentation plan for the portfolio funnel.",
    priority: "high" as const,
    progress: 20,
    tags: ["Analytics", "Funnel", "Planning"],
    projectUrl: "https://rukesh.in",
    repoUrl: "",
    agentId: "strategy-agent-1",
    updatedBy: "agent",
  },
  {
    externalRef: "sample-building-content-cluster",
    columnSlug: "building",
    title: "AI SEO Content Cluster Build",
    description:
      "Generate and structure pages for high-intent SEO clusters with internal link recommendations.",
    priority: "critical" as const,
    progress: 55,
    tags: ["SEO", "AI", "Content"],
    projectUrl: "https://rukesh.in",
    repoUrl: "",
    agentId: "seo-agent-1",
    updatedBy: "agent",
  },
  {
    externalRef: "sample-testing-cro-experiments",
    columnSlug: "testing",
    title: "CRO Experiment Set #04",
    description:
      "Validate new CTA copy and card ordering in A/B runs before publishing to all traffic.",
    priority: "medium" as const,
    progress: 75,
    tags: ["CRO", "A/B Test", "UX"],
    projectUrl: "https://rukesh.in",
    repoUrl: "",
    agentId: "ux-agent-2",
    updatedBy: "agent",
  },
  {
    externalRef: "sample-live-kanban-launch",
    columnSlug: "live",
    title: "Portfolio Kanban Launch",
    description:
      "Deploy the read-only public board with admin-only editing mode and agent ingestion endpoints.",
    priority: "high" as const,
    progress: 90,
    tags: ["Next.js", "Kanban", "Portfolio"],
    projectUrl: "https://rukesh.in",
    repoUrl: "",
    agentId: "ops-agent-1",
    updatedBy: "admin",
  },
  {
    externalRef: "sample-live-report-automation",
    columnSlug: "live",
    title: "Weekly Performance Snapshot Automation",
    description:
      "Automate weekly KPI summary generation for active projects and feed status back into the board.",
    priority: "low" as const,
    progress: 100,
    tags: ["Automation", "Reporting", "Ops"],
    projectUrl: "https://rukesh.in",
    repoUrl: "",
    agentId: "reporting-agent-1",
    updatedBy: "agent",
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function seed() {
  await ensureDatabaseReady();

  const settings = await db.select().from(boardSettings).limit(1);
  if (settings.length === 0) {
    await db.insert(boardSettings).values({
      id: "default",
      title: "Active Projects",
      description: "Current client and product builds in progress.",
      updatedAt: new Date().toISOString(),
    });
  }

  const existingColumns = await db.select().from(columns).limit(1);
  if (existingColumns.length === 0) {
    await db.insert(columns).values(
      initialColumns.map((column, index) => ({
        id: randomUUID(),
        title: column.title,
        slug: slugify(column.title),
        position: index,
        color: column.color,
        isVisible: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    );
  }

  const allColumns = await db.select().from(columns);
  const columnBySlug = new Map(allColumns.map((column) => [column.slug, column]));

  for (const sampleTask of sampleTasks) {
    const targetColumn = columnBySlug.get(sampleTask.columnSlug);
    if (!targetColumn) {
      continue;
    }

    const [existingTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.externalRef, sampleTask.externalRef))
      .limit(1);

    if (existingTask) {
      continue;
    }

    const taskCountInColumn = await db
      .select()
      .from(tasks)
      .where(eq(tasks.columnId, targetColumn.id));

    await db.insert(tasks).values({
      id: randomUUID(),
      columnId: targetColumn.id,
      title: sampleTask.title,
      description: sampleTask.description,
      priority: sampleTask.priority,
      progress: sampleTask.progress,
      position: taskCountInColumn.length,
      projectUrl: sampleTask.projectUrl,
      repoUrl: sampleTask.repoUrl,
      coverImage: "",
      tags: JSON.stringify(sampleTask.tags),
      agentId: sampleTask.agentId,
      externalRef: sampleTask.externalRef,
      updatedBy: sampleTask.updatedBy,
      isVisible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  console.log("Seed completed.");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
