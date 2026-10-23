# Implementation Plan: To Do List Dashboard

## Overview

Implement a zero-dependency, client-side single-page application delivered as three static files (`index.html`, `css/style.css`, `js/app.js`). The app works as a local file with no build tools, no frameworks, and no backend. All state is persisted in `localStorage`. Implementation proceeds module by module, wiring everything together in the final step. Property-based tests live in a separate `test.html` file that loads fast-check via CDN.

## Tasks

- [x] 1. Set up project file structure and HTML skeleton
  - Create `index.html` at the project root with semantic HTML sections for all four panels: Greeting, Pomodoro Timer, Task List, and Quick Links
  - Add a `<header>` with a theme toggle button (`data-action="toggle-theme"`)
  - Add placeholder `<section>` elements with IDs: `#greeting`, `#timer`, `#task-list`, `#quick-links`
  - Link `css/style.css` and `js/app.js` using relative paths (no server required)
  - Create empty `css/style.css` and `js/app.js` files to make the page load without errors
  - Set `<html data-theme="light">` as the default attribute
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 2. Implement the Storage module
  - [x] 2.1 Write the `storage` namespace object in `js/app.js`
    - Implement `storage.KEYS` constants: `todo_dashboard_tasks`, `todo_dashboard_links`, `todo_dashboard_settings`
    - Implement `storage.read(key)`: returns parsed JSON or `null`; catches `SyntaxError` (corrupt JSON) and storage errors; calls `showWarning()` on failure
    - Implement `storage.write(key, value)`: serializes to JSON, writes to `localStorage`, returns `true` on success and `false` on failure
    - Implement `showWarning(message)` helper: renders a non-blocking banner above content
    - _Requirements: 8.4, 8.5, 8.6_

  - [x]* 2.2 Write property test for localStorage serialization round-trip
    - Create `test.html` with fast-check loaded via CDN `<script>` tag
    - **Property 8: LocalStorage serialization round-trip**
    - **Validates: Requirements 8.7**
    - For any valid `Task[]` or `QuickLink[]`, `JSON.parse(JSON.stringify(arr))` produces a structurally equal array

- [x] 3. Implement CSS custom properties and theme system
  - [x] 3.1 Write CSS custom properties and theme rules in `css/style.css`
    - Define `:root` custom properties for colors, spacing, font sizes for the light theme
    - Define `[data-theme="dark"]` override block that remaps all color custom properties to dark-mode values
    - Apply custom properties to all layout elements (panels, buttons, inputs, text)
    - Add responsive layout rules: single-column below 768 px, two-column grid above; viewport range 320 px–2560 px with no horizontal clipping
    - Ensure minimum font size of 12 px for all text
    - _Requirements: 7.2, 10.3_

  - [x] 3.2 Implement the `theme` namespace object in `js/app.js`
    - Implement `theme.init(value)`: applies `value` (or `'light'` default) to `<html data-theme="...">` before any module renders
    - Implement `theme.toggle()`: flips the attribute between `'light'` and `'dark'`, persists to `Settings_Store`
    - Wire the header toggle button to `theme.toggle()` via a delegated `click` listener
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x]* 3.3 Write property test for theme toggle involution
    - **Property 11: Theme toggle is an involution**
    - **Validates: Requirements 7.1, 7.2**
    - For any starting theme T ∈ `{ "light", "dark" }`, toggling twice returns `data-theme` to T

- [x] 4. Implement the Greeting module
  - [x] 4.1 Write the `greeting` namespace object in `js/app.js`
    - Implement `greeting.setSalutation(hour)`: pure function mapping 0–23 → one of four salutation strings per boundary table in Requirements 1.4–1.7
    - Implement `greeting.updateClock()`: reads `new Date()`, formats HH:MM, formats full date string "WEEKDAY_NAME, MONTH_NAME DD, YYYY", calls `setSalutation`, updates `#greeting` innerHTML
    - Implement `greeting.init(settings)`: calls `updateClock()` immediately, then starts a `setInterval` of 60 000 ms
    - Implement `greeting.saveName(name)`: validates 1–50 non-whitespace-only chars; on valid persists to `Settings_Store` and re-renders; on invalid shows inline error; on storage failure shows error and retains previous name
    - Implement ID generation helper: `crypto.randomUUID()` with `Date.now().toString() + Math.random().toString(36).slice(2)` fallback
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x]* 4.2 Write property test for salutation mapping
    - **Property 1: Time-of-day salutation mapping is total and correct**
    - **Validates: Requirements 1.4, 1.5, 1.6, 1.7**
    - For any integer hour in 0–23, `setSalutation(hour)` returns exactly one valid salutation matching the boundary table

  - [x]* 4.3 Write property test for whitespace-only name rejection
    - **Property 2: Whitespace-only names are rejected**
    - **Validates: Requirements 2.1, 2.2**
    - For any string composed entirely of whitespace chars, `saveName` rejects it and in-memory name remains unchanged

