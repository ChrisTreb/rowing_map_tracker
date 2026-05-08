import * as SQLite from 'expo-sqlite';

/**
 * @type {SQLite.SQLiteDatabase | null}
 */
let db = null; // Initialiser à null explicitement

/**
 * Retourne l'instance de la base de données.
 * @returns {SQLite.SQLiteDatabase} L'instance de la base de données SQLite.
 * @throws {Error} Si la base de données n'est pas initialisée.
 */
export const getDb = () => {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
};

/**
 * Initialise la base de données en ouvrant une connexion et en créant les tables si elles n'existent pas.
 * @returns {Promise<void>} Une promesse qui se résout lorsque la base de données est initialisée.
 */
export const initDb = async () => {
  try {
    db = await SQLite.openDatabaseAsync("rowing_tracker.db");

    // ... existing schema definition ...
    await db.execAsync(`
      DROP TABLE IF EXISTS race_participant_position;
      DROP TABLE IF EXISTS race_participant;
      DROP TABLE IF EXISTS race;
      DROP TABLE IF EXISTS race_event_track;
      DROP TABLE IF EXISTS race_event;
      DROP TABLE IF EXISTS session;
      DROP TABLE IF EXISTS user;
      DROP TABLE IF EXISTS rowing_club;
      DROP TABLE IF EXISTS phone_rp_keys;

      CREATE TABLE IF NOT EXISTS race (
        ra_id INTEGER NOT NULL PRIMARY KEY,
        ra_re_id INTEGER NOT NULL REFERENCES race_event(re_id) ON DELETE CASCADE,
        ra_type TEXT NOT NULL,
        ra_name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rowing_club (
        rc_id INTEGER NOT NULL PRIMARY KEY,
        rc_name TEXT NOT NULL,
        rc_nickname TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user (
        usr_id INTEGER NOT NULL PRIMARY KEY,
        usr_name TEXT NULL,
        usr_apikey TEXT NOT NULL UNIQUE,
        usr_rc_id INTEGER REFERENCES rowing_club(rc_id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS session (
        se_id TEXT NOT NULL PRIMARY KEY,
        se_user_id INTEGER NOT NULL REFERENCES user(usr_id) ON DELETE CASCADE,
        se_expires_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS race_event (
        re_id INTEGER NOT NULL PRIMARY KEY,
        re_user_id INTEGER NOT NULL REFERENCES user(usr_id) ON DELETE CASCADE,
        re_event_name TEXT NOT NULL,
        re_event_visibility INTEGER NOT NULL,
        re_event_start_date_and_time INTEGER NOT NULL,
        re_event_end_date_and_time INTEGER NOT NULL,
        re_event_random_id_edit TEXT NOT NULL,
        re_event_random_id_viewer TEXT NOT NULL UNIQUE,
        re_viewport_latitude DECIMAL NOT NULL,
        re_viewport_longitude DECIMAL NOT NULL,
        re_viewport_zoom INTEGER NOT NULL,
        re_viewport_opacity DECIMAL NOT NULL,
        re_maplayer TEXT NOT NULL,
        re_marker_timeout INTEGER NOT NULL DEFAULT 180,
	      re_tail_timeout INTEGER NOT NULL DEFAULT 180,
	      re_flag_content INTEGER NOT NULL DEFAULT 0,
        nb_participants INTEGER NOT NULL DEFAULT 0,
        my_rp_key TEXT NULL
      );

      CREATE TABLE IF NOT EXISTS race_event_track (
        ret_id INTEGER NOT NULL PRIMARY KEY,
        ret_re_id INTEGER NOT NULL REFERENCES race_event(re_id) ON DELETE CASCADE,
        ret_name TEXT NOT NULL,
        ret_xml_gpx TEXT NOT NULL,
        ret_color TEXT NOT NULL,
        ret_enabled INTEGER NOT NULL CHECK (ret_enabled IN (0, 1))
      );

      CREATE TABLE IF NOT EXISTS race_participant (
        rp_id INTEGER NOT NULL PRIMARY KEY,
        rp_ra_id INTEGER NOT NULL REFERENCES race(ra_id) ON DELETE CASCADE,
        rp_bib TEXT,
        rp_name TEXT,
        rp_color TEXT,
        rp_key TEXT NOT NULL UNIQUE,
        rp_updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS race_participant_position (
        rpp_id INTEGER NOT NULL PRIMARY KEY,
        rpp_rp_id INTEGER NOT NULL REFERENCES race_participant(rp_id) ON DELETE CASCADE,
        rpp_date INTEGER NOT NULL,
        rpp_latitude DECIMAL NOT NULL,
        rpp_longitude DECIMAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS phone_rp_keys (
        prk_id INTEGER NOT NULL PRIMARY KEY,
        prk_rp_key TEXT NOT NULL UNIQUE,
        re_id INTEGER NOT NULL,
        re_event_end_date_and_time INTEGER NOT NULL
      );
    `);
    // ... end of existing schema definition ...

    console.log("Database initialized");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

/**
 * Réinitialise la base de données en supprimant toutes les données des tables.
 * @returns {Promise<void>} Une promesse qui se résout lorsque la base de données est réinitialisée.
 */
export const resetDatabase = async () => {
  try {
    const db = getDb();
    await db.runAsync(`
      DELETE FROM race_participant_position;
      DELETE FROM race_participant;
      DELETE FROM race;
      DELETE FROM race_event_track;
      DELETE FROM phone_rp_keys;
      DELETE FROM race_event;
      DELETE FROM session;
      DELETE FROM user;
      DELETE FROM rowing_club;
    `);
    console.log("Database reset ✅");
  } catch (error) {
    console.error("Error resetting database:", error);
    throw error;
  }
};

// Import and re-export all specific operations
import * as phoneKeysOperations from './phoneKeys';
import * as raceOperations from './race';
import * as raceEventOperations from './raceEvent';
import * as raceEventTrackOperations from './raceEventTrack';
import * as raceParticipantOperations from './raceParticipant';
import * as raceParticipantPositionOperations from './raceParticipantPosition';
import * as rowingClubOperations from './rowingClub';
import * as sessionOperations from './session';
import * as userOperations from './user';

export const { addPhoneRpKey, getPhoneRpKeys, deletePhoneRpKey } = phoneKeysOperations;
export const { addRace, getRaces, getRaceById } = raceOperations;
export const { addRowingClub, getRowingClubs, getRowingClubById, updateRowingClub, deleteRowingClub } = rowingClubOperations;
export const { addUser, getUserById, updateUser, deleteUser } = userOperations;
export const { addSession, getSessionById, deleteSession } = sessionOperations;
export const { addRaceEvent, getRaceEvents, getRaceEventById, updateRaceEvent } = raceEventOperations;
export const { addRaceEventTrack, getRaceEventTracksByRaceEventId, getRaceEventTrackById, updateRaceEventTrack } = raceEventTrackOperations;
export const { addRaceParticipant, getRaceParticipantsByRaceId, getRaceParticipantById, updateRaceParticipant, deleteRaceParticipant } = raceParticipantOperations;
export const { addRaceParticipantPosition, getRaceParticipantPositionsByParticipantId, deleteRaceParticipantPositionsByParticipantId } = raceParticipantPositionOperations;

