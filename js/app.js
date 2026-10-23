/* js/app.js — To Do List Dashboard */

/* =========================================================
   showWarning(message)
   Renders a non-blocking warning banner above page content.
   Re-uses an existing banner element if one is already shown
   so multiple failures don't stack infinitely.
   ========================================================= */
function showWarning(message) {
  const BANNER_ID = 'app-warning-banner';
  let banner = document.getElementById(BANNER_ID);

  if (!banner) {
    banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'polite');
    // Inline styles so the banner works before css/style.css defines anything
    Object.assign(banner.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      zIndex: '9999',
      padding: '0.75rem 1rem',
      backgroundColor: '#fff3cd',
      color: '#664d03',
      borderBottom: '1px solid #ffecb5',
      fontSize: '0.9rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.5rem',
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Dismiss warning');
    Object.assign(closeBtn.style, {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '1rem',
      color: 'inherit',
      flexShrink: '0',
    });
    closeBtn.addEventListener('click', () => banner.remove());

    const msgSpan = document.createElement('span');
    msgSpan.className = 'app-warning-text';
    msgSpan.style.flex = '1';

    banner.appendChild(msgSpan);
    banner.appendChild(closeBtn);
    document.body.insertBefore(banner, document.body.firstChild);
  }

  banner.querySelector('.app-warning-text').textContent = message;
}

/* =========================================================
   storage namespace
   Wraps window.localStorage with safe read / write helpers.
   ========================================================= */
const storage = (function () {
  const KEYS = {
    TASKS:    'todo_dashboard_tasks',
    LINKS:    'todo_dashboard_links',
    SETTINGS: 'todo_dashboard_settings',
  };

  /**
   * read(key) — returns the parsed value stored under `key`,
   * or null when the key is missing, the JSON is corrupt, or
   * localStorage is unavailable.
   *
   * Requirements 8.5, 8.6
   */
  function read(key) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return null;          // key not set — normal case
      return JSON.parse(raw);                 // may throw SyntaxError
    } catch (err) {
      if (err instanceof SyntaxError) {
        // Requirement 8.6 — corrupt JSON: discard data, warn user
        showWarning(
          'Saved data could not be recovered and has been reset. ' +
          '(Key: ' + key + ')'
        );
      } else {
        // Requirement 8.5 — storage unavailable or other error
        showWarning(
          'Storage is unavailable. Your changes will not be saved this session. ' +
          '(' + err.message + ')'
        );
      }
      return null;
    }
  }

  /**
   * write(key, value) — serialises `value` to JSON and stores it.
   * Returns true on success, false on failure.
   * The caller is responsible for showing any inline error message
   * when false is returned (Requirement 8.4 — must complete before
   * the next user interaction).
   *
   * Requirements 8.4, 8.5
   */
  function write(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      // Requirement 8.5 — storage unavailable
      showWarning(
        'Storage is unavailable. Your changes will not be saved this session. ' +
        '(' + err.message + ')'
      );
      return false;
    }
  }

  return { KEYS, read, write };
}());

/* =========================================================
   theme namespace
   Manages the light/dark colour scheme via the
   <html data-theme="..."> attribute.

   Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   ========================================================= */
const theme = (function () {
  /** The two valid theme values. */
  const LIGHT = 'light';
  const DARK  = 'dark';

  /**
   * init(value)
   * Applies `value` (or 'light' as a fallback) to the <html> element's
   * data-theme attribute.  Must be called before any module renders so
   * the correct colour scheme is in place before the first paint.
   *
   * Requirement 7.4 — read and apply on load before paint.
   * Requirement 7.5 — default to 'light' when no stored value exists.
   */
  function init(value) {
    const resolved = value === DARK ? DARK : LIGHT;
    document.documentElement.setAttribute('data-theme', resolved);
  }

  /**
   * toggle()
   * Reads the current data-theme attribute, flips it to the opposite
   * value, applies it, and persists the new value to Settings_Store.
   *
   * Requirement 7.1 — switch between 'light' and 'dark'.
   * Requirement 7.2 — apply immediately without a page reload.
   * Requirement 7.3 — persist the selected theme to Settings_Store.
   */
  function toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next    = current === DARK ? LIGHT : DARK;

    // Apply to DOM immediately (Requirement 7.2)
    document.documentElement.setAttribute('data-theme', next);

    // Persist to Settings_Store (Requirement 7.3)
    const settings = storage.read(storage.KEYS.SETTINGS) || {};
    settings.theme = next;
    storage.write(storage.KEYS.SETTINGS, settings);
  }

  return { init, toggle };
}());

/* =========================================================
   Delegated click listener for the theme toggle button.
   Wires [data-action="toggle-theme"] to theme.toggle().

   Requirement 7.1 — toggle control in the header.
   ========================================================= */
document.addEventListener('click', function (event) {
  const target = event.target.closest('[data-action="toggle-theme"]');
  if (target) {
    theme.toggle();
  }
});

/* =========================================================
   generateId()
   Generates a unique string ID using crypto.randomUUID()
   where available, falling back to a timestamp + random
   string for environments without the Web Crypto API.

   Used by tasks and links modules to create unique IDs.
   ========================================================= */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: Date.now() + random base-36 string
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

/* =========================================================
   greeting namespace
   Manages the time/date display, time-of-day salutation,
   and optional personalised name in the #greeting section.

   Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7,
                 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
   ========================================================= */
