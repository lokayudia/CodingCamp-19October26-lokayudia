# Design Document

## Overview

The To Do List Dashboard is a zero-dependency, client-side single-page application delivered as three static files: `index.html`, `css/style.css`, and `js/app.js`. It runs entirely in the browser with no network requests, no build step, and no server. All persistent state is stored in `window.localStorage` under three named keys.

The UI is divided into four functional panels:

| Panel | Purpose |
|---|---|
| Greeting | Time, date, and personalised salutation |
| Pomodoro Timer | Countdown timer with Start / Stop / Reset |
| Task List | CRUD task management |
| Quick Links | Bookmark shortcuts |

A theme toggle in the header switches between light and dark colour schemes. Every write to the DOM is paired with an immediate write to localStorage; reads happen once at page load to restore state.

---

## Architecture

### Component Model

The application is structured as a collection of plain ES modules co-located in `js/app.js`. Because a single-file constraint applies to JavaScript, logical separation is achieved through module-scoped functions grouped by responsibility rather than by file.

```
js/app.js
  ├── storage.js   (inline namespace) — read / write / error handling for localStorage
  ├── greeting.js  (inline namespace) — clock, date, salutation, custom name
  ├── timer.js     (inline namespace) — Pomodoro state machine
  ├── tasks.js     (inline namespace) — task CRUD + rendering
  ├── links.js     (inline namespace) — quick-link CRUD + rendering
  └── init()       — bootstraps all modules on DOMContentLoaded
```

Each namespace is a plain object literal whose methods close over private state variables. There are no classes, no frameworks, and no module bundlers.

### Data Flow

```
Page Load
  └─► storage.read(key) ──► parse JSON ──► module.init(data)
                                  │
                           corrupt / missing
                                  └─► module.init(default) + show warning

User Interaction
  └─► module.handleEvent() ──► mutate in-memory state ──► render()
                                        └─► storage.write(key, data)
                                                  │
                                             write fails
                                                  └─► show inline error
```

### Rendering Strategy

All rendering is imperative DOM manipulation (`innerHTML`, `createElement`, `classList`). There is no virtual DOM or reactive binding. Each module owns a single container element referenced by `id` and re-renders its subtree by replacing `innerHTML` on every state change. This is safe for the expected data sizes (≤250 tasks, ≤50 links).

---

## Components and Interfaces

### Storage Module

Responsible for all interaction with `window.localStorage`.

```
storage = {
  read(key: string): any | null
    // Returns parsed JSON or null. Catches SyntaxError and storage errors.
    // On corrupt JSON: discards data, calls showWarning(), returns null.
    // On unavailable storage: calls showWarning(), returns null.

  write(key: string, value: any): boolean
    // Serializes value to JSON and writes to localStorage.
    // Returns true on success, false on failure.
    // On failure: caller is responsible for showing inline error.

  KEYS = {
    TASKS:    'todo_dashboard_tasks',
    LINKS:    'todo_dashboard_links',
    SETTINGS: 'todo_dashboard_settings'
  }
}
```

**Design decision**: `storage.read` returns `null` rather than throwing so that each module can cleanly fall back to its default state.

### Greeting Module

```
greeting = {
  init(settings: Settings): void
    // Renders time, date, salutation; starts the 60-second interval.

  updateClock(): void
    // Called every 60 s by setInterval; re-renders time + salutation.

  setSalutation(hour: number): string
    // Pure function: maps hour → salutation string.
    //   05–11 → "Good Morning"
    //   12–17 → "Good Afternoon"
    //   18–20 → "Good Evening"
    //   21–23, 00–04 → "Good Night"

  saveName(name: string): void
    // Validates name (1–50 non-whitespace chars).
    // On valid: persists to Settings_Store, updates display.
    // On invalid: shows inline validation error, does NOT save.
    // On storage failure: shows error, retains previous name.
}
```

### Timer Module

The timer is modeled as a finite state machine with three states:

```
        ┌──────────────────────────────────────────────────────┐
        │                                                      │
       idle ─── start ──► running ─── stop ──► paused ──── start ──► running
        ▲                    │                    │
        │                    │ (reset)             │ (reset)
        └────────────────────┴────────────────────┘
                             │
                          reaches 00:00
                             ▼
                           done ─── (reset) ──► idle
```