- [x] 5. Implement the Pomodoro Timer module
  - [x] 5.1 Write the `timer` namespace object in `js/app.js`
    - Implement FSM states: `idle`, `running`, `paused`, `done`; store state and remaining seconds in module-scoped variables
    - Implement `timer.init(durationMinutes)`: sets remaining seconds to `durationMinutes * 60`, renders display, sets state to `idle`
    - Implement `timer.start()`: no-op if state is `running`; starts `setInterval` (1 000 ms tick), sets state to `running`
    - Implement `timer.stop()`: no-op if state is not `running`; calls `clearInterval`, sets state to `paused`
    - Implement `timer.reset()`: calls `clearInterval`, restores remaining seconds to `Timer_Duration * 60`, sets state to `idle`, re-renders
    - Implement tick handler: decrements remaining seconds, re-renders; on reaching 0 calls `clearInterval`, sets state to `done`, applies distinct completion CSS class
    - Implement `timer.setDuration(minutes)`: validates 1–120; on valid stops timer if running, resets to new duration, persists to `Settings_Store`; on invalid shows inline validation message
    - Wire Start, Stop, Reset buttons and duration input to timer methods
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x]* 5.2 Write unit tests for timer FSM edge cases
    - Test `start()` when already `running` is a no-op
    - Test `stop()` when not `running` is a no-op
    - Test `setDuration(0)` and `setDuration(121)` display validation errors
    - Test `setDuration(30)` while running stops timer and resets to 30:00
    - _Requirements: 3.8, 3.9, 4.4, 4.5_

- [x] 6. Checkpoint — verify structure and theme before data modules
  - Ensure all tests pass, ask the user if questions arise.
  - Confirm `index.html` opens as a local file in a browser with no console errors
  - Confirm theme toggle visually switches all panel colors without a page reload

- [x] 7. Implement the Task module
  - [x] 7.1 Write the `tasks` namespace object in `js/app.js`
    - Define `Task` factory: `{ id: generateId(), title, completed: false, createdAt: Date.now() }`
    - Implement `tasks.init(taskArray)`: stores array in module-scoped variable, calls `render()`
    - Implement `tasks.addTask(title)`: validates 1–250 non-empty chars; on valid appends Task, writes to `Task_Store`; on storage failure shows inline error without mutating in-memory list; on invalid shows inline validation message
    - Implement `tasks.toggleComplete(id)`: flips `completed`, persists; on storage failure shows inline error
    - Implement `tasks.beginEdit(id)`: re-renders that row with an `<input>` pre-populated with current title
    - Implement `tasks.saveEdit(id, newTitle)`: validates 1–250 chars; on valid updates title, persists; on empty shows inline error
    - Implement `tasks.cancelEdit(id)`: discards unsaved input, re-renders row with original title
    - Implement `tasks.deleteTask(id)`: removes from array, persists; on storage failure shows inline error
    - Implement `tasks.render()`: replaces `#task-list` container innerHTML; each row: `[checkbox] [title or <input>] [Edit] [Delete]`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12_

  - [x]* 7.2 Write property test for task addition round-trip
    - **Property 3: Task addition round-trip**
    - **Validates: Requirements 5.1, 5.3, 8.7**
    - For any valid title (1–250 chars), after `addTask(title)` the serialized+deserialized array contains a task with that exact title

  - [x]* 7.3 Write property test for whitespace-only and empty task title rejection
    - **Property 4: Whitespace-only and empty task titles are invalid**
    - **Validates: Requirements 5.2, 5.8**
    - For any empty or whitespace-only string, `addTask` and `saveEdit` leave the task list unchanged with no write to `Task_Store`

  - [x]* 7.4 Write property test for task completion toggle involution
    - **Property 5: Task completion toggle is an involution**
    - **Validates: Requirements 5.5**
    - For any task, toggling `completed` twice returns it to its original value and persists both changes

  - [x]* 7.5 Write property test for task edit identity preservation
    - **Property 6: Task edit preserves identity**
    - **Validates: Requirements 5.6, 5.7**
    - For any task, after `saveEdit(id, newTitle)` with a valid title, the task retains the same `id`, `completed`, and `createdAt` with only `title` changed

  - [x]* 7.6 Write property test for task deletion count
    - **Property 7: Task deletion removes exactly one item**
    - **Validates: Requirements 5.10**
    - For any list of length N and any task id in it, after `deleteTask(id)` the list has length N−1 and no task with that id remains

