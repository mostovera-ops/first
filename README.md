# Flux — a Linear-style Kanban

A lightweight, keyboard-friendly project management tool with a Kanban board,
styled after [Linear](https://linear.app): near-black surfaces, hairline
borders, one subtle indigo accent, tight spacing. Everything is stored locally
in your browser and survives reloads — including uploaded file attachments.

## Stack

- **React + TypeScript + Vite**
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **@dnd-kit/core + @dnd-kit/sortable** — all drag-and-drop
- **Zustand** — state, with every mutation autosaved
- **IndexedDB** (via `idb`) — persistence, including attachment blobs (chosen
  over `localStorage` because attachments can exceed its ~5 MB limit)

## Data hierarchy

```
Workspace → Projects → Lists (columns) → Task cards → Attachments
```

## Features

**Workspace** — grid of project cards; add, inline-rename, delete (with
confirm), and drag-to-reorder. Each card shows live list/task counts.

**Board** — horizontal, horizontally-scrolling columns; add, inline-rename,
delete-with-confirm (warns when a list still has cards), and drag list headers
to reorder.

**Cards** — add, inline-rename (double-click or the hover pencil), delete
(hover trash + confirm), and drag to reorder within a list or move across
lists. The card face shows only the task name and a deadline pill that turns
**amber** when due soon and **red** when overdue.

**Task modal** — centered, dark, dismissed via `Esc` / click-outside / close
button. Editable title, date picker, autosizing description and separate notes
fields, and an attachments drop-zone (click or drag-drop) that stores files in
IndexedDB with size, remove, and image thumbnails. Every field autosaves — no
save button.

## Keyboard

- `Esc` — close the modal / cancel an inline edit or confirm dialog
- `Enter` — commit an inline rename; add another task in the composer
- `Shift+Enter` — newline inside description/notes/card composer

## Scripts

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run lint     # oxlint
```

## Project structure

```
src/
  types/      domain models
  db/         IndexedDB layer (idb) + cascading deletes
  store/      Zustand store, autosaves to IndexedDB
  lib/        date + formatting helpers
  components/
    workspace/  Level 1 — project cards
    board/      Level 2 — board + list columns
    card/       Level 3 — task cards
    modal/      Level 4 — task detail + attachments
    ui/         shared primitives (confirm dialog, inline edit, autotextarea)
```
