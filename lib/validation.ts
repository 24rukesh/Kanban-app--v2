import { z } from "zod";

import { priorities } from "./kanban/types";

const urlOrEmpty = z.string().trim().url().or(z.literal(""));

export const adminLoginSchema = z.object({
  key: z.string().min(1).max(200),
});

export const createColumnSchema = z.object({
  title: z.string().trim().min(1).max(80),
  color: z.string().trim().max(20).optional(),
  isVisible: z.boolean().optional(),
});

export const updateColumnSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  color: z.string().trim().max(20).optional(),
  isVisible: z.boolean().optional(),
});

export const reorderColumnsSchema = z.object({
  columns: z
    .array(
      z.object({
        id: z.string().min(1),
        position: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});

export const createTaskSchema = z.object({
  columnId: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  priority: z.enum(priorities).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  projectUrl: urlOrEmpty.optional(),
  repoUrl: urlOrEmpty.optional(),
  coverImage: urlOrEmpty.optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  isVisible: z.boolean().optional(),
});

export const updateTaskSchema = z.object({
  columnId: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  priority: z.enum(priorities).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  projectUrl: urlOrEmpty.optional(),
  repoUrl: urlOrEmpty.optional(),
  coverImage: urlOrEmpty.optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  isVisible: z.boolean().optional(),
});

export const reorderTasksSchema = z.object({
  tasks: z
    .array(
      z.object({
        id: z.string().min(1),
        columnId: z.string().min(1),
        position: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});

export const agentTaskUpsertSchema = z.object({
  externalRef: z.string().trim().min(1).max(160),
  agentId: z.string().trim().min(1).max(120).optional(),
  columnSlug: z.string().trim().min(1).max(80).optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  priority: z.enum(priorities).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  projectUrl: urlOrEmpty.optional(),
  repoUrl: urlOrEmpty.optional(),
  coverImage: urlOrEmpty.optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  isVisible: z.boolean().optional(),
});

export const agentTaskPatchSchema = z.object({
  columnSlug: z.string().trim().min(1).max(80).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  priority: z.enum(priorities).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  projectUrl: urlOrEmpty.optional(),
  repoUrl: urlOrEmpty.optional(),
  coverImage: urlOrEmpty.optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  isVisible: z.boolean().optional(),
});
