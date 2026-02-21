// User Dashboard Application - Grid View with Images

class UserDashboard {
  constructor() {
    this.users = [];
    this.filteredUsers = [];
    this.currentGenderFilter = 'all';

    // Match mode state
    this.matchMode = false;
    this.selectedForMatch = []; // max 2 user IDs

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

    // Match Mode toggle
    const matchModeBtn = document.getElementById('matchModeBtn');
    if (matchModeBtn) {
      matchModeBtn.addEventListener('click', () => this.toggleMatchMode());
    }

    // Match confirm button
    const matchConfirmBtn = document.getElementById('matchConfirmBtn');
    if (matchConfirmBtn) {
      matchConfirmBtn.addEventListener('click', () => this.confirmMatch());
    }
  }

  // ─── Match Mode ────────────────────────────────────────────────────────────

  toggleMatchMode() {
    this.matchMode = !this.matchMode;
    this.selectedForMatch = [];

    const btn = document.getElementById('matchModeBtn');
    const grid = document.getElementById('userGrid');
    const bar = document.getElementById('matchBar');

    if (this.matchMode) {
      btn.textContent = '✕ Exit Match Mode';
      btn.classList.add('active');
      grid && grid.classList.add('match-mode-active');
      bar && (bar.style.display = 'flex');
    } else {
      btn.textContent = '⚡ Match Mode';
      btn.classList.remove('active');
      grid && grid.classList.remove('match-mode-active');
      bar && (bar.style.display = 'none');
    }

    this.updateMatchBar();
    this.renderUsers();
  }

  handleCardSelectForMatch(userId) {
    const idx = this.selectedForMatch.indexOf(userId);

    if (idx !== -1) {
      // Deselect
      this.selectedForMatch.splice(idx, 1);
    } else {
      // Select — cap at 2
      if (this.selectedForMatch.length >= 2) return;
      this.selectedForMatch.push(userId);
    }

    // Update card visual
    const card = document.querySelector(`.grid-card[data-user-id="${userId}"]`);
    if (card) card.classList.toggle('selected', this.selectedForMatch.includes(userId));

    this.updateMatchBar();
  }

  updateMatchBar() {
    const nameA = document.getElementById('matchNameA');
    const nameB = document.getElementById('matchNameB');
    const avatarA = document.getElementById('matchAvatarA');
    const avatarB = document.getElementById('matchAvatarB');
    const confirmBtn = document.getElementById('matchConfirmBtn');

    const userA = this.selectedForMatch[0]
      ? this.users.find(u => u.id === this.selectedForMatch[0])
      : null;
    const userB = this.selectedForMatch[1]
      ? this.users.find(u => u.id === this.selectedForMatch[1])
      : null;

    if (nameA) nameA.textContent = userA ? userA.name : 'Select user 1';
    if (nameB) nameB.textContent = userB ? userB.name : 'Select user 2';

    if (avatarA) {
      avatarA.style.backgroundImage = userA?._original?.firstImageId
        ? `url(${S3_CONFIG.baseUrl}${userA._original.firstImageId})`
        : '';
      avatarA.textContent = userA ? '' : '?';
      avatarA.dataset.initials = userA ? userA.name.charAt(0) : '?';
    }
    if (avatarB) {
      avatarB.style.backgroundImage = userB?._original?.firstImageId
        ? `url(${S3_CONFIG.baseUrl}${userB._original.firstImageId})`
        : '';
      avatarB.textContent = userB ? '' : '?';
      avatarB.dataset.initials = userB ? userB.name.charAt(0) : '?';
    }

    if (confirmBtn) confirmBtn.disabled = this.selectedForMatch.length < 2;
  }

