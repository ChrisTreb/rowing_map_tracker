// @ts-check
import { getDb } from './database';

/**
 * @typedef {object} RaceParticipantPosition
 * @property {number} rpp_id
 * @property {number} rpp_rp_id
 * @property {number} rp_date
 * @property {number} rpp_viewport_latitude
 * @property {number} rpp_viewport_longitude
 */

/**
 * Ajoute une nouvelle position de participant de course à la base de données.
 * @param {number} rpp_id L'ID de la position, généré en externe.
 * @param {number} rpp_rp_id L'ID du participant de course associé.
 * @param {number} rp_date Le timestamp de la position.
 * @param {number} rpp_viewport_latitude La latitude de la position.
 * @param {number} rpp_viewport_longitude La longitude de la position.
 * @returns {Promise<number>} L'ID de la position ajoutée.
 */
export const addRaceParticipantPosition = async (
  rpp_id,
  rpp_rp_id,
  rp_date,
  rpp_viewport_latitude,
  rpp_viewport_longitude
) => {
  try {
    const db = getDb();
    await db.runAsync(
      `INSERT INTO race_participant_position (rpp_id, rpp_rp_id, rp_date, rpp_viewport_latitude, rpp_viewport_longitude) VALUES (?, ?, ?, ?, ?)`,
      [rpp_id, rpp_rp_id, rp_date, rpp_viewport_latitude, rpp_viewport_longitude]
    );
    console.log("Race participant position added:", rpp_id);
    return rpp_id;
  } catch (error) {
    console.error("Error adding race participant position:", error);
    throw error;
  }
};

/**
 * Récupère toutes les positions d'un participant par l'ID du participant.
 * @param {number} rp_id L'ID du participant de course.
 * @returns {Promise<RaceParticipantPosition[]>} Un tableau d'objets RaceParticipantPosition.
 */
export const getRaceParticipantPositionsByParticipantId = async (rp_id) => {
  try {
    const db = getDb();
    const result = await db.getAllAsync(
      `SELECT * FROM race_participant_position WHERE rpp_rp_id = ? ORDER BY rp_date ASC`,
      [rp_id]
    );
    return /** @type {RaceParticipantPosition[]} */ (result);
  } catch (error) {
    console.error("Error fetching race participant positions by participant ID:", error);
    throw error;
  }
};

/**
 * Supprime toutes les positions d'un participant par l'ID du participant.
 * @param {number} rp_id L'ID du participant de course.
 * @returns {Promise<void>} Une promesse qui se résout lorsque les positions sont supprimées.
 */
export const deleteRaceParticipantPositionsByParticipantId = async (rp_id) => {
  try {
    const db = getDb();
    await db.runAsync(
      `DELETE FROM race_participant_position WHERE rpp_rp_id = ?`,
      [rp_id]
    );
  } catch (error) {
    console.error("Error deleting race participant positions by participant ID:", error);
    throw error;
  }
};