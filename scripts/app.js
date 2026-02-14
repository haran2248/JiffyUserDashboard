// User Dashboard Application

class UserDashboard {
    constructor() {
        this.users = [];
        this.filteredUsers = [];
        this.init();
    }

    async init() {
        this.showLoading(true);
        await this.fetchUsers();
        this.setupEventListeners();
        this.renderUsers();
        this.showLoading(false);
    }

    async fetchUsers() {
        try {
            const url = `${API_CONFIG.apiBaseUrl}${API_CONFIG.endpoints.users}`;
            const options = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(API_CONFIG.headers || {})
                }
            };

            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.users = await response.json();
            this.filteredUsers = [...this.users];

            this.updateStats();
        } catch (error) {
            console.error('Error fetching users:', error);
            this.showError('Failed to load user data. Please try again later.');
        }
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => this.handleFilter(e.target.value));
        }

        // View toggle
        const viewToggleBtns = document.querySelectorAll('.view-toggle-btn');
        viewToggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleView(e.target.dataset.view));
        });

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
    }

    handleSearch(query) {
        const searchTerm = query.toLowerCase().trim();

        this.filteredUsers = this.users.filter(user => {
            return (
                user.name.toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm) ||
                user.college.toLowerCase().includes(searchTerm) ||
                user.location.toLowerCase().includes(searchTerm)
            );
        });

        this.renderUsers();
        this.updateStats();
    }

    handleFilter(status) {
        if (status === 'all') {
            this.filteredUsers = [...this.users];
        } else {
            this.filteredUsers = this.users.filter(user => user.status === status);
        }

        this.renderUsers();
        this.updateStats();
    }

    renderUsers() {
        const container = document.getElementById('userTableBody') || document.getElementById('userCardsContainer');

        if (!container) {
            console.error('User container not found');
            return;
        }

        if (this.filteredUsers.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }

        const isTableView = container.id === 'userTableBody';

        if (isTableView) {
            container.innerHTML = this.filteredUsers.map(user => this.createUserRow(user)).join('');
        } else {
            container.innerHTML = this.filteredUsers.map(user => this.createUserCard(user)).join('');
        }

        // Add click listeners for user rows/cards
        this.attachUserClickListeners();
    }

    createUserRow(user) {
        return `
      <tr class="user-row" data-user-id="${user.id}">
        <td>
          <div class="user-cell">
            <div class="user-avatar">${this.getInitials(user.name)}</div>
            <div class="user-info">
              <div class="user-name">${this.escapeHtml(user.name)}</div>
              <div class="user-email">${this.escapeHtml(user.email)}</div>
            </div>
          </div>
        </td>
        <td>${this.escapeHtml(user.college)}</td>
        <td>${this.escapeHtml(user.location)}</td>
        <td><span class="status-badge status-${user.status}">${this.capitalize(user.status)}</span></td>
        <td><span class="verified-badge ${user.verified ? 'verified' : 'unverified'}">${user.verified ? '✓ Verified' : '✗ Unverified'}</span></td>
        <td>${this.formatDate(user.registrationDate)}</td>
        <td>${this.formatDate(user.lastLogin)}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${user.profileCompletion}%"></div>
            <span class="progress-text">${user.profileCompletion}%</span>
          </div>
        </td>
      </tr>
    `;
    }

    createUserCard(user) {
        return `
      <div class="user-card" data-user-id="${user.id}">
        <div class="card-header">
          <div class="user-avatar-large">${this.getInitials(user.name)}</div>
          <div class="card-badges">
            <span class="status-badge status-${user.status}">${this.capitalize(user.status)}</span>
            ${user.verified ? '<span class="verified-icon">✓</span>' : ''}
          </div>
        </div>
        <div class="card-body">
          <h3 class="card-name">${this.escapeHtml(user.name)}</h3>
          <p class="card-email">${this.escapeHtml(user.email)}</p>
          <div class="card-details">
            <div class="detail-item">
              <span class="detail-icon">🎓</span>
              <span class="detail-text">${this.escapeHtml(user.college)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-icon">📍</span>
              <span class="detail-text">${this.escapeHtml(user.location)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-icon">💬</span>
              <span class="detail-text">${user.matchCount} matches</span>
            </div>
          </div>
          <div class="profile-completion">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${user.profileCompletion}%"></div>
            </div>
            <span class="progress-label">Profile ${user.profileCompletion}% complete</span>
          </div>
        </div>
        <div class="card-footer">
          <span class="card-date">Joined ${this.formatDate(user.registrationDate)}</span>
          <span class="card-date">Last seen ${this.formatRelativeTime(user.lastLogin)}</span>
        </div>
      </div>
    `;
    }

    getEmptyState() {
        return `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No users found</h3>
        <p>Try adjusting your search or filter criteria</p>
      </div>
    `;
    }

    attachUserClickListeners() {
        const userElements = document.querySelectorAll('.user-row, .user-card');
        userElements.forEach(element => {
            element.addEventListener('click', () => {
                const userId = element.dataset.userId;
                this.showUserDetails(userId);
            });
        });
    }

    showUserDetails(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        // Create modal with user details
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
      <div class="modal-content">
        <span class="modal-close">&times;</span>
        <h2>User Details</h2>
        <div class="user-details-grid">
          ${Object.entries(user).map(([key, value]) => `
            <div class="detail-row">
              <span class="detail-label">${this.formatLabel(key)}:</span>
              <span class="detail-value">${this.formatValue(key, value)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

        document.body.appendChild(modal);

        // Close modal on click
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('modal-close')) {
                modal.remove();
            }
        });
    }

    updateStats() {
        const totalUsers = this.users.length;
        const activeUsers = this.users.filter(u => u.status === 'active').length;
        const verifiedUsers = this.users.filter(u => u.verified).length;
        const displayedUsers = this.filteredUsers.length;

        this.updateStatCard('totalUsers', totalUsers);
        this.updateStatCard('activeUsers', activeUsers);
        this.updateStatCard('verifiedUsers', verifiedUsers);
        this.updateStatCard('displayedUsers', displayedUsers);
    }

    updateStatCard(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    toggleView(view) {
        // Update active button
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Toggle view containers
        const tableView = document.getElementById('tableView');
        const cardView = document.getElementById('cardView');

        if (view === 'table') {
            tableView.style.display = 'block';
            cardView.style.display = 'none';
        } else {
            tableView.style.display = 'none';
            cardView.style.display = 'grid';
        }

        this.renderUsers();
    }

    async refresh() {
        this.showLoading(true);
        await this.fetchUsers();
        this.renderUsers();
        this.showLoading(false);
        this.showToast('Data refreshed successfully!');
    }

    showLoading(show) {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => errorDiv.remove(), 5000);
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Utility functions
    getInitials(name) {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return this.formatDate(dateString);
    }

    formatLabel(key) {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    formatValue(key, value) {
        if (key.includes('Date') || key.includes('Login')) {
            return this.formatDate(value);
        }
        if (typeof value === 'boolean') {
            return value ? '✓ Yes' : '✗ No';
        }
        return this.escapeHtml(String(value));
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new UserDashboard();
});
