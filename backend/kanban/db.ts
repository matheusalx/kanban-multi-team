import { SQLDatabase } from "encore.dev/storage/sqldb";

export const kanbanDB = SQLDatabase.named("projects");
