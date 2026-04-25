const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Initialize database tables
async function initializeDatabase() {
    try {
        // Users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE,
                password VARCHAR(255),
                google_id VARCHAR(255) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Profiles table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS profiles (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT,
                description TEXT,
                profile_image TEXT,
                footer TEXT,
                nsfw BOOLEAN DEFAULT FALSE,
                links JSONB,
                gallery JSONB,
                text_sections JSONB,
                left_sidebar JSONB,
                right_sidebar JSONB,
                social_icons JSONB,
                background JSONB,
                font JSONB,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id)
            )
        `);

        // OTP codes table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS otp_codes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                email VARCHAR(255) NOT NULL,
                code VARCHAR(6) NOT NULL,
                type VARCHAR(20) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

// Helper functions for database operations
const dbOperations = {
    // User operations
    createUser: async (username, email, password, googleId = null) => {
        try {
            const query = `
                INSERT INTO users (username, email, password, google_id)
                VALUES ($1, $2, $3, $4)
                RETURNING id, username, email, google_id
            `;
            const result = await pool.query(query, [username, email, password, googleId]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    getUserByUsername: async (username) => {
        try {
            const query = 'SELECT * FROM users WHERE username = $1';
            const result = await pool.query(query, [username]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    },

    getUserByEmail: async (email) => {
        try {
            const query = 'SELECT * FROM users WHERE email = $1';
            const result = await pool.query(query, [email]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    },

    getUserByGoogleId: async (googleId) => {
        try {
            const query = 'SELECT * FROM users WHERE google_id = $1';
            const result = await pool.query(query, [googleId]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    },

    getUserById: async (userId) => {
        try {
            const query = 'SELECT * FROM users WHERE id = $1';
            const result = await pool.query(query, [userId]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    },

    updateUserPassword: async (userId, newPassword) => {
        try {
            const query = 'UPDATE users SET password = $1 WHERE id = $2';
            await pool.query(query, [newPassword, userId]);
            return { success: true };
        } catch (error) {
            throw error;
        }
    },

    // OTP operations
    createOTP: async (userId, email, code, type, expiresAt) => {
        try {
            const query = `
                INSERT INTO otp_codes (user_id, email, code, type, expires_at)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `;
            const result = await pool.query(query, [userId, email, code, type, expiresAt]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    getValidOTP: async (email, code, type) => {
        try {
            const query = `
                SELECT * FROM otp_codes 
                WHERE email = $1 AND code = $2 AND type = $3 
                AND used = FALSE AND expires_at > NOW()
                ORDER BY created_at DESC LIMIT 1
            `;
            const result = await pool.query(query, [email, code, type]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    },

    markOTPUsed: async (otpId) => {
        try {
            const query = 'UPDATE otp_codes SET used = TRUE WHERE id = $1';
            await pool.query(query, [otpId]);
            return { success: true };
        } catch (error) {
            throw error;
        }
    },

    cleanupExpiredOTPs: async () => {
        try {
            const query = 'DELETE FROM otp_codes WHERE expires_at < NOW()';
            await pool.query(query);
            return { success: true };
        } catch (error) {
            throw error;
        }
    },

    // Profile operations
    saveProfile: async (userId, profileData) => {
        try {
            const query = `
                INSERT INTO profiles (
                    user_id, name, description, profile_image, footer, nsfw,
                    links, gallery, text_sections, left_sidebar, right_sidebar,
                    social_icons, background, font
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (user_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    profile_image = EXCLUDED.profile_image,
                    footer = EXCLUDED.footer,
                    nsfw = EXCLUDED.nsfw,
                    links = EXCLUDED.links,
                    gallery = EXCLUDED.gallery,
                    text_sections = EXCLUDED.text_sections,
                    left_sidebar = EXCLUDED.left_sidebar,
                    right_sidebar = EXCLUDED.right_sidebar,
                    social_icons = EXCLUDED.social_icons,
                    background = EXCLUDED.background,
                    font = EXCLUDED.font,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            
            const values = [
                userId,
                profileData.name,
                profileData.description,
                profileData.profileImage,
                profileData.footer,
                profileData.nsfw || false,
                JSON.stringify(profileData.links),
                JSON.stringify(profileData.gallery),
                JSON.stringify(profileData.textSections),
                JSON.stringify(profileData.leftSidebar),
                JSON.stringify(profileData.rightSidebar),
                JSON.stringify(profileData.socialIcons),
                JSON.stringify(profileData.background),
                JSON.stringify(profileData.font)
            ];

            const result = await pool.query(query, values);
            return { success: true };
        } catch (error) {
            throw error;
        }
    },

    getProfileByUserId: async (userId) => {
        try {
            const query = 'SELECT * FROM profiles WHERE user_id = $1';
            const result = await pool.query(query, [userId]);
            
            if (result.rows[0]) {
                const row = result.rows[0];
                const profile = {
                    name: row.name,
                    description: row.description,
                    profileImage: row.profile_image,
                    footer: row.footer,
                    nsfw: row.nsfw || false,
                    links: row.links || [],
                    gallery: row.gallery || [],
                    textSections: row.text_sections || [],
                    leftSidebar: row.left_sidebar || [],
                    rightSidebar: row.right_sidebar || [],
                    socialIcons: row.social_icons || [],
                    background: row.background || {},
                    font: row.font || {}
                };
                return profile;
            }
            return null;
        } catch (error) {
            throw error;
        }
    },

    getProfileByUsername: async (username) => {
        try {
            const query = `
                SELECT p.* FROM profiles p
                JOIN users u ON p.user_id = u.id
                WHERE u.username = $1
            `;
            const result = await pool.query(query, [username]);
            
            if (result.rows[0]) {
                const row = result.rows[0];
                const profile = {
                    name: row.name,
                    description: row.description,
                    profileImage: row.profile_image,
                    footer: row.footer,
                    nsfw: row.nsfw || false,
                    links: row.links || [],
                    gallery: row.gallery || [],
                    textSections: row.text_sections || [],
                    leftSidebar: row.left_sidebar || [],
                    rightSidebar: row.right_sidebar || [],
                    socialIcons: row.social_icons || [],
                    background: row.background || {},
                    font: row.font || {}
                };
                return profile;
            }
            return null;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = { pool, initializeDatabase, dbOperations };
