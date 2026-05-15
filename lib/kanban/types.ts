export const priorities = ["low", "medium", "high", "critical"] as const;

export type Priority = (typeof priorities)[number];

export type KanbanTask = {
  id: string;
  columnId: string;
  title: string;
  description: string;
  priority: Priority;
  progress: number;
  position: number;
  projectUrl: string;
  repoUrl: string;
  coverImage: string;
  tags: string[];
  agentId: string;
  externalRef: string;
  updatedBy: string;
  isVisible: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KanbanColumn = {
  id: string;
  title: string;
  slug: string;
  position: number;
  color: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  tasks: KanbanTask[];
};

export type KanbanBoardSettings = {
  title: string;
  description: string;
};

export type KanbanBoard = {
  settings: KanbanBoardSettings;
  columns: KanbanColumn[];
};
