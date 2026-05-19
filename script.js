const STORAGE_KEY = 'tvSeriesTracker';
const STATUS_OPTIONS = ['Active', 'Watchlist', 'Completed', 'Shelved'];

const seriesList = document.getElementById('seriesList');
const emptyMessage = document.getElementById('emptyMessage');
const statusFilter = document.getElementById('statusFilter');
const addSeriesForm = document.getElementById('addSeriesForm');

let allSeries = [];

document.addEventListener('DOMContentLoaded', function() {
    loadSeries();
    statusFilter.value = 'Active';
    statusFilter.addEventListener('change', renderSeries);
    addSeriesForm.addEventListener('submit', handleAddSeries);
    
    document.getElementById('addNewBtn').addEventListener('click', function() {
        document.getElementById('addFormSection').scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => document.getElementById('seriesTitle').focus(), 500);
    });
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
    
    const statusClasses = {
        'Active': 'status-active',
        'Watchlist': 'status-watchlist',
        'Completed': 'status-completed',
        'Shelved': 'status-shelved'
    };
    
    // Build card HTML based on whether we're in "All" view or filtered view
    let statusTagHtml = '';
    let actionsHtml = '';
    
    if (isAllView) {
        // Show All view: display status tag, change status dropdown, and delete button
        statusTagHtml = `<span class="status-tag ${statusClasses[series.status]}">${series.status}</span>`;
        actionsHtml = `
            <div class="card-actions">
                <label>Change status:</label>
                <select data-id="${series.id}">
                    ${STATUS_OPTIONS.map(opt => `<option value="${opt}" ${opt === series.status ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
                <button class="btn-delete" data-id="${series.id}">Delete</button>
            </div>
        `;
    } else {
        // Filtered view: only show title and channel — no actions at all
        actionsHtml = '';
    }
    
    card.innerHTML = `
        <div class="title">${escapeHtml(series.title)}</div>
        <div class="channel">${escapeHtml(series.channel)}</div>
        ${statusTagHtml}
        ${actionsHtml}
    `;
    
    // Attach event listeners only for Show All view
    if (isAllView) {
        const select = card.querySelector('select');
        if (select) {
            select.addEventListener('change', function() {
                updateStatus(series.id, this.value);
            });
        }
        
        const deleteBtn = card.querySelector('.btn-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                if (confirm(`Delete "${series.title}"?`)) deleteSeries(series.id);
            });
        }
    }
    
    return card;
}

function handleAddSeries(event) {
    event.preventDefault();
    
    const title = document.getElementById('seriesTitle').value.trim();
    const channel = document.getElementById('seriesChannel').value.trim();
    const status = document.getElementById('seriesStatus').value;
    
    if (!title || !channel) return;
    
    allSeries.push({
        id: Date.now().toString(),
        title: title,
        channel: channel,
        status: status
    });
    
    saveSeries();
    renderSeries();
    
    document.getElementById('seriesTitle').value = '';
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