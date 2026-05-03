// @ts-check
import { getDb } from './database';

/**
 * @typedef {object} RaceEvent
 * @property {number} re_id
 * @property {number} re_user_id
 * @property {string} re_eventName
 * @property {number} re_eventVisibility
 * @property {number} re_eventStartDateAndTime
 * @property {number} re_eventEndDateAndTime
 * @property {string} re_eventRandomId_edit
 * @property {string} re_eventRandomId_viewer
 * @property {number} re_viewport_latitude
 * @property {number} re_viewport_longitude
 * @property {number} re_viewport_zoom
 * @property {string} re_maplayer
 */

/**
 * Ajoute un nouvel événement de course à la base de données.
 * @param {number} re_id L'ID de l'événement de course, généré en externe.
 * @param {number} re_user_id L'ID de l'utilisateur créateur.
 * @param {string} re_eventName Le nom de l'événement.
 * @param {number} re_eventVisibility La visibilité de l'événement (0 pour privé, 1 pour public).
 * @param {number} re_eventStartDateAndTime Le timestamp de début de l'événement.
 * @param {number} re_eventEndDateAndTime Le timestamp de fin de l'événement.
 * @param {string} re_eventRandomId_edit L'ID aléatoire pour l'édition de l'événement.
 * @param {string} re_eventRandomId_viewer L'ID aléatoire pour la visualisation de l'événement.
 * @param {number} re_viewport_latitude La latitude du centre de la carte.
 * @param {number} re_viewport_longitude La longitude du centre de la carte.
 * @param {number} re_viewport_zoom Le niveau de zoom de la carte.
 * @param {string} re_maplayer Le type de couche de carte.
 * @returns {Promise<number>} L'ID de l'événement de course ajouté.
 */
export const addRaceEvent = async (
  re_id,
  re_user_id,
  re_eventName,
  re_eventVisibility,
  re_eventStartDateAndTime,
  re_eventEndDateAndTime,
  re_eventRandomId_edit,
  re_eventRandomId_viewer,
  re_viewport_latitude,
  re_viewport_longitude,
  re_viewport_zoom,
  re_maplayer
) => {
  try {
    const db = getDb();
    await db.runAsync(
      `INSERT INTO race_event
      (re_id, re_user_id, re_eventName, re_eventVisibility, re_eventStartDateAndTime, re_eventEndDateAndTime, re_eventRandomId_edit, re_eventRandomId_viewer, re_viewport_latitude, re_viewport_longitude, re_viewport_zoom, re_maplayer) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [re_id, re_user_id, re_eventName, re_eventVisibility, re_eventStartDateAndTime, re_eventEndDateAndTime, re_eventRandomId_edit, re_eventRandomId_viewer, re_viewport_latitude, re_viewport_longitude, re_viewport_zoom, re_maplayer]
    );

    console.log("Race event added:", re_id);
    return re_id;
  } catch (error) {
    console.error("Error adding race event:", error);
    throw error;
  }
};

/**
 * Récupère tous les événements de course de la base de données.
 * @returns {Promise<RaceEvent[]>} Un tableau d'objets RaceEvent.
 */
export const getRaceEvents = async () => {
  try {
    const db = getDb();
    const result = await db.getAllAsync(
      `SELECT * FROM race_event ORDER BY re_eventStartDateAndTime DESC`
    );

    console.log("Race events fetched:", result);
    return /** @type {RaceEvent[]} */ (result);
  } catch (error) {
    console.error("Error fetching race events:", error);
    throw error;
  }
};

/**
 * Récupère un événement de course par son ID.
 * @param {number} re_id L'ID de l'événement de course à récupérer.
 * @returns {Promise<RaceEvent | null>} L'objet RaceEvent ou null si non trouvé.
 */
export const getRaceEventById = async (re_id) => {
  try {
    const db = getDb();
    const result = await db.getFirstAsync(
      `SELECT * FROM race_event WHERE re_id = ?`,
      [re_id]
    );
    return /** @type {RaceEvent | null} */ (result);
  } catch (error) {
    console.error("Error fetching race event by ID:", error);
    throw error;
  }
};

/**
 * Met à jour un événement de course existant.
 * @param {number} re_id L'ID de l'événement de course à mettre à jour.
 * @param {string} re_eventName Le nouveau nom de l'événement.
 * @param {number} re_eventVisibility La nouvelle visibilité de l'événement.
 * @param {number} re_eventStartDateAndTime Le nouveau timestamp de début.
 * @param {number} re_eventEndDateAndTime Le nouveau timestamp de fin.
 * @param {string} re_eventRandomId_edit Le nouvel ID aléatoire pour l'édition.
 * @param {string} re_eventRandomId_viewer Le nouvel ID aléatoire pour la visualisation.
 * @param {number} re_viewport_latitude La nouvelle latitude du centre de la carte.
 * @param {number} re_viewport_longitude La nouvelle longitude du centre de la carte.
 * @param {number} re_viewport_zoom Le nouveau niveau de zoom.
 * @param {string} re_maplayer Le nouveau type de couche de carte.
 * @returns {Promise<void>} Une promesse qui se résout lorsque l'événement est mis à jour.
 */
export const updateRaceEvent = async (
  re_id,
  re_eventName,
  re_eventVisibility,
  re_eventStartDateAndTime,
  re_eventEndDateAndTime,
  re_eventRandomId_edit,
  re_eventRandomId_viewer,
  re_viewport_latitude,
  re_viewport_longitude,
  re_viewport_zoom,
  re_maplayer
) => {
  try {
    const db = getDb();
    await db.runAsync(
      `UPDATE race_event SET re_eventName = ?, re_eventVisibility = ?, re_eventStartDateAndTime = ?, re_eventEndDateAndTime = ?, re_eventRandomId_edit = ?, re_eventRandomId_viewer = ?, re_viewport_latitude = ?, re_viewport_longitude = ?, re_viewport_zoom = ?, re_maplayer = ? WHERE re_id = ?`,
      [re_eventName, re_eventVisibility, re_eventStartDateAndTime, re_eventEndDateAndTime, re_eventRandomId_edit, re_eventRandomId_viewer, re_viewport_latitude, re_viewport_longitude, re_viewport_zoom, re_maplayer, re_id]
    );
  } catch (error) {
    console.error("Error updating race event:", error);
    throw error;
  }
};