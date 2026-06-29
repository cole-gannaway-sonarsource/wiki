const app = document.getElementById('app');

const DEFAULT_MARKDOWN = '# New note\n\nStart typing — click **Save Note** to persist it at this URL.';

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

function formatDate(s) {
    if (!s) return '';
    // SQLite datetime('now') stores UTC as "YYYY-MM-DD HH:MM:SS" without a tz marker.
    return new Date(s.replace(' ', 'T') + 'Z').toLocaleString();
}

function previewFor(note) {
    if (note.title) return note.title;
    const text = (note.preview || '').replace(/^#+\s*/, '').split('\n')[0].trim();
    return text || note.id;
}

async function renderHome() {
    app.innerHTML = `
        <div class="header-container">
            <h2>My Local Vault</h2>
            <button id="new-note-btn">New note</button>
        </div>
        <ul id="recent-notes" class="note-list"></ul>
    `;

    document.getElementById('new-note-btn').addEventListener('click', () => {
        window.location.href = '/notes/' + crypto.randomUUID();
    });

    const list = document.getElementById('recent-notes');
    try {
        const res = await fetch('/api/v1/notes');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const notes = await res.json();
        if (!notes.length) {
            list.innerHTML = '<li class="empty">No notes yet — click <strong>New note</strong> to create one.</li>';
            return;
        }
        list.innerHTML = notes.map(n => `
            <li class="note-item">
                <a href="/notes/${encodeURIComponent(n.id)}">${escapeHtml(previewFor(n))}</a>
                <time>${escapeHtml(formatDate(n.created_at))}</time>
            </li>
        `).join('');
    } catch (err) {
        list.innerHTML = `<li class="error">Failed to load notes: ${escapeHtml(err.message)}</li>`;
    }
}

function renderNote(noteId) {
    app.innerHTML = `
        <div class="header-container">
            <h2 id="note-title">${escapeHtml(noteId)}</h2>
            <button id="save-btn">Save Note</button>
        </div>
        <div id="editor-container"></div>
    `;

    const apiUrl = '/api/v1/notes/' + encodeURIComponent(noteId);
    const editor = new toastui.Editor({
        el: document.querySelector('#editor-container'),
        height: '650px',
        initialEditType: 'markdown',
        previewStyle: 'vertical',
        initialValue: DEFAULT_MARKDOWN,
        usageStatistics: false
    });

    fetch(apiUrl)
        .then(res => {
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        })
        .then(md => { if (md !== null) editor.setMarkdown(md); })
        .catch(() => editor.setMarkdown('# Error\n\nCould not load this note.'));

    const saveBtn = document.getElementById('save-btn');
    saveBtn.addEventListener('click', async () => {
        try {
            const res = await fetch(apiUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editor.getMarkdown() })
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            saveBtn.textContent = 'Saved';
            setTimeout(() => { saveBtn.textContent = 'Save Note'; }, 1200);
        } catch (err) {
            alert('Save failed: ' + err.message);
        }
    });
}

function route() {
    const m = window.location.pathname.match(/^\/notes\/([^\/]+)\/?$/);
    if (m) return renderNote(decodeURIComponent(m[1]));
    return renderHome();
}

route();