const greeting = (function () {
  /** Module-scoped state */
  let _currentName = null;   // null means no custom name saved
  let _intervalId  = null;   // setInterval handle

  /** Day and month name lookup arrays (locale-neutral) */
  const DAYS   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  /**
   * setSalutation(hour) — pure function, no side-effects.
   * Maps a 0–23 hour value to one of four salutation strings.
   *
   * 05–11 → "Good Morning"   (Requirement 1.4)
   * 12–17 → "Good Afternoon" (Requirement 1.5)
   * 18–20 → "Good Evening"   (Requirement 1.6)
   * 21–23, 00–04 → "Good Night" (Requirement 1.7)
   */
  function setSalutation(hour) {
    if (hour >= 5 && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    if (hour >= 18 && hour <= 20) return 'Good Evening';
    return 'Good Night'; // covers 21–23 and 00–04
  }

  /**
   * _pad(n) — zero-pads a single-digit number to two digits.
   */
  function _pad(n) {
    return String(n).padStart(2, '0');
  }

  /**
   * updateClock()
   * Reads the current local time via new Date(), builds the
   * HH:MM string and the full date string, derives the salutation,
   * and replaces the #greeting section's innerHTML.
   *
   * Requirement 1.1 — display time in HH:MM format.
   * Requirement 1.2 — update every 60 seconds (interval set in init).
   * Requirement 1.3 — display date as "WEEKDAY_NAME, MONTH_NAME DD, YYYY".
   * Requirements 1.4–1.7 — salutation via setSalutation.
   * Requirement 2.3 — append name when one is saved.
   * Requirement 2.4 — omit name when none is saved.
   */
  function updateClock() {
    const now     = new Date();
    const hour    = now.getHours();
    const minutes = now.getMinutes();

    // HH:MM format (Requirement 1.1)
    const timeStr = _pad(hour) + ':' + _pad(minutes);

    // "WEEKDAY_NAME, MONTH_NAME DD, YYYY" (Requirement 1.3)
    const dayName   = DAYS[now.getDay()];
    const monthName = MONTHS[now.getMonth()];
    const day       = now.getDate();
    const year      = now.getFullYear();
    const dateStr   = dayName + ', ' + monthName + ' ' + day + ', ' + year;

    // Salutation (Requirements 1.4–1.7)
    const salutation = setSalutation(hour);

    // Build salutation line: append name if present (Requirements 2.3, 2.4)
    const salutationLine = _currentName
      ? salutation + ', ' + _currentName
      : salutation;

    // Render into #greeting (Requirement 1.1)
    const container = document.getElementById('greeting');
    if (!container) return;

    container.innerHTML =
      '<div class="greeting-time" aria-label="Current time">' + timeStr + '</div>' +
      '<div class="greeting-date" aria-label="Current date">' + dateStr + '</div>' +
      '<div class="greeting-salutation">' + salutationLine + '</div>' +
      '<div class="greeting-name-form">' +
        '<label for="greeting-name-input" class="sr-only">Your name</label>' +
        '<input' +
          ' id="greeting-name-input"' +
          ' type="text"' +
          ' class="greeting-name-input"' +
          ' placeholder="Enter your name"' +
          ' maxlength="50"' +
          ' value="' + (_currentName ? _escapeAttr(_currentName) : '') + '"' +
          ' aria-label="Enter your name"' +
        ' />' +
        '<button' +
          ' class="greeting-name-save-btn"' +
          ' data-action="save-name"' +
          ' type="button"' +
        '>Save</button>' +
        '<span class="greeting-name-error" role="alert" aria-live="polite"></span>' +
      '</div>';
  }

  /**
   * _escapeAttr(str) — escapes double-quote characters for safe
   * embedding of a value in an HTML attribute string.
   */
  function _escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/&/g, '&amp;');
  }

  /**
   * init(settings)
   * Seeds the module with any previously saved name from Settings_Store,
   * calls updateClock() immediately for the first render (Requirement 1.1),
   * then starts a 60-second interval to keep the time current (Requirement 1.2).
   *
   * Requirement 2.4 — no name shown when settings.name is null.
   * Requirement 2.7 — no name shown when storage unavailable on load.
   */
  function init(settings) {
    _currentName = (settings && settings.name) ? settings.name : null;

    // Render immediately (Requirement 1.1)
    updateClock();

    // Start 60-second refresh (Requirement 1.2)
    if (_intervalId !== null) clearInterval(_intervalId);
    _intervalId = setInterval(updateClock, 60000);
  }

  /**
   * saveName(name)
   * Validates that `name` contains 1–50 non-whitespace-only characters.
   * On valid: persists to Settings_Store (merging with existing settings)
   *           and re-renders with the new name (Requirements 2.3, 2.5).
   * On invalid: shows an inline error, does NOT save (Requirements 2.1, 2.2).
   * On storage failure: shows error, retains the previous name (Requirement 2.6).
   */
  function saveName(name) {
    const container  = document.getElementById('greeting');
    const errorEl    = container ? container.querySelector('.greeting-name-error') : null;

    // Clear any previous error
    if (errorEl) errorEl.textContent = '';

    // Validation: 1–50 chars, not whitespace-only (Requirements 2.1, 2.2)
    const trimmed = String(name).trim();
    if (trimmed.length === 0) {
      if (errorEl) errorEl.textContent = 'Name cannot be empty or contain only whitespace.';
      return;
    }
    if (trimmed.length > 50) {
      if (errorEl) errorEl.textContent = 'Name must be 50 characters or fewer.';
      return;
    }

    // Persist by merging with existing settings (Requirement 2.5)
    const existingSettings = storage.read(storage.KEYS.SETTINGS) || {};
    existingSettings.name  = trimmed;
    const success          = storage.write(storage.KEYS.SETTINGS, existingSettings);

    if (!success) {
      // Requirement 2.6 — storage failure: show error, retain previous name
      if (errorEl) {
        errorEl.textContent = 'Your name could not be saved. Please try again.';
      }
      return;
    }

    // Update in-memory state and re-render (Requirement 2.3)
    _currentName = trimmed;
    updateClock();
  }

  return { init, updateClock, setSalutation, saveName };
}());

/* =========================================================
   Delegated click / input listener for the greeting section.
   Wires [data-action="save-name"] to greeting.saveName().

   Requirements: 2.1, 2.2, 2.3, 2.5, 2.6
   ========================================================= */
