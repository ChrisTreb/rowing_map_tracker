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

export const resetDatabase = async () => {
  try {
    await db.execAsync(`DELETE FROM races;`);
    console.log("Database reset ✅");
  } catch (error) {
    console.error("Error resetting database:", error);
    throw error;
  }
};

export const seedRaces = async () => {
  try {
    const existing = await db.getAllAsync(`SELECT id FROM races LIMIT 1`);

    if (existing.length > 0) {
      console.log("Seed déjà effectué");
      return;
    }

    console.log("Seeding database...");

    const now = Date.now();

    const fakePath = (lat, lng) => {
      return JSON.stringify([
        { latitude: lat, longitude: lng },
        { latitude: lat + 0.001, longitude: lng + 0.001 },
        { latitude: lat + 0.002, longitude: lng + 0.0015 },
        { latitude: lat + 0.003, longitude: lng + 0.002 }
      ]);
    };

    await addRace(
      "Sortie matinale",
      now - 86400000,
      now - 86000000,
      2400,
      5.2,
      7.8,
      fakePath(48.39, -4.48)
    );

    await addRace(
      "Session cardio",
      now - 172800000,
      now - 172000000,
      3600,
      8.5,
      8.5,
      fakePath(48.391, -4.482)
    );

    await addRace(
      "Balade tranquille",
      now - 259200000,
      now - 258000000,
      1800,
      3.1,
      6.2,
      fakePath(48.388, -4.479)
    );

    console.log("Seed terminé ✅");

  } catch (error) {
    console.error("Erreur seed:", error);
  }
};