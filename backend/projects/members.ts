import { api, APIError } from "encore.dev/api";
import { projectsDB } from "./db";

export interface ProjectMember {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  joinedAt: Date;
}

export interface ListMembersRequest {
  projectId: string;
}

export interface ListMembersResponse {
  members: ProjectMember[];
}

export interface RemoveMemberRequest {
  projectId: string;
  memberId: string;
  userId: string;
}

// Lists all members of a project.
export const listMembers = api<ListMembersRequest, ListMembersResponse>(
  { expose: true, method: "GET", path: "/projects/:projectId/members" },
  async (req) => {
    const members = await projectsDB.queryAll<{
      id: string;
      user_id: string;
      user_email: string;
      user_name: string;
      joined_at: Date;
    }>`
      SELECT id, user_id, user_email, user_name, joined_at
      FROM project_members
      WHERE project_id = ${req.projectId}
      ORDER BY joined_at ASC
    `;

    return {
      members: members.map(m => ({
        id: m.id,
        userId: m.user_id,
        userEmail: m.user_email,
        userName: m.user_name,
        joinedAt: m.joined_at,
      })),
    };
  }
);

// Removes a member from a project.
export const removeMember = api<RemoveMemberRequest, void>(
  { expose: true, method: "DELETE", path: "/projects/:projectId/members/:memberId" },
  async (req) => {
    // Verify user is the owner
    const project = await projectsDB.queryRow<{ owner_id: string }>`
      SELECT owner_id FROM projects WHERE id = ${req.projectId}
    `;

    if (!project) {
      throw APIError.notFound("Project not found");
    }

    if (project.owner_id !== req.userId) {
      throw APIError.permissionDenied("Only the project owner can remove members");
    }

    // Get member info for logging
    const member = await projectsDB.queryRow<{
      user_id: string;
      user_name: string;
      user_email: string;
    }>`
      SELECT user_id, user_name, user_email
      FROM project_members
      WHERE id = ${req.memberId} AND project_id = ${req.projectId}
    `;

    if (!member) {
      throw APIError.notFound("Member not found");
    }

    // Remove member
    await projectsDB.exec`
      DELETE FROM project_members
      WHERE id = ${req.memberId} AND project_id = ${req.projectId}
    `;

    // Log activity
    await projectsDB.exec`
      INSERT INTO activity_log (project_id, user_id, user_name, user_email, action, entity_type, details)
      VALUES (${req.projectId}, ${req.userId}, 'System', 'system@kanban.com', 'removed_member', 'project', ${JSON.stringify({ removedUser: member.user_name })})
    `;
  }
);
