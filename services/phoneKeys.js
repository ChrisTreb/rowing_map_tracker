import { getDb } from './database';

/**
 * @typedef {object} PhoneRpKey
 * @property {number} prk_id
 * @property {string} prk_rp_key
 * @property {number} re_id
 * @property {number} re_event_end_date_and_time
 */

/**
 * Adds a new phone RP key to the database.
 * @param {string} rp_key - The RP key to add.
 * @param {number} re_id - The ID of the associated race event (optional, default null).
 * @param {number} re_event_end_date_and_time - The end date and time of the associated race event (optional, default null).
 * @returns {Promise<void>} A promise that resolves when the key is added.
 */
export const addPhoneRpKey = async (rp_key, re_id, re_event_end_date_and_time) => {
  try {
    const db = getDb();
    await db.runAsync(
      `INSERT INTO phone_rp_keys (prk_rp_key, re_id, re_event_end_date_and_time) VALUES (?, ?, ?)`,
      [rp_key, re_id, re_event_end_date_and_time]
    );
    console.log("Phone RP key added:", rp_key);
  } catch (error) {
    console.error("Error adding phone RP key:", error);
    throw error;
  }
};

/**
 * Retrieves all phone RP keys from the database.
 * @returns {Promise<PhoneRpKey[]>} A promise that resolves to an array of phone RP keys.
 */
export const getPhoneRpKeys = async () => {
    try {
        const db = getDb();
        const result = await db.getAllAsync(`SELECT * FROM phone_rp_keys`);
        return result;
    } catch (error) {
        console.error("Error retrieving phone RP keys:", error);
        throw error;
    }
};

/**
 * Deletes a phone RP key from the database.
 * @param {string} rp_key - The RP key to delete.
 * @returns {Promise<void>} A promise that resolves when the key is deleted.
 */
export const deletePhoneRpKey = async (rp_key) => {
    try {
        const db = getDb();
        await db.runAsync(`DELETE FROM phone_rp_keys WHERE prk_rp_key = ?`, [rp_key]);
        console.log("Phone RP key deleted:", rp_key);
    } catch (error) {
        console.error("Error deleting phone RP key:", error);
        throw error;
    }
};

/**
 * Deletes all phone RP keys from the database where end date and time is past.
 */
export const deleteExpiredPhoneRpKeys = async () => {
    try {
        const db = getDb();
        const now = new Date().getTime();
        await db.runAsync(`DELETE FROM phone_rp_keys WHERE re_event_end_date_and_time < ?`, [now]);
        console.log("Expired phone RP keys deleted.");
    } catch (error) {
        console.error("Error deleting expired phone RP keys:", error);
        throw error;
    }
};

/**
 * Updates a phone RP key in the database.
 * @param {string} prk_rp_key - The RP key to update.
 * @param {number} re_id - The ID of the associated race event.
 * @param {number} re_event_end_date_and_time - The end date and time of the associated race event.
 * @returns {Promise<void>} A promise that resolves when the key is updated.
 */
export const updatePhoneRpKey = async (re_id, re_event_end_date_and_time, prk_rp_key) => {
    try {
        const db = getDb();
        await db.runAsync(
            `UPDATE phone_rp_keys SET re_id = ?, re_event_end_date_and_time = ? WHERE prk_rp_key = ?`,
            [re_id, re_event_end_date_and_time, prk_rp_key]
        );
        console.log("Phone RP key updated: ", prk_rp_key);
    } catch (error) {
        console.error("Error updating phone RP key:", error);
        throw error;
    }
};
