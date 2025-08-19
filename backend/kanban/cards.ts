import { api, APIError } from "encore.dev/api";
import { kanbanDB } from "./db";

export interface Card {
  id: string;
  boardId: string;
  title: string;
  description?: string;
  status: string;
  position: number;
  createdById: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCardRequest {
  boardId: string;
  title: string;
  description?: string;
  status: string;
  userId: string;
  userName: string;
  userEmail: string;
}

export interface UpdateCardRequest {
  cardId: string;
  title?: string;
  description?: string;
  status?: string;
  position?: number;
  userId: string;
  userName: string;
  userEmail: string;
}

export interface GetCardsRequest {
  projectId: string;
}

export interface GetCardsResponse {
  cards: Card[];
}

export interface CreateCardResponse {
  card: Card;
}

export interface UpdateCardResponse {
  card: Card;
}

// Gets all cards for a project.
export const getCards = api<GetCardsRequest, GetCardsResponse>(
  { expose: true, method: "GET", path: "/kanban/projects/:projectId/cards" },
  async (req) => {
    const cards = await kanbanDB.queryAll<{
      id: string;
      board_id: string;
      title: string;
      description: string | null;
      status: string;
      position: number;
      created_by_id: string;
      created_by_name: string;
      created_by_email: string;
      created_at: Date;
      updated_at: Date;
    }>`
      SELECT c.id, c.board_id, c.title, c.description, c.status, c.position,
             c.created_by_id, c.created_by_name, c.created_by_email,
             c.created_at, c.updated_at
      FROM cards c
      INNER JOIN boards b ON c.board_id = b.id
      WHERE b.project_id = ${req.projectId}
      ORDER BY c.position ASC
    `;

    return {
      cards: cards.map(c => ({
        id: c.id,
        boardId: c.board_id,
        title: c.title,
        description: c.description || undefined,
        status: c.status,
        position: c.position,
        createdById: c.created_by_id,
        createdByName: c.created_by_name,
        createdByEmail: c.created_by_email,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    };
  }
);

// Creates a new card.
export const createCard = api<CreateCardRequest, CreateCardResponse>(
  { expose: true, method: "POST", path: "/kanban/cards" },
  async (req) => {
    // Get the project ID for logging
    const board = await kanbanDB.queryRow<{ project_id: string }>`
      SELECT project_id FROM boards WHERE id = ${req.boardId}
    `;

    if (!board) {
      throw APIError.notFound("Board not found");
    }

    // Get next position
    const lastCard = await kanbanDB.queryRow<{ position: number }>`
      SELECT position FROM cards 
      WHERE board_id = ${req.boardId} AND status = ${req.status}
      ORDER BY position DESC LIMIT 1
    `;

    const position = (lastCard?.position || 0) + 1;

    const card = await kanbanDB.queryRow<{
      id: string;
      board_id: string;
      title: string;
      description: string | null;
      status: string;
      position: number;
      created_by_id: string;
      created_by_name: string;
      created_by_email: string;
      created_at: Date;
      updated_at: Date;
    }>`
      INSERT INTO cards (board_id, title, description, status, position, created_by_id, created_by_name, created_by_email)
      VALUES (${req.boardId}, ${req.title}, ${req.description || null}, ${req.status}, ${position}, ${req.userId}, ${req.userName}, ${req.userEmail})
      RETURNING id, board_id, title, description, status, position, created_by_id, created_by_name, created_by_email, created_at, updated_at
    `;

    if (!card) {
      throw APIError.internal("Failed to create card");
    }

    // Log activity
    await kanbanDB.exec`
      INSERT INTO activity_log (project_id, user_id, user_name, user_email, action, entity_type, entity_id, details)
      VALUES (${board.project_id}, ${req.userId}, ${req.userName}, ${req.userEmail}, 'created', 'card', ${card.id}, ${JSON.stringify({ title: card.title })})
    `;

    return {
      card: {
        id: card.id,
        boardId: card.board_id,
        title: card.title,
        description: card.description || undefined,
        status: card.status,
        position: card.position,
        createdById: card.created_by_id,
        createdByName: card.created_by_name,
        createdByEmail: card.created_by_email,
        createdAt: card.created_at,
        updatedAt: card.updated_at,
      },
    };
  }
);

// Updates a card.
export const updateCard = api<UpdateCardRequest, UpdateCardResponse>(
  { expose: true, method: "PUT", path: "/kanban/cards/:cardId" },
  async (req) => {
    // Get current card and project info
    const currentCard = await kanbanDB.queryRow<{
      id: string;
      board_id: string;
      title: string;
      description: string | null;
      status: string;
      position: number;
      project_id: string;
    }>`
      SELECT c.id, c.board_id, c.title, c.description, c.status, c.position, b.project_id
      FROM cards c
      INNER JOIN boards b ON c.board_id = b.id
      WHERE c.id = ${req.cardId}
    `;

    if (!currentCard) {
      throw APIError.notFound("Card not found");
    }

    let updateFields: string[] = [];
    let updateValues: any[] = [];
    let changes: any = {};

    if (req.title !== undefined && req.title !== currentCard.title) {
      updateFields.push("title = $" + (updateValues.length + 1));
      updateValues.push(req.title);
      changes.title = { from: currentCard.title, to: req.title };
    }

    if (req.description !== undefined && req.description !== currentCard.description) {
      updateFields.push("description = $" + (updateValues.length + 1));
      updateValues.push(req.description);
      changes.description = { from: currentCard.description, to: req.description };
    }

    if (req.status !== undefined && req.status !== currentCard.status) {
      updateFields.push("status = $" + (updateValues.length + 1));
      updateValues.push(req.status);
      changes.status = { from: currentCard.status, to: req.status };
    }

    if (req.position !== undefined && req.position !== currentCard.position) {
      updateFields.push("position = $" + (updateValues.length + 1));
      updateValues.push(req.position);
      changes.position = { from: currentCard.position, to: req.position };
    }

    if (updateFields.length === 0) {
      return {
        card: {
          id: currentCard.id,
          boardId: currentCard.board_id,
          title: currentCard.title,
          description: currentCard.description || undefined,
          status: currentCard.status,
          position: currentCard.position,
          createdById: req.userId,
          createdByName: req.userName,
          createdByEmail: req.userEmail,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    }

    updateFields.push("updated_at = NOW()");
    updateValues.push(req.cardId);

    const query = `
      UPDATE cards 
      SET ${updateFields.join(", ")}
      WHERE id = $${updateValues.length}
      RETURNING id, board_id, title, description, status, position, created_by_id, created_by_name, created_by_email, created_at, updated_at
    `;

    const updatedCard = await kanbanDB.rawQueryRow<{
      id: string;
      board_id: string;
      title: string;
      description: string | null;
      status: string;
      position: number;
      created_by_id: string;
      created_by_name: string;
      created_by_email: string;
      created_at: Date;
      updated_at: Date;
    }>(query, ...updateValues);

    if (!updatedCard) {
      throw APIError.internal("Failed to update card");
    }

    // Log activity
    await kanbanDB.exec`
      INSERT INTO activity_log (project_id, user_id, user_name, user_email, action, entity_type, entity_id, details)
      VALUES (${currentCard.project_id}, ${req.userId}, ${req.userName}, ${req.userEmail}, 'updated', 'card', ${req.cardId}, ${JSON.stringify(changes)})
    `;

    return {
      card: {
        id: updatedCard.id,
        boardId: updatedCard.board_id,
        title: updatedCard.title,
        description: updatedCard.description || undefined,
        status: updatedCard.status,
        position: updatedCard.position,
        createdById: updatedCard.created_by_id,
        createdByName: updatedCard.created_by_name,
        createdByEmail: updatedCard.created_by_email,
        createdAt: updatedCard.created_at,
        updatedAt: updatedCard.updated_at,
      },
    };
  }
);

// Deletes a card.
export const deleteCard = api<{ cardId: string; userId: string; userName: string; userEmail: string }, void>(
  { expose: true, method: "DELETE", path: "/kanban/cards/:cardId" },
  async (req) => {
    // Get card and project info for logging
    const card = await kanbanDB.queryRow<{
      title: string;
      project_id: string;
    }>`
      SELECT c.title, b.project_id
      FROM cards c
      INNER JOIN boards b ON c.board_id = b.id
      WHERE c.id = ${req.cardId}
    `;

    if (!card) {
      throw APIError.notFound("Card not found");
    }

    await kanbanDB.exec`
      DELETE FROM cards WHERE id = ${req.cardId}
    `;

    // Log activity
    await kanbanDB.exec`
      INSERT INTO activity_log (project_id, user_id, user_name, user_email, action, entity_type, entity_id, details)
      VALUES (${card.project_id}, ${req.userId}, ${req.userName}, ${req.userEmail}, 'deleted', 'card', ${req.cardId}, ${JSON.stringify({ title: card.title })})
    `;
  }
);
