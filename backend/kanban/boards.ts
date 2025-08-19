import { api } from "encore.dev/api";
import { kanbanDB } from "./db";

export interface Board {
  id: string;
  projectId: string;
  name: string;
  position: number;
  createdAt: Date;
}

export interface GetBoardsRequest {
  projectId: string;
}

export interface GetBoardsResponse {
  boards: Board[];
}

// Gets all boards for a project.
export const getBoards = api<GetBoardsRequest, GetBoardsResponse>(
  { expose: true, method: "GET", path: "/kanban/projects/:projectId/boards" },
  async (req) => {
    const boards = await kanbanDB.queryAll<{
      id: string;
      project_id: string;
      name: string;
      position: number;
      created_at: Date;
    }>`
      SELECT id, project_id, name, position, created_at
      FROM boards
      WHERE project_id = ${req.projectId}
      ORDER BY position ASC
    `;

    return {
      boards: boards.map(b => ({
        id: b.id,
        projectId: b.project_id,
        name: b.name,
        position: b.position,
        createdAt: b.created_at,
      })),
    };
  }
);
