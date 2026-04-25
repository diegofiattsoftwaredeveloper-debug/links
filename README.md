# Link in Bio Landing Page

A modern, responsive "link in bio" landing page with backend authentication and database support. Built with HTML, TailwindCSS, vanilla JavaScript, Node.js, Express, and PostgreSQL.

## Features

- **Modern Design**: Beautiful gradient background with glassmorphism effects
- **Responsive**: Optimized for mobile, tablet, and desktop devices
- **Interactive Elements**: Smooth animations and hover effects
- **Authentication**: Username/password login and Google OAuth support
- **Database**: PostgreSQL backend for storing user profiles
- **Edit Mode**: In-page editing with real-time saves to database
- **Social Links**: Easy-to-customize social media and website links
- **Custom Sidebar**: Left and right sidebar sections for additional content
- **Image Gallery**: Upload and display images
- **Text Sections**: Add custom text sections
- **Font & Background Customization**: Full control over appearance

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- Google OAuth credentials (optional, for Google login)

### Backend Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/bio_links
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
PORT=3000
```

3. **Set up PostgreSQL database**:
```bash
# Option 1: Create database and run SQL script
createdb bio_links
psql -d bio_links -f database.sql

# Option 2: Run SQL script directly
psql -f database.sql

# Option 3: Connect to PostgreSQL and run manually
psql
\c bio_links
\i database.sql
```

4. **Start the server**:
```bash
npm start
# or for development with auto-reload
npm run dev
```

The backend will run on `http://localhost:3000`

### Frontend Setup

1. **Open the page**: Open `index.html` in your web browser
2. **The frontend will connect to**: `http://localhost:3000` by default
3. **URL Structure**: 
   - Home page: `index.html` or `index.html#/`
   - User profile: `index.html#/username`
   - Example: `index.html#/johndoe`

## API Endpoints

### Authentication

- `POST /api/login` - Login with username/password
- `POST /api/register` - Register new user
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - Google OAuth callback

### Profile

- `GET /api/profile/:username` - Get public profile by username
- `GET /api/profile` - Get own profile (authenticated)
- `PUT /api/profile` - Save profile (authenticated)

### Health

- `GET /health` - Health check endpoint

## Database Schema

### Users Table
- `id` (SERIAL PRIMARY KEY)
- `username` (VARCHAR UNIQUE)
- `email` (VARCHAR UNIQUE)
- `password` (VARCHAR)
- `google_id` (VARCHAR UNIQUE)
- `created_at` (TIMESTAMP)

### Profiles Table
- `id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER, FOREIGN KEY)
- `name` (TEXT)
- `description` (TEXT)
- `profile_image` (TEXT)
- `footer` (TEXT)
- `links` (JSONB)
- `gallery` (JSONB)
- `text_sections` (JSONB)
- `left_sidebar` (JSONB)
- `right_sidebar` (JSONB)
- `social_icons` (JSONB)
- `background` (JSONB)
- `font` (JSONB)
- `updated_at` (TIMESTAMP)

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

## Customization Guide

### Profile Section
Edit profile information in edit mode:
- Name
- Bio/description
- Profile picture
- Footer text

### Links Section
Add, edit, or remove links with:
- Custom titles and descriptions
- Optional text
- Custom icons (Font Awesome or custom upload)
- Custom colors
- Card styles

### Sidebar Sections
Add content to left/right sidebars:
- Text items
- Images/GIFs
- Shapes (circle, star, hexagon, etc.)
- Custom background colors with transparency

### Gallery
Upload and manage images with optional links

### Text Sections
Add custom text sections with background colors

### Font & Background
- Custom font family
- Text color
- Font size
- Edit indicator color
- Custom background images
- Background settings (size, repeat, position, attachment)

## Deployment Options

### Backend
1. **Railway** (Recommended): Full-stack deployment with PostgreSQL
2. **Render**: Free tier available
3. **Heroku**: Easy PostgreSQL integration
4. **DigitalOcean**: Full control over server
5. **AWS**: Elastic Beanstalk or EC2

### Frontend
1. **Netlify**: Drag-and-drop deployment
2. **Vercel**: Zero-config deployment
3. **GitHub Pages**: Free hosting for static sites
4. **Railway**: Deploy alongside backend
5. **Any web hosting**: Upload the files to your server

## Railway Deployment Guide

### 1. Prepare Your Project
- Ensure `.env` is NOT committed to git (it's in .gitignore)
- Push your code to GitHub

### 2. Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will automatically detect Node.js

### 3. Add PostgreSQL Database
1. In your Railway project, click "New Service"
2. Select "PostgreSQL"
3. Railway will provide a DATABASE_URL

### 4. Set Environment Variables
1. Go to your project settings → Variables
2. Add the following variables:
   - `DATABASE_URL`: (Railway provides this automatically)
   - `JWT_SECRET`: Generate a random string (use: `openssl rand -base64 32`)
   - `SESSION_SECRET`: Generate a random string
   - `GOOGLE_CLIENT_ID`: Your Google OAuth client ID (optional)
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth secret (optional)
   - `GOOGLE_CALLBACK_URL`: `https://your-app.railway.app/auth/google/callback`

### 5. Update Frontend API URL
In `index.html`, change:
```javascript
const API_BASE_URL = 'http://localhost:3001';
```
to:
```javascript
const API_BASE_URL = 'https://your-app.railway.app';
```

### 6. Deploy Frontend
Option 1: Deploy to Railway (same project)
- Upload `index.html` to Railway as a static site

Option 2: Deploy to Vercel
- Push `index.html` to a separate repo
- Connect to Vercel
- Deploy

Option 3: Deploy to Netlify
- Drag and drop `index.html` to Netlify dashboard

### 7. Update Google OAuth (if using)
- Go to Google Cloud Console
- Update authorized redirect URI to: `https://your-app.railway.app/auth/google/callback`

## Browser Support

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

## Technologies Used

### Frontend
- **HTML5**: Semantic markup
- **TailwindCSS**: Utility-first CSS framework (via CDN)
- **Font Awesome**: Icon library (via CDN)
- **Vanilla JavaScript**: No framework dependencies
- **Google Fonts**: Inter font family

### Backend
- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **PostgreSQL**: Database
- **pg**: PostgreSQL client
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT authentication
- **passport**: Authentication middleware
- **passport-google-oauth20**: Google OAuth strategy
- **express-session**: Session management
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management

## License

This project is open source and available under the MIT License.
