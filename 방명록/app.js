const entryForm = document.getElementById('entryForm');
const entryAuthor = document.getElementById('entryAuthor');
const entryContent = document.getElementById('entryContent');
const entryPassword = document.getElementById('entryPassword');
const entryList = document.getElementById('entryList');

const adminToggleBtn = document.getElementById('adminToggleBtn');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminPassword = document.getElementById('adminPassword');
const adminCancelBtn = document.getElementById('adminCancelBtn');
const adminBar = document.getElementById('adminBar');
const adminStatusText = document.getElementById('adminStatusText');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');

const ADMIN_SESSION_KEY = 'guestbook-admin';

const bcryptLib = (window.dcodeIO && window.dcodeIO.bcrypt) || window.bcrypt;
const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

let entries = [];
let isAdmin = sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
const openReplyFormIds = new Set();
let editingEntryId = null;
let editingReply = null; // { entryId, replyId }

function hashPassword(password) {
  return bcryptLib.hashSync(password, 10);
}

function verifyPasswordHash(password, hash) {
  return bcryptLib.compareSync(password, hash);
}

function fromEntryRow(row) {
  return {
    id: row.id,
    authorName: row.author_name,
    content: row.content,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    replies: [],
  };
}

function fromReplyRow(row) {
  return {
    id: row.id,
    entryId: row.entry_id,
    authorName: row.author_name,
    content: row.content,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function findEntry(id) {
  return entries.find((e) => e.id === id);
}

function findReply(entryId, replyId) {
  const entry = findEntry(entryId);
  return entry && entry.replies.find((r) => r.id === replyId);
}

async function loadEntries() {
  const { data: entryRows, error: entryError } = await sb
    .from('entries')
    .select('*')
    .order('created_at', { ascending: false });
  if (entryError) {
    alert('방명록을 불러오지 못했습니다: ' + entryError.message);
    return [];
  }

  const { data: replyRows, error: replyError } = await sb
    .from('replies')
    .select('*')
    .order('created_at', { ascending: true });
  if (replyError) {
    alert('답글을 불러오지 못했습니다: ' + replyError.message);
  }

  const loaded = entryRows.map(fromEntryRow);
  (replyRows || []).forEach((row) => {
    const entry = loaded.find((e) => e.id === row.entry_id);
    if (entry) entry.replies.push(fromReplyRow(row));
  });
  return loaded;
}

async function addEntry(authorName, content, password) {
  const { data, error } = await sb
    .from('entries')
    .insert({ author_name: authorName, content, password_hash: hashPassword(password) })
    .select()
    .single();
  if (error) {
    alert('글을 등록하지 못했습니다: ' + error.message);
    return;
  }
  entries.unshift(fromEntryRow(data));
  render();
}

async function updateEntry(entry, authorName, content) {
  const { error } = await sb
    .from('entries')
    .update({ author_name: authorName, content, updated_at: new Date().toISOString() })
    .eq('id', entry.id);
  if (error) {
    alert('글을 수정하지 못했습니다: ' + error.message);
    return;
  }
  entry.authorName = authorName;
  entry.content = content;
  entry.updatedAt = new Date().toISOString();
  editingEntryId = null;
  render();
}

async function deleteEntry(entry) {
  const { error } = await sb.from('entries').delete().eq('id', entry.id);
  if (error) {
    alert('글을 삭제하지 못했습니다: ' + error.message);
    return;
  }
  entries = entries.filter((e) => e.id !== entry.id);
  render();
}

async function addReply(entryId, authorName, content, password) {
  const { data, error } = await sb
    .from('replies')
    .insert({ entry_id: entryId, author_name: authorName, content, password_hash: hashPassword(password) })
    .select()
    .single();
  if (error) {
    alert('답글을 등록하지 못했습니다: ' + error.message);
    return;
  }
  const entry = findEntry(entryId);
  entry.replies.push(fromReplyRow(data));
  openReplyFormIds.delete(entryId);
  render();
}

async function updateReply(reply, authorName, content) {
  const { error } = await sb
    .from('replies')
    .update({ author_name: authorName, content, updated_at: new Date().toISOString() })
    .eq('id', reply.id);
  if (error) {
    alert('답글을 수정하지 못했습니다: ' + error.message);
    return;
  }
  reply.authorName = authorName;
  reply.content = content;
  reply.updatedAt = new Date().toISOString();
  editingReply = null;
  render();
}

async function deleteReply(entryId, reply) {
  const { error } = await sb.from('replies').delete().eq('id', reply.id);
  if (error) {
    alert('답글을 삭제하지 못했습니다: ' + error.message);
    return;
  }
  const entry = findEntry(entryId);
  entry.replies = entry.replies.filter((r) => r.id !== reply.id);
  render();
}

function verifyOwnership(passwordHash) {
  if (isAdmin) return true;
  const password = prompt('비밀번호를 입력하세요');
  if (password === null) return false;
  const ok = verifyPasswordHash(password, passwordHash);
  if (!ok) alert('비밀번호가 일치하지 않습니다.');
  return ok;
}

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 60%, 50%)`;
}

function createAvatar(name) {
  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.style.background = avatarColor(name);
  avatar.textContent = Array.from(name.trim() || '?')[0].toUpperCase();
  return avatar;
}

function createIdentity(authorName) {
  const identity = document.createElement('div');
  identity.className = 'entry-identity';

  const author = document.createElement('span');
  author.className = 'entry-author';
  author.textContent = authorName;

  identity.appendChild(createAvatar(authorName));
  identity.appendChild(author);
  return identity;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function render() {
  entryList.innerHTML = '';

  if (entries.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = '아직 남겨진 글이 없습니다. 첫 방명록을 남겨보세요.';
    entryList.appendChild(empty);
    return;
  }

  entries.forEach((entry) => entryList.appendChild(renderEntryItem(entry)));
}

function renderEntryItem(entry) {
  const li = document.createElement('li');
  li.className = 'entry-item';

  const header = document.createElement('div');
  header.className = 'entry-header';

  const date = document.createElement('span');
  date.className = 'entry-date';
  date.textContent = formatDate(entry.createdAt) + (entry.updatedAt ? ' (수정됨)' : '');

  header.appendChild(createIdentity(entry.authorName));
  header.appendChild(date);
  li.appendChild(header);

  if (editingEntryId === entry.id) {
    li.appendChild(renderEntryEditForm(entry));
  } else {
    const content = document.createElement('p');
    content.className = 'entry-content';
    content.textContent = entry.content;
    li.appendChild(content);

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const replyBtn = document.createElement('button');
    replyBtn.type = 'button';
    replyBtn.textContent = '답글';
    replyBtn.addEventListener('click', () => {
      if (openReplyFormIds.has(entry.id)) {
        openReplyFormIds.delete(entry.id);
      } else {
        openReplyFormIds.add(entry.id);
      }
      render();
    });

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = '수정';
    editBtn.addEventListener('click', () => {
      if (!verifyOwnership(entry.passwordHash)) return;
      editingEntryId = entry.id;
      render();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'danger-action';
    deleteBtn.textContent = '삭제';
    deleteBtn.addEventListener('click', async () => {
      if (!verifyOwnership(entry.passwordHash)) return;
      if (!confirm('이 글을 삭제할까요? 답글도 함께 삭제됩니다.')) return;
      await deleteEntry(entry);
    });

    actions.appendChild(replyBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    li.appendChild(actions);
  }

  const replyList = document.createElement('ul');
  replyList.className = 'reply-list';
  entry.replies.forEach((reply) => replyList.appendChild(renderReplyItem(entry, reply)));
  li.appendChild(replyList);

  if (openReplyFormIds.has(entry.id)) {
    li.appendChild(renderReplyForm(entry));
  }

  return li;
}

function renderEntryEditForm(entry) {
  const form = document.createElement('form');
  form.className = 'edit-form';

  const authorInput = document.createElement('input');
  authorInput.type = 'text';
  authorInput.maxLength = 30;
  authorInput.value = entry.authorName;
  authorInput.required = true;

  const contentInput = document.createElement('textarea');
  contentInput.maxLength = 1000;
  contentInput.value = entry.content;
  contentInput.required = true;

  const buttons = document.createElement('div');
  buttons.className = 'edit-form-buttons';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.textContent = '저장';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = '취소';
  cancelBtn.addEventListener('click', () => {
    editingEntryId = null;
    render();
  });

  buttons.appendChild(saveBtn);
  buttons.appendChild(cancelBtn);

  form.appendChild(authorInput);
  form.appendChild(contentInput);
  form.appendChild(buttons);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const authorName = authorInput.value.trim();
    const content = contentInput.value.trim();
    if (!authorName || !content) return;
    await updateEntry(entry, authorName, content);
  });

  return form;
}

function renderReplyForm(entry) {
  const form = document.createElement('form');
  form.className = 'reply-form';

  const authorInput = document.createElement('input');
  authorInput.type = 'text';
  authorInput.placeholder = '이름 또는 별명';
  authorInput.maxLength = 30;
  authorInput.required = true;

  const contentInput = document.createElement('textarea');
  contentInput.placeholder = '답글 내용';
  contentInput.maxLength = 1000;
  contentInput.required = true;

  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.placeholder = '비밀번호 (수정·삭제 시 필요)';
  passwordInput.minLength = 4;
  passwordInput.required = true;

  const buttons = document.createElement('div');
  buttons.className = 'edit-form-buttons';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = '답글 등록';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = '취소';
  cancelBtn.addEventListener('click', () => {
    openReplyFormIds.delete(entry.id);
    render();
  });

  buttons.appendChild(submitBtn);
  buttons.appendChild(cancelBtn);

  form.appendChild(authorInput);
  form.appendChild(contentInput);
  form.appendChild(passwordInput);
  form.appendChild(buttons);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const authorName = authorInput.value.trim();
    const content = contentInput.value.trim();
    const password = passwordInput.value;
    if (!authorName || !content || password.length < 4) return;
    await addReply(entry.id, authorName, content, password);
  });

  return form;
}

function renderReplyItem(entry, reply) {
  const li = document.createElement('li');
  li.className = 'reply-item';

  const header = document.createElement('div');
  header.className = 'entry-header';

  const date = document.createElement('span');
  date.className = 'entry-date';
  date.textContent = formatDate(reply.createdAt) + (reply.updatedAt ? ' (수정됨)' : '');

  header.appendChild(createIdentity(reply.authorName));
  header.appendChild(date);
  li.appendChild(header);

  const isEditing = editingReply && editingReply.entryId === entry.id && editingReply.replyId === reply.id;

  if (isEditing) {
    li.appendChild(renderReplyEditForm(entry, reply));
    return li;
  }

  const content = document.createElement('p');
  content.className = 'entry-content';
  content.textContent = reply.content;
  li.appendChild(content);

  const actions = document.createElement('div');
  actions.className = 'item-actions';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.textContent = '수정';
  editBtn.addEventListener('click', () => {
    if (!verifyOwnership(reply.passwordHash)) return;
    editingReply = { entryId: entry.id, replyId: reply.id };
    render();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'danger-action';
  deleteBtn.textContent = '삭제';
  deleteBtn.addEventListener('click', async () => {
    if (!verifyOwnership(reply.passwordHash)) return;
    if (!confirm('이 답글을 삭제할까요?')) return;
    await deleteReply(entry.id, reply);
  });

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  li.appendChild(actions);

  return li;
}

function renderReplyEditForm(entry, reply) {
  const form = document.createElement('form');
  form.className = 'edit-form';

  const authorInput = document.createElement('input');
  authorInput.type = 'text';
  authorInput.maxLength = 30;
  authorInput.value = reply.authorName;
  authorInput.required = true;

  const contentInput = document.createElement('textarea');
  contentInput.maxLength = 1000;
  contentInput.value = reply.content;
  contentInput.required = true;

  const buttons = document.createElement('div');
  buttons.className = 'edit-form-buttons';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.textContent = '저장';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = '취소';
  cancelBtn.addEventListener('click', () => {
    editingReply = null;
    render();
  });

  buttons.appendChild(saveBtn);
  buttons.appendChild(cancelBtn);

  form.appendChild(authorInput);
  form.appendChild(contentInput);
  form.appendChild(buttons);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const authorName = authorInput.value.trim();
    const content = contentInput.value.trim();
    if (!authorName || !content) return;
    await updateReply(reply, authorName, content);
  });

  return form;
}

entryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const authorName = entryAuthor.value.trim();
  const content = entryContent.value.trim();
  const password = entryPassword.value;
  if (!authorName || !content || password.length < 4) return;

  await addEntry(authorName, content, password);
  entryForm.reset();
  entryAuthor.focus();
});

function updateAdminUI() {
  adminBar.hidden = !isAdmin;
  adminStatusText.textContent = isAdmin ? '관리자 모드입니다.' : '';
  adminToggleBtn.hidden = isAdmin;
}

adminToggleBtn.addEventListener('click', () => {
  if (!window.ADMIN_PASSWORD_HASH) {
    alert('관리자 비밀번호가 설정되지 않았습니다. supabase-config.js를 확인하세요.');
    return;
  }
  adminLoginForm.hidden = !adminLoginForm.hidden;
  if (!adminLoginForm.hidden) adminPassword.focus();
});

adminCancelBtn.addEventListener('click', () => {
  adminLoginForm.hidden = true;
  adminPassword.value = '';
});

adminLoginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const ok = verifyPasswordHash(adminPassword.value, window.ADMIN_PASSWORD_HASH);
  if (!ok) {
    alert('관리자 비밀번호가 일치하지 않습니다.');
    return;
  }
  isAdmin = true;
  sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
  adminLoginForm.hidden = true;
  adminPassword.value = '';
  updateAdminUI();
  render();
});

adminLogoutBtn.addEventListener('click', () => {
  isAdmin = false;
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  updateAdminUI();
  render();
});

async function init() {
  updateAdminUI();
  entries = await loadEntries();
  render();
}

init();
