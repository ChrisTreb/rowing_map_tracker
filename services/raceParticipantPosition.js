// @ts-check
import { debugLog } from '../utils/logUtils';
import { getDb } from './database';

/**
 * @typedef {object} DbRaceParticipantPosition
 * @property {number} rpp_id
 * @property {number} rpp_rp_id
 * @property {string} rpp_rp_key
 * @property {number} rpp_date
 * @property {number} rpp_latitude
 * @property {number} rpp_longitude
 */

/**
 * Ajoute une nouvelle position de participant de course à la base de données.
 * @param {number} rpp_rp_id L'ID du participant de course associé.
 * @param {string} rpp_rp_key La clé du participant de la course.
 * @param {number} rpp_date Le timestamp de la position.
 * @param {number} rpp_latitude La latitude de la position.
 * @param {number} rpp_longitude La longitude de la position.
 * @returns {Promise<Void>} L'ID de la position ajoutée.
 */
export const addRaceParticipantPosition = async (
  rpp_rp_id,
  rpp_rp_key,
  rpp_date,
  rpp_latitude,
  rpp_longitude
) => {
  try {
    const db = getDb();
    await db.runAsync(
      `INSERT INTO race_participant_position (rpp_rp_id, rpp_rp_key, rpp_date, rpp_latitude, rpp_longitude) VALUES (?, ?, ?, ?, ?)`,
      [rpp_rp_id, rpp_rp_key, rpp_date, rpp_latitude, rpp_longitude]
    );
    debugLog("INFO", "Race participant position added for participant ID:", rpp_rp_id);
  } catch (error) {
    debugLog("ERROR", "Error adding race participant position:", error);
    throw error;
  }
};

/**
 * Récupère toutes les positions d'un participant par l'ID du participant pour une clé utilisée.
 * @param {string} rpp_rp_key La clé de la course utilisée par le participant.
 * @returns {Promise<DbRaceParticipantPosition[]>} Un tableau d'objets DbRaceParticipantPosition.
 */
export const getRaceParticipantPositionsByParticipantKey = async (rpp_rp_key) => {
  try {
    const db = getDb();
    const result = await db.getAllAsync(
      `SELECT * FROM race_participant_position WHERE rpp_rp_key = ? ORDER BY rpp_date ASC`,
      [rpp_rp_key]
    );
    return /** @type {DbRaceParticipantPosition[]} */ (result);
  } catch (error) {
    debugLog("ERROR", "Error fetching race participant positions by participant ID:", error);
    throw error;
  }
};

/**
 * Supprime toutes les positions d'un participant par l'ID du participant.
 * @param {number} rpp_rp_id L'ID du participant de course.
 * @returns {Promise<void>} Une promesse qui se résout lorsque les positions sont supprimées.
 */
export const deleteRaceParticipantPositionsByParticipantId = async (rpp_rp_id) => {
  try {
    const db = getDb();
    await db.runAsync(
      `DELETE FROM race_participant_position WHERE rpp_rp_id = ?`,
      [rpp_rp_id]
    );
  } catch (error) {
    debugLog("ERROR", "Error deleting race participant positions by participant ID:", error);
    throw error;
  }
};