```
timer = {
  init(durationMinutes: number): void
  start(): void   // ignored if state === 'running'
  stop(): void    // ignored if state !== 'running'
  reset(): void   // always valid; stops interval, restores duration
  setDuration(minutes: number): void
    // Validates 1–120. On valid: resets timer to new duration.
    // On invalid: shows inline validation message.
    // If running: stops timer first.
    // Persists to Settings_Store on success.
}
```

The `setInterval` handle is stored in a module-scoped variable; `reset()` and `stop()` both call `clearInterval`.

### Task Module

```
tasks = {
  init(taskArray: Task[]): void
  addTask(title: string): void
    // Validates 1–250 chars.
    // On valid: appends Task, persists, re-renders.
    // On storage failure: shows inline error, does not mutate in-memory list.
  toggleComplete(id: string): void
  beginEdit(id: string): void   // renders editable field for that task row
  saveEdit(id: string, newTitle: string): void
    // Validates 1–250 chars.
  cancelEdit(id: string): void
  deleteTask(id: string): void
  render(): void   // replaces Task_List container innerHTML
}
```

Each task row is rendered as:
```
[ ✓ checkbox ] [ title or <input> ] [ Edit ] [ Delete ]
```

### Quick Links Module

```
links = {
  init(linkArray: QuickLink[]): void
  addLink(label: string, url: string): void
    // Validates label 1–50 chars, url starts with http(s):// + ≥1 char.
    // Validates total count < 50.
    // On valid: appends, persists, re-renders.
    // On storage failure: shows error, retains form values.
  deleteLink(id: string): void
    // On storage failure: shows error, retains link in displayed list.
  render(): void   // replaces Quick_Links container innerHTML
}
```

Each link renders as a `<button>` that calls `window.open(url, '_blank')`.

### Theme Module

```
theme = {
  init(value: 'light' | 'dark' | null): void
    // Applies value (or 'light' default) to <html data-theme="...">.
  toggle(): void
    // Flips theme, updates data-theme attribute, persists to Settings_Store.
}
```

CSS uses a `[data-theme="dark"]` selector block to override custom properties. No JavaScript class manipulation is needed beyond the single attribute.

---

## Data Models

### Task

```typescript
interface Task {
  id: string;           // crypto.randomUUID() or Date.now().toString() fallback
  title: string;        // 1–250 characters
  completed: boolean;   // false on creation
  createdAt: number;    // Date.now() timestamp
}
```

Stored as: `localStorage['todo_dashboard_tasks'] = JSON.stringify(Task[])`

### QuickLink

```typescript
interface QuickLink {
  id: string;    // crypto.randomUUID() or Date.now().toString() fallback
  label: string; // 1–50 characters
  url: string;   // must start with http:// or https://; max 2048 chars
}
```

Stored as: `localStorage['todo_dashboard_links'] = JSON.stringify(QuickLink[])`

### Settings

```typescript
interface Settings {
  theme: 'light' | 'dark';   // default: 'light'
  name: string | null;        // null means no custom name set; max 50 chars
  timerDuration: number;      // integer 1–120, default: 25
}
```

Stored as: `localStorage['todo_dashboard_settings'] = JSON.stringify(Settings)`

### Storage Key Constants

| Constant | Key String | Default Value |
|---|---|---|
| `KEYS.TASKS` | `'todo_dashboard_tasks'` | `[]` |
| `KEYS.LINKS` | `'todo_dashboard_links'` | `[]` |
| `KEYS.SETTINGS` | `'todo_dashboard_settings'` | `{ theme: 'light', name: null, timerDuration: 25 }` |

### ID Generation

IDs are generated using `crypto.randomUUID()` where available (all modern browsers). A fallback of `Date.now().toString() + Math.random().toString(36).slice(2)` is used for environments without the Web Crypto API, ensuring uniqueness within a single session.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Time-of-day salutation mapping is total and correct

*For any* hour value in the range 0–23, `setSalutation(hour)` SHALL return exactly one of "Good Morning", "Good Afternoon", "Good Evening", or "Good Night", and the result SHALL match the boundary table in Requirement 1 (05–11 → Morning, 12–17 → Afternoon, 18–20 → Evening, 21–23 and 00–04 → Night).

