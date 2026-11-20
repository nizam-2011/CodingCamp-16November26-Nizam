/* =============================================
   FOCUS DASHBOARD — app.js
   Features:
     - Clock & date display
     - Greeting based on time of day
     - Challenge: Custom name in greeting
     - Challenge: Light / Dark mode toggle
     - Focus timer (25 min default)
     - Challenge: Change Pomodoro time
     - To-Do list (add, edit, done, delete)
     - Challenge: Prevent duplicate tasks
     - Challenge: Sort tasks
     - Quick Links (add, delete, localStorage)
   ============================================= */

'use strict';

/* --------------------------------------------------
   UTILITY
-------------------------------------------------- */
function $(id) { return document.getElementById(id); }

function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* --------------------------------------------------
   LOCAL STORAGE HELPERS
-------------------------------------------------- */
const LS = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
};

/* --------------------------------------------------
   THEME  (Challenge: Light / Dark mode)
-------------------------------------------------- */
const themeToggle = $('theme-toggle');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  LS.set('theme', theme);
}

function initTheme() {
  const saved = LS.get('theme', 'light');
  applyTheme(saved);
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* --------------------------------------------------
   CLOCK, DATE & GREETING
-------------------------------------------------- */
const clockEl    = $('clock');
const greetingEl = $('greeting-text');
const dateEl     = $('date-text');

function getGreetingWord(hour) {
  if (hour >= 5  && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

function updateClock() {
  const now    = new Date();
  const hour   = now.getHours();
  const min    = String(now.getMinutes()).padStart(2, '0');
  const sec    = String(now.getSeconds()).padStart(2, '0');
  const ampm   = hour >= 12 ? 'PM' : 'AM';
  const h12    = hour % 12 || 12;

  clockEl.textContent = `${String(h12).padStart(2,'0')}:${min}:${sec} ${ampm}`;

  const name = LS.get('userName', '');
  const nameStr = name ? `, ${name}` : '!';
  greetingEl.textContent = `${getGreetingWord(hour)}${nameStr}${name ? '!' : ''}`;

  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  dateEl.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

setInterval(updateClock, 1000);
updateClock();

/* --------------------------------------------------
   CUSTOM NAME  (Challenge: Custom name in greeting)
-------------------------------------------------- */
const nameInput = $('name-input');
const nameSave  = $('name-save');

function initName() {
  const saved = LS.get('userName', '');
  nameInput.value = saved;
}

nameSave.addEventListener('click', () => {
  const name = nameInput.value.trim();
  LS.set('userName', name);
  updateClock();
  showToast(name ? `Name set to "${name}"` : 'Name cleared');
});

nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') nameSave.click();
});

/* --------------------------------------------------
   FOCUS TIMER  (Challenge: Change Pomodoro time)
-------------------------------------------------- */
const timerDisplay   = $('timer-display');
const timerStart     = $('timer-start');
const timerStop      = $('timer-stop');
const timerReset     = $('timer-reset');
const pomodoroInput  = $('pomodoro-minutes');
const applyTimeBtn   = $('apply-time');

let timerInterval  = null;
let totalSeconds   = 25 * 60;
let remainSeconds  = totalSeconds;
let timerRunning   = false;

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderTimer() {
  timerDisplay.textContent = formatTime(remainSeconds);
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  timerDisplay.classList.add('running');
  timerStart.disabled = true;

  timerInterval = setInterval(() => {
    remainSeconds--;
    renderTimer();
    if (remainSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerDisplay.classList.remove('running');
      timerStart.disabled = false;
      showToast('⏰ Focus session complete!');
    }
  }, 1000);
}

function stopTimer() {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerRunning = false;
  timerDisplay.classList.remove('running');
  timerStart.disabled = false;
}

function resetTimer() {
  stopTimer();
  remainSeconds = totalSeconds;
  renderTimer();
}

applyTimeBtn.addEventListener('click', () => {
  const mins = parseInt(pomodoroInput.value, 10);
  if (isNaN(mins) || mins < 1 || mins > 90) {
    showToast('Enter a value between 1 and 90 minutes');
    return;
  }
  stopTimer();
  totalSeconds  = mins * 60;
  remainSeconds = totalSeconds;
  renderTimer();
  showToast(`Timer set to ${mins} minute${mins !== 1 ? 's' : ''}`);
});

timerStart.addEventListener('click', startTimer);
timerStop.addEventListener('click', stopTimer);
timerReset.addEventListener('click', resetTimer);

renderTimer();

/* --------------------------------------------------
   TO-DO LIST
   Challenges: Prevent duplicate tasks, Sort tasks
-------------------------------------------------- */
const todoInput  = $('todo-input');
const todoAddBtn = $('todo-add');
const todoList   = $('todo-list');
const sortSelect = $('sort-select');

// Modal
const editModal  = $('edit-modal');
const editInput  = $('edit-input');
const editSave   = $('edit-save');
const editCancel = $('edit-cancel');
let   editingId  = null;

function loadTasks() {
  return LS.get('tasks', []);
}

function saveTasks(tasks) {
  LS.set('tasks', tasks);
}

function getSortedTasks(tasks) {
  const mode = sortSelect.value;
  const copy = [...tasks];
  if (mode === 'az')   return copy.sort((a, b) => a.text.localeCompare(b.text));
  if (mode === 'za')   return copy.sort((a, b) => b.text.localeCompare(a.text));
  if (mode === 'done') return copy.sort((a, b) => Number(a.done) - Number(b.done));
  return copy; // default: insertion order
}

function renderTasks() {
  const tasks  = loadTasks();
  const sorted = getSortedTasks(tasks);
  todoList.innerHTML = '';

  if (sorted.length === 0) {
    todoList.innerHTML = '<li style="color:var(--text-muted);font-size:.9rem;text-align:center;padding:16px 0;">No tasks yet. Add one above!</li>';
    return;
  }

  sorted.forEach((task) => {
    const li = document.createElement('li');
    li.className = `todo-item${task.done ? ' done' : ''}`;
    li.dataset.id = task.id;

    const checkbox = document.createElement('input');
    checkbox.type    = 'checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => toggleTask(task.id));

    const span = document.createElement('span');
    span.className   = 'todo-text';
    span.textContent = task.text;

    const actions = document.createElement('div');
    actions.className = 'todo-actions';

    const editBtn = document.createElement('button');
    editBtn.className   = 'btn-edit';
    editBtn.textContent = '✏️';
    editBtn.title       = 'Edit task';
    editBtn.addEventListener('click', () => openEditModal(task.id));

    const delBtn = document.createElement('button');
    delBtn.className   = 'btn-danger';
    delBtn.textContent = '🗑️';
    delBtn.title       = 'Delete task';
    delBtn.addEventListener('click', () => deleteTask(task.id));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(actions);
    todoList.appendChild(li);
  });
}

function addTask(text) {
  text = text.trim();
  if (!text) { showToast('Task cannot be empty'); return; }

  // Challenge: Prevent duplicate tasks (case-insensitive)
  const tasks = loadTasks();
  const duplicate = tasks.some(t => t.text.toLowerCase() === text.toLowerCase());
  if (duplicate) {
    showToast('This task already exists!');
    return;
  }

  tasks.push({ id: Date.now(), text, done: false });
  saveTasks(tasks);
  renderTasks();
}

function toggleTask(id) {
  const tasks = loadTasks();
  const task  = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    saveTasks(tasks);
    renderTasks();
  }
}

function deleteTask(id) {
  const tasks = loadTasks().filter(t => t.id !== id);
  saveTasks(tasks);
  renderTasks();
}

function openEditModal(id) {
  const task = loadTasks().find(t => t.id === id);
  if (!task) return;
  editingId          = id;
  editInput.value    = task.text;
  editModal.classList.remove('hidden');
  editInput.focus();
}

function closeEditModal() {
  editingId = null;
  editModal.classList.add('hidden');
}

function saveEdit() {
  const newText = editInput.value.trim();
  if (!newText) { showToast('Task cannot be empty'); return; }

  const tasks = loadTasks();

  // Prevent duplicate on edit too
  const duplicate = tasks.some(t => t.id !== editingId && t.text.toLowerCase() === newText.toLowerCase());
  if (duplicate) { showToast('A task with that name already exists!'); return; }

  const task = tasks.find(t => t.id === editingId);
  if (task) {
    task.text = newText;
    saveTasks(tasks);
    renderTasks();
    closeEditModal();
  }
}

todoAddBtn.addEventListener('click', () => {
  addTask(todoInput.value);
  todoInput.value = '';
});

todoInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { addTask(todoInput.value); todoInput.value = ''; }
});

