// User Dashboard Application - Grid View with Images

class UserDashboard {
  constructor() {
    this.users = [];
    this.filteredUsers = [];
    this.currentGenderFilter = "all";

    // Match mode state
    this.matchMode = false;
    this.selectedForMatch = []; // max 2 user IDs

    // Match history (persisted in localStorage)
    this.matchHistory = [];
    this.sessionMatchCount = 0;

    this.currentTraitFilter = "all";

    // Suggestion + conversation data keyed by uid — populated in background after load
    this.suggestionData = {}; // { [uid]: { pendingCount, nearestExpiry, conversations } }

    this.init();
  }

  async init() {
    this.showLoading(true);
    this.loadMatchHistory();
    await this.fetchUsers();
    this.setupEventListeners();
    this.renderUsers();
    this.showLoading(false);
    // Fetch suggestion & conversation data in the background; re-renders cards as data arrives
    this.fetchAllSuggestionData();
  }

  async fetchUsers() {
    try {
      const url = `${API_CONFIG.apiBaseUrl}${API_CONFIG.endpoints.users}`;
      const options = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(API_CONFIG.headers || {}),
        },
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

      this.populateTraitDropdown();

      this.updateStats();
    } catch (error) {
      console.error("Error fetching users:", error);
      this.showError("Failed to load user data. Please try again later.");
    }
  }

  setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) =>
        this.handleSearch(e.target.value),
      );
    }

    // Gender filter
    const genderBtns = document.querySelectorAll(".gender-btn");
    genderBtns.forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.handleGenderFilter(e.target.dataset.gender),
      );
    });

    // Trait filter
    const traitFilter = document.getElementById("traitFilter");
    if (traitFilter) {
      traitFilter.addEventListener("change", (e) => 
        this.handleTraitFilter(e.target.value)
      );
    }

    // Refresh button
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.refresh());
    }

    // Match Mode toggle
    const matchModeBtn = document.getElementById("matchModeBtn");
    if (matchModeBtn) {
      matchModeBtn.addEventListener("click", () => this.toggleMatchMode());
    }

    // Match confirm button
    const matchConfirmBtn = document.getElementById("matchConfirmBtn");
    if (matchConfirmBtn) {
      matchConfirmBtn.addEventListener("click", () => this.confirmMatch());
    }

    // Close match modal (X button)
    const closeMatchModalBtn = document.getElementById("closeMatchModalBtn");
    if (closeMatchModalBtn) {
      closeMatchModalBtn.addEventListener("click", () => this.closeComparisonModal());
    }

    // Individual chip remove buttons
    const chipRemoveA = document.getElementById("chipRemoveA");
    if (chipRemoveA) {
      chipRemoveA.addEventListener("click", (e) => {
        e.stopPropagation();
        this.removeMatchUser(0);
      });
    }
    const chipRemoveB = document.getElementById("chipRemoveB");
    if (chipRemoveB) {
      chipRemoveB.addEventListener("click", (e) => {
        e.stopPropagation();
        this.removeMatchUser(1);
      });
    }

    // Individual comparison card remove buttons
    const compCardRemoveA = document.getElementById("compCardRemoveA");
    if (compCardRemoveA) {
      compCardRemoveA.addEventListener("click", () => this.removeMatchUser(0));
    }
    const compCardRemoveB = document.getElementById("compCardRemoveB");
    if (compCardRemoveB) {
      compCardRemoveB.addEventListener("click", () => this.removeMatchUser(1));
    }

    // Click on matchBar backdrop to close
    const matchBar = document.getElementById("matchBar");
    if (matchBar) {
      matchBar.addEventListener("click", (e) => {
        if (e.target === matchBar && matchBar.classList.contains("expanded")) {
          this.closeComparisonModal();
        }
      });
    }

    // Escape key to close match modal
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const bar = document.getElementById("matchBar");
        if (bar && bar.classList.contains("expanded")) {
          this.closeComparisonModal();
        }
      }
    });
  }

  // ─── Match Mode ────────────────────────────────────────────────────────────

  toggleMatchMode() {
    this.matchMode = !this.matchMode;
    this.selectedForMatch = [];

    const btn = document.getElementById("matchModeBtn");
    const grid = document.getElementById("userGrid");
    const bar = document.getElementById("matchBar");
    const panel = document.getElementById("matchComparisonPanel");
    const barInner = document.querySelector(".match-bar-inner");

    if (this.matchMode) {
      btn.textContent = "✕ Exit Match Mode";
      btn.classList.add("active");
      grid && grid.classList.add("match-mode-active");
      bar && (bar.style.display = "flex");
    } else {
      btn.textContent = "⚡ Match Mode";
      btn.classList.remove("active");
      grid && grid.classList.remove("match-mode-active");
      bar && (bar.style.display = "none");
      panel && (panel.style.display = "none");
      barInner && barInner.classList.remove("expanded");
      bar && bar.classList.remove("expanded");
      // Clear match reason inputs
      const vibeInput = document.getElementById("vibeTextInput");
      const compInput = document.getElementById("complementTextInput");
      const fricInput = document.getElementById("frictionTextInput");
      if (vibeInput) vibeInput.value = "";
      if (compInput) compInput.value = "";
      if (fricInput) fricInput.value = "";
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
    if (card)
      card.classList.toggle("selected", this.selectedForMatch.includes(userId));

    this.updateMatchBar();
  }

  updateMatchBar() {
    const nameA = document.getElementById("matchNameA");
    const nameB = document.getElementById("matchNameB");
    const avatarA = document.getElementById("matchAvatarA");
    const avatarB = document.getElementById("matchAvatarB");
    const confirmBtn = document.getElementById("matchConfirmBtn");
    const panel = document.getElementById("matchComparisonPanel");
    const barInner = document.querySelector(".match-bar-inner");
    const bar = document.getElementById("matchBar");

    const userA = this.selectedForMatch[0]
      ? this.users.find((u) => u.id === this.selectedForMatch[0])
      : null;
    const userB = this.selectedForMatch[1]
      ? this.users.find((u) => u.id === this.selectedForMatch[1])
      : null;

    if (nameA) nameA.textContent = userA ? userA.name : "Select user 1";
    if (nameB) nameB.textContent = userB ? userB.name : "Select user 2";

    if (avatarA) {
      avatarA.style.backgroundImage = userA?._original?.firstImageId
        ? `url(${S3_CONFIG.baseUrl}${userA._original.firstImageId})`
        : "";
      avatarA.textContent = userA ? "" : "?";
      avatarA.dataset.initials = userA ? userA.name.charAt(0) : "?";
    }
    if (avatarB) {
      avatarB.style.backgroundImage = userB?._original?.firstImageId
        ? `url(${S3_CONFIG.baseUrl}${userB._original.firstImageId})`
        : "";
      avatarB.textContent = userB ? "" : "?";
      avatarB.dataset.initials = userB ? userB.name.charAt(0) : "?";
    }

    const chipRemoveA = document.getElementById("chipRemoveA");
    const chipRemoveB = document.getElementById("chipRemoveB");
    if (chipRemoveA) chipRemoveA.style.display = userA ? "inline-flex" : "none";
    if (chipRemoveB) chipRemoveB.style.display = userB ? "inline-flex" : "none";

    if (confirmBtn) confirmBtn.disabled = this.selectedForMatch.length < 2;

    // Show/hide comparison panel
    if (userA && userB && panel) {
      panel.style.display = "block";
      barInner && barInner.classList.add("expanded");
      bar && bar.classList.add("expanded");
      this.populateComparisonPanel(userA, userB);
    } else if (panel) {
      panel.style.display = "none";
      barInner && barInner.classList.remove("expanded");
      bar && bar.classList.remove("expanded");
    }
  }

  clearMatchInputs() {
    const ids = [
      "vibeTextInput",
      "complementTextInput",
      "frictionTextInput",
      "trajectoryTextInput",
      "verdictTextInput",
    ];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  }

  closeComparisonModal() {
    this.selectedForMatch = [];
    this.clearMatchInputs();
    this.updateMatchBar();
    this.renderUsers();
  }

  removeMatchUser(index) {
    if (index >= 0 && index < this.selectedForMatch.length) {
      this.selectedForMatch.splice(index, 1);
      this.clearMatchInputs();
      this.updateMatchBar();
      this.renderUsers();
    }
  }

  populateComparisonPanel(userA, userB) {
    const getImageUrl = (user) => user._original?.firstImageId
      ? `${S3_CONFIG.baseUrl}${user._original.firstImageId}`
      : this.getPlaceholderImage(user.gender);

    // Photos
    const photoA = document.getElementById("compPhotoA");
    const photoB = document.getElementById("compPhotoB");
    if (photoA) photoA.src = getImageUrl(userA);
    if (photoB) photoB.src = getImageUrl(userB);

    // Names
    const nameA = document.getElementById("compNameA");
    const nameB = document.getElementById("compNameB");
    if (nameA) nameA.textContent = `${userA.name}${userA.age ? ', ' + userA.age : ''}`;
    if (nameB) nameB.textContent = `${userB.name}${userB.age ? ', ' + userB.age : ''}`;

    // Meta (college, looking for, preferred gender)
    const metaA = document.getElementById("compMetaA");
    const metaB = document.getElementById("compMetaB");
    const buildMeta = (u) => {
      const parts = [];
      if (u.college && u.college !== 'Not specified') parts.push(`🎓 ${u.college}`);
      if (u.lookingFor) parts.push(`💫 ${u.lookingFor}`);
      if (u.gender) parts.push(u.gender);
      return parts.join(' · ');
    };
    if (metaA) metaA.textContent = buildMeta(userA);
    if (metaB) metaB.textContent = buildMeta(userB);

    // Interest tags
    const tagsA = document.getElementById("compTagsA");
    const tagsB = document.getElementById("compTagsB");
    const renderTags = (interests) => (interests || []).slice(0, 5)
      .map(i => `<span class="tag">${this.escapeHtml(i)}</span>`).join('');
    if (tagsA) tagsA.innerHTML = renderTags(userA.interests);
    if (tagsB) tagsB.innerHTML = renderTags(userB.interests);

    // Shared interests
    const interestsA = (userA.interests || []).map(i => i.toLowerCase());
    const interestsB = (userB.interests || []).map(i => i.toLowerCase());
    const shared = (userA.interests || []).filter(i => interestsB.includes(i.toLowerCase()));

    const sharedSection = document.getElementById("sharedInterests");
    const sharedTags = document.getElementById("sharedTags");
    if (shared.length > 0 && sharedSection && sharedTags) {
      sharedSection.style.display = "flex";
      sharedTags.innerHTML = shared.map(i =>
        `<span class="shared-tag">${this.escapeHtml(i)}</span>`
      ).join('');
    } else if (sharedSection) {
      sharedSection.style.display = "none";
    }

    // Attach event listener for Auto-Generate Pitch
    const btnGeneratePitch = document.getElementById("btnGeneratePitch");
    if (btnGeneratePitch) {
      btnGeneratePitch.onclick = () => this.generatePitch(userA, userB);
    }
  }

  async generatePitch(userA, userB) {
    const btn = document.getElementById("btnGeneratePitch");
    const vibeInput = document.getElementById("vibeTextInput");
    const compInput = document.getElementById("complementTextInput");
    const fricInput = document.getElementById("frictionTextInput");

    if (btn) {
      btn.disabled = true;
      btn.textContent = "✨ Generating...";
    }

    try {
      const url = `${AI_API.baseUrl}${AI_API.endpoints.generatePitch}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          subject_user_id: userB.id,
          viewer_user_id: userA.id,
          subject_user_model: userB._original || {},
          viewer_user_model: userA._original || {},
          subject_signals: userB._original?.signalProfile || {},
          viewer_signals: userA._original?.signalProfile || {}
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error("Failed to generate pitch");
      const data = await response.json();

      // Check for race condition: abort if selected users changed during request
      if (this.selectedForMatch[0] !== userA.id || this.selectedForMatch[1] !== userB.id) {
        return;
      }

      const trajInput = document.getElementById("trajectoryTextInput");
      const verdictInput = document.getElementById("verdictTextInput");

      if (vibeInput) vibeInput.value = data.vibeText || "";
      if (compInput) compInput.value = data.complementText || "";
      if (fricInput) fricInput.value = data.frictionText || "";
      if (trajInput) trajInput.value = data.trajectoryOptions ? data.trajectoryOptions.join("\n") : "";
      if (verdictInput) verdictInput.value = data.verdictText || "";

    } catch (error) {
      console.error(error);
      this.showError("Failed to generate pitch via AI.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "✨ Auto-Generate";
      }
    }
  }

  async confirmMatch() {
    if (this.selectedForMatch.length < 2) return;

    const userA = this.users.find((u) => u.id === this.selectedForMatch[0]);
    const userB = this.users.find((u) => u.id === this.selectedForMatch[1]);

    // Get the match pitch from the textareas
    const vibeInput = document.getElementById("vibeTextInput");
    const compInput = document.getElementById("complementTextInput");
    const fricInput = document.getElementById("frictionTextInput");
    const trajInput = document.getElementById("trajectoryTextInput");
    const verdictInput = document.getElementById("verdictTextInput");
    
    const vibeText = vibeInput ? vibeInput.value.trim() : "";
    const complementText = compInput ? compInput.value.trim() : "";
    const frictionText = fricInput ? fricInput.value.trim() : "";
    const trajectoryText = trajInput ? trajInput.value.trim() : "";
    const verdictText = verdictInput ? verdictInput.value.trim() : "";

    if (!vibeText || !complementText || !frictionText || !trajectoryText || !verdictText) {
      // Highlight empty ones
      [vibeInput, compInput, fricInput, trajInput, verdictInput].forEach(inp => {
        if (inp && !inp.value.trim()) {
          inp.style.borderColor = '#EF4444';
          inp.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
          setTimeout(() => {
            inp.style.borderColor = '';
            inp.style.boxShadow = '';
          }, 3000);
        }
      });
      return;
    }

    const trajectoryOptions = trajectoryText.split('\n').map(t => t.trim()).filter(t => t.length > 0);
    const matchPitch = { vibeText, complementText, frictionText, trajectoryOptions, verdictText };

    const buildCandidate = (user) => {
      const orig = user._original || {};
      return {
        candidateUserId: user.uid || user.id,
        name: user.name,
        age: user.age ? String(user.age) : "",
        location: user.location || "",
        imageId: orig.firstImageId || "",
        secondImageId: orig.secondImageId || "",
        thirdImageId: orig.thirdImageId || "",
        fourthImageId: orig.fourthImageId || "",
        matchPitch: matchPitch,
      };
    };

    const payload = {
      candidate1: buildCandidate(userA),
      candidate2: buildCandidate(userB),
    };

    const confirmBtn = document.getElementById("matchConfirmBtn");
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = "💫 Saving...";
    }

    try {
      const url = `${SUGGESTIONS_API.baseUrl}${SUGGESTIONS_API.endpoints.save}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok)
        throw new Error(`Server responded with ${response.status}`);

      console.log("Match saved:", payload);

      // Track in history
      this.addMatchToHistory(userA.name, userB.name, vibeText);

      // Show success animation
      this.showMatchSuccess(userA.name, userB.name);
    } catch (error) {
      console.error("Failed to save match:", error);
      this.showError(`Failed to save match: ${error.message}`);
    } finally {
      this.selectedForMatch = [];
      this.updateMatchBar();
      document
        .querySelectorAll(".grid-card.selected")
        .forEach((c) => c.classList.remove("selected"));
      if (confirmBtn) {
        confirmBtn.textContent = "💘 Suggest Match";
        confirmBtn.disabled = true;
      }
      // Clear reason inputs
      if (vibeInput) vibeInput.value = "";
      if (compInput) compInput.value = "";
      if (fricInput) fricInput.value = "";
      // Hide comparison panel
      const panel = document.getElementById("matchComparisonPanel");
      if (panel) panel.style.display = "none";
      const barInner = document.querySelector(".match-bar-inner");
      if (barInner) barInner.classList.remove("expanded");
      const bar = document.getElementById("matchBar");
      if (bar) bar.classList.remove("expanded");
    }
  }

  // ─── Grid Rendering ────────────────────────────────────────────────────────

  handleSearch(query) {
    const searchTerm = query.toLowerCase().trim();

    this.filteredUsers = this.users.filter((user) => {
      const matchesSearch =
        searchTerm === "" ||
        user.name.toLowerCase().includes(searchTerm) ||
        String(user.college || "").toLowerCase().includes(searchTerm);

      const matchesGender =
        this.currentGenderFilter === "all" ||
        user.gender === this.currentGenderFilter;

      const traits = user._original?.curatedProfile?.personalityTraits || [];
      const matchesTrait = 
        this.currentTraitFilter === "all" ||
        traits.includes(this.currentTraitFilter);

      return matchesSearch && matchesGender && matchesTrait;
    });

    this.renderUsers();
    this.updateStats();
  }

  populateTraitDropdown() {
    const traitSelect = document.getElementById("traitFilter");
    if (!traitSelect) return;

    const traits = new Set();
    this.users.forEach(u => {
      const uTraits = u._original?.curatedProfile?.personalityTraits;
      if (uTraits && Array.isArray(uTraits)) {
        uTraits.forEach(t => traits.add(t));
      }
    });

    const sortedTraits = Array.from(traits).sort();
    
    let optionsHtml = '<option value="all">All Traits</option>';
    sortedTraits.forEach(trait => {
      optionsHtml += `<option value="${this.escapeHtml(trait)}">${this.escapeHtml(trait)}</option>`;
    });

    traitSelect.innerHTML = optionsHtml;
  }

  handleTraitFilter(trait) {
    this.currentTraitFilter = trait;
    
    const genderContainer = document.getElementById("genderToggleContainer");
    if (genderContainer) {
      if (trait !== "all") {
        genderContainer.style.display = "none";
        // Reset gender filter to all when switching to trait view
        if (this.currentGenderFilter !== "all") {
          this.handleGenderFilter("all");
          return; // handleGenderFilter calls handleSearch
        }
      } else {
        genderContainer.style.display = "flex";
      }
    }

    const searchInput = document.getElementById("searchInput");
    this.handleSearch(searchInput ? searchInput.value : "");
  }

  handleGenderFilter(gender) {
    this.currentGenderFilter = gender;

    document.querySelectorAll(".gender-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.gender === gender);
    });

    const searchInput = document.getElementById("searchInput");
    this.handleSearch(searchInput ? searchInput.value : "");
  }

  renderUsers() {
    const container = document.getElementById("userGrid");

    if (!container) {
      console.error("User grid container not found");
      return;
    }

    if (this.filteredUsers.length === 0) {
      container.innerHTML = this.getEmptyState();
      return;
    }

    if (this.currentTraitFilter && this.currentTraitFilter !== "all") {
      const men = this.filteredUsers.filter(u => u.gender === 'Man');
      const women = this.filteredUsers.filter(u => u.gender === 'Woman');

      container.innerHTML = `
        <div class="trait-split-container" style="grid-column: 1 / -1;">
          <div class="trait-column">
            <h3 class="trait-column-title title-men">Men (${men.length})</h3>
            <div class="user-grid split-mode">
              ${men.map(u => this.createGridCard(u)).join("")}
            </div>
          </div>
          <div class="trait-column">
            <h3 class="trait-column-title title-women">Women (${women.length})</h3>
            <div class="user-grid split-mode">
              ${women.map(u => this.createGridCard(u)).join("")}
            </div>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = this.filteredUsers
        .map((user) => this.createGridCard(user))
        .join("");
    }
    
    this.attachUserClickListeners();
  }

  createGridCard(user) {
    const imageUrl = user._original?.firstImageId
      ? `${S3_CONFIG.baseUrl}${user._original.firstImageId}`
      : this.getPlaceholderImage(user.gender);

    const trimmedName = this.escapeHtml((user.name || "").trim());
    const age = user.age ? `, ${user.age}` : "";

    // Determine badge content: show number (1 or 2) if selected
    const selIdx = this.selectedForMatch.indexOf(user.id);
    const isSelected = selIdx !== -1;
    const badgeContent = isSelected ? (selIdx + 1) : '✓';

    // Extra info rows — label is first letter of field name
    const infoRows = this.buildCardInfoRows(user);

    // Suggestion + conversation pills — shown right next to the name
    const namePills = this._buildNamePills(user);

    return `
      <div class="grid-card${isSelected ? " selected" : ""}" data-user-id="${user.id}">
        ${this.matchMode ? `<div class="card-select-badge">${badgeContent}</div>` : ""}
        <div class="grid-card-image-wrapper">
          <img 
            src="${imageUrl}" 
            alt="${trimmedName}"
            class="grid-card-image"
            onerror="this.src='${this.getPlaceholderImage(user.gender)}'"
          >
        </div>
        <div class="grid-card-content">
          <div class="grid-card-name-row">
            <span class="grid-card-name">${trimmedName}${age}</span>
            <span class="card-name-pills">${namePills}</span>
          </div>
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
      const chips = user.interests
        .map(
          (i) =>
            `<span class="card-interest-chip">${this.escapeHtml(i)}</span>`,
        )
        .join("");
      rows.push(`<div class="card-info-row card-info-row--full">
        <span class="card-info-label">I</span>
        <div class="card-interests">${chips}</div>
      </div>`);
    }

    // T: Personality Traits
    const traits = user._original?.curatedProfile?.personalityTraits || user._original?.personalDescription?.personalityList || [];
    if (traits.length > 0) {
      const traitChips = traits
        .map(
          (t) =>
            `<span class="card-interest-chip" style="background: rgba(139, 92, 246, 0.2); border-color: rgba(139, 92, 246, 0.4);">${this.escapeHtml(t)}</span>`,
        )
        .join("");
      rows.push(`<div class="card-info-row card-info-row--full">
        <span class="card-info-label" style="color: var(--color-primary-light);">T</span>
        <div class="card-interests">${traitChips}</div>
      </div>`);
    }

    // S: Suggestions & Conversations — explicit list of suggested candidate names, ages & expiry
    const uid = user.uid || user.id;
    const sd = this.suggestionData[uid];
    if (sd) {
      if (sd.candidates && sd.candidates.length > 0) {
        const candidateItemsHtml = sd.candidates.map(c => {
          const diffMs = c.expiry - new Date();
          const diffHrs = Math.floor(diffMs / 3600000);
          const diffMin = Math.floor((diffMs % 3600000) / 60000);
          let expClass = "ok";
          let expText = "";
          if (diffMs <= 0) {
            expClass = "expired";
            expText = "Expired";
          } else if (diffHrs < 6) {
            expClass = "urgent";
            expText = diffHrs > 0 ? `${diffHrs}h ${diffMin}m` : `${diffMin}m`;
          } else if (diffHrs < 24) {
            expClass = "soon";
            expText = `${diffHrs}h ${diffMin}m`;
          } else {
            const d = Math.floor(diffHrs / 24);
            const h = diffHrs % 24;
            expClass = "ok";
            expText = `${d}d ${h}h`;
          }

          const candidateAgeStr = c.age ? `, ${this.escapeHtml(c.age)}` : "";
          return `<div class="card-sugg-candidate-item">
            <span class="card-sugg-candidate-name">👉 <strong>${this.escapeHtml(c.name)}</strong>${candidateAgeStr}</span>
            <span class="card-sugg-expiry-badge card-sugg-expiry-badge--${expClass}">⏳ ${expText}</span>
          </div>`;
        }).join("");

        rows.push(`<div class="card-info-row card-info-row--full">
          <span class="card-info-label" style="color: #A78BFA;">S</span>
          <div class="card-sugg-container">
            <div class="card-sugg-title-bar">
              <strong>${sd.pendingCount} Suggestion${sd.pendingCount > 1 ? 's' : ''}</strong>
            </div>
            <div class="card-sugg-candidates-list">
              ${candidateItemsHtml}
            </div>
          </div>
        </div>`);
      } else {
        rows.push(`<div class="card-info-row card-info-row--full">
          <span class="card-info-label" style="color: var(--color-text-muted);">S</span>
          <span class="card-sugg-none">0 Pending Suggestions</span>
        </div>`);
      }

      // 💬 Conversations count
      rows.push(`<div class="card-info-row">
        <span class="card-info-label card-info-label--conv">💬</span>
        <span class="card-conv-pill">${sd.conversations} Conversation${sd.conversations !== 1 ? 's' : ''}</span>
      </div>`);
    }

    if (rows.length === 0) return "";
    return `<div class="card-extra-info">${rows.join("")}</div>`;
  }

  getPlaceholderImage(gender) {
    const color = gender === "Woman" ? "#EC4899" : "#8B5CF6";
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
    const userElements = document.querySelectorAll(".grid-card");
    userElements.forEach((element) => {
      element.addEventListener("click", () => {
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
    const user = this.users.find((u) => u.id === userId);
    if (!user) return;

    const original = user._original || {};
    const curated = original.curatedProfile || {};
    const imageUrl = original.firstImageId
      ? `${S3_CONFIG.baseUrl}${original.firstImageId}`
      : this.getPlaceholderImage(user.gender);

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <span class="modal-close">&times;</span>
        
        <img src="${imageUrl}" alt="${this.escapeHtml(user.name)}" class="modal-profile-image" 
             onerror="this.src='${this.getPlaceholderImage(user.gender)}'">
        
        <h2 style="text-align: center; margin-bottom: var(--spacing-xl);">
          ${this.escapeHtml(user.name)}${user.age ? `, ${user.age}` : ""}
        </h2>

        ${this.renderBasicInfo(user)}
        ${this.renderSuggestionsSection(user)}
        ${this.renderPersonalityTraits(curated.personalityTraits)}
        ${this.renderInterests(curated.interests)}
        ${this.renderConversationStyle(curated.conversationStyleDescription)}
        ${this.renderAboutMe(curated.aboutMe)}
        ${this.renderAdditionalDetails(user, original)}

        <button class="btn-select-match" data-uid="${user.id}">⚡ Select for Match</button>
      </div>
    `;

    document.body.appendChild(modal);

    // "Select for Match" button handler
    const selectBtn = modal.querySelector('.btn-select-match');
    if (selectBtn) {
      selectBtn.addEventListener('click', () => {
        modal.remove();
        // Enter match mode if not already
        if (!this.matchMode) {
          this.toggleMatchMode();
        }
        // Select this user
        if (!this.selectedForMatch.includes(user.id) && this.selectedForMatch.length < 2) {
          this.handleCardSelectForMatch(user.id);
          // Re-render to update badge
          this.renderUsers();
        }
      });
    }

    modal.addEventListener("click", (e) => {
      if (
        e.target.classList.contains("modal") ||
        e.target.classList.contains("modal-close")
      ) {
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
          ${
            user.gender
              ? `
          <div class="detail-row">
            <span class="detail-label">Gender:</span>
            <span class="detail-value">${user.gender}</span>
          </div>
          `
              : ""
          }
          ${
            user.lookingFor
              ? `
          <div class="detail-row">
            <span class="detail-label">Looking For:</span>
            <span class="detail-value">${user.lookingFor}</span>
          </div>
          `
              : ""
          }
          ${
            user.preferredGender
              ? `
          <div class="detail-row">
            <span class="detail-label">Prefers:</span>
            <span class="detail-value">${user.preferredGender}</span>
          </div>
          `
              : ""
          }
        </div>
      </div>
    `;
  }

  renderSuggestionsSection(user) {
    const uid = user.uid || user.id;
    const sd = this.suggestionData[uid];
    if (!sd) return "";

    const candidates = sd.candidates || [];
    const now = new Date();

    const candidateCards = candidates.length > 0
      ? candidates.map(c => {
          const diffMs = c.expiry - now;
          const diffHrs = Math.floor(diffMs / 3600000);
          const diffMin = Math.floor((diffMs % 3600000) / 60000);
          let expClass = "ok";
          let expText = "";
          if (diffMs <= 0) {
            expClass = "expired";
            expText = "Expired";
          } else if (diffHrs < 6) {
            expClass = "urgent";
            expText = diffHrs > 0 ? `${diffHrs}h ${diffMin}m` : `${diffMin}m`;
          } else if (diffHrs < 24) {
            expClass = "soon";
            expText = `${diffHrs}h ${diffMin}m`;
          } else {
            expClass = "ok";
            expText = `${Math.floor(diffHrs / 24)}d ${diffHrs % 24}h`;
          }

          const candidateAgeStr = c.age ? `, ${this.escapeHtml(c.age)}` : "";
          return `
            <div class="modal-candidate-card">
              <div class="modal-candidate-header">
                <span class="modal-candidate-name">👉 <strong>${this.escapeHtml(c.name)}</strong>${candidateAgeStr}</span>
                <span class="modal-expiry-badge modal-expiry-badge--${expClass}">⏳ Expires in ${expText}</span>
              </div>
              ${c.matchReason ? `<div class="modal-candidate-reason">💡 ${this.escapeHtml(c.matchReason)}</div>` : ""}
            </div>
          `;
        }).join("")
      : `<p style="color: var(--color-text-muted);">No pending suggestions</p>`;

    return `
      <div class="modal-section">
        <div class="modal-section-title">
          📬 Pending Suggestions (${sd.pendingCount}) &amp; Expiry
        </div>
        <div class="modal-suggestions-container">
          ${candidateCards}
        </div>
      </div>
    `;
  }

  renderPersonalityTraits(traits) {
    if (!traits || traits.length === 0) return "";

    return `
      <div class="modal-section">
        <div class="modal-section-title">
          ✨ Personality Traits
        </div>
        <div class="personality-traits">
          ${traits.map((trait) => `<span class="trait-badge">${this.escapeHtml(trait)}</span>`).join("")}
        </div>
      </div>
    `;
  }

  renderInterests(interests) {
    if (!interests || interests.length === 0) return "";

    return `
      <div class="modal-section">
        <div class="modal-section-title">
          💡 Interests
        </div>
        <div class="interests-list">
          ${interests.map((interest) => `<span class="interest-badge">${this.escapeHtml(interest)}</span>`).join("")}
        </div>
      </div>
    `;
  }

  renderConversationStyle(description) {
    if (!description) return "";

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
    if (!aboutMe) return "";

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
            <span class="detail-value ${user.verified ? "verified" : "unverified"}">${user.verified ? "✓ Yes" : "✗ No"}</span>
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
    const activeUsers = this.users.filter((u) => u.status === "active").length;
    const verifiedUsers = this.users.filter((u) => u.verified).length;
    const displayedUsers = this.filteredUsers.length;

    this.updateStatCard("totalUsers", totalUsers);
    this.updateStatCard("activeUsers", activeUsers);
    this.updateStatCard("verifiedUsers", verifiedUsers);
    this.updateStatCard("displayedUsers", displayedUsers);
    this.updateStatCard("matchesMade", this.matchHistory.length);
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

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      this.handleSearch(searchInput.value);
    } else {
      this.renderUsers();
    }

    this.showLoading(false);
    this.showToast("Data refreshed successfully!");
  }

  // ─── UI Helpers ────────────────────────────────────────────────────────────

  showLoading(show) {
    const loader = document.getElementById("loader");
    if (loader) {
      loader.style.display = show ? "flex" : "none";
    }
  }

  showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
  }

  showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ─── Match History ──────────────────────────────────────────────────────────

  loadMatchHistory() {
    try {
      const saved = localStorage.getItem('jiffy_match_history');
      this.matchHistory = saved ? JSON.parse(saved) : [];
    } catch (e) {
      this.matchHistory = [];
    }
    this.renderRecentMatches();
  }

  addMatchToHistory(nameA, nameB, reason) {
    const entry = {
      nameA,
      nameB,
      reason,
      timestamp: new Date().toISOString(),
    };
    this.matchHistory.unshift(entry);
    // Keep last 50
    if (this.matchHistory.length > 50) this.matchHistory.pop();
    this.sessionMatchCount++;

    try {
      localStorage.setItem('jiffy_match_history', JSON.stringify(this.matchHistory));
    } catch (e) {
      console.warn('Failed to save match history:', e);
    }

    this.updateStatCard('matchesMade', this.matchHistory.length);
    this.renderRecentMatches();
  }

  renderRecentMatches() {
    const section = document.getElementById('recentMatchesSection');
    const list = document.getElementById('recentMatchesList');
    if (!section || !list) return;

    if (this.matchHistory.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    list.innerHTML = this.matchHistory.slice(0, 20).map(entry => {
      const time = this.formatRelativeTime(entry.timestamp);
      return `
        <div class="recent-match-item">
          <div class="match-pair">
            <span class="person">${this.escapeHtml(entry.nameA)}</span>
            <span class="separator">💕</span>
            <span class="person">${this.escapeHtml(entry.nameB)}</span>
          </div>
          <span class="match-time">${time}</span>
        </div>
      `;
    }).join('');
  }

  // ─── Success Animation ──────────────────────────────────────────────────────

  showMatchSuccess(nameA, nameB) {
    const overlay = document.createElement('div');
    overlay.className = 'match-success-overlay';
    overlay.innerHTML = `
      <div class="match-success-content">
        <div class="match-success-emoji">💘</div>
        <div class="match-success-text">Match Suggested!</div>
        <div class="match-success-sub">${this.escapeHtml(nameA)} & ${this.escapeHtml(nameB)}</div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', () => overlay.remove());
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.5s ease';
        setTimeout(() => overlay.remove(), 500);
      }
    }, 2000);
  }

  // ─── Utility ───────────────────────────────────────────────────────────────

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return this.formatDate(dateString);
  }
}

// Initialize app when DOM is ready
let dashboardInstance = null;
document.addEventListener("DOMContentLoaded", () => {
  dashboardInstance = new UserDashboard();
});

// ─── Suggestions & Conversations (inline card data) ──────────────────────────

UserDashboard.prototype.fetchAllSuggestionData = async function () {
  const SUGGESTION_EXPIRY_MS = 72 * 60 * 60 * 1000; // 72h
  const BASE = "https://limitless-sea-53782-2c45e56f3e92.herokuapp.com";

  // Fetch all users in parallel; update cards as each result comes in
  await Promise.allSettled(
    this.users.map(async (user) => {
      const uid = user.uid || user.id;
      let pendingCount = 0;
      let nearestExpiry = null;
      let candidateDetails = [];

      try {
        const res = await fetch(`${BASE}/api/suggestions/${uid}`, {
          signal: AbortSignal.timeout(10000)
        });
        if (res.ok) {
          const data = await res.json();
          const candidates = data.candidates || [];
          pendingCount = candidates.length;

          candidateDetails = candidates.map((c) => {
            const createdAt = c.createdAt ? new Date(c.createdAt) : new Date();
            const expiry = new Date(createdAt.getTime() + SUGGESTION_EXPIRY_MS);
            if (!nearestExpiry || expiry < nearestExpiry) {
              nearestExpiry = expiry;
            }
            return {
              candidateUserId: c.candidateUserId,
              name: c.name || "Candidate",
              age: c.age || "",
              location: c.location || "",
              compatibilityScore: c.compatibilityScore,
              matchReason: c.matchReason,
              expiry: expiry
            };
          });
        }
      } catch (e) {
        // timeout / network error — keep defaults
      }

      const conversations = user._original?.matches?.length ?? 0;

      // Store candidate details and re-render card info
      this.suggestionData[uid] = {
        pendingCount,
        nearestExpiry,
        conversations,
        candidates: candidateDetails
      };
      this._updateCardInPlace(uid);
    })
  );
};

// Update both name-row pills and card info rows
UserDashboard.prototype._updateCardInPlace = function (uid) {
  const card = document.querySelector(`.grid-card[data-user-id="${uid}"]`);
  if (!card) return;
  const user = this.users.find((u) => (u.uid || u.id) === uid);
  if (!user) return;

  const pillsSpan = card.querySelector(".card-name-pills");
  if (pillsSpan) pillsSpan.innerHTML = this._buildNamePills(user);

  const existingExtraInfo = card.querySelector(".card-extra-info");
  const newExtraHtml = this.buildCardInfoRows(user);
  if (existingExtraInfo) {
    existingExtraInfo.outerHTML = newExtraHtml;
  } else {
    const content = card.querySelector(".grid-card-content");
    if (content) content.insertAdjacentHTML("beforeend", newExtraHtml);
  }
};

// Build the compact pills shown adjacent to the user's name
UserDashboard.prototype._buildNamePills = function (user) {
  const uid = user.uid || user.id;
  const sd = this.suggestionData[uid];
  if (!sd) return "";

  const parts = [];

  // Pending count badge
  parts.push(sd.pendingCount > 0
    ? `<span class="card-sugg-pill card-sugg-pill--active">${sd.pendingCount} 📬</span>`
    : `<span class="card-sugg-pill card-sugg-pill--none">0 📬</span>`);

  // Expiry badge (only when there are pending suggestions)
  if (sd.pendingCount > 0 && sd.nearestExpiry) {
    const diffMs  = sd.nearestExpiry - new Date();
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMin = Math.floor((diffMs % 3600000) / 60000);
    if (diffMs <= 0) {
      parts.push(`<span class="card-sugg-expiry card-sugg-expiry--expired">exp.</span>`);
    } else if (diffHrs < 6) {
      const t = diffHrs > 0 ? `${diffHrs}h` : `${diffMin}m`;
      parts.push(`<span class="card-sugg-expiry card-sugg-expiry--urgent">⚠ ${t}</span>`);
    } else if (diffHrs < 24) {
      parts.push(`<span class="card-sugg-expiry card-sugg-expiry--soon">${diffHrs}h</span>`);
    } else {
      parts.push(`<span class="card-sugg-expiry card-sugg-expiry--ok">${Math.floor(diffHrs/24)}d</span>`);
    }
  }

  // Conversations badge
  parts.push(sd.conversations > 0
    ? `<span class="card-conv-pill">${sd.conversations} 💬</span>`
    : `<span class="card-conv-pill card-conv-pill--zero">0 💬</span>`);

  return parts.join("");
};


// ─── Recent Matches Toggle ────────────────────────────────────────────────────

function toggleRecentMatches() {
  const list = document.getElementById('recentMatchesList');
  const toggle = document.getElementById('recentMatchesToggle');
  if (list) list.classList.toggle('collapsed');
  if (toggle) toggle.classList.toggle('collapsed');
}

// ─── Create User Modal Functions ──────────────────────────────────────────────

function openCreateUserModal() {
  const modal = document.getElementById("createUserModal");
  if (modal) {
    modal.style.display = "flex";
    // Auto-generate UID for form mode
    generateUid();
  }
}

function closeCreateUserModal() {
  const modal = document.getElementById("createUserModal");
  if (modal) modal.style.display = "none";
  // Clear feedback
  const feedback = document.getElementById("createUserFeedback");
  if (feedback) {
    feedback.style.display = "none";
    feedback.className = "create-user-feedback";
  }
}

function switchCreateTab(tab) {
  // Toggle active tab button
  document.querySelectorAll(".create-user-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  // Toggle tab content
  document.getElementById("formTab").classList.toggle("active", tab === "form");
  document.getElementById("jsonTab").classList.toggle("active", tab === "json");
}

function toggleSection(legend) {
  const body = legend.nextElementSibling;
  if (body) {
    body.classList.toggle("collapsed");
    legend.textContent = body.classList.contains("collapsed")
      ? legend.textContent.replace("▾", "▸")
      : legend.textContent.replace("▸", "▾");
  }
}

function generateUid() {
  // Firebase-like uid: 28 alphanumeric characters
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let uid = "";
  for (let i = 0; i < 28; i++)
    uid += chars.charAt(Math.floor(Math.random() * chars.length));
  const input = document.getElementById("formUid");
  if (input) input.value = uid;
}

function parseCommaSeparated(value) {
  if (!value || !value.trim()) return null;
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function submitFormUser(event) {
  event.preventDefault();
  const form = document.getElementById("createUserForm");
  const btn = document.getElementById("formSubmitBtn");
  btn.disabled = true;
  btn.textContent = "⏳ Submitting...";

  try {
    const fd = new FormData(form);
    const get = (name) => fd.get(name)?.toString().trim() || "";

    // Build the request payload matching ManualUserRequest DTO
    const payload = {
      name: get("name"),
      uid: get("uid"),
    };

    // Optional string fields
    if (get("email")) payload.email = get("email");
    if (get("phoneNumber")) payload.phoneNumber = get("phoneNumber");
    if (get("bio")) payload.bio = get("bio");
    if (get("firstImageId")) payload.firstImageId = get("firstImageId");

    // Image IDs
    const imageIds = parseCommaSeparated(get("imageIds"));
    if (imageIds) payload.imageIds = imageIds;

    // Basic Details
    const gender = get("gender");
    const preferredGender = get("preferredGender");
    const birthDate = get("birthDate");
    const height = get("height");
    if (gender || preferredGender || birthDate || height) {
      payload.basicDetails = {};
      payload.basicDetails.name = get("name"); // sync name
      if (gender) payload.basicDetails.gender = gender;
      if (preferredGender)
        payload.basicDetails.preferredGender = preferredGender;
      if (birthDate) payload.basicDetails.birthDate = birthDate;
      if (height) payload.basicDetails.height = parseInt(height);
    }

    // Personal Description
    const personalityList = parseCommaSeparated(get("personalityList"));
    const preferredActivityList = parseCommaSeparated(
      get("preferredActivityList"),
    );
    const filmAndTVList = parseCommaSeparated(get("filmAndTVList"));
    const languageList = parseCommaSeparated(get("languageList"));
    const typeOfDrinker = get("typeOfDrinker");
    const typeOfSmoker = get("typeOfSmoker");
    if (
      personalityList ||
      preferredActivityList ||
      filmAndTVList ||
      languageList ||
      typeOfDrinker ||
      typeOfSmoker
    ) {
      payload.personalDescription = {};
      if (personalityList)
        payload.personalDescription.personalityList = personalityList;
      if (preferredActivityList)
        payload.personalDescription.preferredActivityList =
          preferredActivityList;
      if (filmAndTVList)
        payload.personalDescription.filmAndTVList = filmAndTVList;
      if (languageList) payload.personalDescription.languageList = languageList;
      if (typeOfDrinker)
        payload.personalDescription.typeOfDrinker = typeOfDrinker;
      if (typeOfSmoker) payload.personalDescription.typeOfSmoker = typeOfSmoker;
    }

    // Weekend Plans
    const goingOut = parseCommaSeparated(get("goingOut"));
    const stayingIn = parseCommaSeparated(get("stayingIn"));
    if (goingOut || stayingIn) {
      payload.weekendPlans = {};
      if (goingOut) payload.weekendPlans.goingOut = goingOut;
      if (stayingIn) payload.weekendPlans.stayingIn = stayingIn;
    }

    // Date Timing
    const dateRightNow =
      form.querySelector('[name="dateRightNow"]')?.checked || false;
    const preferredDateSessions = parseCommaSeparated(
      get("preferredDateSessions"),
    );
    if (dateRightNow || preferredDateSessions) {
      payload.dateTiming = {};
      payload.dateTiming.dateRightNow = dateRightNow;
      if (preferredDateSessions)
        payload.dateTiming.preferredDateSessions = preferredDateSessions;
    }

    // Professional Details
    const university = get("university");
    const graduationYear = get("graduationYear");
    const companyName = get("companyName");
    const titleCompany = get("titleCompany");
    if (university || graduationYear || companyName || titleCompany) {
      payload.professionalDetails = {};
      if (university) payload.professionalDetails.university = university;
      if (graduationYear)
        payload.professionalDetails.graduationYear = parseInt(graduationYear);
      if (companyName) payload.professionalDetails.companyName = companyName;
      if (titleCompany) payload.professionalDetails.titleCompany = titleCompany;
    }

    // Desired Qualities
    const lookingFor = get("lookingFor");
    const socialPersonalityList = parseCommaSeparated(
      get("socialPersonalityList"),
    );
    const preferredActivitiesList = parseCommaSeparated(
      get("preferredActivitiesList"),
    );
    const idealDate = get("idealDate");
    const drinkingType = get("drinkingType");
    const smokerType = get("smokerType");
    if (
      lookingFor ||
      socialPersonalityList ||
      preferredActivitiesList ||
      idealDate ||
      drinkingType ||
      smokerType
    ) {
      payload.desiredQualities = {};
      if (lookingFor) payload.desiredQualities.lookingFor = lookingFor;
      if (socialPersonalityList)
        payload.desiredQualities.socialPersonalityList = socialPersonalityList;
      if (preferredActivitiesList)
        payload.desiredQualities.preferredActivitiesList =
          preferredActivitiesList;
      if (idealDate) payload.desiredQualities.idealDate = idealDate;
      if (drinkingType) payload.desiredQualities.drinkingType = drinkingType;
      if (smokerType) payload.desiredQualities.smokerType = smokerType;
    }

    // Attractiveness Basic Info
    const prefferedStartAge = get("prefferedStartAge");
    const prefferedEndAge = get("prefferedEndAge");
    const prefferedHeight = get("prefferedHeight");
    const maxDistance = get("maxDistance");
    const desiredLanguageList = parseCommaSeparated(get("desiredLanguageList"));
    if (
      prefferedStartAge ||
      prefferedEndAge ||
      prefferedHeight ||
      maxDistance ||
      desiredLanguageList
    ) {
      payload.attractivenessBasicInfo = {};
      if (prefferedStartAge)
        payload.attractivenessBasicInfo.prefferedStartAge =
          parseInt(prefferedStartAge);
      if (prefferedEndAge)
        payload.attractivenessBasicInfo.prefferedEndAge =
          parseInt(prefferedEndAge);
      if (prefferedHeight)
        payload.attractivenessBasicInfo.prefferedHeight =
          parseInt(prefferedHeight);
      if (maxDistance)
        payload.attractivenessBasicInfo.maxDistance = parseInt(maxDistance);
      if (desiredLanguageList)
        payload.attractivenessBasicInfo.languageList = desiredLanguageList;
    }

    // Location
    const latitude = get("latitude");
    const longitude = get("longitude");
    if (latitude && longitude) {
      payload.locationX = parseFloat(longitude); // x = longitude
      payload.locationY = parseFloat(latitude); // y = latitude
    }

    // Matching Profile
    const energy = get("energy");
    const depthPreference = get("depthPreference");
    const communicationStyle = get("communicationStyle");
    const openness = get("openness");
    if (energy || depthPreference || communicationStyle || openness) {
      payload.matchingProfile = {};
      if (energy) payload.matchingProfile.energy = energy;
      if (depthPreference)
        payload.matchingProfile.depthPreference = depthPreference;
      if (communicationStyle)
        payload.matchingProfile.communicationStyle = communicationStyle;
      if (openness) payload.matchingProfile.openness = parseFloat(openness);
    }

    // Curated Profile
    const personalityTraits = parseCommaSeparated(get("personalityTraits"));
    const interests = parseCommaSeparated(get("interests"));
    const conversationStyleDescription = get("conversationStyleDescription");
    if (personalityTraits || interests || conversationStyleDescription) {
      payload.curatedProfile = {};
      if (personalityTraits)
        payload.curatedProfile.personalityTraits = personalityTraits;
      if (interests) payload.curatedProfile.interests = interests;
      if (conversationStyleDescription)
        payload.curatedProfile.conversationStyleDescription =
          conversationStyleDescription;
    }

    // Generated Questions
    const questionsRaw = get("generatedQuestions");
    if (questionsRaw) {
      payload.generatedQuestions = questionsRaw
        .split("\n")
        .map((q) => q.trim())
        .filter((q) => q.length > 0);
    }

    // Status
    payload.onboardingStatus = get("onboardingStatus") || "COMPLETED";
    payload.isVerified =
      form.querySelector('[name="isVerified"]')?.checked ?? true;
    payload.isPhoneVerified =
      form.querySelector('[name="isPhoneVerified"]')?.checked ?? false;
    const chatCount = get("chatCount");
    if (chatCount) payload.chatCount = parseInt(chatCount);

    console.log("Submitting form user:", payload);

    const url = `${API_CONFIG.apiBaseUrl}${API_CONFIG.endpoints.createManualUser}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error || `HTTP ${response.status}`);
    }

    const savedUser = await response.json();
    showCreateFeedback(
      "success",
      `✅ User "${savedUser.name}" created/updated successfully! (uid: ${savedUser.uid})`,
    );

    // Refresh the dashboard grid
    if (dashboardInstance) dashboardInstance.refresh();
  } catch (error) {
    console.error("Form submit error:", error);
    showCreateFeedback("error", `❌ ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = "🚀 Create / Upsert User";
  }
}

async function submitJsonUser() {
  const textarea = document.getElementById("jsonInput");
  const btn = document.getElementById("jsonSubmitBtn");

  if (!textarea || !textarea.value.trim()) {
    showCreateFeedback("error", "❌ Please paste JSON first.");
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(textarea.value.trim());
  } catch (e) {
    showCreateFeedback("error", `❌ Invalid JSON: ${e.message}`);
    return;
  }

  btn.disabled = true;
  btn.textContent = "⏳ Submitting...";

  try {
    const url = `${API_CONFIG.apiBaseUrl}${API_CONFIG.endpoints.upsertManualUserJson}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error || `HTTP ${response.status}`);
    }

    const savedUser = await response.json();
    showCreateFeedback(
      "success",
      `✅ User "${savedUser.name}" upserted via JSON! (uid: ${savedUser.uid})`,
    );

    // Refresh the dashboard grid
    if (dashboardInstance) dashboardInstance.refresh();
  } catch (error) {
    console.error("JSON submit error:", error);
    showCreateFeedback("error", `❌ ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = "🚀 Submit JSON";
  }
}

function validateJson() {
  const textarea = document.getElementById("jsonInput");
  if (!textarea || !textarea.value.trim()) {
    showCreateFeedback("error", "❌ No JSON to validate.");
    return;
  }
  try {
    const parsed = JSON.parse(textarea.value.trim());
    const keys = Object.keys(parsed);
    showCreateFeedback(
      "info",
      `✅ Valid JSON — ${keys.length} top-level keys: ${keys.slice(0, 8).join(", ")}${keys.length > 8 ? "..." : ""}`,
    );
  } catch (e) {
    showCreateFeedback("error", `❌ Invalid JSON: ${e.message}`);
  }
}

function showCreateFeedback(type, message) {
  const feedback = document.getElementById("createUserFeedback");
  if (!feedback) return;
  feedback.className = `create-user-feedback ${type}`;
  feedback.textContent = message;
  feedback.style.display = "block";
  // Auto-hide success after 5s
  if (type === "success") {
    setTimeout(() => {
      feedback.style.display = "none";
    }, 5000);
  }
}
