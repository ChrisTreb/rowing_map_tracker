// @ts-check
import { getDb } from './database';

/**
 * @typedef {object} DbRaceEvent
 * @property {number} re_id
 * @property {number} re_user_id
 * @property {string} re_event_name
 * @property {number} re_event_visibility
 * @property {number} re_event_start_date_and_time
 * @property {number} re_event_end_date_and_time
 * @property {string} re_event_random_id_edit
 * @property {string} re_event_random_id_viewer
 * @property {number} re_viewport_latitude
 * @property {number} re_viewport_longitude
 * @property {number} re_viewport_zoom
 * @property {string} re_viewport_opacity
 * @property {string} re_maplayer
 * @property {number} re_marker_timeout
 * @property {number} re_tail_timeout
 * @property {number} re_flag_content
 * @property {number} nb_participants
 */

/**
 * Ajoute un nouvel événement de course à la base de données.
 * @param {number} re_id L'ID de l'événement de course, généré en externe.
 * @param {number} re_user_id L'ID de l'utilisateur créateur.
 * @param {string} re_event_name Le nom de l'événement.
 * @param {number} re_event_visibility La visibilité de l'événement (0 pour privé, 1 pour public).
 * @param {number} re_event_start_date_and_time Le timestamp de début de l'événement.
 * @param {number} re_event_end_date_and_time Le timestamp de fin de l'événement.
 * @param {string} re_event_random_id_edit L'ID aléatoire pour l'édition de l'événement.
 * @param {string} re_event_random_id_viewer L'ID aléatoire pour la visualisation de l'événement.
 * @param {number} re_viewport_latitude La latitude du centre de la carte.
 * @param {number} re_viewport_longitude La longitude du centre de la carte.
 * @param {number} re_viewport_zoom Le niveau de zoom de la carte.
 * @param {string} re_viewport_opacity L'opacité du viewport.
 * @param {string} re_maplayer Le type de couche de carte.
 * @param {number} re_marker_timeout Le délai d'expiration des marqueurs en secondes (optionnel, par défaut 180).
 * @param {number} re_tail_timeout Le délai d'expiration des traces en secondes (optionnel, par défaut 180).
 * @param {number} re_flag_content Le contenu du drapeau de l'événement (optionnel, par défaut 0).
 * @param {number} nb_participants Le nombre de participants à l'événement (optionnel, par défaut 0).
 * @returns {Promise<number>} L'ID de l'événement de course ajouté.
 */
