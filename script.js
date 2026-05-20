const STORAGE_KEY = 'tvSeriesTracker';
const STATUS_OPTIONS = ['Active', 'Watchlist', 'Completed', 'Shelved'];

const seriesList = document.getElementById('seriesList');
const emptyMessage = document.getElementById('emptyMessage');
const statusFilter = document.getElementById('statusFilter');
const addSeriesForm = document.getElementById('addSeriesForm');

let allSeries = [];
let currentlyEditingId = null;
let expandedCardId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadSeries();
    statusFilter.value = 'Active';
    statusFilter.addEventListener('change', renderSeries);
    addSeriesForm.addEventListener('submit', handleAddSeries);
});

function loadSeries() {
    const stored = localStorage.getItem(STORAGE_KEY);
    allSeries = stored ? JSON.parse(stored) : [];
    renderSeries();
}

function saveSeries() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allSeries));
}

function renderSeries() {
    const filter = statusFilter.value;
    const isAllView = filter === 'All';
    const filtered = isAllView ? allSeries : allSeries.filter(s => s.status === filter);

    seriesList.innerHTML = '';
    currentlyEditingId = null;

    if (filtered.length === 0) {
        emptyMessage.style.display = 'block';
        return;
    }

    emptyMessage.style.display = 'none';
    filtered.forEach(series => seriesList.appendChild(createCard(series, isAllView)));
}

function createCard(series, isAllView) {
    const card = document.createElement('div');
    card.className = 'series-card';
    card.dataset.id = series.id;

    const statusClasses = {
        'Active': 'status-active',
        'Watchlist': 'status-watchlist',
        'Completed': 'status-completed',
        'Shelved': 'status-shelved'
    };

    const seasonDisplay = series.season ? `S${series.season}` : '';
    const isExpanded = expandedCardId === series.id;

    if (isAllView && !isExpanded) {
        // Collapsed Show All view: title only, clickable to expand
        card.classList.add('card-collapsed');
        card.innerHTML = `
            <div class="title-row title-clickable">
                <span class="title">${escapeHtml(series.title)}</span>
                ${seasonDisplay ? `<span class="season-badge">${escapeHtml(seasonDisplay)}</span>` : ''}
            </div>
        `;

        card.querySelector('.title-clickable').addEventListener('click', function() {
            expandedCardId = series.id;
            renderSeries();
        });

    } else if (isAllView && isExpanded) {
        // Expanded Show All view: full details with actions
        card.classList.add('card-expanded');
        card.innerHTML = `
            <div class="title-row title-clickable">
                <span class="title">${escapeHtml(series.title)}</span>
                ${seasonDisplay ? `<span class="season-badge">${escapeHtml(seasonDisplay)}</span>` : ''}
            </div>
            <div class="channel">${escapeHtml(series.channel)}</div>
            <span class="status-tag ${statusClasses[series.status]}">${series.status}</span>
            <div class="card-actions">
                <label>Change status:</label>
                <select data-id="${series.id}">
                    ${STATUS_OPTIONS.map(opt => `<option value="${opt}" ${opt === series.status ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
                <button class="btn-edit" data-id="${series.id}">Edit</button>
                <button class="btn-delete" data-id="${series.id}">Delete</button>
            </div>
        `;

        // Click title to collapse
        card.querySelector('.title-clickable').addEventListener('click', function() {
            expandedCardId = null;
            renderSeries();
        });

        // Status change
        const select = card.querySelector('select');
        if (select) {
            select.addEventListener('change', function() {
                updateStatus(series.id, this.value);
            });
        }

        // Edit button
        const editBtn = card.querySelector('.btn-edit');
        if (editBtn) {
            editBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                startEdit(series.id);
            });
        }

        // Delete button
        const deleteBtn = card.querySelector('.btn-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (confirm(`Delete "${series.title}"?`)) deleteSeries(series.id);
            });
        }

    } else {
        // Filtered view: title, season badge, channel only
        card.innerHTML = `
            <div class="title-row">
                <span class="title">${escapeHtml(series.title)}</span>
                ${seasonDisplay ? `<span class="season-badge">${escapeHtml(seasonDisplay)}</span>` : ''}
            </div>
            <div class="channel">${escapeHtml(series.channel)}</div>
        `;
    }

    return card;
}

function startEdit(id) {
    if (currentlyEditingId && currentlyEditingId !== id) {
        renderSeries();
    }

    currentlyEditingId = id;
    const series = allSeries.find(s => s.id === id);
    if (!series) return;

    const card = document.querySelector(`.series-card[data-id="${id}"]`);
    if (!card) return;

    card.innerHTML = `
        <div class="edit-form">
            <div class="form-group">
                <label>Title</label>
                <input type="text" id="edit-title-${id}" value="${escapeHtml(series.title)}" required>
            </div>
            <div class="form-group">
                <label>Season</label>
                <input type="number" id="edit-season-${id}" value="${series.season || 1}" min="1" required>
            </div>
            <div class="form-group">
                <label>Channel</label>
                <input type="text" id="edit-channel-${id}" value="${escapeHtml(series.channel)}" required>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="edit-status-${id}">
                    ${STATUS_OPTIONS.map(opt => `<option value="${opt}" ${opt === series.status ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
            </div>
            <div class="edit-actions">
                <button class="btn-save" data-id="${id}">Save</button>
                <button class="btn-cancel" data-id="${id}">Cancel</button>
            </div>
        </div>
    `;

    document.getElementById(`edit-title-${id}`).focus();

    card.querySelector('.btn-save').addEventListener('click', function() {
        saveEdit(id);
    });

    card.querySelector('.btn-cancel').addEventListener('click', function() {
        currentlyEditingId = null;
        renderSeries();
    });

    card.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit(id);
            }
        });
    });
}

