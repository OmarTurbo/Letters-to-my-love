import {
  ApiError,
  createLetter,
  deleteLetter,
  deleteReply,
  getLetters,
  getReplies,
  updateLetter,
  verifyPassword
} from '../services/lettersApi.js';
import { localDateISO } from './dashboardDate.js';

const PASSWORD_KEY = 'letters-admin-password';
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const passwordInput = document.getElementById('password');
const list = document.getElementById('letter-list');
const status = document.getElementById('status');
const editor = document.getElementById('editor');
const form = document.getElementById('letter-form');
const formError = document.getElementById('form-error');
const newButton = document.getElementById('new-letter');
const count = document.getElementById('letter-count');
const titleInput = document.getElementById('title');
const dateInput = document.getElementById('date');
const contentInput = document.getElementById('content');
const idInput = document.getElementById('letter-id');

let currentLetters = [];

function today() { return localDateISO(); }
function savedPassword() { return sessionStorage.getItem(PASSWORD_KEY); }
function setStatus(message) { status.textContent = message; }

function showLogin(message = '') {
  loginView.hidden = false;
  dashboardView.hidden = true;
  newButton.hidden = true;
  loginError.textContent = message;
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
  newButton.hidden = false;
}

function handleUnauthorized(error) {
  if (error instanceof ApiError && error.status === 401) {
    sessionStorage.removeItem(PASSWORD_KEY);
    showLogin('Your session expired. Enter the password again.');
    return true;
  }
  return false;
}

function renderLetters() {
  list.replaceChildren();
  count.textContent = String(currentLetters.length);

  if (!currentLetters.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No letters yet. Write the first one.';
    list.appendChild(empty);
    return;
  }

  [...currentLetters].reverse().forEach((letter) => {
    const card = document.createElement('article');
    card.className = 'letter-card';
    const info = document.createElement('div');
    const heading = document.createElement('h3');
    heading.textContent = letter.title;
    const meta = document.createElement('p');
    meta.className = 'letter-meta';
    meta.textContent = letter.date;
    const preview = document.createElement('p');
    preview.className = 'letter-preview';
    preview.textContent = letter.content.replace(/\s+/g, ' ').trim().slice(0, 120);
    info.append(heading, meta, preview);
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const edit = document.createElement('button');
    edit.className = 'button button-ghost';
    edit.type = 'button';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => openEditor(letter));
    const remove = document.createElement('button');
    remove.className = 'button button-ghost';
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.addEventListener('click', () => removeLetter(letter, remove));
    const repliesButton = document.createElement('button');
    repliesButton.className = 'button button-ghost';
    repliesButton.type = 'button';
    repliesButton.textContent = 'Replies';
    const repliesPanel = document.createElement('div');
    repliesPanel.className = 'dashboard-replies';
    repliesPanel.hidden = true;
    repliesButton.addEventListener('click', async () => {
      repliesPanel.hidden = !repliesPanel.hidden;
      if (repliesPanel.hidden) return;
      repliesPanel.textContent = 'Loading replies…';
      try {
        const replies = await getReplies(letter.id);
        repliesPanel.replaceChildren();
        if (!replies.length) repliesPanel.textContent = 'No replies yet.';
        replies.forEach((reply) => {
          const row = document.createElement('div');
          row.className = 'dashboard-reply';
          const text = document.createElement('span');
          text.textContent = `${reply.authorName}: ${reply.message}`;
          const deleteButton = document.createElement('button');
          deleteButton.className = 'button button-ghost';
          deleteButton.type = 'button';
          deleteButton.textContent = 'Delete';
          deleteButton.addEventListener('click', async () => {
            deleteButton.disabled = true;
            try {
              await deleteReply(letter.id, reply.id, savedPassword());
              row.remove();
              setStatus('Reply deleted.');
            } catch (error) {
              if (!handleUnauthorized(error)) setStatus(error.message || 'Could not delete reply.');
              deleteButton.disabled = false;
            }
          });
          row.append(text, deleteButton);
          repliesPanel.appendChild(row);
        });
      } catch (error) {
        repliesPanel.textContent = error.message || 'Could not load replies.';
      }
    });
    actions.append(repliesButton);
    actions.append(edit, remove);
    card.append(info, actions, repliesPanel);
    list.appendChild(card);
  });
}

