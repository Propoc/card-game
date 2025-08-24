# AWS Amplify Deployment Guide

## Prerequisites
- AWS Account
- GitHub repository with your code
- Node.js project (already set up)

## Deployment Steps

### 1. Prepare Your Repository
Your project is now configured with:
- `amplify.yml` - Build configuration
- Updated `package.json` with build scripts
- Server configured for production deployment

### 2. Deploy to AWS Amplify

1. **Login to AWS Amplify Console**
   - Go to https://console.aws.amazon.com/amplify/
   - Click "New app" → "Host web app"

2. **Connect Repository**
   - Select "GitHub"
   - Authorize AWS Amplify to access your repo
   - Select your `card-game` repository
   - Select the `master` branch

3. **Configure Build Settings**
   - The `amplify.yml` file will be automatically detected
   - Build command: `npm run build`
   - Publish directory: `build`

4. **Environment Variables (Optional)**
   - Add any environment variables your app needs
   - Example: `NODE_ENV=production`

5. **Deploy**
   - Click "Save and deploy"
   - Wait for the build to complete (usually 5-10 minutes)

### 3. Update CORS Settings
After deployment, you'll need to update the CORS origins in `server/server.js`:

Replace `your-domain.com` with your actual Amplify domain (something like `https://main.d1234567890.amplifyapp.com`)

### 4. Test Your Deployment
- Your React app will be served at the Amplify URL
- The WebSocket server will run on the same domain
- Visit `/api` to see the server status page

## Project Structure
```
your-app/
├── amplify.yml          # Build configuration
├── package.json         # Frontend dependencies & scripts
├── src/                 # React frontend
├── public/              # Static assets
├── server/              # Backend server
│   ├── package.json     # Backend dependencies
│   └── server.js        # Express + Socket.IO server
└── build/               # Production build output
    ├── static/          # Frontend assets
    └── server/          # Backend files
```

## Key Features Added
1. **Production Configuration**: Server serves React app in production
2. **Server Info Page**: Visit `/api` to see server status
3. **Proper CORS**: Configured for Amplify domains
4. **Build Process**: Includes both frontend and backend in build output

## Troubleshooting
- If WebSocket connections fail, check CORS settings
- Ensure the correct Amplify domain is in the CORS origins
- Check Amplify build logs for any errors
- Make sure all dependencies are listed in package.json files
