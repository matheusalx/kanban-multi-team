import { api, APIError } from "encore.dev/api";
import { projectsDB } from "./db";
import { randomBytes } from "crypto";

export interface CreateProjectRequest {
  name: string;
  description?: string;
  userId: string;
  userName: string;
  userEmail: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  shareToken?: string;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectResponse {
  project: Project;
}

// Creates a new project.
export const create = api<CreateProjectRequest, CreateProjectResponse>(
  { expose: true, method: "POST", path: "/projects" },
  async (req) => {
    const project = await projectsDB.queryRow<{
      id: string;
      name: string;
      description: string | null;
      owner_id: string;
      share_token: string | null;
      is_shared: boolean;
      created_at: Date;
      updated_at: Date;
    }>`
      INSERT INTO projects (name, description, owner_id)
      VALUES (${req.name}, ${req.description || null}, ${req.userId})
      RETURNING id, name, description, owner_id, share_token, is_shared, created_at, updated_at
    `;

    if (!project) {
      throw APIError.internal("Failed to create project");
    }

    // Add owner as a member
    await projectsDB.exec`
      INSERT INTO project_members (project_id, user_id, user_email, user_name)
      VALUES (${project.id}, ${req.userId}, ${req.userEmail}, ${req.userName})
    `;

    // Create default boards
    const defaultBoards = ["A Fazer", "Em Andamento", "Concluído"];
    for (let i = 0; i < defaultBoards.length; i++) {
      await projectsDB.exec`
        INSERT INTO boards (project_id, name, position)
        VALUES (${project.id}, ${defaultBoards[i]}, ${i})
      `;
    }

    // Log activity
    await projectsDB.exec`
      INSERT INTO activity_log (project_id, user_id, user_name, user_email, action, entity_type, entity_id)
      VALUES (${project.id}, ${req.userId}, ${req.userName}, ${req.userEmail}, 'created', 'project', ${project.id})
    `;

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description || undefined,
        ownerId: project.owner_id,
        shareToken: project.share_token || undefined,
        isShared: project.is_shared,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
      },
    };
  }
);
