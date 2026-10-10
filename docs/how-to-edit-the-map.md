# How to update the Resource Map

The map (`map.html`) shows two kinds of pins:

| Pin | Where it comes from | Who updates it |
|---|---|---|
| **★ Trusted** (solid colour, white ring) | The spreadsheet `data/resources.csv` | Staff (you!) |
| **Nearby** (white with coloured ring) | OpenStreetMap, found automatically around the searched address | Nobody. It's automatic |

Everything is free. There's no Google account, billing, or API key.

---

## Adding, changing, or removing a trusted resource

The list is a normal spreadsheet with one row per resource.

| Column | What to put | Example |
|---|---|---|
| `name` | Name of the service | `Fort York Food Bank` |
| `category` | One or more categories from the list below, separated by `;` | `Food Banks; Free Meals` |
| `address` | Street address with city. **Leave blank** for phone/online-only services | `380 College St, Toronto, ON` |
| `phone` | Optional | `416-929-5200` |
| `website` | Full link starting with https:// | `https://fyfb.com/` |
| `notes` | Optional short note (hours, ages, etc.) | `Youth 16-24 only` |
| `lat` / `lng` | Map coordinates. **You can leave these blank**: the map looks up the address itself | `43.657925` / `-79.401384` |

### Editing on GitHub (no software needed)
1. Go to github.com/Kalrog6858/follow-up-supports.github.io
2. Click `data` → `resources.csv` → the ✏️ pencil icon (top right).
3. Add a new line at the bottom, for example:
   ```
   My New Food Bank,Food Banks,"123 Main St, Toronto, ON",,https://example.org/,Open Tuesdays,,
   ```
   **Rule:** if a value contains a comma (most addresses do), wrap it in "double quotes".
4. Click **Commit changes**. The live map updates in about a minute.

### Editing in Excel or Google Sheets (easier for big changes)
1. Download `resources.csv` from GitHub (the ⬇ "Download raw file" button).
2. Open it in Excel or Google Sheets, then edit, add, or delete rows.
3. Save or export as **CSV** (not .xlsx). In Excel: *File → Save As → CSV UTF-8*.
4. On GitHub, open the `data` folder → **Add file → Upload files** → drop in `resources.csv` → **Commit changes**.

### Removing a resource
Delete its row. That's it.

---

## The categories (spell them exactly like this)

Shelters · Housing Help · Food Banks · Free Meals · Health Clinics · Mental Health Services ·
Harm Reduction · Legal Aid · Immigration & Newcomer Services · ID & Documents · Income & Benefits ·
Employment Centres · Education · LGBTQ+ Services · Women's Support · Drop-in Centres · Youth Programs

A row with a misspelled category won't appear. To **add a brand-new category**, open `js/map.js`,
find the `CATEGORIES` list near the top, copy one line, and change the name, emoji, and colour.

---

## ⚠️ Safety rule: confidential addresses

**Never put the address of a confidential shelter (for example, a women's/DV shelter) in the spreadsheet.**
Leave the address blank so it appears in the "Online & phone" list without a pin.
The "Women's Support" category never pulls automatic results, for the same reason.

---

## Switching to a Google Sheet (optional)

If staff would rather edit a Google Sheet than GitHub:

1. Upload `resources.csv` into Google Sheets (*File → Import*). Keep the same column headers.
2. **Use a shared or work account, not a personal one**, so it survives staff changes.
3. *File → Share → Publish to web* → pick the sheet → choose **Comma-separated values (.csv)** → **Publish**. Copy the link.
4. On GitHub, open `js/map.js`, find `SHEET_CSV_URL: ''` near the top, and paste the link between the quotes.
5. Commit. From now on the map reads the Sheet. (If the Sheet ever fails to load, the map automatically
   falls back to `data/resources.csv`.)

Note: anyone with a published Sheet's link can view it. That's fine for a public resource list. Never put private info in it.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| New resource doesn't show | Check the category spelling; check for a missing "quote" around an address with commas |
| Pin is in the wrong spot | Fill in `lat` and `lng` yourself. In Google Maps, right-click the spot → click the numbers to copy them |
| "Nearby search is busy" | The free OpenStreetMap server is busy. Trusted pins still work. Wait a minute and search again |
| Intersection not found | Add the city: `Queen St & Main St, Brampton` |
| A nearby (automatic) place is wrong or closed | Fix it for everyone at openstreetmap.org (free account) |

## Free services the map uses
- **Leaflet**: draws the map (leafletjs.com)
- **OpenStreetMap**: map pictures, address search (Nominatim), nearby places (Overpass)
- **PapaParse**: reads the spreadsheet

Privacy: searched addresses are sent to OpenStreetMap's servers to find them on the map. They're not
saved by this website. Encourage staff to use an intersection rather than a youth's exact home address.
