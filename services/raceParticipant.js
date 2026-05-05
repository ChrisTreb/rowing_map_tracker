// @ts-check
import { getDb } from './database';

/**
 * @typedef {object} DbRaceParticipant
 * @property {number} rp_id
 * @property {number} rp_ra_id
 * @property {string | null} rp_bib
 * @property {string | null} rp_name
 * @property {string | null} rp_color
 * @property {string} rp_key
 * @property {number | null} rp_updated_at
 */

/**
 * Ajoute un nouveau participant de course à la base de données.
 * @param {number} rp_id L'ID du participant, généré en externe.
 * @param {number} rp_ra_id L'ID de la course associée.
 * @param {string | null} rp_bib Le numéro de dossard du participant (peut être null).
 * @param {string | null} rp_name Le nom du participant (peut être null).
 * @param {string | null} rp_color La couleur associée au participant (peut être null).
 * @param {string} rp_key La clé unique du participant.
 * @param {number | null} rp_updated_at Le timestamp de la dernière mise à jour (peut être null).
 * @returns {Promise<number>} L'ID du participant ajouté.
 */
export const addRaceParticipant = async (
  rp_id,
  rp_ra_id,
  rp_bib,
  rp_name,
  rp_color,
  rp_key,
  rp_updated_at
) => {
  try {
    const db = getDb();
    await db.runAsync(
      `INSERT INTO race_participant (rp_id, rp_ra_id, rp_bib, rp_name, rp_color, rp_key, rp_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [rp_id, rp_ra_id, rp_bib, rp_name, rp_color, rp_key, rp_updated_at]
    );
    console.log("Race participant added:", rp_id);
    return rp_id;
  } catch (error) {
    console.error("Error adding race participant:", error);
    throw error;
  }
};

/**
 * Récupère tous les participants d'une course par l'ID de la course.
 * @param {number} ra_id L'ID de la course.
 * @returns {Promise<DbRaceParticipant[]>} Un tableau d'objets DbRaceParticipant.
 */
export const getRaceParticipantsByRaceId = async (ra_id) => {
  try {
    const db = getDb();
    const result = await db.getAllAsync(
      `SELECT * FROM race_participant WHERE rp_ra_id = ?`,
      [ra_id]
    );
    return /** @type {DbRaceParticipant[]} */ (result);
  } catch (error) {
    console.error("Error fetching race participants by race ID:", error);
    throw error;
  }
};

/**
 * Récupère un participant de course par son ID.
 * @param {number} rp_id L'ID du participant à récupérer.
 * @returns {Promise<DbRaceParticipant | null>} L'objet DbRaceParticipant ou null si non trouvé.
 */
export const getRaceParticipantById = async (rp_id) => {
  try {
    const db = getDb();
    const result = await db.getFirstAsync(
      `SELECT * FROM race_participant WHERE rp_id = ?`,
      [rp_id]
    );
    return /** @type {DbRaceParticipant | null} */ (result);
  } catch (error) {
    console.error("Error fetching race participant by ID:", error);
    throw error;
  }
};

/**
 * Met à jour un participant de course existant.
 * @param {number} rp_id L'ID du participant à mettre à jour.
 * @param {string | null} rp_bib Le nouveau numéro de dossard.
 * @param {string | null} rp_name Le nouveau nom du participant.
 * @param {string | null} rp_color La nouvelle couleur.
 * @param {string} rp_key La nouvelle clé unique.
 * @param {number | null} rp_updated_at Le nouveau timestamp de mise à jour.
 * @returns {Promise<void>} Une promesse qui se résout lorsque le participant est mis à jour.
 */
export const updateRaceParticipant = async (rp_id, rp_bib, rp_name, rp_color, rp_key, rp_updated_at) => {
  try {
    const db = getDb();
    await db.runAsync(
      `UPDATE race_participant SET rp_bib = ?, rp_name = ?, rp_color = ?, rp_key = ?, rp_updated_at = ? WHERE rp_id = ?`,
      [rp_bib, rp_name, rp_color, rp_key, rp_updated_at, rp_id]
    );
  } catch (error) {
    console.error("Error updating race participant:", error);
    throw error;
  }
};

/**
 * Supprime un participant de course par son ID.
 * @param {number} rp_id L'ID du participant à supprimer.
 * @returns {Promise<void>} Une promesse qui se résout lorsque le participant est supprimé.
 */
export const deleteRaceParticipant = async (rp_id) => {
  try {
    const db = getDb();
    await db.runAsync(
      `DELETE FROM race_participant WHERE rp_id = ?`,
      [rp_id]
    );
  } catch (error) {
    console.error("Error deleting race participant:", error);
    throw error;
  }
};