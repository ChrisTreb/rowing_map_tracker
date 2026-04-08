import * as SQLite from 'expo-sqlite';

let db;

export const initDb = async () => {
  try {
    db = await SQLite.openDatabaseAsync("rowing_tracker.db");

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS race (
        ra_id INTEGER PRIMARY KEY AUTOINCREMENT,
        ra_re_id INTEGER NOT NULL REFERENCES race_event(re_id) ON DELETE CASCADE,
        ra_type TEXT NOT NULL,
        ra_name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rowing_club (
        rc_id INTEGER PRIMARY KEY AUTOINCREMENT,
        rc_name TEXT NOT NULL,
        rc_nickname TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user (
        usr_id INTEGER NOT NULL PRIMARY KEY,
        usr_google_id TEXT NOT NULL,
        usr_email TEXT NOT NULL,
        usr_name TEXT NULL,
        usr_apikey TEXT NOT NULL,
        usr_rc_id INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS session (
        se_id TEXT NOT NULL PRIMARY KEY,
        se_user_id INTEGER NOT NULL REFERENCES user(usr_id) ON DELETE CASCADE,
        se_expires_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS race_event (
        re_id INTEGER PRIMARY KEY AUTOINCREMENT,
        re_user_id INTEGER NOT NULL REFERENCES user(usr_id) ON DELETE CASCADE,
        re_eventName TEXT NOT NULL,
        re_eventVisibility INTEGER NOT NULL,
        re_eventStartDateAndTime INTEGER NOT NULL,
        re_eventEndDateAndTime INTEGER NOT NULL,
        re_eventRandomId_edit TEXT NOT NULL,
        re_eventRandomId_viewer TEXT NOT NULL,
        re_viewport_latitude DECIMAL NOT NULL,
        re_viewport_longitude DECIMAL NOT NULL,
        re_viewport_zoom INTEGER NOT NULL,
        re_maplayer TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS race_event_track (
        ret_id INTEGER PRIMARY KEY AUTOINCREMENT,
        ret_re_id INTEGER NOT NULL REFERENCES race_event(re_id) ON DELETE CASCADE,
        ret_name TEXT NOT NULL,
        ret_xml_gpx TEXT NOT NULL,
        ret_color TEXT NOT NULL,
        ret_enabled INTEGER NOT NULL CHECK (ret_enabled IN (0, 1))
      );

      CREATE TABLE IF NOT EXISTS race_participant (
        rp_id INTEGER PRIMARY KEY AUTOINCREMENT,
        rp_ra_id INTEGER NOT NULL REFERENCES race(ra_id) ON DELETE CASCADE,
        rp_bib TEXT,
        rp_name TEXT,
        rp_color,
        rp_key TEXT NOT NULL REFERENCES race_key(rk_key),
        rp_updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS race_participant_position (
        rpp_id INTEGER PRIMARY KEY AUTOINCREMENT,
        rpp_rp_id INTEGER NOT NULL REFERENCES race(ra_id),
        rp_date INTEGER NOT NULL,
        rpp_viewport_latitude DECIMAL NOT NULL,
        rpp_viewport_longitude DECIMAL NOT NULL
      );
    `);

    console.log("Database initialized");

  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

// Race operations
export const addRace = async (
  ra_re_id,
  ra_type,
  ra_name
) => {
  try {
    const result = await db.runAsync(
      `INSERT INTO races
      (ra_re_id, ra_type, ra_name) VALUES(?, ?, ?)`,
      [ra_re_id, ra_type, ra_name]
    );

    console.log("Race added:", result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error adding race:", error);
    throw error;
  }
};

export const getRaces = async () => {
  try {
    const result = await db.getAllAsync(
      `SELECT * FROM races ORDER BY start_time DESC`
    );

    if (result.length === 0 || !result[0].route_data) {
      console.warn("No races found or route_data is empty");
      return [];
    }

    console.log("Races fetched:", result);

    return result;

  } catch (error) {
    console.error("Error fetching races:", error);
    throw error;
  }
};

export const getRaceById = async (id) => {
  try {
    const result = await db.getAsync(
      `SELECT * FROM  races WHERE id = ?`,
      [id]
    );
    return result;
  } catch (error) {
    console.error("Error fetching race by ID:", error);
    throw error;
  }
};

// Race event operations
export const addRaceEvent = async (
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
    const result = await db.runAsync(
      `INSERT INTO race_event
      (re_user_id, re_eventName, re_eventVisibility, re_eventStartDateAndTime, re_eventEndDateAndTime, re_eventRandomId_edit, re_eventRandomId_viewer, re_viewport_latitude, re_viewport_longitude, re_viewport_zoom, re_maplayer) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [re_user_id, re_eventName, re_eventVisibility, re_eventStartDateAndTime, re_eventEndDateAndTime, re_eventRandomId_edit, re_eventRandomId_viewer, re_viewport_latitude, re_viewport_longitude, re_viewport_zoom, re_maplayer]
    );

    console.log("Race event added:", result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error adding race event:", error);
    throw error;
  }
};

export const getRaceEvents = async () => {
  try {
    const result = await db.getAllAsync(
      `SELECT * FROM race_event ORDER BY re_eventStartDateAndTime DESC`
    );

    console.log("Race events fetched:", result);
    return result;
  } catch (error) {
    console.error("Error fetching race events:", error);
    throw error;
  }
};

export const getRaceEventById = async (id) => {
  try {
    const result = await db.getAsync(
      `SELECT * FROM race_event WHERE id = ?`,
      [id]
    );
    return result;
  } catch (error) {
    console.error("Error fetching race event by ID:", error);
    throw error;
  }
};

export const updateRaceEvent = async (
  id,
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
    await db.runAsync(
      `UPDATE race_event SET re_eventName = ?, re_eventVisibility = ?, re_eventStartDateAndTime = ?, re_eventEndDateAndTime = ?, re_eventRandomId_edit = ?, re_eventRandomId_viewer = ?, re_viewport_latitude = ?, re_viewport_longitude = ?, re_viewport_zoom = ?, re_maplayer = ? WHERE id = ?`,
      [re_eventName, re_eventVisibility, re_eventStartDateAndTime, re_eventEndDateAndTime, re_eventRandomId_edit, re_eventRandomId_viewer, re_viewport_latitude, re_viewport_longitude, re_viewport_zoom, re_maplayer, id]
    );
  } catch (error) {
    console.error("Error updating race event:", error);
    throw error;
  }
};

// Race event track operations
export const addRaceEventTrack = async (
  ret_re_id,
  ret_track_data
) => {
  try {
    const result = await db.runAsync(
      `INSERT INTO race_event_track
      (ret_re_id, ret_track_data) VALUES(?, ?)`,
      [ret_re_id, ret_track_data]
    );

    console.log("Race event track added:", result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error adding race event track:", error);
    throw error;
  }
};

export const getRaceEventTracksByRaceEventId = async (re_id) => {
  try {
    const result = await db.getAllAsync(
      `SELECT * FROM race_event_track WHERE ret_re_id = ?`,
      [re_id]
    );
    return result;
  } catch (error) {
    console.error("Error fetching race event tracks by race event ID:", error);
    throw error;
  }
};

export const getRaceEventTrackById = async (id) => {
  try {
    const result = await db.getAsync(
      `SELECT * FROM race_event_track WHERE id = ?`,
      [id]
    );
    return result;
  } catch (error) {
    console.error("Error fetching race event track by ID:", error);
    throw error;
  }
};

export const updateRaceEventTrack = async (id, ret_track_data) => {
  try {
    await db.runAsync(
      `UPDATE race_event_track SET ret_track_data = ? WHERE id = ?`,
      [ret_track_data, id]
    );
  } catch (error) {
    console.error("Error updating race event track:", error);
    throw error;
  }
};

// User operations
export const addUser = async (
  usr_google_id
) => {
  try {
    const result = await db.runAsync(
      `INSERT INTO users (usr_google_id) VALUES (?)`,
      [usr_google_id]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error adding user:", error);
    throw error;
  }
};

export const getUserByGoogleId = async (usr_google_id) => {
  try {
    const result = await db.getAsync(   
      `SELECT * FROM users WHERE usr_google_id = ?`,
      [usr_google_id]
    );
    return result;
  } catch (error) {
    console.error("Error fetching user by Google ID:", error);
    throw error;
  }
};

export const getUserById = async (usr_id) => {
  try {
    const result = await db.getAsync(
      `SELECT * FROM users WHERE id = ?`,
      [usr_id]
    );
    return result;
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    throw error;
  }
};

export const updateUser = async (usr_id, usr_email, usr_name, usr_apikey, usr_rc_id) => {
  try {
    await db.runAsync(
      `UPDATE users SET usr_email = ?, usr_name = ?, usr_apikey = ?, usr_rc_id = ? WHERE id = ?`,
      [usr_email, usr_name, usr_apikey, usr_rc_id, usr_id]
    );
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

export const deleteUser = async (usr_id) => {
  try {
    await db.runAsync(
      `DELETE FROM users WHERE id = ?`,
      [usr_id]
    );
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

// Session operations
export const addSession = async (se_user_id, se_expires_at) => {
  try {
    const result = await db.runAsync(
      `INSERT INTO sessions (se_user_id, se_expires_at) VALUES (?, ?)`,
      [se_user_id, se_expires_at]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error adding session:", error);
    throw error;
  }
};

export const getSessionById = async (se_id) => {
  try {
    const result = await db.getAsync(
      `SELECT * FROM sessions WHERE id = ?`,
      [se_id]
    );
    return result;
  } catch (error) {
    console.error("Error fetching session by ID:", error);
    throw error;
  }
};

export const deleteSession = async (se_id) => {
  try {
    await db.runAsync(
      `DELETE FROM sessions WHERE id = ?`,
      [se_id]
    );
  } catch (error) {
    console.error("Error deleting session:", error);
    throw error;
  }
};

// Race participant operations
export const addRaceParticipant = async (
  rp_ra_id,
  rp_bib,
  rp_name,
  rp_color,
  rp_key,
  rp_updated_at
) => {
  try {
    const result = await db.runAsync(
      `INSERT INTO race_participants (rp_ra_id, rp_bib, rp_name, rp_color, rp_key, rp_updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [rp_ra_id, rp_bib, rp_name, rp_color, rp_key, rp_updated_at]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error adding race participant:", error);
    throw error;
  }
};

export const getRaceParticipantsByRaceId = async (ra_id) => {
  try {
    const result = await db.getAllAsync(
      `SELECT * FROM race_participants WHERE rp_ra_id = ?`,
      [ra_id]
    );
    return result;
  } catch (error) {
    console.error("Error fetching race participants by race ID:", error);
    throw error;
  }
};

export const getRaceParticipantById = async (rp_id) => {
  try {
    const result = await db.getAsync(
      `SELECT * FROM race_participants WHERE id = ?`,
      [rp_id]
    );
    return result;
  } catch (error) {
    console.error("Error fetching race participant by ID:", error);
    throw error;
  }
};

export const updateRaceParticipant = async (rp_id, rp_bib, rp_name, rp_color, rp_key, rp_updated_at) => {
  try {
    await db.runAsync(
      `UPDATE race_participants SET rp_bib = ?, rp_name = ?, rp_color = ?, rp_key = ?, rp_updated_at = ? WHERE id = ?`,
      [rp_bib, rp_name, rp_color, rp_key, rp_updated_at, rp_id]
    );
  } catch (error) {
    console.error("Error updating race participant:", error);
    throw error;
  }
};

export const deleteRaceParticipant = async (rp_id) => {
  try {
    await db.runAsync(
      `DELETE FROM race_participants WHERE id = ?`,
      [rp_id]
    );
  } catch (error) {
    console.error("Error deleting race participant:", error);
    throw error;
  }
};

// Rowing club operations
export const addRowingClub = async (rc_name, rc_nickname) => {
  try {
    const result = await db.runAsync(
      `INSERT INTO rowing_clubs (rc_name, rc_nickname) VALUES (?, ?)`,
      [rc_name, rc_nickname]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error adding rowing club:", error);
    throw error;
  }
};

export const getRowingClubs = async () => {
  try {
    const result = await db.getAllAsync(`SELECT * FROM rowing_clubs`);
    return result;
  } catch (error) {
    console.error("Error fetching rowing clubs:", error);
    throw error;
  }
};

export const getRowingClubById = async (rc_id) => {
  try {
    const result = await db.getAsync(
      `SELECT * FROM rowing_clubs WHERE id = ?`,
      [rc_id]
    );
    return result;
  } catch (error) {
    console.error("Error fetching rowing club by ID:", error);
    throw error;
  }
};

export const updateRowingClub = async (rc_id, rc_name, rc_nickname) => {
  try {
    await db.runAsync(
      `UPDATE rowing_clubs SET rc_name = ?, rc_nickname = ? WHERE id = ?`,
      [rc_name, rc_nickname, rc_id]
    );
  } catch (error) {
    console.error("Error updating rowing club:", error);
    throw error;
  }
};

export const deleteRowingClub = async (rc_id) => {
  try {
    await db.runAsync(
      `DELETE FROM rowing_clubs WHERE id = ?`,
      [rc_id]
    );
  } catch (error) {
    console.error("Error deleting rowing club:", error);
    throw error;
  }
};

// Race participant position operations
export const addRaceParticipantPosition = async (
  rpp_rp_id,
  rpp_position,
  rp_date,
  rpp_viewport_latitude,
  rpp_viewport_longitude
) => {
  try {
    const result = await db.runAsync(
      `INSERT INTO race_participant_positions (rpp_rp_id, rpp_position, rp_date, rpp_viewport_latitude, rpp_viewport_longitude) VALUES (?, ?, ?, ?, ?)`,
      [rpp_rp_id, rpp_position, rp_date, rpp_viewport_latitude, rpp_viewport_longitude]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error adding race participant position:", error);
    throw error;
  }
};

export const getRaceParticipantPositionsByParticipantId = async (rp_id) => {
  try {
    const result = await db.getAllAsync(
      `SELECT * FROM race_participant_positions WHERE rpp_rp_id = ?`,
      [rp_id]
    );
    return result;
  } catch (error) {
    console.error("Error fetching race participant positions by participant ID:", error);
    throw error;
  }
};

export const deleteRaceParticipantPositionsByParticipantId = async (rp_id) => {
  try {
    await db.runAsync(
      `DELETE FROM race_participant_positions WHERE rpp_rp_id = ?`,
      [rp_id]
    );
  } catch (error) {
    console.error("Error deleting race participant positions by participant ID:", error);
    throw error;
  }
};

// Utility function to reset the database (for testing purposes)
export const resetDatabase = async () => {
  try {
    await db.execAsync(`DELETE FROM races; `);
    console.log("Database reset ✅");
  } catch (error) {
    console.error("Error resetting database:", error);
    throw error;
  }
};