document.addEventListener('click', function (event) {
  const saveBtn = event.target.closest('[data-action="save-name"]');
  if (saveBtn) {
    // Find the name input inside the same greeting form
    const form  = saveBtn.closest('.greeting-name-form');
    const input = form ? form.querySelector('.greeting-name-input') : null;
    if (input) {
      greeting.saveName(input.value);
    }
  }
});

/* =========================================================
   timer namespace
   Manages the Pomodoro countdown timer as a finite-state
   machine with four states: idle → running → paused → done.
   The #timer section is fully rendered by this module.

   Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9,
                 4.1, 4.2, 4.3, 4.4, 4.5
   ========================================================= */
const timer = (function () {
  /* ----------------------------------------------------------
     FSM states
     idle    — initialised, not yet started
     running — counting down
     paused  — stopped mid-countdown
     done    — reached 00:00
     ---------------------------------------------------------- */
  const STATE = { IDLE: 'idle', RUNNING: 'running', PAUSED: 'paused', DONE: 'done' };

  /** Module-scoped state variables */
  let _state          = STATE.IDLE;
  let _remainingSecs  = 25 * 60;    // default 25 min until init() is called
  let _durationMins   = 25;         // Timer_Duration; updated by setDuration()
  let _intervalHandle = null;       // setInterval handle

  /* ----------------------------------------------------------
     Internal helpers
     ---------------------------------------------------------- */

  /** Zero-pad a number to two digits. */
  function _pad(n) {
    return String(n).padStart(2, '0');
  }

  /** Format seconds as "MM:SS". */
  function _format(totalSecs) {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return _pad(mins) + ':' + _pad(secs);
  }

  /** Return the #timer section container, or null. */
  function _container() {
    return document.getElementById('timer');
  }

  /* ----------------------------------------------------------
     render()
     Replaces the #timer section's innerHTML with:
       - A display <div class="timer-display"> (adds .timer-done when done)
       - Start / Stop / Reset buttons
       - Duration input + Set button
       - Inline validation / error span
     ---------------------------------------------------------- */
  function _render() {
    const container = _container();
    if (!container) return;

    const displayClasses = 'timer-display' + (_state === STATE.DONE ? ' timer-done' : '');

    container.innerHTML =
      '<h2 class="timer-heading">Pomodoro Timer</h2>' +
      '<div class="' + displayClasses + '" aria-label="Timer display" aria-live="polite">' +
        _format(_remainingSecs) +
      '</div>' +
      '<div class="timer-controls">' +
        '<button class="timer-btn" data-action="timer-start" type="button" aria-label="Start timer">Start</button>' +
        '<button class="timer-btn" data-action="timer-stop"  type="button" aria-label="Stop timer">Stop</button>' +
        '<button class="timer-btn" data-action="timer-reset" type="button" aria-label="Reset timer">Reset</button>' +
      '</div>' +
      '<div class="timer-duration-form">' +
        '<label for="timer-duration-input" class="timer-duration-label">Duration (min):</label>' +
        '<input' +
          ' id="timer-duration-input"' +
          ' type="number"' +
          ' class="timer-duration-input"' +
          ' min="1"' +
          ' max="120"' +
          ' value="' + _durationMins + '"' +
          ' aria-label="Set timer duration in minutes"' +
        ' />' +
        '<button class="timer-btn timer-set-btn" data-action="set-duration" type="button">Set</button>' +
        '<span class="timer-duration-error" role="alert" aria-live="polite"></span>' +
      '</div>';
  }

  /* ----------------------------------------------------------
     _tick()
     Called every second while in the RUNNING state.
     Decrements remaining seconds and re-renders.
     When 0 is reached: stops interval, transitions to DONE,
     then re-renders with the .timer-done CSS class applied.
     Requirement 3.3, 3.6
     ---------------------------------------------------------- */
  function _tick() {
    _remainingSecs -= 1;

    if (_remainingSecs <= 0) {
      // Requirement 3.6 — stop and apply completion state
      _remainingSecs  = 0;   // guard against any negative drift
      clearInterval(_intervalHandle);
      _intervalHandle = null;
      _state          = STATE.DONE;
    }

    _render();   // single render per tick; .timer-done applied when state === DONE
  }

  /* ----------------------------------------------------------
     Public API
     ---------------------------------------------------------- */

  /**
   * init(durationMinutes)
   * Seeds the timer with the persisted (or default) duration,
   * renders the initial display, and sets state to idle.
   *
   * Requirement 3.1 — initialise to Timer_Duration minutes.
   */
  function init(durationMinutes) {
    const mins      = (typeof durationMinutes === 'number' && durationMinutes >= 1) ? durationMinutes : 25;
    _durationMins   = mins;
    _remainingSecs  = mins * 60;
    _state          = STATE.IDLE;
    if (_intervalHandle !== null) {
      clearInterval(_intervalHandle);
      _intervalHandle = null;
    }
    _render();
  }

  /**
   * start()
   * No-op if already running (Requirement 3.8).
   * Otherwise starts a 1-second interval and transitions to RUNNING.
   *
   * Requirement 3.2 — begin countdown when not already running.
   */
  function start() {
    if (_state === STATE.RUNNING) return;  // Requirement 3.8 — ignore
    _intervalHandle = setInterval(_tick, 1000);
    _state          = STATE.RUNNING;
    _render();
  }

  /**
   * stop()
   * No-op if not currently running (Requirement 3.9).
   * Otherwise clears the interval and transitions to PAUSED.
   *
   * Requirement 3.4 — pause and retain current time.
   */
  function stop() {
    if (_state !== STATE.RUNNING) return;  // Requirement 3.9 — ignore
    clearInterval(_intervalHandle);
    _intervalHandle = null;
    _state          = STATE.PAUSED;
    _render();
  }

  /**
   * reset()
   * Always valid; stops any running interval, restores
   * remaining seconds to _durationMins * 60, and transitions
   * back to IDLE.
   *
   * Requirement 3.5 — stop if running, restore display to Timer_Duration:00.
   */
  function reset() {
    if (_intervalHandle !== null) {
      clearInterval(_intervalHandle);
      _intervalHandle = null;
    }
    _remainingSecs = _durationMins * 60;
    _state         = STATE.IDLE;
    _render();
  }

  /**
   * setDuration(minutes)
   * Validates that `minutes` is an integer in [1, 120].
   * On valid:
   *   - If currently running, stops the timer first (Requirement 4.5).
   *   - Resets to the new duration (Requirement 4.2).
   *   - Persists to Settings_Store (Requirement 4.3).
   * On invalid:
   *   - Shows inline validation message (Requirement 4.4).
   *
   * Requirements 4.1, 4.2, 4.3, 4.4, 4.5
   */
  function setDuration(minutes) {
    const container = _container();
    const errorEl   = container ? container.querySelector('.timer-duration-error') : null;

    // Clear previous error
    if (errorEl) errorEl.textContent = '';

    // Validate: must be an integer in [1, 120]
    const parsed = Number(minutes);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 120) {
      if (errorEl) {
        errorEl.textContent = 'Duration must be a whole number between 1 and 120.';
      }
      return;
    }

    // Requirement 4.5 — if running, stop first
    if (_state === STATE.RUNNING) {
      clearInterval(_intervalHandle);
      _intervalHandle = null;
      _state          = STATE.PAUSED;
    }

    // Update duration and reset (Requirement 4.2)
    _durationMins  = parsed;
    _remainingSecs = parsed * 60;
    _state         = STATE.IDLE;
    _render();

    // Persist to Settings_Store (Requirement 4.3)
    const existingSettings      = storage.read(storage.KEYS.SETTINGS) || {};
    existingSettings.timerDuration = parsed;
    storage.write(storage.KEYS.SETTINGS, existingSettings);
  }

  return { init, start, stop, reset, setDuration };
}());

