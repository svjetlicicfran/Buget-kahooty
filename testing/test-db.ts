// src/test-db.ts
import knex from 'knex';
import config from '../knexfile.ts'; // Ensure this points to your corrected knexfile

// Initialize the knex instance for development
const db = knex(config.development);

async function testConnection() {
    try {
        // Perform a simple query to check connectivity
        const result = await db.raw('SELECT VERSION() as version');

        console.log('Successfully connected to the database!');
        console.log('Database version:', result[0][0].version);

        // Always close the connection in a test script to exit the process
        await db.destroy();
    } catch (error) {
        console.error('Database connection failed:', error);
    }
}

testConnection();