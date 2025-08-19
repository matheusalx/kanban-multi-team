import { api, APIError } from "encore.dev/api";
import { authDB } from "./db";
import bcrypt from "bcrypt";
import type { User } from "./register";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

// Authenticates a user and returns a session token.
export const login = api<LoginRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/auth/login" },
  async (req) => {
    const user = await authDB.queryRow<{
      id: string;
      email: string;
      name: string;
      password_hash: string;
      profile_image_url: string | null;
      created_at: Date;
    }>`
      SELECT id, email, name, password_hash, profile_image_url, created_at
      FROM users WHERE email = ${req.email}
    `;

    if (!user) {
      throw APIError.unauthenticated("Invalid email or password");
    }

    const isValidPassword = await bcrypt.compare(req.password, user.password_hash);
    if (!isValidPassword) {
      throw APIError.unauthenticated("Invalid email or password");
    }

    // Generate simple token (in production, use JWT)
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImageUrl: user.profile_image_url || undefined,
        createdAt: user.created_at,
      },
      token,
    };
  }
);
