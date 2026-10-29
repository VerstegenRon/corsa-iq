# E-mail templates for Supabase Auth

Paste these in the Supabase dashboard: **Authentication → Emails → Templates**. The links go to
`/auth/confirm` with a `token_hash`, so they work in any browser, not only the one that asked.

Supabase has one template per kind, not one per language: paste either the English or the Dutch set.

| Template             | Subject (English)                            | English                  | Subject (Dutch)                              | Dutch                 |
| -------------------- | -------------------------------------------- | ------------------------ | -------------------------------------------- | --------------------- |
| Confirm signup       | Confirm your e-mail address for CorsaIQ     | `confirm-signup-en.html` | Bevestig je e-mailadres voor CorsaIQ        | `confirm-signup.html` |
| Reset password       | Your new password for CorsaIQ               | `reset-password-en.html` | Je nieuwe wachtwoord voor CorsaIQ           | `reset-password.html` |
| Change email address | Confirm your new e-mail address for CorsaIQ | `change-email-en.html`   | Bevestig je nieuwe e-mailadres voor CorsaIQ | `change-email.html`   |

`{{ .RedirectTo }}` is the address the app asks for (`…/auth/confirm?next=…`); it must be on the
Redirect URLs list (Authentication → URL Configuration). Sign-up keeps `next`, so someone who signs
up through an invitation link comes back to the invitation after confirming.
