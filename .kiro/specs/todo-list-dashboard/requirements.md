# Requirements Document

## Introduction

The To Do List Dashboard is a client-side web application built with HTML, CSS, and Vanilla JavaScript. It provides users with a personal productivity dashboard accessible from any modern browser. The app requires no backend server and no build tooling — all data is persisted using the browser's Local Storage API. Core features include a time-aware greeting, a Pomodoro focus timer, a task management list, and a customizable quick-links panel. Optional stretch-goal features include a light/dark mode toggle, a custom user name in the greeting, and a configurable Pomodoro duration.

## Glossary

- **Dashboard**: The single-page web application rendered in the browser.
- **Task**: A user-created to-do item with a title, completion status, and unique identifier.
- **Task_List**: The UI component that displays and manages all Tasks.
- **Task_Store**: The Local Storage key used to persist Task data as a JSON array.
- **Timer**: The Pomodoro countdown timer component.
- **Timer_Duration**: The countdown length in minutes, defaulting to 25 minutes.
- **Quick_Link**: A user-defined bookmark consisting of a label and a URL.
- **Quick_Link_Store**: The Local Storage key used to persist Quick_Link data as a JSON array.
- **Greeting**: The UI component that displays the current time, date, and a time-of-day salutation.
- **Settings_Store**: The Local Storage key used to persist user preferences (theme, custom name, Timer_Duration).
- **Theme**: The visual color scheme of the Dashboard, either "light" or "dark".
- **Storage**: The browser's `window.localStorage` API.

---

## Requirements

### Requirement 1: Time and Date Greeting

**User Story:** As a user, I want to see the current time, date, and a contextual greeting when I open the Dashboard, so that I am immediately oriented to the current moment.

#### Acceptance Criteria

1. WHEN the Dashboard is opened, THE Greeting SHALL immediately display the current local time in HH:MM format based on the device's local clock.
2. THE Greeting SHALL update the displayed time every 60 seconds to reflect the current local time.
3. THE Greeting SHALL display the current local date in the format "WEEKDAY_NAME, MONTH_NAME DD, YYYY" (e.g., "Monday, October 23, 2026").
4. IF the local time is between 05:00 and 11:59 inclusive, THEN THE Greeting SHALL display the salutation "Good Morning".
5. IF the local time is between 12:00 and 17:59 inclusive, THEN THE Greeting SHALL display the salutation "Good Afternoon".
6. IF the local time is between 18:00 and 20:59 inclusive, THEN THE Greeting SHALL display the salutation "Good Evening".
7. IF the local time is between 21:00 and 23:59, or between 00:00 and 04:59 inclusive, THEN THE Greeting SHALL display the salutation "Good Night".

---

### Requirement 2: Custom Name in Greeting

**User Story:** As a user, I want to personalize the greeting with my name, so that the Dashboard feels tailored to me.

#### Acceptance Criteria

1. THE Greeting SHALL include a text input field that accepts a custom name between 1 and 50 non-whitespace-only characters.
2. WHEN the user submits a custom name that is empty or contains only whitespace characters, THE Dashboard SHALL display an inline validation error indicating the name is invalid and SHALL NOT save the name.
3. WHEN the user saves a valid custom name, THE Dashboard SHALL display the salutation combined with the saved name (e.g., "Good Morning, Alex").
4. WHEN no custom name has been saved, THE Dashboard SHALL display the salutation without a name.
5. WHEN the user saves a valid custom name, THE Dashboard SHALL persist the name in Settings_Store so that the name is restored on the next page load.
6. IF Settings_Store is unavailable when saving a custom name, THEN THE Dashboard SHALL display an error message indicating the name could not be saved and SHALL retain the previously saved name in Settings_Store.
7. IF Settings_Store is unavailable on page load, THEN THE Dashboard SHALL display the salutation without a name.

---

### Requirement 3: Pomodoro Focus Timer

**User Story:** As a user, I want a Pomodoro-style countdown timer, so that I can work in focused intervals and manage my concentration.

#### Acceptance Criteria

