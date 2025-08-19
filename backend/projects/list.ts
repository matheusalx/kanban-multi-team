import { api } from "encore.dev/api";
import { projectsDB } from "./db";
import type { Project } from "./create";

export interface ListProjectsRequest {
  userId: string;
}

export interface ListProjectsResponse {
  projects: Project[];
}

// Lists all projects for a user.
export const list = api<ListProjectsRequest, ListProjectsResponse>(
  { expose: true, method: "GET", path: "/projects/user/:userId" },
  async (req) => {
    const projects = await projectsDB.queryAll<{
      id: string;
      name: string;
      description: string | null;
      owner_id: string;
      share_token: string | null;
      is_shared: boolean;
      created_at: Date;
      updated_at: Date;
    }>`
      SELECT DISTINCT p.id, p.name, p.description, p.owner_id, p.share_token, p.is_shared, p.created_at, p.updated_at
      FROM projects p
      INNER JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = ${req.userId}
      ORDER BY p.updated_at DESC
    `;

    return {
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || undefined,
        ownerId: p.owner_id,
        shareToken: p.share_token || undefined,
        isShared: p.is_shared,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
    };
  }
);
