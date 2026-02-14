# Jiffy User Dashboard

An internal dashboard application for viewing and managing Jiffy user data. Features a modern, premium UI with dark mode, glassmorphism effects, and real-time search/filtering capabilities.

## 🚀 Features

- **Modern UI**: Dark theme with vibrant gradients and glassmorphism
- **Dual View Modes**: Switch between table and card views
- **Real-time Search**: Filter users by name, email, college, or location
- **Status Filtering**: Filter by user status (active, inactive, waitlisted)
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Extensible Architecture**: Easy to add new user fields
- **Environment Switching**: Toggle between dev (mock data) and production APIs

## 📁 Project Structure

```
JiffyUserDashboard/
├── index.html           # Main HTML structure
├── styles/
│   └── main.css        # Premium CSS styling
├── scripts/
│   ├── config.js       # API configuration
│   └── app.js          # Dashboard application logic
├── api/
│   └── users.json      # Mock user data (dev mode)
├── .gitignore
└── README.md
```

## 🛠️ Setup & Installation

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, Safari)
- [Optional] Node.js for running a local server

### Running Locally

#### Option 1: Direct File Access
Simply open `index.html` in your browser:
```bash
# Navigate to project directory
cd "d:\Everything swish\JiffyUserDashboard"

# Open in default browser (Windows)
start index.html
```

#### Option 2: Local Server (Recommended)
Using a local server prevents CORS issues and provides better development experience:

```bash
# Using npx (no installation needed)
cd "d:\Everything swish\JiffyUserDashboard"
npx -y serve@latest .
```

Then open `http://localhost:3000` in your browser.

## 🔧 Configuration

### Switching Between Environments

Edit `scripts/config.js` to switch between dev and production:

```javascript
// Change ENV to 'dev' or 'prod'
const ENV = 'dev';  // Uses mock data from api/users.json
// const ENV = 'prod';  // Uses real backend API
```

### Connecting to Your Backend

Update the production configuration in `scripts/config.js`:

```javascript
prod: {
  apiBaseUrl: 'https://your-backend-api.com/api',
  endpoints: {
    users: '/users'
  },
  authRequired: true,  // Set to true if auth needed
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'X-API-Key': 'YOUR_API_KEY'
  }
}
```

## 📊 Mock Data

The dashboard includes 8 mock users with diverse data:
- Different colleges and locations
- Various status types (active, inactive, waitlisted)
- Verified and unverified users
- Profile completion percentages
- Match counts

## 🎨 Customization

### Adding New User Fields

The dashboard is designed to be extensible. To add new fields:

1. **Update the API response** (or mock data in `api/users.json`):
```json
{
  "id": "usr_001",
  "name": "User Name",
  "newField": "New Value"
}
```

2. **The dashboard automatically handles new fields** in the detail view modal. No code changes needed for basic display!

3. **For table/card view**, update the HTML generation in `scripts/app.js`:
   - Modify `createUserRow()` for table view
   - Modify `createUserCard()` for card view

### Styling Customization

All design tokens are defined in CSS variables at the top of `styles/main.css`:

```css
:root {
  --color-primary: #8B5CF6;    /* Change primary color */
  --color-secondary: #EC4899;  /* Change secondary color */
  --spacing-md: 1rem;          /* Adjust spacing */
  /* ... and many more */
}
```

## 🔐 Security Notes

- This is an **internal tool** - ensure it's not publicly accessible
- Add authentication before deploying to production
- Use HTTPS for API communication
- Store API keys securely (environment variables, secret management)

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🚀 Deployment

### Option 1: Static Hosting (Cloudflare Pages, Netlify, Vercel)
```bash
# Simply connect your git repository
# The dashboard is a static site - no build step needed!
```

### Option 2: Internal Server
```bash
# Copy files to your web server
# Ensure your backend API has CORS enabled
# Configure environment variables for production
```

## 🛡️ CORS Configuration

If you encounter CORS errors when connecting to your backend:

1. **Backend must allow your frontend origin**:
   - For development: `http://localhost:3000`
   - For production: Your deployed domain

2. **Required CORS headers** (backend side):
   ```
   Access-Control-Allow-Origin: <your-origin>
   Access-Control-Allow-Methods: GET, POST, OPTIONS
   Access-Control-Allow-Headers: Content-Type, Authorization
   ```

## 📝 API Response Format

Expected user object structure:

```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "phone": "string",
  "status": "active|inactive|waitlisted",
  "verified": boolean,
  "registrationDate": "ISO 8601 date string",
  "lastLogin": "ISO 8601 date string",
  "college": "string",
  "location": "string",
  "profileCompletion": number (0-100),
  "matchCount": number
}
```

The dashboard is extensible and will handle additional fields automatically in the detail modal.

## 🤝 Contributing

This is an internal tool. For updates or improvements:
1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit for review

## 📄 License

Internal use only - Jiffy © 2026

---

**Need help?** Contact the development team or check the inline code comments for implementation details.