1. THE Timer SHALL initialize with a countdown value equal to Timer_Duration minutes and 00 seconds, where Timer_Duration is 25 minutes by default and is configurable to any integer value between 1 and 60 minutes inclusive.
2. WHEN the user activates the Start control and the Timer is not already counting down, THE Timer SHALL begin counting down at one-second intervals.
3. WHILE the Timer is counting down, THE Timer SHALL update the displayed minutes and seconds once per second.
4. WHEN the user activates the Stop control and the Timer is counting down, THE Timer SHALL pause the countdown and retain the current remaining time.
5. WHEN the user activates the Reset control, THE Timer SHALL stop the countdown if running and restore the display to Timer_Duration minutes and 00 seconds.
6. WHEN the countdown reaches 00:00, THE Timer SHALL stop automatically and change the timer display to a distinct completion state that is visually differentiated from the counting-down state.
7. THE Timer SHALL expose Start, Stop, and Reset controls at all times.
8. IF the user activates the Start control and the Timer is already counting down, THEN THE Timer SHALL ignore the activation and continue counting down without interruption.
9. IF the user activates the Stop control and the Timer is not counting down, THEN THE Timer SHALL ignore the activation and retain the current displayed time without change.

---

### Requirement 4: Configurable Pomodoro Duration

**User Story:** As a user, I want to change the Pomodoro timer duration, so that I can adapt focus intervals to my personal working style.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a setting that allows the user to set Timer_Duration to any integer value between 1 and 120 minutes inclusive.
2. WHEN the user saves a new Timer_Duration, THE Timer SHALL reset and display the new Timer_Duration value in MM:SS format.
3. WHEN the user saves a new Timer_Duration, THE Dashboard SHALL persist the value in Settings_Store so that the value is restored on the next page load.
4. IF the user enters a Timer_Duration value that is not an integer, is less than 1, is greater than 120, or is empty, THEN THE Dashboard SHALL reject the input, display an inline validation message indicating the valid range (1–120), and preserve the previously saved Timer_Duration value.
5. IF the user changes Timer_Duration while the Timer is counting down, THEN THE Dashboard SHALL stop the Timer, reset it to the new Timer_Duration, and require the user to manually restart it.

---

### Requirement 5: Task Management

**User Story:** As a user, I want to add, edit, complete, and delete tasks in a list, so that I can track the work I need to accomplish.

#### Acceptance Criteria

1. THE Task_List SHALL provide an input field and a submission control that allow the user to add a new Task with a non-empty title between 1 and 250 characters.
2. IF the user attempts to submit a Task with an empty title, THEN THE Task_List SHALL reject the submission and display an inline validation message.
3. WHEN the user submits a valid Task title (1–250 characters), THE Task_List SHALL add the Task to the list and persist all Tasks to Task_Store.
4. THE Task_List SHALL display each Task with its title, a completion toggle, an edit control, and a delete control.
5. WHEN the user activates the completion toggle for a Task, THE Task_List SHALL toggle the Task's completion status between completed and not-completed and persist the change to Task_Store.
6. WHEN the user activates the edit control for a Task, THE Task_List SHALL present the Task's title in an editable field pre-populated with the current title.
7. WHEN the user saves an edited Task title that is non-empty (1–250 characters), THE Task_List SHALL update the Task's title and persist the change to Task_Store.
8. IF the user attempts to save an edited Task title that is empty, THEN THE Task_List SHALL reject the save and display an inline validation message.
9. WHEN the user cancels an in-progress edit, THE Task_List SHALL discard the unsaved changes and restore the Task's previously saved title in the display.
10. WHEN the user activates the delete control for a Task, THE Task_List SHALL immediately remove the Task from the list and persist the updated list to Task_Store.
11. IF a write to Task_Store fails during any Task mutation (add, edit, delete, toggle), THEN THE Task_List SHALL display an inline error message indicating the change could not be saved and preserve the prior Task_Store state.
12. WHEN the Dashboard loads, THE Task_List SHALL read all Tasks from Task_Store and render them in the order they were saved.

---

### Requirement 6: Quick Links

**User Story:** As a user, I want to save and access favorite website links from the Dashboard, so that I can reach important sites with a single click.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a form with a label field (1–50 characters) and a URL field (1–2048 characters) that allows the user to submit a new Quick_Link, provided the total number of stored Quick_Links is fewer than 50.
2. IF the user submits the Quick_Link form with an empty label, a label exceeding 50 characters, or a URL that does not begin with `http://` or `https://` followed by at least one character, THEN THE Dashboard SHALL reject the submission and display an inline validation message identifying the invalid field.
3. WHEN the user submits a valid Quick_Link form, THE Dashboard SHALL append the new Quick_Link to Quick_Link_Store and, IF the write to Quick_Link_Store fails, THEN THE Dashboard SHALL display an error message indicating the link could not be saved and retain the form values.
4. WHILE at least one Quick_Link is stored, THE Dashboard SHALL display each Quick_Link as a clickable button labeled with the Quick_Link's label.
5. WHEN the user activates a Quick_Link button, THE Dashboard SHALL open the associated URL in a new browser tab.
6. WHEN the user activates the delete control for a Quick_Link, THE Dashboard SHALL remove that Quick_Link from Quick_Link_Store and, IF the write to Quick_Link_Store fails, THEN THE Dashboard SHALL display an error message indicating the link could not be deleted and retain the existing Quick_Link in the displayed list.
7. WHEN the Dashboard loads, THE Dashboard SHALL read all Quick_Links from Quick_Link_Store and render them, and IF the read from Quick_Link_Store fails, THEN THE Dashboard SHALL display an error message indicating links could not be loaded and render an empty Quick_Link list.

