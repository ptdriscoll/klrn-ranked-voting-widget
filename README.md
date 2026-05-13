# KLRN Ranked Voting Widget

A configurable, ranked voting widget built for KLRN’s City Showdown contest.

This project, which replaces the original [KLRN City Showdown Voting App](https://github.com/ptdriscoll/klrn-city-showdown?tab=readme-ov-file), implements a drag-and-drop ranked voting interface, configurable entries, secure vote submission, and a results dashboard. Although styled for City Showdown, the architecture is configuration-driven and reusable for other ranked voting applications.

![Nielsen Data Explorer Dashboard 2](images/ranked-voting-widget-2.png)

---

## ✨ Features

- Drag-and-drop ranked interface (SortableJS)
- Configurable entry list and scoring ladder
- Multiple voting periods support
- Client-side ZIP code validation
- JSON API vote submission
- PHP/MySQL backend vote storage
- Smooth thank-you state transition
- Dashboard summarizing results and providing CSV download
- Suspicion scoring and flagging for vote review

---

## 🔒 Vote Integrity Layers

Designed to discourage duplicate or automated voting while preserving anonymous access.

### Client-Side

- One vote per device per voting period
- Local storage and cookies required for voting
- Multi-tab submit lock
- Timing protection
- Honeypot bot field
- Front-end fingerprint generation

### Server-Side

- Active voting period validation
- Token uniqueness enforcement
- Vote entry validation against config
- Duplicate submission protection
- Fingerprint / IP checks
- Suspicion scoring flags:
  - TOO-FAST
  - SAME-SIG
  - REPEATED

---

## ⚙ Setup

### Server-Side

For this version of the app, place these assets from [`server/`](https://github.com/ptdriscoll/klrn-ranked-voting-widget/tree/main/server) in a root directory.

```
ranked-voting-widget/
├─ api/
├─ assets/
├─ includes/
├─ index.php
```

Also, with the exception of `dev/embed.htm`, add the [`dev/`](https://github.com/ptdriscoll/klrn-ranked-voting-widget/tree/main/dev) directory to the same root folder.

Then, rename [`server/config-example.php`](server/config-example.php) as `config.php`, and make edits to add database connection info, applicable time zones, and a list of users as `'username' => 'password'`. Add this new file to the same root folder.

You'll end up with:

```
ranked-voting-widget/
├─ api/
├─ assets/
├─ dev/
├─ includes/
├─ config.php
├─ index.php

```

Next, use SQL at [`server/sql-reference.sql`](server/sql-reference.sql) to create the database tables `vote_sessions` and `vote_results`.

### Client-Side

The entries, points ladder and voting periods are injected via JSON in the front end's [`dev/embed.htm`](dev/embed.htm) and the server's source of truth at [`server/includes/config.json`](server/includes/config.json) - make sure the JSON in both files is the same:

```json
{
  "entries": [
    { "id": 1, "name": "Band Name One" },
    { "id": 2, "name": "Solo Artist Two" },
    { "id": 3, "name": "Duo Group Three" },
    { "id": 4, "name": "Band Name Four" },
    { "id": 5, "name": "Artist Name Five" }
  ],
  "points": [16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  "votingPeriods": [
    ["2026-03-02 T 00:00:00 -06:00", "2026-03-13 T 23:59:59 -05:00"],
    ["2026-03-16 T 00:00:00 -05:00", "2026-03-22 T 23:59:59 -05:00"],
    ["2026-03-23 T 00:00:00 -05:00", "2026-03-29 T 23:59:59 -05:00"],
    ["2026-05-04 T 00:00:00 -05:00", "2026-05-10 T 23:59:59 -05:00"]
  ],
  "apiUrl": "/",
  "testMode": true
}
```

In the JSON, `"testMode": true` ignores server errors when testing the front end without a valid submission URL. To add a server submission, set `"testMode": false` and point `"apiUrl": ...` to `submit-vote.php`, for example:

```json
 "...": "",
"apiUrl": "ranked-voting-widget/api/submit-vote.php"
"testMode": false
```

After configuring the JSON, add [`dev/embed.htm`](dev/embed.htm) to the HTML of a webpage. And edit the CSS `link` and JavaScript `script` tags to point to where they are on a server, i.e.:

```html
<link href="ranked-voting-widget/dev/styles.css?v=0.00" rel="stylesheet" />
<!-- ... -->
<script type="module" src="ranked-voting-widget/dev/script.js?v=0.31"></script>
```

## KLRN City Showdown References

- [KLRN City Showdown](https://www.klrn.org/cityshowdown/)
- [Bento 3 Documentation](https://docs.pbs.org/display/B3)
- [Bento 3 Embed Code](https://docs.pbs.org/display/B3/Embed)