async function loadLetters() {
  list.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  list.setAttribute('aria-busy', 'true');
  setStatus('Loading letters…');
  try {
    currentLetters = await getLetters();
    renderLetters();
    setStatus('');
  } catch (error) {
    if (handleUnauthorized(error)) return;
    setStatus(error.message || 'Could not load letters.');
    const retry = document.createElement('button');
    retry.className = 'button button-ghost';
    retry.type = 'button';
    retry.textContent = 'Retry';
    retry.addEventListener('click', loadLetters);
    list.replaceChildren(retry);
  } finally {
    list.removeAttribute('aria-busy');
  }
}

function openEditor(letter = null) {
  form.reset();
  formError.textContent = '';
  idInput.value = letter?.id ?? '';
  titleInput.value = letter?.title ?? '';
  dateInput.value = letter?.dateISO ?? today();
  contentInput.value = letter?.content ?? '';
  document.getElementById('editor-title').textContent = letter ? 'Edit a letter' : 'Write a letter';
  editor.hidden = false;
  titleInput.focus();
}

function closeEditor() { editor.hidden = true; }

async function removeLetter(letter, button) {
  if (!window.confirm(`Delete "${letter.title}"? This cannot be undone.`)) return;
  button.disabled = true;
  try {
    await deleteLetter(letter.id, savedPassword());
    await loadLetters();
    setStatus('Letter deleted.');
  } catch (error) {
    if (!handleUnauthorized(error)) setStatus(error.message || 'Could not delete letter.');
  } finally {
    button.disabled = false;
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector('button');
  button.disabled = true;
  loginError.textContent = '';
  try {
    await verifyPassword(passwordInput.value);
    sessionStorage.setItem(PASSWORD_KEY, passwordInput.value);
    passwordInput.value = '';
    showDashboard();
    await loadLetters();
  } catch (error) {
    loginError.textContent = error.message || 'Could not open the dashboard.';
  } finally { button.disabled = false; }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formError.textContent = '';
  if (!titleInput.value.trim() || !contentInput.value.trim() || !dateInput.value) {
    formError.textContent = 'Title, date, and letter content are required.';
    return;
  }
  const button = document.getElementById('save-letter');
  button.disabled = true;
  const data = { title: titleInput.value, content: contentInput.value, date: dateInput.value };
  try {
    const saved = idInput.value
      ? await updateLetter(idInput.value, data, savedPassword())
      : await createLetter(data, savedPassword());
    closeEditor();
    await loadLetters();
    const action = idInput.value ? 'Letter updated.' : 'Letter saved.';
    setStatus(saved?.notification?.status === 'failed'
      ? `${action} Notification could not be sent.`
      : action);
  } catch (error) {
    if (!handleUnauthorized(error)) formError.textContent = error.message || 'Could not save letter.';
  } finally { button.disabled = false; }
});

newButton.addEventListener('click', () => openEditor());
document.getElementById('cancel-editor').addEventListener('click', closeEditor);
document.getElementById('lock-dashboard').addEventListener('click', () => {
  sessionStorage.removeItem(PASSWORD_KEY);
  closeEditor();
  showLogin();
  passwordInput.focus();
});

const existingPassword = savedPassword();
if (existingPassword) {
  verifyPassword(existingPassword)
    .then(() => { showDashboard(); return loadLetters(); })
    .catch(() => { sessionStorage.removeItem(PASSWORD_KEY); showLogin(); });
} else {
  showLogin();
}