function saveEdit(id) {
    const title = document.getElementById(`edit-title-${id}`).value.trim();
    const season = parseInt(document.getElementById(`edit-season-${id}`).value) || 1;
    const channel = document.getElementById(`edit-channel-${id}`).value.trim();
    const status = document.getElementById(`edit-status-${id}`).value;

    if (!title || !channel) {
        showMessage('Title and channel are required.', 'error');
        return;
    }

    const series = allSeries.find(s => s.id === id);
    if (series) {
        series.title = title;
        series.season = season;
        series.channel = channel;
        series.status = status;
        saveSeries();
        currentlyEditingId = null;
        renderSeries();
        showMessage('Series updated.', 'success');
    }
}

function handleAddSeries(event) {
    event.preventDefault();

    const title = document.getElementById('seriesTitle').value.trim();
    const season = parseInt(document.getElementById('seriesSeason').value) || 1;
    const channel = document.getElementById('seriesChannel').value.trim();
    const status = document.getElementById('seriesStatus').value;

    if (!title || !channel) return;

    allSeries.push({
        id: Date.now().toString(),
        title: title,
        season: season,
        channel: channel,
        status: status
    });

    saveSeries();
    renderSeries();

    document.getElementById('seriesTitle').value = '';
    document.getElementById('seriesSeason').value = '1';
    document.getElementById('seriesChannel').value = '';
    document.getElementById('seriesStatus').value = 'Watchlist';

    showMessage(`"${title}" added.`, 'success');
}

function updateStatus(id, newStatus) {
    const series = allSeries.find(s => s.id === id);
    if (series) {
        series.status = newStatus;
        saveSeries();
        renderSeries();
        showMessage('Status updated.', 'success');
    }
}

function deleteSeries(id) {
    if (expandedCardId === id) expandedCardId = null;
    allSeries = allSeries.filter(s => s.id !== id);
    saveSeries();
    renderSeries();
    showMessage('Series deleted.', 'success');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(text, type) {
    const existing = document.querySelector('.temp-message');
    if (existing) existing.remove();

    const msg = document.createElement('div');
    msg.className = 'temp-message';
    msg.textContent = text;
    msg.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 12px 20px;
        border-radius: 8px; color: white; font-weight: 600; z-index: 1000;
        background-color: ${type === 'success' ? '#5cb85c' : '#d9534f'};
    `;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
}
