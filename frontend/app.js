(() => {
  // Same-origin when served by Express; falls back to localhost if index.html is opened as a file.
  // To point at a deployed API from anywhere, open index.html?api=https://your-api.example.com
  const params = new URLSearchParams(location.search);
  const API_BASE = params.get('api') ?? (location.protocol === 'file:' ? 'http://localhost:3000' : '');
  const API = API_BASE.replace(/\/$/, '') + '/api/clubs';

  const CATEGORIES = ['Academic', 'Arts & Culture', 'Business', 'Community Service', 'Faith', 'Sports', 'Technology', 'Other'];
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const $ = (id) => document.getElementById(id);
  const form = $('club-form'), rowsEl = $('rows'), toastEl = $('toast');
  const FIELDS = ['name', 'category', 'description', 'meeting_day', 'venue', 'president_name', 'contact_email', 'member_count'];

  let clubs = [];
  let editingId = null;
  let toastTimer;

  // ---------- helpers ----------
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function toast(message, isError = false) {
    toastEl.textContent = message;
    toastEl.className = 'show' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.className = ''), 3500);
  }

  async function request(url, options = {}) {
    const init = { ...options };
    if (init.body) init.headers = { 'Content-Type': 'application/json' };
    let res;
    try { res = await fetch(url, init); }
    catch { throw new Error('Cannot reach the API. Is the server running?'); }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.details?.join('. ') || data?.error || `Request failed (${res.status})`);
    return data;
  }

  function formatDate(sqlTimestamp) {
    if (!sqlTimestamp) return '';
    const d = new Date(sqlTimestamp.replace(' ', 'T') + 'Z'); // SQLite stores UTC
    return isNaN(d) ? sqlTimestamp : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function fillSelect(select, options, blankLabel) {
    select.innerHTML = `<option value="">${esc(blankLabel)}</option>` +
      options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
  }

  // ---------- rendering ----------
  function render() {
    const q = $('search').value.trim().toLowerCase();
    const cat = $('filter-category').value;
    const visible = clubs.filter((c) =>
      (!cat || c.category === cat) &&
      (!q || [c.name, c.president_name, c.venue].some((v) => (v || '').toLowerCase().includes(q))));

    $('count').textContent = `${visible.length} of ${clubs.length} clubs`;

    if (!visible.length) {
      rowsEl.innerHTML = `<tr><td colspan="6" class="empty">${clubs.length ? 'No clubs match your search.' : 'No clubs yet. Add the first one using the form.'}</td></tr>`;
      return;
    }

    rowsEl.innerHTML = visible.map((c) => `
      <tr class="${c.id === editingId ? 'editing' : ''}">
        <td>
          <span class="club-name">${esc(c.name)}</span>${c.category ? `<span class="chip">${esc(c.category)}</span>` : ''}
          ${c.description ? `<div class="desc">${esc(c.description)}</div>` : ''}
        </td>
        <td>${esc(c.meeting_day)}${c.venue ? `<div class="small">${esc(c.venue)}</div>` : ''}</td>
        <td>${esc(c.president_name)}${c.contact_email ? `<div class="small">${esc(c.contact_email)}</div>` : ''}</td>
        <td class="num">${esc(c.member_count)}</td>
        <td class="small">${esc(formatDate(c.updated_at))}</td>
        <td><div class="row-actions">
          <button class="edit" data-action="edit" data-id="${c.id}">Edit</button>
          <button class="del" data-action="delete" data-id="${c.id}">Delete</button>
        </div></td>
      </tr>`).join('');
  }

  // ---------- API calls (each one refreshes the list afterwards) ----------
  async function loadClubs() {
    try { clubs = await request(API); render(); }
    catch (err) { rowsEl.innerHTML = `<tr><td colspan="6" class="empty">${esc(err.message)}</td></tr>`; toast(err.message, true); }
  }

  function resetForm() {
    editingId = null;
    form.reset();
    $('member_count').value = 0;
    $('form-title').textContent = 'Add a club';
    $('submit-btn').textContent = 'Add club';
    $('cancel-btn').hidden = true;
  }

  function startEdit(id) {
    const club = clubs.find((c) => c.id === id);
    if (!club) return;
    editingId = id;
    FIELDS.forEach((f) => { $(f).value = club[f] ?? ''; });
    $('form-title').textContent = `Edit club #${id}`;
    $('submit-btn').textContent = 'Save changes';
    $('cancel-btn').hidden = false;
    render();
    $('name').focus();
    $('form-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function saveClub(event) {
    event.preventDefault();
    const payload = {};
    FIELDS.forEach((f) => { payload[f] = $(f).value; });
    if (!payload.name.trim()) { toast('Club name is required', true); $('name').focus(); return; }

    const wasEditing = editingId !== null;
    try {
      await request(wasEditing ? `${API}/${editingId}` : API, {
        method: wasEditing ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      resetForm();
      await loadClubs();
      toast(wasEditing ? 'Changes saved' : 'Club added');
    } catch (err) { toast(err.message, true); }
  }

  async function deleteClub(id) {
    const club = clubs.find((c) => c.id === id);
    if (!club || !confirm(`Delete "${club.name}"? This cannot be undone.`)) return;
    try {
      await request(`${API}/${id}`, { method: 'DELETE' });
      if (editingId === id) resetForm();
      await loadClubs();
      toast('Club deleted');
    } catch (err) { toast(err.message, true); }
  }

  // ---------- wiring ----------
  fillSelect($('category'), CATEGORIES, 'Select…');
  fillSelect($('meeting_day'), DAYS, 'Select…');
  fillSelect($('filter-category'), CATEGORIES, 'All categories');

  form.addEventListener('submit', saveClub);
  $('cancel-btn').addEventListener('click', () => { resetForm(); render(); });
  $('search').addEventListener('input', render);
  $('filter-category').addEventListener('change', render);
  rowsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.action === 'edit') startEdit(id); else deleteClub(id);
  });

  loadClubs();
})();
