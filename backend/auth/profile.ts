import { api, APIError } from "encore.dev/api";
import { authDB } from "./db";
import bcrypt from "bcrypt";
import type { User } from "./register";

export interface UpdateProfileRequest {
  name?: string;
  profileImageUrl?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface UpdateProfileResponse {
  user: User;
}

// Updates the user's profile information.
export const updateProfile = api<UpdateProfileRequest, UpdateProfileResponse>(
  { expose: true, method: "PUT", path: "/auth/profile" },
  async (req) => {
    // In a real app, you'd get the user ID from the auth token
    // For now, we'll use a placeholder approach
    const userId = "placeholder"; // This should come from auth middleware

    const user = await authDB.queryRow<{
      id: string;
      email: string;
      name: string;
      password_hash: string;
      profile_image_url: string | null;
      created_at: Date;
    }>`
      SELECT id, email, name, password_hash, profile_image_url, created_at
      FROM users WHERE id = ${userId}
    `;

    if (!user) {
      throw APIError.notFound("User not found");
    }

    let updateFields: string[] = [];
    let updateValues: any[] = [];

    if (req.name) {
      updateFields.push("name = $" + (updateValues.length + 1));
      updateValues.push(req.name);
    }

    if (req.profileImageUrl !== undefined) {
      updateFields.push("profile_image_url = $" + (updateValues.length + 1));
      updateValues.push(req.profileImageUrl);
    }

    if (req.newPassword && req.currentPassword) {
      const isValidPassword = await bcrypt.compare(req.currentPassword, user.password_hash);
      if (!isValidPassword) {
        throw APIError.invalidArgument("Current password is incorrect");
      }

      const newPasswordHash = await bcrypt.hash(req.newPassword, 10);
      updateFields.push("password_hash = $" + (updateValues.length + 1));
      updateValues.push(newPasswordHash);
    }

    if (updateFields.length === 0) {
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profileImageUrl: user.profile_image_url || undefined,
          createdAt: user.created_at,
        },
      };
    }

    updateFields.push("updated_at = NOW()");
    updateValues.push(userId);

    const query = `
      UPDATE users 
      SET ${updateFields.join(", ")}
      WHERE id = $${updateValues.length}
      RETURNING id, email, name, profile_image_url, created_at
    `;

    const updatedUser = await authDB.rawQueryRow<{
      id: string;
      email: string;
      name: string;
      profile_image_url: string | null;
      created_at: Date;
    }>(query, ...updateValues);

    if (!updatedUser) {
      throw APIError.internal("Failed to update user");
    }

    return {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        profileImageUrl: updatedUser.profile_image_url || undefined,
        createdAt: updatedUser.created_at,
      },
    };
  }
);