**Validates: Requirements 1.4, 1.5, 1.6, 1.7**

---

### Property 2: Whitespace-only names are rejected

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines), attempting to save it as a custom name SHALL be rejected — the in-memory name SHALL remain unchanged and the name SHALL NOT be written to Settings_Store.

**Validates: Requirements 2.1, 2.2**

---

### Property 3: Task addition round-trip

*For any* valid task title (non-empty, 1–250 characters), after calling `addTask(title)`, serializing the in-memory task array to JSON and deserializing it SHALL produce an array containing a task whose `title` equals the original input.

**Validates: Requirements 5.1, 5.3, 8.7**

---

### Property 4: Whitespace-only and empty task titles are invalid

*For any* string that is empty or composed entirely of whitespace characters, `addTask` and `saveEdit` SHALL reject the input — the task list SHALL remain unchanged and no write to Task_Store SHALL occur.

**Validates: Requirements 5.2, 5.8**

---

### Property 5: Task completion toggle is an involution

*For any* task in the list, toggling its completion status twice SHALL return `completed` to its original value, and the change SHALL be persisted to Task_Store.

**Validates: Requirements 5.5**

---

### Property 6: Task edit preserves identity

*For any* task in the list, after `saveEdit(id, newTitle)` with a valid title, the task with that `id` SHALL exist in the list with `title === newTitle` and all other fields unchanged.

**Validates: Requirements 5.6, 5.7**

---

### Property 7: Task deletion removes exactly one item

*For any* task list of length N and any task id in that list, after `deleteTask(id)` the list SHALL have length N−1 and SHALL NOT contain any task with the deleted `id`.

**Validates: Requirements 5.10**

---

### Property 8: LocalStorage serialization round-trip

*For any* valid Task array or QuickLink array, serializing it with `JSON.stringify` and then deserializing with `JSON.parse` SHALL produce an array that is structurally equal (same length, same field values) to the original.

**Validates: Requirements 8.7**

---

### Property 9: Quick link URL validation

*For any* string that does not begin with `http://` or `https://` followed by at least one non-empty character, `addLink` SHALL reject it — the link list SHALL remain unchanged and no write to Quick_Link_Store SHALL occur.

**Validates: Requirements 6.2**

---

### Property 10: Quick link count cap

*For any* Quick_Link list that already contains 50 entries, attempting to add another link SHALL be rejected — the list length SHALL remain 50.

**Validates: Requirements 6.1**

---

### Property 11: Theme toggle is an involution

*For any* current theme value T ∈ { "light", "dark" }, calling `theme.toggle()` twice SHALL result in the `data-theme` attribute returning to T.

**Validates: Requirements 7.1, 7.2**

---

### Property 12: Settings persistence round-trip

*For any* valid Settings object, writing it to Settings_Store and reading it back SHALL produce a Settings object with the same `theme`, `name`, and `timerDuration` values.

**Validates: Requirements 2.5, 4.3, 7.3, 8.3**

---

## Error Handling

### Storage Unavailable

When `window.localStorage` throws (e.g., private browsing mode with storage quota 0, or browser security policy), the `storage.write` function returns `false` and each module displays an inline, non-blocking warning banner. The application continues to function with in-memory state for the session.

### Corrupt JSON

When `JSON.parse` throws a `SyntaxError` on a stored value, the storage module:
1. Discards the corrupt data.
2. Initializes that store's data to its default empty state (`[]` for arrays, default object for settings).
3. Displays a non-blocking warning message: *"Saved [tasks/links/settings] could not be recovered and have been reset."*

### Validation Errors

All validation errors are displayed as inline messages adjacent to the relevant input field. They are not modal dialogs or page-level banners. They are cleared when the user modifies the input or cancels the action.

### Timer Edge Cases

- Activating **Start** while already running: no-op (requirement 3.8).
- Activating **Stop** while not running: no-op (requirement 3.9).
- Changing duration while running: timer stops, resets to new duration, requires manual restart (requirement 4.5).

### Quick Link Edge Cases

- Attempting to open a link where the URL was saved before protocol validation was enforced: the link opens as-is via `window.open`; the URL validation gate prevents new invalid entries.
- Delete failure: the link is retained in the displayed list; the user is shown an error message.

---

## Testing Strategy

### Overview