export const addRaceEvent = async (
  re_id,
  re_user_id,
  re_event_name,
  re_event_visibility,
  re_event_start_date_and_time,
  re_event_end_date_and_time,
  re_event_random_id_edit,
  re_event_random_id_viewer,
  re_viewport_latitude,
  re_viewport_longitude,
  re_viewport_zoom,
  re_viewport_opacity,
  re_maplayer,
  re_marker_timeout,
  re_tail_timeout,
  re_flag_content,
  nb_participants
) => {
  try {
    const db = getDb();
    await db.runAsync(
      `INSERT INTO race_event
      (re_id, re_user_id, re_event_name, re_event_visibility, re_event_start_date_and_time, re_event_end_date_and_time, re_event_random_id_edit, re_event_random_id_viewer, re_viewport_latitude, re_viewport_longitude, re_viewport_zoom, re_viewport_opacity, re_maplayer, re_marker_timeout, re_tail_timeout, re_flag_content, nb_participants) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [re_id, re_user_id, re_event_name, re_event_visibility, re_event_start_date_and_time, re_event_end_date_and_time, re_event_random_id_edit, re_event_random_id_viewer, re_viewport_latitude, re_viewport_longitude, re_viewport_zoom, re_viewport_opacity, re_maplayer, re_marker_timeout, re_tail_timeout, re_flag_content, nb_participants]
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
 * @returns {Promise<DbRaceEvent[]>} Un tableau d'objets DbRaceEvent.
 */
export const getRaceEvents = async () => {
  try {
    const db = getDb();
    const result = await db.getAllAsync(
      `SELECT * FROM race_event ORDER BY re_event_start_date_and_time DESC`
    );

    console.log("Race events fetched:", result);
    return /** @type {DbRaceEvent[]} */ (result);
  } catch (error) {
    console.error("Error fetching race events:", error);
    throw error;
  }
};

/**
 * Récupère un événement de course par son ID.
 * @param {number} re_id L'ID de l'événement de course à récupérer.
 * @returns {Promise<DbRaceEvent | null>} L'objet DbRaceEvent ou null si non trouvé.
 */
export const getRaceEventById = async (re_id) => {
  try {
    const db = getDb();
    const result = await db.getFirstAsync(
      `SELECT * FROM race_event WHERE re_id = ?`,
      [re_id]
    );
    return /** @type {DbRaceEvent | null} */ (result);
  } catch (error) {
    console.error("Error fetching race event by ID:", error);
    throw error;
  }
};

/**
 * Met à jour un événement de course existant.
 * @param {number} re_id L'ID de l'événement de course à mettre à jour.
 * @param {string} re_event_name Le nouveau nom de l'événement.
 * @param {number} re_event_visibility La nouvelle visibilité de l'événement.
 * @param {number} re_event_start_date_and_time Le nouveau timestamp de début.
 * @param {number} re_event_end_date_and_time Le nouveau timestamp de fin.
 * @param {string} re_event_random_id_edit Le nouvel ID aléatoire pour l'édition.
 * @param {string} re_event_random_id_viewer Le nouvel ID aléatoire pour la visualisation.
 * @param {number} re_viewport_latitude La nouvelle latitude du centre de la carte.
 * @param {number} re_viewport_longitude La nouvelle longitude du centre de la carte.
 * @param {number} re_viewport_zoom Le nouveau niveau de zoom.
 * @param {string} re_viewport_opacity L'opacité du viewport.
 * @param {string} re_maplayer Le nouveau type de couche de carte.
 * @param {number} re_marker_timeout Le nouveau délai d'expiration des marqueurs en secondes.
 * @param {number} re_tail_timeout Le nouveau délai d'expiration des traces en secondes.
 * @param {number} re_flag_content Le nouveau contenu du drapeau de l'événement.
 * @param {number} nb_participants Le nouveau nombre de participants à l'événement.
 * @returns {Promise<void>} Une promesse qui se résout lorsque l'événement est mis à jour.
 */
export const updateRaceEvent = async (
  re_id,
  re_event_name,
  re_event_visibility,
  re_event_start_date_and_time,
  re_event_end_date_and_time,
  re_event_random_id_edit,
  re_event_random_id_viewer,
  re_viewport_latitude,
  re_viewport_longitude,
  re_viewport_zoom,
  re_viewport_opacity,
  re_maplayer,
  re_marker_timeout,
  re_tail_timeout,
  re_flag_content,
  nb_participants
) => {
  try {
    const db = getDb();
    await db.runAsync(
      `UPDATE race_event SET re_event_name = ?, re_event_visibility = ?, re_event_start_date_and_time = ?, re_event_end_date_and_time = ?, re_event_random_id_edit = ?, re_event_random_id_viewer = ?, re_viewport_latitude = ?, re_viewport_longitude = ?, re_viewport_zoom = ?, re_viewport_opacity = ?, re_maplayer = ?, re_marker_timeout = ?, re_tail_timeout = ?, re_flag_content = ?, nb_participants = ? WHERE re_id = ?`,
      [re_event_name, re_event_visibility, re_event_start_date_and_time, re_event_end_date_and_time, re_event_random_id_edit, re_event_random_id_viewer, re_viewport_latitude, re_viewport_longitude, re_viewport_zoom, re_viewport_opacity, re_maplayer, re_marker_timeout, re_tail_timeout, re_flag_content, nb_participants, re_id]
    );
  } catch (error) {
    console.error("Error updating race event:", error);
    throw error;
  }
};