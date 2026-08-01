const STORAGE_KEY = 'todo-list-items';

const todoForm = document.getElementById('todoForm');
const todoText = document.getElementById('todoText');
const todoDueDate = document.getElementById('todoDueDate');
const todoCategory = document.getElementById('todoCategory');
const todoPriority = document.getElementById('todoPriority');
const todoRepeat = document.getElementById('todoRepeat');
const todoList = document.getElementById('todoList');
const progressText = document.getElementById('progressText');
const progressBarFill = document.getElementById('progressBarFill');
const searchText = document.getElementById('searchText');
const categoryFilter = document.getElementById('categoryFilter');
const sortBy = document.getElementById('sortBy');
const darkModeToggle = document.getElementById('darkModeToggle');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

const THEME_KEY = 'todo-list-theme';

let todos = loadTodos();

function loadTodos() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function addTodo(text, dueDate, category, priority, repeat) {
  todos.push({
    id: generateId(),
    text,
    dueDate: dueDate || null,
    category: category.trim(),
    priority,
    repeat: repeat || 'none',
    completed: false,
    createdAt: Date.now(),
  });
  saveTodos();
  render();
}

function nextDueDate(dueDate, repeat) {
  const date = new Date(dueDate);
  if (repeat === 'daily') date.setDate(date.getDate() + 1);
  if (repeat === 'weekly') date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function updateTodo(id, changes) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  Object.assign(todo, changes);
  saveTodos();
  render();
}

function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  saveTodos();
  render();
}

function toggleComplete(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  todo.completed = !todo.completed;

  if (todo.completed && todo.repeat && todo.repeat !== 'none' && todo.dueDate) {
    todos.push({
      id: generateId(),
      text: todo.text,
      dueDate: nextDueDate(todo.dueDate, todo.repeat),
      category: todo.category,
      priority: todo.priority,
      repeat: todo.repeat,
      completed: false,
      createdAt: Date.now(),
    });
  }

  saveTodos();
  render();
}

function getVisibleTodos() {
  const filterValue = categoryFilter.value.trim().toLowerCase();
  const searchValue = searchText.value.trim().toLowerCase();

  let list = todos.slice();
  if (filterValue) {
    list = list.filter((t) => t.category.toLowerCase().includes(filterValue));
  }
  if (searchValue) {
    list = list.filter((t) => t.text.toLowerCase().includes(searchValue));
  }

  const priorityRank = { high: 0, medium: 1, low: 2 };
  const sortField = sortBy.value;

  list.sort((a, b) => {
    if (sortField === 'dueDate') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    if (sortField === 'priority') {
      return priorityRank[a.priority] - priorityRank[b.priority];
    }
    return a.createdAt - b.createdAt;
  });

  return list;
}

function render() {
  const visible = getVisibleTodos();
  todoList.innerHTML = '';

  if (visible.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = '할 일이 없습니다. 새 할 일을 추가해보세요.';
    todoList.appendChild(empty);
  } else {
    visible.forEach((todo) => todoList.appendChild(renderTodoItem(todo)));
  }

  const completedCount = todos.filter((t) => t.completed).length;
  progressText.textContent = todos.length
    ? `${completedCount} / ${todos.length}개 완료`
    : '';
  progressBarFill.style.width = todos.length
    ? `${Math.round((completedCount / todos.length) * 100)}%`
    : '0%';
}

function renderTodoItem(todo) {
  const li = document.createElement('li');
  li.className = 'todo-item';
  if (todo.completed) li.classList.add('completed');
  if (isOverdue(todo)) li.classList.add('overdue');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.completed;
  checkbox.addEventListener('change', () => toggleComplete(todo.id));

  const main = document.createElement('div');
  main.className = 'todo-main';

  const textEl = document.createElement('div');
  textEl.className = 'todo-text';
  textEl.textContent = todo.text;

  const meta = document.createElement('div');
  meta.className = 'todo-meta';
  meta.appendChild(makeBadge(priorityLabel(todo.priority), `priority-${todo.priority}`));
  if (todo.category) {
    meta.appendChild(makeBadge(todo.category));
  }
  if (todo.dueDate) {
    const dueBadge = makeBadge(`마감 ${todo.dueDate}`, isDueSoon(todo) ? 'due-soon' : '');
    meta.appendChild(dueBadge);
  }
  if (todo.repeat && todo.repeat !== 'none') {
    meta.appendChild(makeBadge(`🔁 ${repeatLabel(todo.repeat)}`));
  }

  main.appendChild(textEl);
  main.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'todo-actions';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.textContent = '수정';
  editBtn.addEventListener('click', () => startEdit(todo));

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.textContent = '삭제';
  deleteBtn.addEventListener('click', () => {
    if (confirm('이 할 일을 삭제할까요?')) deleteTodo(todo.id);
  });

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  li.appendChild(checkbox);
  li.appendChild(main);
  li.appendChild(actions);

  return li;
}

function makeBadge(label, extraClass) {
  const span = document.createElement('span');
  span.className = extraClass ? `badge ${extraClass}` : 'badge';
  span.textContent = label;
  return span;
}

function priorityLabel(priority) {
  return { high: '높음', medium: '보통', low: '낮음' }[priority] || priority;
}

function repeatLabel(repeat) {
  return { daily: '매일', weekly: '매주' }[repeat] || repeat;
}

function isOverdue(todo) {
  if (!todo.dueDate || todo.completed) return false;
  return todo.dueDate < todayString();
}

function isDueSoon(todo) {
  if (!todo.dueDate || todo.completed) return false;
  const diffDays = (new Date(todo.dueDate) - new Date(todayString())) / 86400000;
  return diffDays <= 1;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function startEdit(todo) {
  const newText = prompt('할 일 내용을 수정하세요', todo.text);
  if (newText === null) return;
  const trimmed = newText.trim();
  if (!trimmed) return;
  updateTodo(todo.id, { text: trimmed });
}

todoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = todoText.value.trim();
  if (!text) return;

  addTodo(text, todoDueDate.value, todoCategory.value, todoPriority.value, todoRepeat.value);

  todoForm.reset();
  todoPriority.value = 'medium';
  todoRepeat.value = 'none';
  todoText.focus();
});

searchText.addEventListener('input', render);
categoryFilter.addEventListener('input', render);
sortBy.addEventListener('change', render);

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  darkModeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, theme);
}

darkModeToggle.addEventListener('click', () => {
  const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

applyTheme(
  localStorage.getItem(THEME_KEY) ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
);

exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(todos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `todo-list-${todayString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => importFile.click());

importFile.addEventListener('change', () => {
  const file = importFile.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) throw new Error('invalid format');
      todos = imported;
      saveTodos();
      render();
    } catch (err) {
      alert('올바른 JSON 파일이 아닙니다.');
    }
  };
  reader.readAsText(file);
  importFile.value = '';
});

function checkReminders() {
  if (!('Notification' in window)) return;

  const dueSoonOrOverdue = todos.filter(
    (t) => !t.completed && t.dueDate && t.dueDate <= todayString()
  );
  if (dueSoonOrOverdue.length === 0) return;

  const notify = () =>
    new Notification('마감 임박한 할 일이 있습니다', {
      body: dueSoonOrOverdue.map((t) => `- ${t.text} (${t.dueDate})`).join('\n'),
    });

  if (Notification.permission === 'granted') {
    notify();
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') notify();
    });
  }
}

render();
checkReminders();