sortSelect.addEventListener('change', renderTasks);

editSave.addEventListener('click', saveEdit);
editCancel.addEventListener('click', closeEditModal);
editInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveEdit(); });

editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});

/* --------------------------------------------------
   QUICK LINKS
-------------------------------------------------- */
const linkNameInput = $('link-name-input');
const linkUrlInput  = $('link-url-input');
const linkAddBtn    = $('link-add');
const linksGrid     = $('links-grid');

function loadLinks() { return LS.get('links', []); }
function saveLinks(links) { LS.set('links', links); }

function renderLinks() {
  const links = loadLinks();
  linksGrid.innerHTML = '';

  if (links.length === 0) {
    linksGrid.innerHTML = '<p style="color:var(--text-muted);font-size:.9rem;">No links yet. Add one above!</p>';
    return;
  }

  links.forEach((link) => {
    const chip = document.createElement('div');
    chip.style.display = 'inline-flex';
    chip.style.alignItems = 'center';
    chip.style.gap = '4px';

    const a = document.createElement('a');
    a.className   = 'link-chip';
    a.href        = link.url;
    a.target      = '_blank';
    a.rel         = 'noopener noreferrer';
    a.textContent = link.name;

    const removeBtn = document.createElement('button');
    removeBtn.className   = 'link-chip-remove';
    removeBtn.textContent = '✕';
    removeBtn.title       = 'Remove link';
    removeBtn.addEventListener('click', () => deleteLink(link.id));

    // Append remove button inside the chip for clean layout
    a.appendChild(removeBtn);
    chip.appendChild(a);
    linksGrid.appendChild(chip);
  });
}

function addLink(name, url) {
  name = name.trim();
  url  = url.trim();
  if (!name) { showToast('Please enter a label'); return; }
  if (!url)  { showToast('Please enter a URL'); return; }

  // Ensure URL has a scheme
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  const links = loadLinks();
  links.push({ id: Date.now(), name, url });
  saveLinks(links);
  renderLinks();
}

function deleteLink(id) {
  const links = loadLinks().filter(l => l.id !== id);
  saveLinks(links);
  renderLinks();
}

linkAddBtn.addEventListener('click', () => {
  addLink(linkNameInput.value, linkUrlInput.value);
  linkNameInput.value = '';
  linkUrlInput.value  = '';
});

linkUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') linkAddBtn.click();
});

/* --------------------------------------------------
   INIT
-------------------------------------------------- */
function init() {
  initTheme();
  initName();
  renderTasks();
  renderLinks();
}

init();
