import { api, APIError } from "encore.dev/api";
import { projectsDB } from "./db";
import { randomBytes } from "crypto";
import type { Project } from "./create";

export interface EnableSharingRequest {
  projectId: string;
  userId: string;
}

export interface EnableSharingResponse {
  shareToken: string;
}

export interface JoinProjectRequest {
  shareToken: string;
  userId: string;
  userName: string;
  userEmail: string;
}

export interface JoinProjectResponse {
  project: Project;
}

// Enables sharing for a project and generates a share token.
export const enableSharing = api<EnableSharingRequest, EnableSharingResponse>(
  { expose: true, method: "POST", path: "/projects/:projectId/share" },
  async (req) => {
    // Verify user is the owner
    const project = await projectsDB.queryRow<{ owner_id: string }>`
      SELECT owner_id FROM projects WHERE id = ${req.projectId}
    `;

    if (!project) {
      throw APIError.notFound("Project not found");
    }

    if (project.owner_id !== req.userId) {
      throw APIError.permissionDenied("Only the project owner can enable sharing");
    }

    // Generate share token
    const shareToken = randomBytes(16).toString('hex');

    await projectsDB.exec`
      UPDATE projects 
      SET share_token = ${shareToken}, is_shared = TRUE, updated_at = NOW()
      WHERE id = ${req.projectId}
    `;

    return { shareToken };
  }
);

// Joins a project using a share token.
export const joinProject = api<JoinProjectRequest, JoinProjectResponse>(
  { expose: true, method: "POST", path: "/projects/join" },
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
      SELECT id, name, description, owner_id, share_token, is_shared, created_at, updated_at
      FROM projects 
      WHERE share_token = ${req.shareToken} AND is_shared = TRUE
    `;

    if (!project) {
      throw APIError.notFound("Invalid share token or project not shared");
    }

    // Check if user is already a member
    const existingMember = await projectsDB.queryRow`
      SELECT id FROM project_members 
      WHERE project_id = ${project.id} AND user_id = ${req.userId}
    `;

    if (!existingMember) {
      // Add user as member
      await projectsDB.exec`
        INSERT INTO project_members (project_id, user_id, user_email, user_name)
        VALUES (${project.id}, ${req.userId}, ${req.userEmail}, ${req.userName})
      `;

      // Log activity
      await projectsDB.exec`
        INSERT INTO activity_log (project_id, user_id, user_name, user_email, action, entity_type, entity_id)
        VALUES (${project.id}, ${req.userId}, ${req.userName}, ${req.userEmail}, 'joined', 'project', ${project.id})
      `;
    }

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
