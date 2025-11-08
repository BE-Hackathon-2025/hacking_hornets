# Firebase Firestore Security Rules

## 🔐 IMPORTANT: Add These Security Rules to Firebase Console

### How to Add Security Rules:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **innovest-92487**
3. Click on **Firestore Database** in the left sidebar
4. Click on the **Rules** tab at the top
5. Replace the existing rules with the rules below
6. Click **Publish** to activate the rules

### Security Rules Code:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the resource
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Users collection - users can only access their own document
    match /users/{userId} {
      allow read: if isAuthenticated() && isOwner(userId);
      allow write: if isAuthenticated() && isOwner(userId);
    }
    
    // Portfolios collection - users can only access their own portfolios
    match /portfolios/{portfolioId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update, delete: if isAuthenticated() && isOwner(resource.data.userId);
    }
    
    // Conversations collection - users can only access their own conversations
    match /conversations/{conversationId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update, delete: if isAuthenticated() && isOwner(resource.data.userId);
    }
  }
}
```

## 📋 What These Rules Do:

### User Collection Rules:
- ✅ Users can READ their own user document
- ✅ Users can WRITE to their own user document
- ❌ Users CANNOT read other users' documents
- ❌ Users CANNOT write to other users' documents
- ❌ Unauthenticated users CANNOT access any user documents

### Portfolio Collection Rules:
- ✅ Users can READ their own portfolios
- ✅ Users can CREATE new portfolios (with their userId)
- ✅ Users can UPDATE their own portfolios
- ✅ Users can DELETE their own portfolios
- ❌ Users CANNOT access other users' portfolios
- ❌ Unauthenticated users CANNOT access any portfolios

### Conversation Collection Rules:
- ✅ Users can READ their own conversations
- ✅ Users can CREATE new conversations (with their userId)
- ✅ Users can UPDATE their own conversations (add messages)
- ✅ Users can DELETE their own conversations
- ❌ Users CANNOT access other users' conversations
- ❌ Unauthenticated users CANNOT access any conversations

## 🛡️ Security Features:

1. **Authentication Required**: All operations require user to be logged in
2. **Ownership Verification**: Users can only access their own data
3. **Data Isolation**: Each user's data is completely separate
4. **Create Validation**: When creating documents, userId must match auth user
5. **Read Protection**: Cannot read other users' data even if you have the ID

## ⚠️ Important Notes:

### Before Publishing:
- Make sure you're in the correct Firebase project
- Review the rules carefully
- Test in the Firebase Rules Simulator (optional)

### After Publishing:
- Rules take effect immediately
- Old rules are replaced completely
- You can view rule history in Firebase Console

### Testing Rules:
You can test these rules in the Firebase Console:
1. Go to **Rules** tab
2. Click on **Rules Playground**
3. Select operation type (get, create, update, delete)
4. Enter document path (e.g., `/users/test-user-id`)
5. Set authentication state (Authenticated/Unauthenticated)
6. Set auth UID to match your test
7. Click **Run** to see if operation is allowed

## 🔍 Example Tests:

### Test 1: User Reading Own Document
```
Operation: get
Path: /users/abc123
Auth: Authenticated (uid: abc123)
Result: ✅ Allow
```

### Test 2: User Reading Another User's Document
```
Operation: get
Path: /users/xyz789
Auth: Authenticated (uid: abc123)
Result: ❌ Deny
```

### Test 3: Creating Portfolio with Correct userId
```
Operation: create
Path: /portfolios/portfolio123
Auth: Authenticated (uid: abc123)
Data: { userId: "abc123", ... }
Result: ✅ Allow
```

### Test 4: Creating Portfolio with Different userId
```
Operation: create
Path: /portfolios/portfolio123
Auth: Authenticated (uid: abc123)
Data: { userId: "xyz789", ... }
Result: ❌ Deny
```

## 🚨 Common Issues:

### Issue: "Missing or insufficient permissions"
**Solution**: Make sure:
1. User is logged in
2. userId in document matches auth.uid
3. Security rules are published
4. User has internet connection

### Issue: Rules not updating
**Solution**: 
1. Check you clicked "Publish" in Firebase Console
2. Wait 10-30 seconds for rules to propagate
3. Refresh your app
4. Check browser console for errors

### Issue: Cannot create documents
**Solution**:
1. Verify userId in document data matches logged-in user
2. Check you're using the correct collection name
3. Verify user is authenticated

## 📊 Monitoring Access:

You can monitor who's accessing your database:
1. Go to Firebase Console → **Firestore Database**
2. Click on **Usage** tab
3. View read/write operations
4. Set up alerts for unusual activity

## 🎯 Rule Best Practices:

1. ✅ Always require authentication
2. ✅ Validate userId matches auth.uid
3. ✅ Use helper functions for clarity
4. ✅ Test rules before deploying to production
5. ✅ Monitor database access patterns
6. ✅ Keep rules as simple as possible
7. ✅ Document any complex logic

---

**Security Status: Ready to Deploy**

Copy the security rules above and paste them into your Firebase Console now!
