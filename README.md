# Social MPA – Noroff JS CA  
Author: Mikkel August Andaas

Modular ES6 app on the Noroff v2 API. JWT auth, posts CRUD, profiles with follow/unfollow, simple ranked search, and optimistic reactions.

Live: https://js-2-ma.netlify.app/

---

## Features
- JWT register/login + API key bootstrap
- Feed with pagination and create post
- Post view: edit, delete, local reaction bar
- Profile: view, change avatar, follow/unfollow
- Search: posts + profiles with simple relevance
- Central fetch wrapper (`apiClient`) + small store with persistence
- JSDoc + `// @ts-check` for editor safety

---

## Setup

### 1) Install and start
```bash
npm install
npm run start
Open: http://localhost:<port>/src/pages/register/register.html

2) Configure API
src/app/config.js

js
export const CONFIG = {
  API_BASE: "https://v2.api.noroff.dev",
  ENDPOINTS: {
    AUTH: {
      REGISTER: "/auth/register",
      LOGIN: "/auth/login",
      CREATE_API_KEY: "/auth/create-api-key",
    },
    SOCIAL: {
      POSTS: "/social/posts",
      PROFILES: "/social/profiles",
    },
  },
  STORAGE: {
    TOKEN: "social.token",
    USER: "social.user",
    API_KEY: "social.apiKey",
  },
};


Dev URLs
/src/pages/login/login.html

/src/pages/register/register.html

/src/pages/feed/feed.html

/src/pages/post/post.html?id=<postId>

/src/pages/profile/profile.html?u=<username>

Manual Test Plan
Auth

Register with @stud.noroff.no. Log in. Token saved to localStorage.

On login, API key is automatically created via ensureApiKey().

Feed

Create a post (image URL optional).

Click a card to open the post page.

Post

Edit title/body → Save.

Delete → redirected to feed.

Reactions: click emojis; counts update optimistically.

Profile

Open profile.html?u=<username>.

Change avatar.

Follow/unfollow another user.

Search

Type ≥ 2 chars in the search input; see mixed posts + profiles ranked.

Troubleshooting
MIME type “text/html” for .js
Your server returned HTML for a module (likely 404). Start the dev server from the project root and keep relative imports. Open the .js URL directly; it must show JavaScript, not HTML.

401/403
Missing/expired token or API key. Log in again.

Follow 404
Use PUT /social/profiles/:name/follow (no body). The code does this.

Images
Must be http(s) URLs.

Cache issues
Hard refresh (Ctrl+F5) or clear site data for localhost.

Project Structure
arduino
Kopier kode
src/
  app/
    config.js
    links.js
  components/
    navbar.js
    pagination.js
    spinner.js
    emojis.js
  pages/
    feed/
      feed.html
      feed.js
    post/
      post.html
      post.js
    profile/
      profile.html
      profile.js
    login/
      login.html
      login.js
    register/
      register.html
      register.js
  services/
    apiClient.js
    auth.js
    posts.js
    profiles.js
    search.js
  state/
    store.js
  utils/
    dom.js
styles/
  base.css
  components.css
  pages/
    nav.css
    feed.css

Tech Choices (short)
services/apiClient.js
Single fetch wrapper adds Authorization and X-Noroff-API-Key, normalizes errors.

state/store.js
Tiny pub/sub store, persists token, user, apiKey to localStorage.

services/*
Focused modules per domain: auth, posts, profiles, search.

pages/*
Page scripts orchestrate DOM + service calls only.

utils/dom.js
$, $$, ready, esc, cssEscape.

Types
JSDoc + // @ts-check instead of TypeScript for fast feedback.

Requirements Mapping
ES6 modules ✅

At least 3 JSDoc’d functions (apiClient, search, links, etc.) ✅

Deployed app (Netlify) ✅

Basic UI ✅

README with run instructions ✅

User stories: register, login, feed, single post, create, edit, delete, user posts, follow/unfollow, search, own profile ✅

Notes / Limitations
Reaction counts are optimistic (local UI update).

Manual testing only due to scope.

Styling is minimal; focus is JS structure and API flows.

References
Noroff v2 API docs
Corse moodle docs


MDN: Fetch API, URLSearchParams, Storage, CSS.escape
References
Noroff v2 API docs

MDN: Fetch API, URLSearchParams, Storage, CSS.escape
