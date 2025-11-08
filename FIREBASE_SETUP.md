# Firebase Authentication Setup Guide

This guide will walk you through setting up Firebase Authentication for the Money Talks application.

## Prerequisites

- A Google account
- Node.js and npm installed
- This project cloned and dependencies installed (`npm install`)

## Step 1: Firebase Console Setup

1. **Go to Firebase Console**
   - Visit [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Sign in with your Google account

2. **Select Your Project**
   - You should already have a project called `innovest-92487`
   - Click on it to open the project dashboard

## Step 2: Get Firebase Web App Configuration

1. **Navigate to Project Settings**
   - Click the gear icon (⚙️) next to "Project Overview"
   - Click "Project settings"

2. **Find Your Web App**
   - Scroll down to the "Your apps" section
   - Click on the web app (if you don't have one, click "Add app" and select web)

3. **Copy Configuration**
   - You'll see a code snippet with your Firebase configuration
   - It looks like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
     authDomain: "innovest-92487.firebaseapp.com",
     projectId: "innovest-92487",
     storageBucket: "innovest-92487.firebasestorage.app",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef1234567890abcdef",
     measurementId: "G-XXXXXXXXXX"
   };
   ```

## Step 3: Create Environment File

1. **Copy the example file**
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local`**
   - Open the file in your text editor
   - Replace the placeholder values with your actual Firebase config values:

   ```env
   VITE_FIREBASE_API_KEY=your_actual_api_key
   VITE_FIREBASE_AUTH_DOMAIN=innovest-92487.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=innovest-92487
   VITE_FIREBASE_STORAGE_BUCKET=innovest-92487.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_actual_sender_id
   VITE_FIREBASE_APP_ID=your_actual_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_actual_measurement_id
   ```

## Step 4: Verify Authentication Methods

1. **In Firebase Console, go to Authentication**
   - Click "Authentication" in the left sidebar
   - Click the "Sign-in method" tab

2. **Verify Enabled Methods**
   - ✅ **Email/Password** should be enabled
   - ✅ **Google** should be enabled

3. **If not enabled:**
   - Click on each provider
   - Toggle "Enable"
   - For Google: Add your project support email
   - Click "Save"

## Step 5: Configure Google OAuth (Important!)

1. **In the Google provider settings:**
   - Add authorized domains if deploying (e.g., your production domain)
   - For local development, `localhost` should already be there

2. **Get OAuth Client ID (if needed):**
   - The Firebase Console should handle this automatically
   - If you see errors about OAuth, check the "Credentials" section in Google Cloud Console

## Step 6: Test the Application

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Test Sign Up**
   - Navigate to `http://localhost:5173/signup`
   - Try creating an account with email/password
   - Try signing up with Google

3. **Test Sign In**
   - Navigate to `http://localhost:5173/login`
   - Try logging in with your credentials
   - Try signing in with Google

4. **Verify Authentication**
   - After logging in, you should be redirected to `/dashboard`
   - Your name/email should appear in the top right dropdown
   - Click the dropdown and test "Log Out"

## Troubleshooting

### Error: "Firebase API key is invalid"
- Double-check that you copied the correct API key from Firebase Console
- Make sure there are no extra spaces or quotes in your `.env.local` file

### Error: "Firebase: Error (auth/unauthorized-domain)"
- Go to Firebase Console > Authentication > Settings > Authorized domains
- Add your domain (for local dev, `localhost` should already be there)

### Google Sign-In Shows "Error 400: redirect_uri_mismatch"
- In Firebase Console > Authentication > Sign-in method > Google
- Make sure the OAuth redirect URIs are properly configured
- For local development, ensure `http://localhost:5173` is authorized

### Users Can't Access Protected Routes
- Check that the AuthProvider is wrapping your app in `main.jsx`
- Verify that protected routes are wrapped with `<ProtectedRoute>` in `App.jsx`
- Check browser console for any auth-related errors

## Security Notes

⚠️ **Important Security Information:**

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **API keys are safe in frontend** - Firebase API keys are designed to be public, but configure security rules
3. **Set up Firebase Security Rules** - Protect your database and storage with proper rules
4. **Service Account Key** - The `innovest-92487-firebase-adminsdk-*.json` file contains private keys and should NEVER be committed or shared

## Firebase Security Rules (Recommended)

After setting up authentication, configure security rules in Firebase Console:

### Firestore Rules (if you add a database later)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Storage Rules (if you add file storage later)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Additional Features

The authentication system includes:

- ✅ Email/Password Authentication
- ✅ Google OAuth Sign-In
- ✅ Protected Routes
- ✅ User Session Persistence
- ✅ Display Name Support
- ✅ Password Reset Capability (function available in `authService.js`)
- ✅ Toast Notifications for Auth Events

## Next Steps

Now that authentication is set up, you can:

1. Add user profile management
2. Connect portfolio data to user accounts
3. Implement Firestore for data persistence
4. Add email verification for new users
5. Implement "Forgot Password" flow in the UI

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify all environment variables are correctly set
3. Ensure Firebase Authentication is enabled in your Firebase project
4. Check that your Firebase plan supports the authentication methods you're using

---

**Happy Coding! 🚀**