/* =========================================================
   Delegated click listener for timer controls.
   Wires:
     [data-action="timer-start"]  → timer.start()
     [data-action="timer-stop"]   → timer.stop()
     [data-action="timer-reset"]  → timer.reset()
     [data-action="set-duration"] → timer.setDuration(value)

   Requirements: 3.2, 3.4, 3.5, 3.7, 4.1, 4.2, 4.4
   ========================================================= */
document.addEventListener('click', function (event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;

  switch (target.getAttribute('data-action')) {
    case 'timer-start':
      timer.start();
      break;

    case 'timer-stop':
      timer.stop();
      break;

    case 'timer-reset':
      timer.reset();
      break;

    case 'set-duration': {
      const form  = target.closest('.timer-duration-form');
      const input = form ? form.querySelector('.timer-duration-input') : null;
      if (input) {
        timer.setDuration(input.value);
      }
      break;
    }

    default:
      break;
  }
});

/* =========================================================
   tasks namespace
   Manages Task CRUD: add, toggle, edit, delete, and render.
   All state is stored in the module-scoped _tasks array and
   persisted to Task_Store (localStorage) on every mutation.

   Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8,
                 5.9, 5.10, 5.11, 5.12
   ========================================================= */
const tasks = (function () {
  /** Module-scoped state */
  let _tasks = [];          // array of Task objects
  let _editingId = null;    // id of the task currently being edited (or null)

  /* ----------------------------------------------------------
     Task factory
     Creates a new Task object with a unique id, the given title,
     completed = false, and createdAt = Date.now().
     ---------------------------------------------------------- */
  function _createTask(title) {
    return {
      id:        generateId(),
      title:     title,
      completed: false,
      createdAt: Date.now(),
    };
  }

  /* ----------------------------------------------------------
     _escapeHtml(str)
     Escapes HTML special characters to prevent XSS when
     inserting user-provided text as innerHTML content.
     ---------------------------------------------------------- */
  function _escapeHtml(str) {
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;');
  }

  /* ----------------------------------------------------------
     _escapeAttr(str)
     Escapes a value for safe embedding inside an HTML attribute.
     ---------------------------------------------------------- */
  function _escapeAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  /* ----------------------------------------------------------
     _container()
     Returns the #task-list section element, or null.
     ---------------------------------------------------------- */
  function _container() {
    return document.getElementById('task-list');
  }

  /* ----------------------------------------------------------
     render()
     Replaces the #task-list container innerHTML with:
       - An add-task input + button form at the top.
       - One row per task: [checkbox] [title or <input>] [Edit] [Delete]
     When a task is in edit mode (_editingId === task.id) the
     title cell becomes a text input pre-populated with the current title.

     Requirement 5.4 — each row has: title, toggle, edit, delete.
     Requirement 5.6 — edit row shows pre-populated input.
     Requirement 5.12 — loads and renders tasks on Dashboard open.
     ---------------------------------------------------------- */
  function render() {
    const container = _container();
    if (!container) return;

    // Build add-task form
    let html =
      '<h2 class="task-list-heading">Task List</h2>' +
      '<div class="task-add-form">' +
        '<label for="task-add-input" class="sr-only">New task title</label>' +
        '<input' +
          ' id="task-add-input"' +
          ' type="text"' +
          ' class="task-add-input"' +
          ' placeholder="Add a new task…"' +
          ' maxlength="250"' +
          ' aria-label="New task title"' +
        ' />' +
        '<button' +
          ' class="task-btn task-add-btn"' +
          ' data-action="add-task"' +
          ' type="button"' +
          ' aria-label="Add task"' +
        '>Add</button>' +
        '<span class="task-add-error" role="alert" aria-live="polite"></span>' +
      '</div>';

    // Build task rows
    if (_tasks.length === 0) {
      html += '<p class="task-empty-msg">No tasks yet. Add one above!</p>';
    } else {
      html += '<ul class="task-list" aria-label="Tasks">';
      _tasks.forEach(function (task) {
        const isEditing = (_editingId === task.id);
        const checkedAttr = task.completed ? ' checked' : '';
        const itemClass   = 'task-item' + (task.completed ? ' task-item--completed' : '');

        html += '<li class="' + itemClass + '" data-task-id="' + _escapeAttr(task.id) + '">';

        // Completion toggle checkbox
        html +=
          '<input' +
            ' type="checkbox"' +
            ' class="task-toggle"' +
            ' data-action="toggle-task"' +
            ' data-id="' + _escapeAttr(task.id) + '"' +
            ' aria-label="Toggle completion for ' + _escapeAttr(task.title) + '"' +
            checkedAttr +
          ' />';

        if (isEditing) {
          // Edit mode: title becomes a text input
          html +=
            '<input' +
              ' type="text"' +
              ' class="task-edit-input"' +
              ' data-id="' + _escapeAttr(task.id) + '"' +
              ' value="' + _escapeAttr(task.title) + '"' +
              ' maxlength="250"' +
              ' aria-label="Edit task title"' +
            ' />' +
            '<span class="task-edit-error" role="alert" aria-live="polite"></span>' +
            '<button' +
              ' class="task-btn task-save-btn"' +
              ' data-action="save-edit"' +
              ' data-id="' + _escapeAttr(task.id) + '"' +
              ' type="button"' +
            '>Save</button>' +
            '<button' +
              ' class="task-btn task-cancel-btn"' +
              ' data-action="cancel-edit"' +
              ' data-id="' + _escapeAttr(task.id) + '"' +
              ' type="button"' +
            '>Cancel</button>';
        } else {
          // Normal mode: show title, Edit, Delete
          html +=
            '<span class="task-title">' + _escapeHtml(task.title) + '</span>' +
            '<button' +
              ' class="task-btn task-edit-btn"' +
              ' data-action="edit-task"' +
              ' data-id="' + _escapeAttr(task.id) + '"' +
              ' type="button"' +
              ' aria-label="Edit task ' + _escapeAttr(task.title) + '"' +
            '>Edit</button>' +
            '<button' +
              ' class="task-btn task-delete-btn"' +
              ' data-action="delete-task"' +
              ' data-id="' + _escapeAttr(task.id) + '"' +
              ' type="button"' +
              ' aria-label="Delete task ' + _escapeAttr(task.title) + '"' +
            '>Delete</button>';
        }

        html += '</li>';
      });
      html += '</ul>';
    }

    container.innerHTML = html;
  }

  /* ----------------------------------------------------------
     init(taskArray)
     Stores the provided array in the module-scoped _tasks variable
     and calls render() to display the initial list.

     Requirement 5.12 — read and render tasks on load.
     ---------------------------------------------------------- */
  function init(taskArray) {
    _tasks     = Array.isArray(taskArray) ? taskArray : [];
    _editingId = null;
    render();
  }

  /* ----------------------------------------------------------
     addTask(title)
     Validates that `title` is 1–250 non-empty (non-whitespace-only)
     characters. On valid: creates a Task, appends it, writes to
     Task_Store. On storage failure: removes the task from the
     in-memory array and shows an inline error without mutating the
     stored list. On invalid: shows an inline validation message.

     Requirements 5.1, 5.2, 5.3, 5.11
     ---------------------------------------------------------- */
  function addTask(title) {
    const container = _container();
    const errorEl   = container ? container.querySelector('.task-add-error') : null;

    // Clear previous error
    if (errorEl) errorEl.textContent = '';

    // Validation: 1–250 chars, not whitespace-only (Requirements 5.1, 5.2)
    const trimmed = String(title).trim();
    if (trimmed.length === 0) {
      if (errorEl) errorEl.textContent = 'Task title cannot be empty.';
      return;
    }
    if (trimmed.length > 250) {
      if (errorEl) errorEl.textContent = 'Task title must be 250 characters or fewer.';
      return;
    }

    // Create the Task and optimistically append (Requirement 5.3)
    const newTask = _createTask(trimmed);
    _tasks.push(newTask);

    // Persist to Task_Store (Requirement 5.3)
    const success = storage.write(storage.KEYS.TASKS, _tasks);
    if (!success) {
      // Requirement 5.11 — storage failure: roll back in-memory change
      _tasks.pop();
      render();
      // Show inline error after re-render so the element exists in the DOM
      const errEl2 = container ? container.querySelector('.task-add-error') : null;
      if (errEl2) errEl2.textContent = 'Task could not be saved. Please try again.';
      return;
    }

    // Clear the add-task input and re-render
    render();
    const addInput = container ? container.querySelector('.task-add-input') : null;
    if (addInput) addInput.value = '';
  }

  /* ----------------------------------------------------------
     toggleComplete(id)
     Finds the task with the given id, flips its `completed` flag,
     and persists. On storage failure: reverts the flip and shows
     an inline error.

     Requirement 5.5, 5.11
     ---------------------------------------------------------- */
  function toggleComplete(id) {
    const idx = _tasks.findIndex(function (t) { return t.id === id; });
    if (idx === -1) return;

    // Flip completed
    _tasks[idx].completed = !_tasks[idx].completed;

    // Persist
    const success = storage.write(storage.KEYS.TASKS, _tasks);
    if (!success) {
      // Revert on failure (Requirement 5.11)
      _tasks[idx].completed = !_tasks[idx].completed;
    }

    render();

    if (!success) {
      const container = _container();
      // Find the error element for this specific row
      const row = container ? container.querySelector('[data-task-id="' + id + '"]') : null;
      // Since there's no per-row error span in normal mode, use the add-error area
      // as a fallback inline message visible to the user
      const errEl = container ? container.querySelector('.task-add-error') : null;
      if (errEl) errEl.textContent = 'Could not save completion status. Please try again.';
    }
  }

  /* ----------------------------------------------------------
     beginEdit(id)
     Sets _editingId to the given id and re-renders just that row
     with a text input pre-populated with the current title.

     Requirement 5.6
     ---------------------------------------------------------- */
  function beginEdit(id) {
    const exists = _tasks.some(function (t) { return t.id === id; });
    if (!exists) return;
    _editingId = id;
    render();
    // Focus the edit input for accessibility
    const container = _container();
    const editInput = container ? container.querySelector('.task-edit-input[data-id="' + id + '"]') : null;
    if (editInput) {
      editInput.focus();
      // Move cursor to end
      const len = editInput.value.length;
      editInput.setSelectionRange(len, len);
    }
  }

  /* ----------------------------------------------------------
     saveEdit(id, newTitle)
     Validates that `newTitle` is 1–250 characters (not empty).
     On valid: updates the task's title in memory and persists.
     On empty / invalid: shows an inline error inside the edit row.

     Requirements 5.7, 5.8, 5.11
     ---------------------------------------------------------- */
  function saveEdit(id, newTitle) {
    const container = _container();
    const row       = container ? container.querySelector('[data-task-id="' + id + '"]') : null;
    const errorEl   = row ? row.querySelector('.task-edit-error') : null;

    // Clear previous error
    if (errorEl) errorEl.textContent = '';

    const trimmed = String(newTitle).trim();

    // Validation: must be 1–250 chars (Requirement 5.8)
    if (trimmed.length === 0) {
      if (errorEl) errorEl.textContent = 'Task title cannot be empty.';
      return;
    }
    if (trimmed.length > 250) {
      if (errorEl) errorEl.textContent = 'Task title must be 250 characters or fewer.';
      return;
    }

    const idx = _tasks.findIndex(function (t) { return t.id === id; });
    if (idx === -1) return;

    const previousTitle = _tasks[idx].title;
    _tasks[idx].title   = trimmed;

    // Persist (Requirement 5.7)
    const success = storage.write(storage.KEYS.TASKS, _tasks);
    if (!success) {
      // Revert on failure (Requirement 5.11)
      _tasks[idx].title = previousTitle;
    }

    // Exit edit mode and re-render
    _editingId = null;
    render();

    if (!success) {
      const errEl2 = container ? container.querySelector('.task-add-error') : null;
      if (errEl2) errEl2.textContent = 'Task could not be saved. Please try again.';
    }
  }

  /* ----------------------------------------------------------
     cancelEdit(id)
     Discards any unsaved input, clears _editingId, and re-renders
     the row with the original title.

     Requirement 5.9
     ---------------------------------------------------------- */
  function cancelEdit(id) {
    _editingId = null;
    render();
  }

  /* ----------------------------------------------------------
     deleteTask(id)
     Removes the task with the given id from _tasks and persists.
     On storage failure: re-inserts the task and shows an inline error.

     Requirements 5.10, 5.11
     ---------------------------------------------------------- */
  function deleteTask(id) {
    const idx = _tasks.findIndex(function (t) { return t.id === id; });
    if (idx === -1) return;

    const removed = _tasks.splice(idx, 1)[0];

    // Persist (Requirement 5.10)
    const success = storage.write(storage.KEYS.TASKS, _tasks);
    if (!success) {
      // Revert on failure (Requirement 5.11)
      _tasks.splice(idx, 0, removed);
      render();
      const container = _container();
      const errEl = container ? container.querySelector('.task-add-error') : null;
      if (errEl) errEl.textContent = 'Task could not be deleted. Please try again.';
      return;
    }

    // If we were editing the deleted task, clear edit state
    if (_editingId === id) _editingId = null;
    render();
  }

  return { init, render, addTask, toggleComplete, beginEdit, saveEdit, cancelEdit, deleteTask };
}());

