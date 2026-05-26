import { debugLog } from '../utils/logUtils';
import { getDb } from './database';

/**
 * @typedef {object} DbRace
 * @property {number} ra_id
 * @property {number} ra_re_id
 * @property {string} ra_type
 * @property {string} ra_name
 */

/**
 * Ajoute une nouvelle course à la base de données.
 * @param {number} ra_id L'ID de la course, généré en externe.
 * @param {number} ra_re_id L'ID de l'événement de course associé.
 * @param {string} ra_type Le type de la course.
 * @param {string} ra_name Le nom de la course.
 * @returns {Promise<number>} L'ID de la course ajoutée.
 */
export const addRace = async (
  ra_id,
  ra_re_id,
  ra_type,
  ra_name
) => {
  try {
    const db = getDb();
    await db.runAsync(
      `INSERT INTO race
      (ra_id, ra_re_id, ra_type, ra_name) VALUES(?, ?, ?, ?)`,
      [ra_id, ra_re_id, ra_type, ra_name]
    );

    debugLog("INFO", "Race added:", ra_id);
    return ra_id;
  } catch (error) {
    debugLog("ERROR", "Error adding race:", error);
    throw error;
  }
};

/**
 * Récupère toutes les courses de la base de données.
 * @returns {Promise<DbRace[]>} Un tableau d'objets DbRace.
 */
export const getRaces = async () => {
  try {
    const db = getDb();
    const result = await db.getAllAsync(
      `SELECT * FROM race ORDER BY ra_id DESC`
    );
    debugLog("INFO", "Races fetched:", result);
    return /** @type {DbRace[]} */ (result); // Cast pour assurer le type
  } catch (error) {
    debugLog("ERROR", "Error fetching races:", error);
    throw error;
  }
};

/**
 * Récupère une course par son ID.
 * @param {number} ra_id L'ID de la course à récupérer.
 * @returns {Promise<DbRace | null>} L'objet DbRace ou null si non trouvé.
 */
export const getRaceById = async (ra_id) => {
  try {
    const db = getDb();
    const result = await db.getFirstAsync(
      `SELECT * FROM race WHERE ra_id = ?`,
      [ra_id]
    );
    return /** @type {DbRace | null} */ (result); // Cast pour assurer le type
  } catch (error) {
    debugLog("ERROR", "Error fetching race by ID:", error);
    throw error;
  }
};

/**
 * Récupère les courses par l'ID de l'événement.
 * @param {number} ra_re_id L'ID de l'événement de course associé.
 * @returns {Promise<DbRace[] | null>} L'objet DbRace ou null si non trouvé.
 */
export const getRacesByEventId = async (ra_re_id) => {
  try {
    const db = getDb();
    const result = await db.getAllAsync(
      `SELECT * FROM race WHERE ra_re_id = ?`,
      [ra_re_id]
    );
    return /** @type {DbRace[] | null} */ (result); // Cast pour assurer le type
  } catch (error) {
    debugLog("ERROR", "Error fetching race by event ID:", error);
    throw error;
  }
};

/**
 * Met à jour une course existante
 * @param {number} ra_id L'ID de la course, généré en externe.
 * @param {number} ra_re_id L'ID de l'événement de course associé.
 * @param {string} ra_type Le type de la course.
 * @param {string} ra_name Le nom de la course.
 * @returns {Promise<void>} Une promesse qui se résout lorsque la course est mise à jour.
 */
export const updateRace = async (
  ra_id,
  ra_re_id,
  ra_type,
  ra_name
) => {
  try {
    const db = getDb();
    await db.runAsync(
      `UPDATE race SET ra_re_id = ?, ra_type = ?, ra_name = ? WHERE ra_id = ?`,
      [ra_re_id, ra_type, ra_name, ra_id]
    );
    debugLog("INFO", "Race updated, id:", ra_id);
  } catch (error) {
    debugLog("ERROR", "Error updating race:", error);
    throw error;
  }
};