---

### Requirement 7: Light/Dark Mode Toggle

**User Story:** As a user, I want to switch between a light and a dark visual theme, so that I can use the Dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a toggle control that switches the Theme between "light" and "dark" and displays the currently active Theme value.
2. WHEN the user activates the theme toggle, THE Dashboard SHALL apply the selected Theme to all UI components — including backgrounds, text, borders, and interactive controls — without requiring a page reload.
3. WHEN the user activates the theme toggle, THE Dashboard SHALL persist the selected Theme value in Settings_Store.
4. WHEN the Dashboard loads, THE Dashboard SHALL read the Theme value from Settings_Store and apply it before any UI components are painted to the screen.
5. IF no Theme value exists in Settings_Store, THEN THE Dashboard SHALL apply the "light" Theme as the default.

---

### Requirement 8: Local Storage Persistence

**User Story:** As a user, I want all my data to be saved automatically in the browser, so that my tasks, links, and preferences are restored every time I open the Dashboard.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL read Task data from Task_Store and render Tasks in the order in which they were last persisted.
2. WHEN the Dashboard loads, THE Dashboard SHALL read Quick_Link data from Quick_Link_Store and render Quick_Links.
3. WHEN the Dashboard loads, THE Dashboard SHALL read settings (Theme, custom name, Timer_Duration) from Settings_Store and apply them before any visible content is rendered, so that no default theme or name is shown before the stored values take effect.
4. WHEN the user creates, updates, reorders, or deletes a Task, Quick_Link, or setting value, THE Dashboard SHALL write the updated data to the corresponding Store before the next user interaction can be processed.
5. IF Storage is unavailable or throws an error during a read or write operation, THEN THE Dashboard SHALL display a non-blocking warning message indicating the storage failure and continue operating with in-memory state for the remainder of the session.
6. IF a read from any Store returns data that cannot be parsed as valid JSON, THEN THE Dashboard SHALL discard the corrupt data, initialize that Store's data to its default empty state, and display a non-blocking warning message indicating that saved data could not be recovered.
7. THE Dashboard SHALL ensure that for every Task array and Quick_Link array written to their respective Stores, parsing the stored value and re-serializing it produces an array structurally equal to the original.

---

### Requirement 9: Project File Structure

**User Story:** As a developer, I want the project to follow a simple, predictable file layout, so that the codebase is easy to navigate and maintain.

#### Acceptance Criteria

1. THE Dashboard SHALL be delivered as exactly one HTML file at the project root (e.g., `index.html`).
2. THE Dashboard SHALL reference exactly one CSS file located inside a `css/` directory.
3. THE Dashboard SHALL reference exactly one JavaScript file located inside a `js/` directory.
4. THE HTML file SHALL reference the CSS and JavaScript files using relative paths so that the project resolves correctly when opened from the local filesystem without a server.
5. WHEN the project is opened as a local file in Chrome, Firefox, Edge, or Safari, THE Dashboard SHALL render all UI elements, apply all styles, execute all JavaScript, produce no uncaught console errors, and require no network requests to function.

---

### Requirement 10: Performance and Responsiveness

**User Story:** As a user, I want the Dashboard to load quickly and respond to interactions without lag, so that it does not interrupt my workflow.

#### Acceptance Criteria

1. THE Dashboard SHALL render all visible above-the-fold content to an interactive state within 2 seconds on a connection with a download speed of at least 10 Mbps and a latency of no more than 50ms.
2. WHEN the user interacts with any control (add, edit, delete, toggle, timer button), THE Dashboard SHALL reflect the change in the UI within 100 milliseconds.
3. THE Dashboard SHALL maintain a layout at viewport widths between 320px and 2560px such that no content is horizontally clipped or overlapping, all text remains at a minimum font size of 12px, and all interactive controls remain accessible without horizontal scrolling.
4. IF the Dashboard has not reached an interactive state within 2 seconds of navigation, THEN THE Dashboard SHALL display a loading indicator until all visible above-the-fold content is fully rendered.