/* =========================================================
   Delegated event listeners for task actions.
   All task interactions are handled via a single click listener
   (and an Enter key listener for the add-task input) on the
   document, using the data-action attribute to dispatch.

   Wires:
     data-action="add-task"     → tasks.addTask()
     data-action="toggle-task"  → tasks.toggleComplete(id)
     data-action="edit-task"    → tasks.beginEdit(id)
     data-action="save-edit"    → tasks.saveEdit(id, newTitle)
     data-action="cancel-edit"  → tasks.cancelEdit(id)
     data-action="delete-task"  → tasks.deleteTask(id)
     Enter key on add-task input → tasks.addTask()

   Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10
   ========================================================= */
document.addEventListener('click', function (event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;

  const action = target.getAttribute('data-action');

  switch (action) {
    case 'add-task': {
      const container = document.getElementById('task-list');
      const input     = container ? container.querySelector('.task-add-input') : null;
      if (input) tasks.addTask(input.value);
      break;
    }

    case 'toggle-task': {
      const id = target.getAttribute('data-id');
      if (id) tasks.toggleComplete(id);
      break;
    }

    case 'edit-task': {
      const id = target.getAttribute('data-id');
      if (id) tasks.beginEdit(id);
      break;
    }

    case 'save-edit': {
      const id        = target.getAttribute('data-id');
      const container = document.getElementById('task-list');
      const editInput = container
        ? container.querySelector('.task-edit-input[data-id="' + id + '"]')
        : null;
      if (id && editInput) tasks.saveEdit(id, editInput.value);
      break;
    }

    case 'cancel-edit': {
      const id = target.getAttribute('data-id');
      if (id) tasks.cancelEdit(id);
      break;
    }

    case 'delete-task': {
      const id = target.getAttribute('data-id');
      if (id) tasks.deleteTask(id);
      break;
    }

    default:
      break;
  }
});

