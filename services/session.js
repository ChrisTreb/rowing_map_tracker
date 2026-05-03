// @ts-check
import { getDb } from './database';

/**
 * @typedef {object} Session
 * @property {string} se_id
 * @property {number} se_user_id
 * @property {number} se_expires_at
 */

/**
 * Ajoute une nouvelle session à la base de données.
 * @param {string} se_id L'ID de la session, généré en externe (ex: UUID).
 * @param {number} se_user_id L'ID de l'utilisateur associé à la session.
 * @param {number} se_expires_at Le timestamp d'expiration de la session.
 * @returns {Promise<string>} L'ID de la session ajoutée.
 */
export const addSession = async (
  se_id,
  se_user_id,
  se_expires_at
) => {
  try {
    const db = getDb();
    await db.runAsync(
      `INSERT INTO session (se_id, se_user_id, se_expires_at) VALUES (?, ?, ?)`,
      [se_id, se_user_id, se_expires_at]
    );
    console.log("Session added:", se_id);
    return se_id;
  } catch (error) {
    console.error("Error adding session:", error);
    throw error;
  }
};

/**
 * Récupère une session par son ID.
 * @param {string} se_id L'ID de la session à récupérer.
 * @returns {Promise<Session | null>} L'objet Session ou null si non trouvé.
 */
export const getSessionById = async (se_id) => {
  try {
    const db = getDb();
    const result = await db.getFirstAsync(
      `SELECT * FROM session WHERE se_id = ?`,
      [se_id]
    );
    return /** @type {Session | null} */ (result);
  } catch (error) {
    console.error("Error fetching session by ID:", error);
    throw error;
  }
};

/**
 * Supprime une session par son ID.
 * @param {string} se_id L'ID de la session à supprimer.
 * @returns {Promise<void>} Une promesse qui se résout lorsque la session est supprimée.
 */
export const deleteSession = async (se_id) => {
  try {
    const db = getDb();
    await db.runAsync(
      `DELETE FROM session WHERE se_id = ?`,
      [se_id]
    );
  } catch (error) {
    console.error("Error deleting session:", error);
    throw error;
  }
};