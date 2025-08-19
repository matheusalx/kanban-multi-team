import { SQLDatabase } from "encore.dev/storage/sqldb";

export const projectsDB = new SQLDatabase("projects", {
  migrations: "./migrations",
});
