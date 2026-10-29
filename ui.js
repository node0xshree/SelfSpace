window.ShelfSpace = window.ShelfSpace || {};

(function (app) {
  const navItems = [
    { page: "catalog", label: "Catalog", href: "index.html" },
    { page: "loans", label: "My Loans", href: "loans.html" },
    { page: "reservations", label: "Reservations & Bookings", href: "reservations.html" },
    { page: "history", label: "History", href: "history.html" },
    { page: "admin", label: "Admin Dashboard", href: "admin.html", admin: true },
    { page: "reports", label: "Reports", href: "reports.html", admin: true }
  ];

  const categoryIcons = {
    Book: "📚",
    "Lab Equipment": "🧪",
    Room: "🏛️",
    "Sports Gear": "🏸"
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function formatDate(value) {
    if (!value) return "—";
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    if (!year || !month || !day) return "—";
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date(year, month - 1, day, 12));
  }

  function money(amount) {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  }

  function memberName(state, memberId) {
    return state.members.find((member) => member.id === memberId)?.name || "Unknown member";
  }

  function itemName(state, itemId) {
    return state.items.find((item) => item.id === itemId)?.name || "Unknown resource";
  }

  function getPageHeading(page) {
    const headings = {
      catalog: ["Resource catalog", "Find your next resource", "Explore books, lab tools, team rooms, and sports gear from one place."],
      loans: ["Your account", "My loans", "Keep track of what you have borrowed and when it is due."],
      reservations: ["Plan ahead", "Reservations and bookings", "Join a waiting list or book a room or lab resource for a time slot."],
      history: ["Your activity", "Borrowing history", "A clear record of completed loans for members and resources."],
      admin: ["Staff workspace", "Admin dashboard", "A quick view of active loans, overdue resources, and today's activity."],
      reports: ["Insights", "Resource reports", "See borrowing patterns and outstanding fines at a glance."]
    };
    return headings[page] || headings.catalog;
  }

  function renderHeader(state, page) {
    const activeMemberId = state.settings.activeMemberId;
    const currentTheme = app.storage.getTheme();
    const nav = navItems
      .filter((item) => !item.admin || state.settings.activeRole === "Admin")
      .map((item) => `<a class="nav-link" href="${item.href}"${item.page === page ? ' aria-current="page"' : ""}>${item.label}</a>`)
      .join("");
    const memberOptions = state.members.map((member) =>
      `<option value="member:${escapeHtml(member.id)}"${state.settings.activeRole === "Member" && member.id === activeMemberId ? " selected" : ""}>${escapeHtml(member.name)}</option>`
    ).join("");

    document.getElementById("site-header").innerHTML = `
      <header class="site-header">
        <div class="header-inner">
          <a class="brand" href="index.html" aria-label="ShelfSpace home">
            <span class="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none"><path d="M5 5.5c2.6-.8 4.9-.5 7 1v13c-2.1-1.5-4.4-1.8-7-1v-13Zm14 0c-2.6-.8-4.9-.5-7 1v13c2.1-1.5 4.4-1.8 7-1v-13Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 9h1.5M15 9h1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </span>
            <span>ShelfSpace</span>
          </a>
          <nav class="top-nav" aria-label="Main navigation">${nav}</nav>
          <div class="header-actions">
            <label class="sr-only" for="user-switch">Switch user or role</label>
            <select id="user-switch" class="select-field user-select" aria-label="Switch user or role">
              ${memberOptions}
              <option value="admin"${state.settings.activeRole === "Admin" ? " selected" : ""}>Admin / Staff</option>
            </select>
            <button class="button button-quiet" type="button" data-action="theme" aria-label="Switch to ${currentTheme === "light" ? "dark" : "light"} mode" title="Toggle color theme">${currentTheme === "light" ? "☾" : "☀"}</button>
            <button class="button button-secondary button-small reset-button" type="button" data-action="reset">Reset demo data</button>
          </div>
        </div>
      </header>`;
  }

  function renderHeading(page) {
    const [eyebrow, title, description] = getPageHeading(page);
    return `<section class="page-heading">
      <div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="page-description">${description}</p></div>
    </section>`;
  }

  function statusBadge(label, kind) {
    return `<span class="badge badge-${kind}">${escapeHtml(label)}</span>`;
  }

  function catalogCards(state, filters = {}) {
    const query = (filters.query || "").trim().toLowerCase();
    const category = filters.category || "all";
    const availableOnly = Boolean(filters.availableOnly);
    const matchingItems = state.items.filter((item) => {
      const counts = app.rules.getCopyCounts(state, item.id);
      return item.name.toLowerCase().includes(query) &&
        (category === "all" || item.category === category) &&
        (!availableOnly || counts.available > 0);
    });

    if (!matchingItems.length) {
      return `<div class="empty-state">
        <span class="empty-icon" aria-hidden="true">⌕</span>
        <h2>No matching resources</h2>
        <p>Try a different search or category. You can also clear the availability filter.</p>
      </div>`;
    }

    return matchingItems.map((item, index) => {
      const counts = app.rules.getCopyCounts(state, item.id);
      const overdueCount = state.loans.filter((loan) => {
        const copy = state.copies.find((entry) => entry.copyId === loan.copyId);
        return copy?.itemId === item.id && !loan.returnDate &&
          app.rules.dayDifference(loan.dueDate, state.settings.simulatedDate) > 0;
      }).length;
      const status = counts.available > 0
        ? statusBadge("Available", "available")
        : counts.reserved > 0
          ? statusBadge("Reserved", "reserved")
          : overdueCount > 0
            ? statusBadge("Overdue", "overdue")
          : statusBadge("Borrowed", "borrowed");
      const isBookable = ["Room", "Lab Equipment"].includes(item.category);
      const readyReservation = state.reservations.some((reservation) =>
        reservation.itemId === item.id &&
        reservation.memberId === state.settings.activeMemberId &&
        reservation.status === "ready"
      );
      const currentReservation = state.reservations.find((reservation) =>
        reservation.itemId === item.id &&
        reservation.memberId === state.settings.activeMemberId &&
        ["waiting", "ready"].includes(reservation.status)
      );
      const borrowLabel = readyReservation ? "Claim copy" : "Borrow";
      const borrowDisabled = counts.available === 0 && !readyReservation;
      const secondaryAction = counts.available > 0
        ? ""
        : currentReservation?.status === "waiting"
          ? `<span class="badge badge-reserved">In queue · #${app.rules.getQueuePosition(state, currentReservation)}</span>`
          : currentReservation?.status === "ready"
            ? `<span class="badge badge-reserved">Reserved for you</span>`
            : `<button class="button button-secondary button-small" type="button" data-action="queue" data-item-id="${escapeHtml(item.id)}">Join queue</button>`;
      return `<article class="resource-card" data-category="${escapeHtml(item.category)}" style="animation-delay:${Math.min(index, 8) * 35}ms">
        <div class="resource-card-top">
          <span class="resource-icon" aria-hidden="true">${categoryIcons[item.category] || "📦"}</span>
          ${status}
        </div>
        <div class="resource-title-row"><h3>${escapeHtml(item.name)}</h3></div>
        <div class="inline-actions"><span class="badge badge-category">${escapeHtml(item.category)}</span><span class="resource-id">${escapeHtml(item.id)}</span></div>
        <p class="resource-description">${escapeHtml(item.description)}</p>
        <div class="card-meta"><span>${counts.available} of ${counts.total} copies free</span><span>·</span><span>${counts.borrowed} out</span></div>
        <div class="resource-footer">
          <button class="button button-small" type="button" data-action="borrow" data-item-id="${escapeHtml(item.id)}"${borrowDisabled ? " disabled" : ""}>${borrowLabel}</button>
          <div class="inline-actions">${secondaryAction}${isBookable ? `<button class="button button-secondary button-small" type="button" data-action="go-booking">Book slot</button>` : ""}</div>
        </div>
      </article>`;
    }).join("");
  }

  function renderCatalog(state, filters) {
    const categories = app.data.categories.map((category) =>
      `<option value="${escapeHtml(category)}"${filters.category === category ? " selected" : ""}>${escapeHtml(category)}</option>`
    ).join("");
    return `${renderHeading("catalog")}
      <section aria-label="Search and filter resources">
        <div class="toolbar">
          <div class="filter-row">
            <label class="sr-only" for="catalog-search">Search by resource name</label>
            <input id="catalog-search" class="field search-field" type="search" placeholder="Search resources..." value="${escapeHtml(filters.query || "")}">
            <label class="sr-only" for="category-filter">Filter by category</label>
            <select id="category-filter" class="select-field">
              <option value="all"${!filters.category || filters.category === "all" ? " selected" : ""}>All categories</option>${categories}
            </select>
            <label class="check-field"><input id="available-filter" type="checkbox"${filters.availableOnly ? " checked" : ""}> Show only available now</label>
          </div>
          <span id="catalog-count" class="muted text-small"></span>
        </div>
        <div id="catalog-results" class="catalog-grid" aria-live="polite">${catalogCards(state, filters)}</div>
      </section>`;
  }

  function emptyState(icon, title, message) {
    return `<div class="empty-state"><span class="empty-icon" aria-hidden="true">${icon}</span><h2>${title}</h2><p>${message}</p></div>`;
  }

  function renderLoans(state) {
    const memberId = state.settings.activeMemberId;
    const member = state.members.find((entry) => entry.id === memberId);
    const loans = state.loans.filter((loan) => loan.memberId === memberId && !loan.returnDate);
    const borrowLimit = state.settings.borrowLimit;
    const remainingSlots = Math.max(0, borrowLimit - loans.length);
    const debt = member?.unpaidFines || 0;
    const finePanel = debt > 0
      ? `<aside class="fine-banner loans-fine-banner"><div><span class="loans-fine-kicker">ACCOUNT NOTE</span><strong>There’s ${money(debt)} to settle</strong><p>Clear your balance before borrowing another resource.</p></div><button class="button button-danger" type="button" data-action="pay-fine">Pay fine <span aria-hidden="true">↗</span></button></aside>`
      : `<aside class="fine-banner fine-banner-clear loans-fine-banner"><div><span class="loans-fine-kicker">ACCOUNT NOTE</span><strong>Your account is in good standing</strong><p>No unpaid fines. Keep enjoying the collection.</p></div><span class="loans-clear-mark" aria-hidden="true">✓</span></aside>`;

    const cards = loans.map((loan, index) => {
      const copy = state.copies.find((entry) => entry.copyId === loan.copyId);
      const item = state.items.find((entry) => entry.id === copy?.itemId);
      const overdueDays = Math.max(0, app.rules.dayDifference(loan.dueDate, state.settings.simulatedDate));
      const badge = overdueDays > 0
        ? statusBadge(`Overdue · ${overdueDays} day${overdueDays === 1 ? "" : "s"}`, "overdue")
        : statusBadge("On track", "available");
      const fine = app.rules.getUnpaidForLoan(state, loan);
      const categoryKind = {
        Book: "book",
        "Lab Equipment": "lab",
        Room: "room",
        "Sports Gear": "sports"
      }[item?.category] || "other";
      const title = item?.name || "Resource";
      const initials = title.split(/\s+/).slice(0, 2).map((word) => word.charAt(0)).join("").toUpperCase();
      const renewalsLeft = Math.max(0, state.settings.renewalLimit - loan.renewCount);
      return `<article class="loan-entry${overdueDays > 0 ? " loan-entry-overdue" : ""}">
        <div class="loan-entry-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</div>
        <div class="loan-cover" data-kind="${categoryKind}" aria-hidden="true">
          <span class="loan-cover-mark">${escapeHtml(initials)}</span>
          <span class="loan-cover-rule"></span>
          <span class="loan-cover-category">${escapeHtml(item?.category || "Resource")}</span>
        </div>
        <div class="loan-entry-copy">
          <div class="loan-entry-topline"><span class="loan-copy-id">${escapeHtml(loan.copyId)}</span>${badge}</div>
          <h3>${escapeHtml(title)}</h3>
          <div class="loan-entry-facts">
            <span><span class="loan-fact-label">BORROWED</span>${formatDate(loan.borrowDate)}</span>
            <span><span class="loan-fact-label">RENEWALS LEFT</span>${renewalsLeft} of ${state.settings.renewalLimit}</span>
            ${fine > 0 ? `<span><span class="loan-fact-label">FINE</span>${money(fine)}</span>` : ""}
          </div>
          <div class="loan-entry-actions">
            <button class="button loan-renew-button" type="button" data-action="renew" data-loan-id="${escapeHtml(loan.id)}"${loan.renewCount >= state.settings.renewalLimit ? " disabled" : ""}>Renew loan <span aria-hidden="true">↗</span></button>
            <button class="button button-secondary loan-return-button" type="button" data-action="return" data-loan-id="${escapeHtml(loan.id)}">Return item</button>
          </div>
        </div>
        <div class="loan-due-block">
          <span class="loan-fact-label">${overdueDays > 0 ? "WAS DUE" : "RETURN BY"}</span>
          <strong>${formatDate(loan.dueDate)}</strong>
          <span class="loan-due-caption">${overdueDays > 0 ? `${overdueDays} day${overdueDays === 1 ? "" : "s"} past due` : "Keep the story moving."}</span>
        </div>
      </article>`;
    }).join("");

    return `<section class="loans-page" aria-labelledby="loans-title">
      <header class="loans-masthead">
        <div class="loans-heading-copy">
          <p class="eyebrow">YOUR LITTLE CORNER OF THE LIBRARY</p>
          <h1 id="loans-title">Borrowed,<br><em>not forgotten.</em></h1>
          <p class="loans-intro-text">A quiet place to keep tabs on what’s with you, and what needs to find its way back.</p>
          <span class="loans-member-line">ON YOUR CARD <strong>${escapeHtml(member?.name || "Library member")}</strong></span>
        </div>
        <aside class="shelf-summary" aria-label="Borrowing limit">
          <div class="shelf-summary-heading"><span>YOUR SHELF</span><span>NO. 01</span></div>
          <p class="shelf-count"><strong>${String(loans.length).padStart(2, "0")}</strong><span> / ${String(borrowLimit).padStart(2, "0")}</span></p>
          <div class="shelf-meter" role="img" aria-label="${loans.length} of ${borrowLimit} borrowing slots in use">${Array.from({ length: borrowLimit }, (_, slot) => `<span class="${slot < loans.length ? "is-filled" : ""}"></span>`).join("")}</div>
          <p class="shelf-caption">${remainingSlots === 1 ? "One more resource can come home with you." : `${remainingSlots} more ${remainingSlots === 1 ? "item" : "items"} can come home with you.`}</p>
        </aside>
      </header>
      ${finePanel}
      <section class="loans-list-section" aria-labelledby="loans-list-title">
        <div class="loans-list-heading"><div><span class="loans-section-kicker">OUT IN THE WORLD</span><h2 id="loans-list-title">On your shelf, for now<span>.</span></h2></div><span class="loans-active-count">${String(loans.length).padStart(2, "0")} <span>ACTIVE</span></span></div>
        <div class="loans-ledger">${cards || `<div class="loans-empty">${emptyState("↗", "A shelf waiting for a story", "Browse the catalog and bring something useful home.")}<a class="button loan-renew-button" href="index.html">Explore the catalog <span aria-hidden="true">↗</span></a></div>`}</div>
      </section>
    </section>`;
  }

  function renderReservations(state) {
    const memberId = state.settings.activeMemberId;
    const queue = state.reservations
      .filter((reservation) => reservation.memberId === memberId && ["waiting", "ready"].includes(reservation.status))
      .map((reservation) => {
        const position = app.rules.getQueuePosition(state, reservation);
        const ready = reservation.status === "ready";
        return `<div class="record-row">
          <div><strong>${escapeHtml(itemName(state, reservation.itemId))}</strong><p class="muted">${ready ? `Copy ${escapeHtml(reservation.copyId)} is ready to claim` : `Queue position ${position}`}</p></div>
          ${statusBadge(ready ? "Ready" : `#${position} in line`, ready ? "reserved" : "borrowed")}
        </div>`;
      }).join("");

    const bookableItems = state.items.filter((item) => ["Room", "Lab Equipment"].includes(item.category));
    const options = bookableItems.map((item) =>
      `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} · ${escapeHtml(item.category)}</option>`
    ).join("");
    const bookings = state.bookings
      .filter((booking) =>
        !booking.cancelledAt &&
        booking.date >= state.settings.simulatedDate &&
        (state.settings.activeRole === "Admin" || booking.memberId === memberId)
      )
      .sort((first, second) => first.date.localeCompare(second.date) || first.startTime.localeCompare(second.startTime))
      .map((booking) => `<div class="record-row">
        <div><strong>${escapeHtml(itemName(state, booking.itemId))}</strong><p class="muted">${formatDate(booking.date)} · ${escapeHtml(booking.startTime)}–${escapeHtml(booking.endTime)}${state.settings.activeRole === "Admin" ? ` · ${escapeHtml(memberName(state, booking.memberId))}` : ""}</p></div>
        <button class="button button-secondary button-small" type="button" data-action="cancel-booking" data-booking-id="${escapeHtml(booking.id)}">Cancel</button>
      </div>`).join("");

    return `${renderHeading("reservations")}
      <div class="two-column-layout">
        <section class="panel content-panel">
          <div class="section-title-row"><div><h2>Reservation queue</h2><p class="muted">When a copy returns, it is held for the next person in line.</p></div></div>
          <div class="record-list">${queue || emptyState("⏳", "No reservations yet", "Join a queue from the catalog when a resource has no free copies.")}</div>
        </section>
        <section class="panel content-panel">
          <h2>Book a room or lab slot</h2>
          <p class="muted">Choose a time range. Overlapping bookings for the same resource are not allowed.</p>
          <form id="booking-form" class="form-grid">
            <label class="form-label">Resource<select class="select-field" name="itemId" required>${options}</select></label>
            <label class="form-label">Date<input class="field" type="date" name="date" min="${escapeHtml(state.settings.simulatedDate)}" value="${escapeHtml(state.settings.simulatedDate)}" required></label>
            <div class="form-pair">
              <label class="form-label">Start time<input class="field" type="time" name="startTime" value="09:00" required></label>
              <label class="form-label">End time<input class="field" type="time" name="endTime" value="10:00" required></label>
            </div>
            <button class="button" type="submit">Review booking</button>
          </form>
        </section>
      </div>
      <section class="panel content-panel section-spaced">
        <div class="section-title-row"><div><h2>${state.settings.activeRole === "Admin" ? "All active bookings" : "Your active bookings"}</h2><p class="muted">Cancel a booking if your plans change.</p></div></div>
        <div class="record-list">${bookings || emptyState("🗓️", "No active bookings", "Confirmed room and lab slots will appear here.")}</div>
      </section>`;
  }

  function renderHistory(state, filters) {
    const memberOptions = state.members.map((member) =>
      `<option value="${escapeHtml(member.id)}"${filters.memberId === member.id ? " selected" : ""}>${escapeHtml(member.name)}</option>`
    ).join("");
    const itemOptions = state.items.map((item) =>
      `<option value="${escapeHtml(item.id)}"${filters.itemId === item.id ? " selected" : ""}>${escapeHtml(item.name)}</option>`
    ).join("");
    const memberFilter = state.settings.activeRole === "Admin"
      ? `<label class="form-label">Member<select id="history-member" class="select-field"><option value="all">All members</option>${memberOptions}</select></label>`
      : "";
    const loans = state.loans.filter((loan) =>
      loan.returnDate &&
      (state.settings.activeRole === "Member" ? loan.memberId === state.settings.activeMemberId : filters.memberId === "all" || loan.memberId === filters.memberId) &&
      (filters.itemId === "all" || state.copies.find((copy) => copy.copyId === loan.copyId)?.itemId === filters.itemId)
    ).sort((first, second) => second.returnDate.localeCompare(first.returnDate));
    const rows = loans.map((loan) => {
      const copy = state.copies.find((entry) => entry.copyId === loan.copyId);
      const item = state.items.find((entry) => entry.id === copy?.itemId);
      return `<tr>
        <td data-label="Resource"><strong>${escapeHtml(item?.name || "Resource")}</strong><span class="table-subtext">${escapeHtml(loan.copyId)}</span></td>
        <td data-label="Member">${escapeHtml(memberName(state, loan.memberId))}</td>
        <td data-label="Borrowed">${formatDate(loan.borrowDate)}</td>
        <td data-label="Returned">${formatDate(loan.returnDate)}</td>
        <td data-label="Fine">${money(loan.fine)}</td>
      </tr>`;
    }).join("");

    return `${renderHeading("history")}
      <section class="panel content-panel">
        <div class="filter-row history-filters">${memberFilter}
          <label class="form-label">Resource<select id="history-item" class="select-field"><option value="all">All resources</option>${itemOptions}</select></label>
          <span class="muted">${loans.length} completed loan${loans.length === 1 ? "" : "s"}</span>
        </div>
        ${loans.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Resource</th><th>Member</th><th>Borrowed</th><th>Returned</th><th>Fine</th></tr></thead><tbody>${rows}</tbody></table></div>` : emptyState("🧾", "No completed loans", "Returned resources will show up here with their borrowing dates and any fine.") }
      </section>`;
  }

  function renderAdmin(state) {
    const activeLoans = state.loans.filter((loan) => !loan.returnDate);
    const overdueLoans = activeLoans.filter((loan) => app.rules.dayDifference(loan.dueDate, state.settings.simulatedDate) > 0);
    const pendingFines = state.members.reduce((total, member) => total + member.unpaidFines, 0);
    const activeBookings = state.bookings.filter((booking) => !booking.cancelledAt && booking.date >= state.settings.simulatedDate);
    const stats = [
      ["Items out", activeLoans.length, "↗"],
      ["Overdue", overdueLoans.length, "⌛"],
      ["Pending fines", money(pendingFines), "₹"],
      ["Active bookings", activeBookings.length, "▦"]
    ].map(([label, value, icon]) => `<article class="stat-card"><span class="stat-icon">${icon}</span><div><p>${label}</p><strong>${value}</strong></div></article>`).join("");
    const rows = activeLoans.map((loan) => {
      const copy = state.copies.find((entry) => entry.copyId === loan.copyId);
      const item = state.items.find((entry) => entry.id === copy?.itemId);
      const overdue = app.rules.dayDifference(loan.dueDate, state.settings.simulatedDate) > 0;
      return `<tr>
        <td data-label="Resource"><strong>${escapeHtml(item?.name || "Resource")}</strong><span class="table-subtext">${escapeHtml(loan.copyId)}</span></td>
        <td data-label="Member">${escapeHtml(memberName(state, loan.memberId))}</td>
        <td data-label="Due date">${formatDate(loan.dueDate)}</td>
        <td data-label="Status">${overdue ? statusBadge("Overdue", "overdue") : statusBadge("On track", "available")}</td>
        <td data-label="Fine">${money(app.rules.getUnpaidForLoan(state, loan))}</td>
        <td data-label="Action"><button class="button button-secondary button-small" type="button" data-action="return" data-loan-id="${escapeHtml(loan.id)}">Mark returned</button></td>
      </tr>`;
    }).join("");

    return `${renderHeading("admin")}
      <section class="stat-grid" aria-label="Library statistics">${stats}</section>
      <section class="panel content-panel section-spaced">
        <div class="section-title-row section-title-wrap"><div><h2>Active loans</h2><p class="muted">Every copy is tracked independently, with member and due-date details.</p></div>
          <form id="simulate-date-form" class="simulate-form"><label class="form-label" for="simulated-date">Simulate date</label><input id="simulated-date" class="field" type="date" min="${escapeHtml(state.settings.simulatedDate)}" value="${escapeHtml(state.settings.simulatedDate)}" required><button class="button button-secondary button-small" type="submit">Update date</button></form>
        </div>
        ${activeLoans.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Resource / copy</th><th>Member</th><th>Due date</th><th>Status</th><th>Fine</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>` : emptyState("✨", "No active loans", "New checkouts will appear here as soon as a member borrows a resource.") }
      </section>`;
  }

  function renderReports(state) {
    const counts = state.items.map((item) => ({
      name: item.name,
      count: state.loans.filter((loan) => state.copies.find((copy) => copy.copyId === loan.copyId)?.itemId === item.id).length
    })).sort((first, second) => second.count - first.count || first.name.localeCompare(second.name));
    const maxBorrows = Math.max(1, ...counts.map((item) => item.count));
    const popularRows = counts.slice(0, 6).map((item) =>
      `<div class="chart-row"><div class="chart-label"><strong>${escapeHtml(item.name)}</strong><span>${item.count} borrow${item.count === 1 ? "" : "s"}</span></div><div class="bar-track"><span class="bar-fill" style="width:${Math.round(item.count / maxBorrows * 100)}%"></span></div></div>`
    ).join("");
    const defaulters = state.members.map((member) => {
      const overdueCount = state.loans.filter((loan) =>
        loan.memberId === member.id && !loan.returnDate && app.rules.dayDifference(loan.dueDate, state.settings.simulatedDate) > 0
      ).length;
      return { member, overdueCount };
    }).filter((entry) => entry.overdueCount > 0 || entry.member.unpaidFines > 0)
      .sort((first, second) => second.member.unpaidFines - first.member.unpaidFines || second.overdueCount - first.overdueCount);
    const defaulterRows = defaulters.map(({ member, overdueCount }) =>
      `<tr><td data-label="Member"><strong>${escapeHtml(member.name)}</strong></td><td data-label="Overdue items">${overdueCount}</td><td data-label="Unpaid fine">${money(member.unpaidFines)}</td></tr>`
    ).join("");
    const collected = state.finePayments.reduce((total, payment) => total + payment.amount, 0);
    const pending = state.members.reduce((total, member) => total + member.unpaidFines, 0);

    return `${renderHeading("reports")}
      <section class="stat-grid report-stat-grid">
        <article class="stat-card"><span class="stat-icon">₹</span><div><p>Fines collected</p><strong>${money(collected)}</strong></div></article>
        <article class="stat-card"><span class="stat-icon">◷</span><div><p>Fines pending</p><strong>${money(pending)}</strong></div></article>
      </section>
      <div class="two-column-layout section-spaced">
        <section class="panel content-panel"><h2>Most borrowed resources</h2><p class="muted">All loans, including returned items.</p><div class="chart-list">${popularRows}</div></section>
        <section class="panel content-panel"><h2>Top defaulters</h2><p class="muted">Members with overdue items or unpaid fines.</p>
          ${defaulters.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Member</th><th>Overdue items</th><th>Unpaid fine</th></tr></thead><tbody>${defaulterRows}</tbody></table></div>` : emptyState("🌿", "No defaulters", "There are no overdue resources or unpaid fines right now.") }
        </section>
      </div>`;
  }

  function render(state, page, filters = {}) {
    renderHeader(state, page);
    const content = {
      catalog: () => renderCatalog(state, filters),
      loans: () => renderLoans(state),
      reservations: () => renderReservations(state),
      history: () => renderHistory(state, filters),
      admin: () => renderAdmin(state),
      reports: () => renderReports(state)
    }[page] || (() => renderCatalog(state, filters));
    document.getElementById("app").innerHTML = `${content()}<footer class="site-footer">ShelfSpace · A simple home for campus resources</footer>`;
    if (page === "catalog") updateCatalogCount(state, filters);
  }

  function updateCatalogCount(state, filters) {
    const count = document.getElementById("catalog-count");
    if (!count) return;
    const query = (filters.query || "").trim().toLowerCase();
    const matching = state.items.filter((item) =>
      item.name.toLowerCase().includes(query) &&
      (!filters.category || filters.category === "all" || item.category === filters.category) &&
      (!filters.availableOnly || app.rules.getCopyCounts(state, item.id).available > 0)
    ).length;
    count.textContent = `${matching} resource${matching === 1 ? "" : "s"}`;
  }

  function renderCatalogResults(state, filters) {
    const results = document.getElementById("catalog-results");
    if (!results) return;
    results.innerHTML = catalogCards(state, filters);
    updateCatalogCount(state, filters);
  }

  function openConfirm({ title, message, confirmLabel, action, data = {} }) {
    const root = document.getElementById("modal-root");
    const dataAttributes = Object.entries(data)
      .map(([key, value]) => {
        const attribute = key.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
        return `data-${attribute}="${escapeHtml(value)}"`;
      })
      .join(" ");
    root.innerHTML = `<dialog class="confirm-dialog" aria-labelledby="modal-title">
      <form method="dialog" class="dialog-close-form"><button class="dialog-close" aria-label="Close dialog">×</button></form>
      <div class="dialog-icon" aria-hidden="true">✦</div>
      <h2 id="modal-title">${escapeHtml(title)}</h2>
      <p class="muted">${escapeHtml(message)}</p>
      <div class="dialog-actions">
        <button class="button button-secondary" type="button" data-action="close-modal">Not now</button>
        <button class="button" type="button" data-action="modal-confirm" data-confirm-action="${escapeHtml(action)}" ${dataAttributes}>${escapeHtml(confirmLabel)}</button>
      </div>
    </dialog>`;
    const dialog = root.querySelector("dialog");
    dialog.showModal();
  }

  function showToast(message, type = "success") {
    const root = document.getElementById("toast-root");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.textContent = message;
    root.append(toast);
    window.setTimeout(() => toast.remove(), 3600);
  }

  app.ui = {
    render,
    renderCatalogResults,
    openConfirm,
    showToast,
    formatDate,
    money,
    itemName
  };
})(window.ShelfSpace);
