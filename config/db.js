const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.on('connect', () => {
    console.log('✅ Supabase PostgreSQL সংযুক্ত / Database connected');
});

pool.on('error', (err) => {
    console.error('❌ Database সমস্যা:', err.message);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
