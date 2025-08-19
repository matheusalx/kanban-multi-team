import { api, APIError } from "encore.dev/api";
import { authDB } from "./db";
import bcrypt from "bcrypt";

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  profileImageUrl?: string;
  createdAt: Date;
}

export interface RegisterResponse {
  user: User;
  token: string;
}

// Registers a new user account.
export const register = api<RegisterRequest, RegisterResponse>(
  { expose: true, method: "POST", path: "/auth/register" },
  async (req) => {
    // Check if user already exists
    const existingUser = await authDB.queryRow`
      SELECT id FROM users WHERE email = ${req.email}
    `;
    
    if (existingUser) {
      throw APIError.alreadyExists("User with this email already exists");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(req.password, 10);

    // Create user
    const user = await authDB.queryRow<{
      id: string;
      email: string;
      name: string;
      profile_image_url: string | null;
      created_at: Date;
    }>`
      INSERT INTO users (email, password_hash, name)
      VALUES (${req.email}, ${passwordHash}, ${req.name})
      RETURNING id, email, name, profile_image_url, created_at
    `;

    if (!user) {
      throw APIError.internal("Failed to create user");
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