The feature is a pure client-side application with no build tooling, so tests are written with a lightweight browser-compatible test runner (e.g., [QUnit](https://qunitjs.com/) or [Jasmine standalone](https://jasmine.github.io/)) that can be opened as a local HTML file without a server. Property-based tests use [fast-check](https://fast-check.io/), loaded via a CDN `<script>` tag in the test HTML.

### Unit Tests

Unit tests cover specific examples, edge cases, and error conditions for each module.

**Greeting module**
- `setSalutation(5)` returns `"Good Morning"` (boundary: 05:00)
- `setSalutation(11)` returns `"Good Morning"` (boundary: 11:59)
- `setSalutation(12)` returns `"Good Afternoon"`
- `setSalutation(17)` returns `"Good Afternoon"`
- `setSalutation(18)` returns `"Good Evening"`
- `setSalutation(20)` returns `"Good Evening"`
- `setSalutation(21)` returns `"Good Night"`
- `setSalutation(0)` returns `"Good Night"` (midnight)
- `setSalutation(4)` returns `"Good Night"` (boundary: 04:59)
- `saveName("")` shows validation error, does not persist
- `saveName("   ")` shows validation error, does not persist

**Timer module**
- Initial state equals Timer_Duration × 60 seconds
- `start()` when already running is a no-op
- `stop()` when not running is a no-op
- Timer reaches 00:00 and transitions to `done` state
- `reset()` restores display to Timer_Duration:00
- `setDuration(0)` and `setDuration(121)` display validation errors
- `setDuration(30)` while running stops timer and resets to 30:00

**Task module**
- Adding a task with 250-char title succeeds
- Adding a task with 251-char title is rejected
- Adding an empty task is rejected
- Editing a task to empty title is rejected
- Cancelling an edit restores original title
- Storage write failure shows inline error and leaves Task_Store unchanged

**Quick links module**
- Adding a link with a bare domain (no `http://`) is rejected
- Adding a link when 50 links exist is rejected
- Delete failure shows error, link remains in list
- Opening a link calls `window.open(url, '_blank')`

**Storage module**
- Corrupt JSON in a store triggers reset to default + warning
- Unavailable storage triggers warning + in-memory operation
- Successful write returns `true`; failed write returns `false`

### Property-Based Tests

Property-based tests use **fast-check** with a minimum of **100 iterations** per property. Each test is tagged with a comment referencing the design property.

```
// Feature: todo-list-dashboard, Property 1: Time-of-day salutation mapping is total and correct
// Feature: todo-list-dashboard, Property 2: Whitespace-only names are rejected
// Feature: todo-list-dashboard, Property 3: Task addition round-trip
// Feature: todo-list-dashboard, Property 4: Whitespace-only and empty task titles are invalid
// Feature: todo-list-dashboard, Property 5: Task completion toggle is an involution
// Feature: todo-list-dashboard, Property 6: Task edit preserves identity
// Feature: todo-list-dashboard, Property 7: Task deletion removes exactly one item
// Feature: todo-list-dashboard, Property 8: LocalStorage serialization round-trip
// Feature: todo-list-dashboard, Property 9: Quick link URL validation
// Feature: todo-list-dashboard, Property 10: Quick link count cap
// Feature: todo-list-dashboard, Property 11: Theme toggle is an involution
// Feature: todo-list-dashboard, Property 12: Settings persistence round-trip
```

All property tests operate on pure in-memory functions (the rendering layer is not involved); `localStorage` is replaced with an in-memory stub to keep tests fast and side-effect-free.

### Integration Tests

Integration tests verify end-to-end behavior with a real (stubbed) localStorage:
- Page load reads Task_Store and renders the correct number of task rows.
- Page load reads Settings_Store and applies the saved theme before paint.
- Page load reads Quick_Link_Store and renders the correct link buttons.
- A full task lifecycle (add → complete → edit → delete) leaves Task_Store in the expected state.
- A full quick-link lifecycle (add → click → delete) leaves Quick_Link_Store in the expected state.

### Cross-Browser Smoke Tests

Manual smoke tests in Chrome, Firefox, Edge, and Safari (as local files):
- All UI components render without layout overflow at 320 px and 1440 px.
- No uncaught console errors on page load.
- Timer countdown works correctly for a 1-minute run.
- Theme persists across page reload.
