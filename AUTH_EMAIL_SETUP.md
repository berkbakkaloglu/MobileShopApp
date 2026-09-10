# ShopList branded auth email setup

The app now sends verification and password-reset emails through a Netlify Function instead of Firebase's built-in email templates.

## 1. Resend

Create a Resend account and API key.

For production sending, add and verify a domain in Resend, then use a sender such as:

`ShopList <hello@yourdomain.com>`

For initial testing, Resend's `onboarding@resend.dev` sender may be used subject to Resend's testing restrictions.

## 2. Firebase service account

Firebase Console → Project settings → Service accounts → Generate new private key.

Do **not** commit that JSON file to GitHub.

Copy the complete JSON object into a Netlify environment variable named:

`FIREBASE_SERVICE_ACCOUNT`

## 3. Netlify environment variables

Netlify → berkscartapp → Project configuration → Environment variables.

Add:

- `FIREBASE_SERVICE_ACCOUNT` = the complete Firebase service-account JSON
- `RESEND_API_KEY` = your Resend API key
- `MAIL_FROM` = for example `ShopList <hello@yourdomain.com>`
- `APP_URL` = `https://berkscartapp.netlify.app`

After adding or changing variables, trigger a new production deploy. Netlify applies environment-variable changes on a new deploy.

## 4. Firebase Realtime Database rules

Recommended rules once existing guest-data migration is complete:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid && auth.token.email_verified === true",
        ".write": "auth != null && auth.uid === $uid && auth.token.email_verified === true"
      }
    }
  }
}
```

## Flow

- New user signs up with Firebase Authentication.
- The browser obtains the signed-in user's Firebase ID token.
- `/.netlify/functions/auth-email` verifies the token with Firebase Admin.
- Firebase Admin generates a one-time verification link.
- The function extracts the Firebase action code and creates a ShopList URL at `/auth-action.html`.
- Resend sends the branded ShopList email.
- Password-reset links follow the same pattern but intentionally return the same public success response whether or not the account exists, reducing account enumeration.

Firebase's built-in email templates are no longer used by the app for these two flows.
