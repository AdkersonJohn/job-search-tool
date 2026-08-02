# Icon Library + API Key UX — Design

**Date:** 2026-08-01
**Status:** Approved

## Problem

The UI uses emojis (🚀💼📍📅🕐📆🔍⚙🏢) which reads as unpolished, and the API key
input gives no way to verify what was typed or confirm it saved (it silently
autosaved on every keystroke).

## Decisions made

- **Icon library:** `lucide-react` (new dependency, user-approved).
- **Save semantics:** typing edits a draft only; the key persists to localStorage
  only when the "Save API key" button is clicked, which shows a "Saved ✓"
  confirmation that clears on further edits.

## Design

All changes in `src/components/SearchPage.tsx` + `src/App.css`.

### Icon swaps (lucide-react, red theme)

| Emoji | Replacement |
|---|---|
| 🚀 title | `Rocket` beside "Job Search" |
| 💼 job input | `Briefcase` |
| 📍 city input | `MapPin` |
| 📅🕐📆 select options | emojis removed (native `<option>` can't render SVG); select wrapped like the text inputs with a `Calendar` icon |
| 🔍 search button | `Search` |
| ⚙ settings toggle | `Settings` |
| 💼 results heading (CSS ::before) | `Briefcase` inline in the h3 |
| 🏢 company | `Building2` |

Global `button` rule gains flex centering + gap for icon alignment.

### API key panel

- Input stays `type="password"` by default; an `Eye`/`EyeOff` toggle button sits
  inside the field's right edge and switches it to `type="text"` (with
  aria-labels "Show/Hide API key").
- State split: `draftKey` (input value) vs `storedKey` (persisted). The
  "Add a free RapidAPI key…" hint tracks `storedKey`.
- **Save API key** button: trims, calls `setJSearchKey`, syncs `storedKey`,
  shows "Saved ✓" (`Check` icon, green) until the draft is edited again.
- Enter inside the key field also saves.

## Out of scope

- Replacing the "→" card arrow (text glyph, not an emoji).
- Any data-layer changes (`jobService.ts`/`jobUtils.ts` untouched).
