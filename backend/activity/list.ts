import { api } from "encore.dev/api";
import { activityDB } from "./db";

export interface ActivityLog {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: any;
  createdAt: Date;
}

export interface GetActivityRequest {
  projectId: string;
  limit?: number;
}

export interface GetActivityResponse {
  activities: ActivityLog[];
}

// Gets recent activity for a project.
export const getActivity = api<GetActivityRequest, GetActivityResponse>(
  { expose: true, method: "GET", path: "/activity/projects/:projectId" },
  async (req) => {
    const limit = req.limit || 50;
    
    const activities = await activityDB.queryAll<{
      id: string;
      project_id: string;
      user_id: string;
      user_name: string;
      user_email: string;
      action: string;
      entity_type: string;
      entity_id: string | null;
      details: any;
      created_at: Date;
    }>`
      SELECT id, project_id, user_id, user_name, user_email, action, entity_type, entity_id, details, created_at
      FROM activity_log
      WHERE project_id = ${req.projectId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return {
      activities: activities.map(a => ({
        id: a.id,
        projectId: a.project_id,
        userId: a.user_id,
        userName: a.user_name,
        userEmail: a.user_email,
        action: a.action,
        entityType: a.entity_type,
        entityId: a.entity_id || undefined,
        details: a.details,
        createdAt: a.created_at,
      })),
    };
  }
);