- [x] 8. Implement the Quick Links module
  - [x] 8.1 Write the `links` namespace object in `js/app.js`
    - Define `QuickLink` factory: `{ id: generateId(), label, url }`
    - Implement `links.init(linkArray)`: stores array, calls `render()`
    - Implement `links.addLink(label, url)`: validates label 1–50 chars, url starts with `http://` or `https://` + ≥1 char, and total count < 50; on valid appends and writes to `Quick_Link_Store`; on storage failure shows error and retains form values; on invalid shows inline validation message per field
    - Implement `links.deleteLink(id)`: removes from array, writes to `Quick_Link_Store`; on storage failure shows error and retains link in displayed list
    - Implement `links.render()`: replaces `#quick-links` container innerHTML; each link renders as a `<button>` calling `window.open(url, '_blank')`; each button has a delete control
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 8.2 Write property test for quick link URL validation
    - **Property 9: Quick link URL validation**
    - **Validates: Requirements 6.2**
    - For any string that does not begin with `http://` or `https://` + ≥1 char, `addLink` rejects it and the list remains unchanged

  - [ ]* 8.3 Write property test for quick link count cap
    - **Property 10: Quick link count cap**
    - **Validates: Requirements 6.1**
    - For any list already containing exactly 50 entries, attempting `addLink` is rejected and the list length stays at 50

- [x] 9. Implement `init()` bootstrap and wire all modules together
  - [x] 9.1 Write the `init()` function in `js/app.js` and bind it to `DOMContentLoaded`
    - Call `storage.read(KEYS.SETTINGS)` → fall back to defaults `{ theme: 'light', name: null, timerDuration: 25 }` on null/corrupt
    - Call `theme.init(settings.theme)` first (before any other render) to apply the saved theme before paint
    - Call `greeting.init(settings)` to render time/date and start the clock interval
    - Call `timer.init(settings.timerDuration)` to initialize the timer display
    - Call `tasks.init(storage.read(KEYS.TASKS) ?? [])` to restore and render saved tasks
    - Call `links.init(storage.read(KEYS.LINKS) ?? [])` to restore and render saved links
    - Attach delegated event listeners on `document` for all module actions (add task, toggle, edit, delete, add link, delete link, save name, timer controls, theme toggle)
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 9.4, 9.5_

  - [ ]* 9.2 Write integration tests in `test.html`
    - Test page load reads `Task_Store` and renders the correct number of task rows
    - Test page load reads `Settings_Store` and applies saved theme before paint
    - Test page load reads `Quick_Link_Store` and renders the correct link buttons
    - Test full task lifecycle: add → complete → edit → delete leaves `Task_Store` in expected state
    - Test full quick-link lifecycle: add → click → delete leaves `Quick_Link_Store` in expected state
    - _Requirements: 8.1, 8.2, 8.3_

- [ ]* 9.3 Write property test for settings persistence round-trip
  - **Property 12: Settings persistence round-trip**
  - **Validates: Requirements 2.5, 4.3, 7.3, 8.3**
  - For any valid `Settings` object, writing to `Settings_Store` and reading back produces an object with the same `theme`, `name`, and `timerDuration`

- [x] 10. Final checkpoint — full integration verification
  - Ensure all tests pass, ask the user if questions arise.
  - Open `index.html` as a local file and confirm: all four panels render, timer counts down, tasks persist across reload, links persist across reload, theme persists across reload, no uncaught console errors at viewport widths 320 px and 1440 px

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All property-based tests live in `test.html`, which loads fast-check via CDN — no build step or test setup required
- Each task references specific requirements for traceability
- Checkpoints (tasks 6 and 10) ensure incremental validation before moving to the next layer
- Property tests validate universal correctness; unit tests in task 5.2 validate specific FSM edge cases
- The `init()` bootstrap in task 9.1 calls `theme.init()` before any other render to prevent a flash of unstyled/wrong-theme content

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2"] },
    { "id": 3, "tasks": ["3.3", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 5, "tasks": ["5.2", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "7.4", "7.5", "7.6", "8.1"] },
    { "id": 7, "tasks": ["8.2", "8.3", "9.1"] },
    { "id": 8, "tasks": ["9.2", "9.3"] }
  ]
}
```
