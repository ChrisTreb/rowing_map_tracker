// @ts-check
import { getDb } from './database';

/**
 * @typedef {object} DbUser
 * @property {number} usr_id
 * @property {string | null} usr_name
 * @property {string} usr_apikey
 * @property {number | null} usr_rc_id
 */

/**
 * Ajoute un nouvel utilisateur à la base de données.
 * @param {number} usr_id L'ID de l'utilisateur, généré en externe.
 * @param {string | null} usr_name Le nom de l'utilisateur.
 * @param {string} usr_apikey La clé API de l'utilisateur.
 * @param {number | null} usr_rc_id L'ID du club d'aviron de l'utilisateur (peut être null).
 * @returns {Promise<number>} L'ID de l'utilisateur ajouté.
 */
export const addUser = async (
  usr_id,
  usr_name,
  usr_apikey,
  usr_rc_id
) => {
  try {
    const db = getDb();
    await db.runAsync(
      `INSERT INTO user (usr_id, usr_name, usr_apikey, usr_rc_id) VALUES (?, ?, ?, ?)`,
      [usr_id, usr_name, usr_apikey, usr_rc_id]
    );
    console.log("User added:", usr_id);
    return usr_id;
  } catch (error) {
    console.error("Error adding user:", error);
    throw error;
  }
};

/**
 * Récupère un utilisateur par son ID.
 * @param {number} usr_id L'ID de l'utilisateur à récupérer.
 * @returns {Promise<DbUser | null>} L'objet DbUser ou null si non trouvé.
 */
export const getUserById = async (usr_id) => {
  try {
    const db = getDb();
    const result = await db.getFirstAsync(
      `SELECT * FROM user WHERE usr_id = ?`,
      [usr_id]
    );
    return /** @type {DbUser | null} */ (result);
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    throw error;
  }
};

/**
 * Met à jour un utilisateur existant.
 * @param {number} usr_id L'ID de l'utilisateur à mettre à jour.
 * @param {string | null} usr_name Le nouveau nom de l'utilisateur.
 * @param {string} usr_apikey La nouvelle clé API de l'utilisateur.
 * @param {number | null} usr_rc_id Le nouvel ID du club d'aviron de l'utilisateur (peut être null).
 * @returns {Promise<void>} Une promesse qui se résout lorsque l'utilisateur est mis à jour.
 */
export const updateUser = async (usr_id, usr_name, usr_apikey, usr_rc_id) => {
  try {
    const db = getDb();
    await db.runAsync(
      `UPDATE user SET usr_name = ?, usr_apikey = ?, usr_rc_id = ? WHERE usr_id = ?`,
      [usr_name, usr_apikey, usr_rc_id, usr_id]
    );
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

/**
 * Supprime un utilisateur par son ID.
 * @param {number} usr_id L'ID de l'utilisateur à supprimer.
 * @returns {Promise<void>} Une promesse qui se résout lorsque l'utilisateur est supprimé.
 */
export const deleteUser = async (usr_id) => {
  try {
    const db = getDb();
    await db.runAsync(
      `DELETE FROM user WHERE usr_id = ?`,
      [usr_id]
    );
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};