/* Enter key on the add-task input triggers addTask() */
document.addEventListener('keydown', function (event) {
  if (event.key !== 'Enter') return;
  const target = event.target;
  if (target && target.classList.contains('task-add-input')) {
    tasks.addTask(target.value);
    event.preventDefault();
  }
});

/* =========================================================
   links namespace
   Manages Quick Links: add, delete, and render.
   All state is stored in the module-scoped _links array and
   persisted to Quick_Link_Store (localStorage) on every mutation.

   Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
   ========================================================= */
const links = (function () {
  /** Module-scoped state */
  let _links = [];   // array of QuickLink objects

  /* ----------------------------------------------------------
     QuickLink factory
     Creates a new QuickLink object with a unique id, the given
     label, and the given url.
     ---------------------------------------------------------- */
  function _createLink(label, url) {
    return {
      id:    generateId(),
      label: label,
      url:   url,
    };
  }

  /* ----------------------------------------------------------
     _escapeHtml(str)
     Escapes HTML special characters to prevent XSS when
     inserting user-provided text as innerHTML content.
     ---------------------------------------------------------- */
  function _escapeHtml(str) {
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;');
  }

  /* ----------------------------------------------------------
     _escapeAttr(str)
     Escapes a value for safe embedding inside an HTML attribute.
     ---------------------------------------------------------- */
  function _escapeAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  /* ----------------------------------------------------------
     _container()
     Returns the #quick-links section element, or null.
     ---------------------------------------------------------- */
  function _container() {
    return document.getElementById('quick-links');
  }

  /* ----------------------------------------------------------
     render()
     Replaces the #quick-links container innerHTML with:
       - A heading.
       - An add-link form (label input + url input + Add button).
       - A grid of link items, each with an open button and a
         delete button.
       - An empty-state message when no links exist.

     Requirements 6.4, 6.5, 6.6, 6.7
     ---------------------------------------------------------- */
  function render() {
    const container = _container();
    if (!container) return;

    // Build add-link form
    let html =
      '<h2 class="links-heading">Quick Links</h2>' +
      '<div class="link-add-form">' +
        '<div>' +
          '<label for="link-label-input">Label</label>' +
          '<input' +
            ' id="link-label-input"' +
            ' type="text"' +
            ' class="link-label-input"' +
            ' placeholder="e.g. GitHub"' +
            ' maxlength="50"' +
            ' aria-label="Quick link label"' +
          ' />' +
          '<span class="link-label-error validation-error" role="alert" aria-live="polite"></span>' +
        '</div>' +
        '<div>' +
          '<label for="link-url-input">URL</label>' +
          '<input' +
            ' id="link-url-input"' +
            ' type="url"' +
            ' class="link-url-input"' +
            ' placeholder="https://example.com"' +
            ' aria-label="Quick link URL"' +
          ' />' +
          '<span class="link-url-error validation-error" role="alert" aria-live="polite"></span>' +
        '</div>' +
        '<button' +
          ' class="link-add-btn"' +
          ' data-action="add-link"' +
          ' type="button"' +
          ' aria-label="Add quick link"' +
        '>Add</button>' +
        '<span class="link-form-error storage-error" role="alert" aria-live="polite" style="display:none;"></span>' +
      '</div>';

    // Build link items
    if (_links.length === 0) {
      html += '<p class="empty-state">No quick links yet. Add one above!</p>';
    } else {
      html += '<div class="link-grid">';
      _links.forEach(function (link) {
        html +=
          '<span class="link-item">' +
            '<button' +
              ' class="link-open-btn"' +
              ' data-action="open-link"' +
              ' data-url="' + _escapeAttr(link.url) + '"' +
              ' data-id="' + _escapeAttr(link.id) + '"' +
              ' type="button"' +
              ' aria-label="Open ' + _escapeAttr(link.label) + ' in a new tab"' +
            '>' + _escapeHtml(link.label) + '</button>' +
            '<button' +
              ' class="btn-icon"' +
              ' data-action="delete-link"' +
              ' data-id="' + _escapeAttr(link.id) + '"' +
              ' type="button"' +
              ' aria-label="Delete ' + _escapeAttr(link.label) + '"' +
            '>✕</button>' +
          '</span>';
      });
      html += '</div>';
    }

    container.innerHTML = html;
  }

  /* ----------------------------------------------------------
     init(linkArray)
     Stores the provided array in the module-scoped _links variable
     and calls render() to display the initial list.

     Requirement 6.7 — read and render links on load.
     ---------------------------------------------------------- */
  function init(linkArray) {
    _links = Array.isArray(linkArray) ? linkArray : [];
    render();
  }

  /* ----------------------------------------------------------
     addLink(label, url)
     Validates:
       - label is 1–50 non-whitespace-only characters (Requirement 6.1, 6.2)
       - url starts with http:// or https:// followed by ≥1 character (Requirement 6.2)
       - total link count is < 50 (Requirement 6.1)
     On valid: creates a QuickLink, appends it, writes to Quick_Link_Store.
     On storage failure: rolls back in-memory change, shows inline error,
       and retains the form values (Requirement 6.3).
     On invalid: shows inline validation message per field (Requirement 6.2).

     Requirements 6.1, 6.2, 6.3
     ---------------------------------------------------------- */
  function addLink(label, url) {
    const container = _container();

    // We need to resolve error elements after a potential re-render, so
    // read form values now (they might come from the caller) and clear
    // existing errors. We'll show errors by re-querying after render.
    let hasError = false;

    const trimmedLabel = String(label).trim();
    const trimmedUrl   = String(url).trim();

    // Validate: count cap first (no point showing field errors if capped)
    if (_links.length >= 50) {
      // Re-render to refresh any stale state, then show the error
      render();
      const formError = container ? container.querySelector('.link-form-error') : null;
      if (formError) {
        formError.textContent = 'Maximum of 50 quick links reached.';
        formError.style.display = '';
      }
      // Restore form values
      _restoreFormValues(container, label, url);
      return;
    }

    // Validate label (Requirement 6.2)
    if (trimmedLabel.length === 0 || trimmedLabel.length > 50) {
      hasError = true;
    }

    // Validate url: must start with http:// or https:// + at least 1 char
    const urlValid = /^https?:\/\/.+/.test(trimmedUrl);
    if (!urlValid) {
      hasError = true;
    }

    if (hasError) {
      // Show per-field validation messages without re-rendering (keep form values)
      // Get fresh references to error spans
      const labelError = container ? container.querySelector('.link-label-error') : null;
      const urlError   = container ? container.querySelector('.link-url-error')   : null;

      if (labelError) labelError.textContent = '';
      if (urlError)   urlError.textContent   = '';

      if (trimmedLabel.length === 0) {
        if (labelError) labelError.textContent = 'Label cannot be empty.';
      } else if (trimmedLabel.length > 50) {
        if (labelError) labelError.textContent = 'Label must be 50 characters or fewer.';
      }

      if (!urlValid) {
        if (urlError) urlError.textContent = 'URL must start with http:// or https://.';
      }
      return;
    }

    // Optimistically add the link
    const newLink = _createLink(trimmedLabel, trimmedUrl);
    _links.push(newLink);

    // Persist to Quick_Link_Store (Requirement 6.3)
    const success = storage.write(storage.KEYS.LINKS, _links);
    if (!success) {
      // Requirement 6.3 — storage failure: roll back in-memory change
      _links.pop();
      // Re-render so the DOM is clean, then show error and restore form values
      render();
      const formError = container ? container.querySelector('.link-form-error') : null;
      if (formError) {
        formError.textContent = 'Link could not be saved. Please try again.';
        formError.style.display = '';
      }
      _restoreFormValues(container, label, url);
      return;
    }

    // Success — re-render (clears the form as part of a fresh render)
    render();
  }

  /* ----------------------------------------------------------
     _restoreFormValues(container, label, url)
     After a render() call resets the form, re-populates the label
     and URL inputs with the values the user had entered so they
     don't lose their work on a storage failure.
     ---------------------------------------------------------- */
  function _restoreFormValues(container, label, url) {
    if (!container) return;
    const labelInput = container.querySelector('.link-label-input');
    const urlInput   = container.querySelector('.link-url-input');
    if (labelInput) labelInput.value = label;
    if (urlInput)   urlInput.value   = url;
  }

  /* ----------------------------------------------------------
     deleteLink(id)
     Removes the link with the given id from _links and persists.
     On storage failure: re-inserts the link and shows an inline error,
     retaining the link in the displayed list (Requirement 6.6).

     Requirements 6.6
     ---------------------------------------------------------- */
  function deleteLink(id) {
    const idx = _links.findIndex(function (l) { return l.id === id; });
    if (idx === -1) return;

    const removed = _links.splice(idx, 1)[0];

    // Persist to Quick_Link_Store (Requirement 6.6)
    const success = storage.write(storage.KEYS.LINKS, _links);
    if (!success) {
      // Revert on failure — re-insert in original position
      _links.splice(idx, 0, removed);
      render();
      const container = _container();
      const formError = container ? container.querySelector('.link-form-error') : null;
      if (formError) {
        formError.textContent = 'Link could not be deleted. Please try again.';
        formError.style.display = '';
      }
      return;
    }

    render();
  }

  return { init, render, addLink, deleteLink };
}());

