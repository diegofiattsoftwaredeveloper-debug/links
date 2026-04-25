const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const { initializeDatabase, dbOperations } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '.')));

// Session configuration (disabled for Vercel serverless)
if (process.env.VERCEL !== '1') {
    app.use(session({
        secret: process.env.SESSION_SECRET || 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false }
    }));
}

// Passport configuration
app.use(passport.initialize());
if (process.env.VERCEL !== '1') {
    app.use(passport.session());
}

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await dbOperations.getUserById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Google OAuth Strategy (only if credentials are provided)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user exists by Google ID
            let user = await dbOperations.getUserByGoogleId(profile.id);
            
            if (user) {
                return done(null, user);
            }
            
            // Check if user exists by email
            user = await dbOperations.getUserByEmail(profile.emails[0].value);
            
            if (user) {
                // Link Google account to existing user
                // You might want to update the user's google_id here
                return done(null, user);
            }
            
            // Create new user
            const newUser = await dbOperations.createUser(
                profile.displayName,
                profile.emails[0].value,
                null, // No password for Google users
                profile.id
            );
            return done(null, newUser);
        } catch (error) {
            return done(error, null);
        }
    }));
}

// Initialize database
initializeDatabase().catch(console.error);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Routes

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Auth Routes

// Login with username/password
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const user = await dbOperations.getUserByUsername(username);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user has a password (Google users don't)
        if (!user.password) {
            return res.status(401).json({ error: 'Please use Google login for this account' });
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Register new user
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Check if user already exists
        const existingUser = await dbOperations.getUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        if (email) {
            const existingEmail = await dbOperations.getUserByEmail(email);
            if (existingEmail) {
                return res.status(400).json({ error: 'Email already exists' });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await dbOperations.createUser(username, email, hashedPassword);

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Request password reset OTP
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await dbOperations.getUserByEmail(email);
        if (!user) {
            // Don't reveal if email exists, but return success for security
            return res.json({ message: 'If the email exists, a reset code has been sent' });
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Save OTP to database
        await dbOperations.createOTP(user.id, email, otp, 'password_reset', expiresAt);

        // TODO: Send email with OTP
        console.log(`Password reset OTP for ${email}: ${otp}`);

        res.json({ message: 'If the email exists, a reset code has been sent' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// Verify OTP and reset password
app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'Email, OTP, and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Verify OTP
        const otpRecord = await dbOperations.getValidOTP(email, otp, 'password_reset');
        if (!otpRecord) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Mark OTP as used
        await dbOperations.markOTPUsed(otpRecord.id);

        // Update user password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await dbOperations.updateUserPassword(otpRecord.user_id, hashedPassword);

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Google OAuth Routes (only if credentials are provided AND not on Vercel)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.VERCEL !== '1') {
    app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

    app.get('/auth/google/callback',
        passport.authenticate('google', { failureRedirect: '/login' }),
        async (req, res) => {
            // Generate JWT token
            const token = jwt.sign(
                { id: req.user.id, username: req.user.username },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            // Redirect to frontend with token
            res.redirect(`/?token=${token}&username=${req.user.username}#/${req.user.username}`);
        }
    );
}

// Profile Routes

// Get profile by username (public)
app.get('/api/profile/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const profile = await dbOperations.getProfileByUsername(username);

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json(profile);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Get own profile (authenticated)
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const profile = await dbOperations.getProfileByUserId(req.user.id);

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json(profile);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Save profile (authenticated)
app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const profileData = req.body;
        
        await dbOperations.saveProfile(req.user.id, profileData);

        res.json({ success: true });
    } catch (error) {
        console.error('Save profile error:', error);
        res.status(500).json({ error: 'Failed to save profile' });
    }
});

// Catch-all route to serve index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server (only if not running on Vercel)
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
    });
}

// Export for Vercel
module.exports = app;
