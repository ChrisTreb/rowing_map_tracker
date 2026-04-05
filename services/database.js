import * as SQLite from 'expo-sqlite';

let db;

export const initDb = async () => {
  try {
    db = await SQLite.openDatabaseAsync("rowing_tracker.db");

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS races (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration INTEGER,
        distance REAL,
        avg_speed REAL,
        route_data TEXT
      );
    `);

    console.log("Database initialized");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

export const addRace = async (
  name,
  start_time,
  end_time,
  duration,
  distance,
  avg_speed,
  route_data
) => {
  try {
    const result = await db.runAsync(
      `INSERT INTO races 
       (name, start_time, end_time, duration, distance, avg_speed, route_data) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, start_time, end_time, duration, distance, avg_speed, route_data]
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