/* =========================================================
   Delegated event listeners for quick links actions.
   Wires:
     data-action="add-link"    → links.addLink(label, url)
     data-action="open-link"   → window.open(url, '_blank')
     data-action="delete-link" → links.deleteLink(id)

   Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   ========================================================= */
document.addEventListener('click', function (event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;

  const action = target.getAttribute('data-action');

  switch (action) {
    case 'add-link': {
      const container  = document.getElementById('quick-links');
      const labelInput = container ? container.querySelector('.link-label-input') : null;
      const urlInput   = container ? container.querySelector('.link-url-input')   : null;
      if (labelInput && urlInput) {
        links.addLink(labelInput.value, urlInput.value);
      }
      break;
    }

    case 'open-link': {
      // Requirement 6.5 — open URL in a new tab
      const url = target.getAttribute('data-url');
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      break;
    }

    case 'delete-link': {
      const id = target.getAttribute('data-id');
      if (id) links.deleteLink(id);
      break;
    }

    default:
      break;
  }
});

/* =========================================================
   init()
   Bootstrap function — called once when the DOM is ready.

   Reads persisted settings, applies the saved theme before any
   other module renders (Requirement 7.4), then initialises each
   module in dependency order.

   Requirements: 8.1, 8.2, 8.3, 8.5, 9.4, 9.5
   ========================================================= */
