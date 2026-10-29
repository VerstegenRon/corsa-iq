# E-mail templates for Supabase Auth

Paste these in the Supabase dashboard: **Authentication → Emails → Templates**. The links go to
`/auth/confirm` with a `token_hash`, so they work in any browser, not only the one that asked.

| Template            | Subject                                   | File                  |
| ------------------- | ----------------------------------------- | --------------------- |
| Confirm signup      | Bevestig je e-mailadres voor Corsa IQ     | `confirm-signup.html` |
| Reset password      | Je nieuwe wachtwoord voor Corsa IQ        | `reset-password.html` |
| Change email address | Bevestig je nieuwe e-mailadres voor Corsa IQ | `change-email.html` |

`{{ .RedirectTo }}` is the address the app asks for (`…/auth/confirm?next=…`); it must be on the
Redirect URLs list (Authentication → URL Configuration). Sign-up keeps `next`, so someone who signs
up through an invitation link comes back to the invitation after confirming.
