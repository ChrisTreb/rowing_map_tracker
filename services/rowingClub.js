// @ts-check
import { getDb } from './database';

/**
 * @typedef {object} DbRowingClub
 * @property {number} rc_id
 * @property {string} rc_name
 * @property {string} rc_nickname
 */

/**
 * Ajoute un nouveau club d'aviron à la base de données.
 * @param {number} rc_id L'ID du club d'aviron, généré en externe.
 * @param {string} rc_name Le nom du club d'aviron.
 * @param {string} rc_nickname Le surnom du club d'aviron.
 * @returns {Promise<number>} L'ID du club d'aviron ajouté.
 */
export const addRowingClub = async (rc_id, rc_name, rc_nickname) => { // Add rc_id parameter
  try {
    const db = getDb();
    await db.runAsync( // No need to capture result.lastInsertRowId
      `INSERT INTO rowing_club (rc_id, rc_name, rc_nickname) VALUES (?, ?, ?)`, // Include rc_id in INSERT
      [rc_id, rc_name, rc_nickname]
    );
    console.log("Rowing club added:", rc_id);
    return rc_id; // Return the provided ID
  } catch (error) {
    console.error("Error adding rowing club:", error);
    throw error;
  }
};

/**
 * Récupère tous les clubs d'aviron de la base de données.
 * @returns {Promise<DbRowingClub[]>} Un tableau d'objets DbRowingClub.
 */
export const getRowingClubs = async () => {
  try {
    const db = getDb();
    const result = await db.getAllAsync(`SELECT * FROM rowing_club`);
    return /** @type {DbRowingClub[]} */ (result);
  } catch (error) {
    console.error("Error fetching rowing clubs:", error);
    throw error;
  }
};

/**
 * Récupère un club d'aviron par son ID.
 * @param {number} rc_id L'ID du club d'aviron à récupérer.
 * @returns {Promise<DbRowingClub | null>} L'objet DbRowingClub ou null si non trouvé.
 */
export const getRowingClubById = async (rc_id) => {
  try {
    const db = getDb();
    const result = await db.getFirstAsync(
      `SELECT * FROM rowing_club WHERE rc_id = ?`,
      [rc_id]
    );
    return /** @type {DbRowingClub | null} */ (result);
  } catch (error) {
    console.error("Error fetching rowing club by ID:", error);
    throw error;
  }
};

/**
 * Met à jour un club d'aviron existant.
 * @param {number} rc_id L'ID du club d'aviron à mettre à jour.
 * @param {string} rc_name Le nouveau nom du club d'aviron.
 * @param {string} rc_nickname Le nouveau surnom du club d'aviron.
 * @returns {Promise<void>} Une promesse qui se résout lorsque le club est mis à jour.
 */
export const updateRowingClub = async (rc_id, rc_name, rc_nickname) => {
  try {
    const db = getDb();
    await db.runAsync(
      `UPDATE rowing_club SET rc_name = ?, rc_nickname = ? WHERE rc_id = ?`,
      [rc_name, rc_nickname, rc_id]
    );
  } catch (error) {
    console.error("Error updating rowing club:", error);
    throw error;
  }
};

/**
 * Supprime un club d'aviron par son ID.
 * @param {number} rc_id L'ID du club d'aviron à supprimer.
 * @returns {Promise<void>} Une promesse qui se résout lorsque le club est supprimé.
 */
export const deleteRowingClub = async (rc_id) => {
  try {
    const db = getDb();
    await db.runAsync(
      `DELETE FROM rowing_club WHERE rc_id = ?`, // Fixed 'id' to 'rc_id'
      [rc_id]
    );
  } catch (error) {
    console.error("Error deleting rowing club:", error);
    throw error;
  }
};