function init() {
  /* ----------------------------------------------------------
     1. Load settings — fall back to defaults when nothing is
        stored or the stored object is missing expected fields.

     Requirement 8.3 — restore settings on load.
     Requirement 8.5 — handle storage unavailability gracefully.
     ---------------------------------------------------------- */
  const DEFAULT_SETTINGS = { theme: 'light', name: null, timerDuration: 25 };

  const rawSettings = storage.read(storage.KEYS.SETTINGS);
  const settings = {
    theme:         (rawSettings && rawSettings.theme)         || DEFAULT_SETTINGS.theme,
    name:          (rawSettings && rawSettings.name  != null) ? rawSettings.name : DEFAULT_SETTINGS.name,
    timerDuration: (rawSettings && rawSettings.timerDuration) || DEFAULT_SETTINGS.timerDuration,
  };

  /* ----------------------------------------------------------
     2. Apply theme FIRST — before any module renders — so the
        correct colour scheme is in place before the first paint.

     Requirement 7.4 — apply saved theme before paint.
     ---------------------------------------------------------- */
  theme.init(settings.theme);

  /* ----------------------------------------------------------
     3. Initialise remaining modules in order.

     Requirement 8.1 — render greeting on load.
     Requirement 8.2 — render timer on load.
     Requirement 8.3 — restore and render tasks and links on load.
     ---------------------------------------------------------- */
  greeting.init(settings);
  timer.init(settings.timerDuration);
  tasks.init(storage.read(storage.KEYS.TASKS) ?? []);
  links.init(storage.read(storage.KEYS.LINKS) ?? []);
}

/* =========================================================
   Bind init() to DOMContentLoaded.
   All delegated event listeners are already attached above;
   init() only bootstraps module state.

   Requirements: 9.4, 9.5
   ========================================================= */
document.addEventListener('DOMContentLoaded', init);
