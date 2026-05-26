// @ts-check
import { debugLog } from '../utils/logUtils';
import { getDb } from './database';

/**
 * @typedef {object} DbRaceEventTrack
 * @property {number} ret_id
 * @property {number} ret_re_id
 * @property {string} ret_name
 * @property {string} ret_xml_gpx
 * @property {string} ret_color
 * @property {number} ret_enabled
 */

/**
 * Ajoute une nouvelle piste d'événement de course à la base de données.
 * @param {number} ret_id L'ID de la piste, généré en externe.
 * @param {number} ret_re_id L'ID de l'événement de course associé.
 * @param {string} ret_name Le nom de la piste.
 * @param {string} ret_xml_gpx Les données GPX XML de la piste.
 * @param {string} ret_color La couleur de la piste.
 * @param {number} ret_enabled L'état d'activation de la piste (0 ou 1).
 * @returns {Promise<number>} L'ID de la piste ajoutée.
 */
export const addRaceEventTrack = async (
  ret_id,
  ret_re_id,
  ret_name,
  ret_xml_gpx,
  ret_color,
  ret_enabled
) => {
  try {
    const db = getDb();
    await db.runAsync(
      `INSERT INTO race_event_track
      (ret_id, ret_re_id, ret_name, ret_xml_gpx, ret_color, ret_enabled) VALUES(?, ?, ?, ?, ?, ?)`,
      [ret_id, ret_re_id, ret_name, ret_xml_gpx, ret_color, ret_enabled]
    );

    debugLog("INFO", "Race event track added:", ret_id);
    return ret_id;
  } catch (error) {
    debugLog("ERROR", "Error adding race event track:", error);
    throw error;
  }
};

/**
 * Récupère toutes les pistes d'événement de course par l'ID de l'événement.
 * @param {number} re_id L'ID de l'événement de course.
 * @returns {Promise<DbRaceEventTrack[]>} Un tableau d'objets DbRaceEventTrack.
 */
export const getRaceEventTracksByRaceEventId = async (re_id) => {
  try {
    const db = getDb();
    const result = await db.getAllAsync(
      `SELECT * FROM race_event_track WHERE ret_re_id = ?`,
      [re_id]
    );
    return /** @type {DbRaceEventTrack[]} */ (result);
  } catch (error) {
    debugLog("ERROR", "Error fetching race event tracks by race event ID:", error);
    throw error;
  }
};

/**
 * Récupère une piste d'événement de course par son ID.
 * @param {number} ret_id L'ID de la piste d'événement à récupérer.
 * @returns {Promise<DbRaceEventTrack | null>} L'objet DbRaceEventTrack ou null si non trouvé.
 */
export const getRaceEventTrackById = async (ret_id) => {
  try {
    const db = getDb();
    const result = await db.getFirstAsync(
      `SELECT * FROM race_event_track WHERE ret_id = ?`,
      [ret_id]
    );
    return /** @type {DbRaceEventTrack | null} */ (result);
  } catch (error) {
    debugLog("ERROR", "Error fetching race event track by ID:", error);
    throw error;
  }
};

/**
 * Met à jour une piste d'événement de course existante.
 * @param {number} ret_id L'ID de la piste à mettre à jour.
 * @param {string} ret_name Le nouveau nom de la piste.
 * @param {string} ret_xml_gpx Les nouvelles données GPX XML.
 * @param {string} ret_color La nouvelle couleur de la piste.
 * @param {number} ret_enabled Le nouvel état d'activation de la piste.
 * @returns {Promise<void>} Une promesse qui se résout lorsque la piste est mise à jour.
 */
export const updateRaceEventTrack = async (
  ret_id,
  ret_name,
  ret_xml_gpx,
  ret_color,
  ret_enabled
) => {
  try {
    const db = getDb();
    await db.runAsync(
      `UPDATE race_event_track SET ret_name = ?, ret_xml_gpx = ?, ret_color = ?, ret_enabled = ? WHERE ret_id = ?`,
      [ret_name, ret_xml_gpx, ret_color, ret_enabled, ret_id]
    );
  } catch (error) {
    debugLog("ERROR", "Error updating race event track:", error);
    throw error;
  }
};