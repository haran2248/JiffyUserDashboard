// User Dashboard Application - Grid View with Images

class UserDashboard {
    constructor() {
        this.users = [];
        this.filteredUsers = [];
        this.currentGenderFilter = 'all';
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

            const backendData = await response.json();

            // Transform backend data to dashboard format using mapper
            this.users = mapBackendUsers(backendData);
            this.filteredUsers = [...this.users];

            console.log(`Loaded ${this.users.length} users from backend`);

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

        // Gender filter
        const genderBtns = document.querySelectorAll('.gender-btn');
        genderBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleGenderFilter(e.target.dataset.gender));
        });

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
    }

    handleSearch(query) {
        const searchTerm = query.toLowerCase().trim();

        // Apply both search and gender filter
        this.filteredUsers = this.users.filter(user => {
            const matchesSearch = searchTerm === '' ||
                user.name.toLowerCase().includes(searchTerm) ||
                user.college.toLowerCase().includes(searchTerm);

            const matchesGender = this.currentGenderFilter === 'all' ||
                user.gender === this.currentGenderFilter;

            return matchesSearch && matchesGender;
        });

        this.renderUsers();
        this.updateStats();
    }

    handleGenderFilter(gender) {
        this.currentGenderFilter = gender;

        // Update active button
        document.querySelectorAll('.gender-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.gender === gender);
        });

        // Re-apply filters
        const searchInput = document.getElementById('searchInput');
        this.handleSearch(searchInput ? searchInput.value : '');
    }

    renderUsers() {
        const container = document.getElementById('userGrid');

        if (!container) {
            console.error('User grid container not found');
            return;
        }

        if (this.filteredUsers.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }

        container.innerHTML = this.filteredUsers.map(user => this.createGridCard(user)).join('');

        // Add click listeners
        this.attachUserClickListeners();
    }

    createGridCard(user) {
        // Get image URL from S3
        const imageUrl = user._original?.firstImageId
            ? `${S3_CONFIG.baseUrl}${user._original.firstImageId}`
            : this.getPlaceholderImage(user.gender);

        const age = user.age ? `, ${user.age}` : '';

        return `
      <div class="grid-card" data-user-id="${user.id}">
        <img 
          src="${imageUrl}" 
          alt="${this.escapeHtml(user.name)}"
          class="grid-card-image"
          onerror="this.src='${this.getPlaceholderImage(user.gender)}'"
        >
        <div class="grid-card-content">
          <div class="grid-card-name">${this.escapeHtml(user.name)}${age}</div>
          <div class="grid-card-college">
            <span>🎓</span>
            <span>${this.escapeHtml(user.college)}</span>
          </div>
        </div>
      </div>
    `;
    }

    getPlaceholderImage(gender) {
        // Return a gradient-based placeholder
        const color = gender === 'Woman' ? '#EC4899' : '#8B5CF6';
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='533'%3E%3Crect width='400' height='533' fill='${encodeURIComponent(color)}'/%3E%3Ctext x='50%25' y='50%25' font-size='120' fill='white' text-anchor='middle' dy='.3em' font-family='Arial'%3E👤%3C/text%3E%3C/svg%3E`;
    }

    getEmptyState() {
        return `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🔍</div>
        <h3>No users found</h3>
        <p>Try adjusting your search or filter criteria</p>
      </div>
    `;
    }

    attachUserClickListeners() {
        const userElements = document.querySelectorAll('.grid-card');
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

        const original = user._original || {};
        const curated = original.curatedProfile || {};
        const imageUrl = original.firstImageId
            ? `${S3_CONFIG.baseUrl}${original.firstImageId}`
            : this.getPlaceholderImage(user.gender);

        // Create modal with enhanced user details
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
      <div class="modal-content">
        <span class="modal-close">&times;</span>
        
        <img src="${imageUrl}" alt="${this.escapeHtml(user.name)}" class="modal-profile-image" 
             onerror="this.src='${this.getPlaceholderImage(user.gender)}'">
        
        <h2 style="text-align: center; margin-bottom: var(--spacing-xl);">
          ${this.escapeHtml(user.name)}${user.age ? `, ${user.age}` : ''}
        </h2>

        ${this.renderBasicInfo(user)}
        ${this.renderPersonalityTraits(curated.personalityTraits)}
        ${this.renderInterests(curated.interests)}
        ${this.renderConversationStyle(curated.conversationStyleDescription)}
        ${this.renderAboutMe(curated.aboutMe)}
        ${this.renderAdditionalDetails(user, original)}
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

    renderBasicInfo(user) {
        return `
      <div class="modal-section">
        <div class="modal-section-title">
          📋 Basic Information
        </div>
        <div class="user-details-grid">
          <div class="detail-row">
            <span class="detail-label">Email:</span>
            <span class="detail-value">${this.escapeHtml(user.email)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Phone:</span>
            <span class="detail-value">${this.escapeHtml(user.phone)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">College:</span>
            <span class="detail-value">${this.escapeHtml(user.college)}</span>
          </div>
          ${user.gender ? `
          <div class="detail-row">
            <span class="detail-label">Gender:</span>
            <span class="detail-value">${user.gender}</span>
          </div>
          ` : ''}
          ${user.lookingFor ? `
          <div class="detail-row">
            <span class="detail-label">Looking For:</span>
            <span class="detail-value">${user.lookingFor}</span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
    }

    renderPersonalityTraits(traits) {
        if (!traits || traits.length === 0) return '';

        return `
      <div class="modal-section">
        <div class="modal-section-title">
          ✨ Personality Traits
        </div>
        <div class="personality-traits">
          ${traits.map(trait => `<span class="trait-badge">${this.escapeHtml(trait)}</span>`).join('')}
        </div>
      </div>
    `;
    }

    renderInterests(interests) {
        if (!interests || interests.length === 0) return '';

        return `
      <div class="modal-section">
        <div class="modal-section-title">
          💡 Interests
        </div>
        <div class="interests-list">
          ${interests.map(interest => `<span class="interest-badge">${this.escapeHtml(interest)}</span>`).join('')}
        </div>
      </div>
    `;
    }

    renderConversationStyle(description) {
        if (!description) return '';

        return `
      <div class="modal-section">
        <div class="modal-section-title">
          💬 Conversation Style
        </div>
        <div class="conversation-text">${this.escapeHtml(description)}</div>
      </div>
    `;
    }

    renderAboutMe(aboutMe) {
        if (!aboutMe) return '';

        return `
      <div class="modal-section">
        <div class="modal-section-title">
          📖 About Me
        </div>
        <p style="color: var(--color-text-secondary); line-height: 1.6;">${this.escapeHtml(aboutMe)}</p>
      </div>
    `;
    }

    renderAdditionalDetails(user, original) {
        return `
      <div class="modal-section">
        <div class="modal-section-title">
          📊 Additional Details
        </div>
        <div class="user-details-grid">
          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="detail-value">
              <span class="status-badge status-${user.status}">${this.capitalize(user.status)}</span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Verified:</span>
            <span class="detail-value ${user.verified ? 'verified' : 'unverified'}">${user.verified ? '✓ Yes' : '✗ No'}</span>
          </div>
<div class="detail-row">
            <span class="detail-label">Profile Completion:</span>
            <span class="detail-value">${user.profileCompletion}%</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Match Count:</span>
            <span class="detail-value">${user.matchCount}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Registered:</span>
            <span class="detail-value">${this.formatDate(user.registrationDate)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Last Login:</span>
            <span class="detail-value">${this.formatRelativeTime(user.lastLogin)}</span>
          </div>
        </div>
      </div>
    `;
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

    async refresh() {
        this.showLoading(true);
        await this.fetchUsers();

        // Reapply current filters
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            this.handleSearch(searchInput.value);
        } else {
            this.renderUsers();
        }

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
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new UserDashboard();
});
