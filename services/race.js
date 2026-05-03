import { getDb } from './database';

/**
 * @typedef {object} Race
 * @property {number} ra_id
 * @property {number} ra_re_id
 * @property {string} ra_type
 * @property {string} ra_name
 */

/**
 * @typedef {object} RowingClub
 * @property {number} rc_id
 * @property {string} rc_name
 * @property {string} rc_nickname
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

    console.log("Race added:", ra_id);
    return ra_id;
  } catch (error) {
    console.error("Error adding race:", error);
    throw error;
  }
};

/**
 * Récupère toutes les courses de la base de données.
 * @returns {Promise<Race[]>} Un tableau d'objets Race.
 */
export const getRaces = async () => {
  try {
    const db = getDb();
    const result = await db.getAllAsync(
      `SELECT * FROM race ORDER BY ra_id DESC`
    );

    // This part of the original code seemed to be for a 'route_data' column that isn't in the schema.
    // If you need to filter or process 'route_data', please ensure the schema includes it or adjust accordingly.
    // if (result.length === 0 || !result[0].route_data) {
    //   console.warn("No races found or route_data is empty");
    //   return [];
    // }

    console.log("Races fetched:", result);
    return /** @type {Race[]} */ (result); // Cast pour assurer le type
  } catch (error) {
    console.error("Error fetching races:", error);
    throw error;
  }
};

/**
 * Récupère une course par son ID.
 * @param {number} ra_id L'ID de la course à récupérer.
 * @returns {Promise<Race | null>} L'objet Race ou null si non trouvé.
 */
export const getRaceById = async (ra_id) => {
  try {
    const db = getDb();
    const result = await db.getFirstAsync(
      `SELECT * FROM race WHERE ra_id = ?`,
      [ra_id]
    );
    return /** @type {Race | null} */ (result); // Cast pour assurer le type
  } catch (error) {
    console.error("Error fetching race by ID:", error);
    throw error;
  }
};
