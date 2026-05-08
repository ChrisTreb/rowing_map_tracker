import { getDb } from './database';

/**
 * @typedef {object} PhoneRpKey
 * @property {number} prk_id
 * @property {string} prk_rp_key
 */

/**
 * Adds a new phone RP key to the database.
 * @param {string} rp_key - The RP key to add.
 * @returns {Promise<void>} A promise that resolves when the key is added.
 */
export const addPhoneRpKey = async (rp_key) => {
  try {
    const db = getDb();
    await db.runAsync(
      `INSERT INTO phone_rp_keys (prk_rp_key) VALUES (?)`,
      [rp_key]
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