  async confirmMatch() {
    if (this.selectedForMatch.length < 2) return;

    const userA = this.users.find(u => u.id === this.selectedForMatch[0]);
    const userB = this.users.find(u => u.id === this.selectedForMatch[1]);

    const buildCandidate = (user) => {
      const orig = user._original || {};
      return {
        candidateUserId: user.uid || user.id,
        name: user.name,
        age: user.age ? String(user.age) : '',
        location: user.location || '',
        imageId: orig.firstImageId || '',
        secondImageId: orig.secondImageId || '',
        thirdImageId: orig.thirdImageId || '',
        fourthImageId: orig.fourthImageId || '',
        matchReason: 'test'
      };
    };

    const payload = {
      candidate1: buildCandidate(userA),
      candidate2: buildCandidate(userB)
    };

    const confirmBtn = document.getElementById('matchConfirmBtn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Saving...';
    }

    try {
      const url = `${SUGGESTIONS_API.baseUrl}${SUGGESTIONS_API.endpoints.save}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Server responded with ${response.status}`);

      console.log('Match saved:', payload);
      this.showToast(`Matched ${userA.name} with ${userB.name}!`);
    } catch (error) {
      console.error('Failed to save match:', error);
      this.showError(`Failed to save match: ${error.message}`);
    } finally {
      this.selectedForMatch = [];
      this.updateMatchBar();
      document.querySelectorAll('.grid-card.selected').forEach(c => c.classList.remove('selected'));
      if (confirmBtn) {
        confirmBtn.textContent = 'Match!';
        confirmBtn.disabled = false;
      }
    }
  }

  // ─── Grid Rendering ────────────────────────────────────────────────────────

  handleSearch(query) {
    const searchTerm = query.toLowerCase().trim();

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

    document.querySelectorAll('.gender-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.gender === gender);
    });

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
    this.attachUserClickListeners();
  }

  createGridCard(user) {
    const imageUrl = user._original?.firstImageId
      ? `${S3_CONFIG.baseUrl}${user._original.firstImageId}`
      : this.getPlaceholderImage(user.gender);

    const age = user.age ? `, ${user.age}` : '';

    // Extra info rows — label is first letter of field name
    const infoRows = this.buildCardInfoRows(user);

    return `
      <div class="grid-card${this.selectedForMatch.includes(user.id) ? ' selected' : ''}" data-user-id="${user.id}">
        ${this.matchMode ? '<div class="card-select-badge">✓</div>' : ''}
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
          ${infoRows}
        </div>
      </div>
    `;
  }

  buildCardInfoRows(user) {
    const rows = [];

    // R: Relationship type
    if (user.lookingFor) {
      rows.push(`<div class="card-info-row">
        <span class="card-info-label">R</span>
        <span class="card-info-pill">${this.escapeHtml(user.lookingFor)}</span>
      </div>`);
    }

    // G: Gender preference
    if (user.preferredGender) {
      rows.push(`<div class="card-info-row">
        <span class="card-info-label">G</span>
        <span class="card-info-pill">${this.escapeHtml(user.preferredGender)}</span>
      </div>`);
    }

    // C: Conversation style (truncated)
    if (user.conversationStyle) {
      rows.push(`<div class="card-info-row card-info-row--full">
        <span class="card-info-label">C</span>
        <span class="card-info-style">${this.escapeHtml(user.conversationStyle)}</span>
      </div>`);
    }

    // I: Interests (all)
    if (user.interests && user.interests.length > 0) {
      const chips = user.interests.map(i => `<span class="card-interest-chip">${this.escapeHtml(i)}</span>`).join('');
      rows.push(`<div class="card-info-row card-info-row--full">
        <span class="card-info-label">I</span>
        <div class="card-interests">${chips}</div>
      </div>`);
    }

    if (rows.length === 0) return '';
    return `<div class="card-extra-info">${rows.join('')}</div>`;
  }

  getPlaceholderImage(gender) {
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
        if (this.matchMode) {
          this.handleCardSelectForMatch(userId);
        } else {
          this.showUserDetails(userId);
        }
      });
    });
  }

  // ─── User Detail Modal ─────────────────────────────────────────────────────

  showUserDetails(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    const original = user._original || {};
    const curated = original.curatedProfile || {};
    const imageUrl = original.firstImageId
      ? `${S3_CONFIG.baseUrl}${original.firstImageId}`
      : this.getPlaceholderImage(user.gender);

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
          ${user.preferredGender ? `
          <div class="detail-row">
            <span class="detail-label">Prefers:</span>
            <span class="detail-value">${user.preferredGender}</span>
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

  // ─── Stats ─────────────────────────────────────────────────────────────────

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

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      this.handleSearch(searchInput.value);
    } else {
      this.renderUsers();
    }

    this.showLoading(false);
    this.showToast('Data refreshed successfully!');
  }

  // ─── UI Helpers ────────────────────────────────────────────────────────────

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

  // ─── Utility ───────────────────────────────────────────────────────────────

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
