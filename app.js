window.ShelfSpace = window.ShelfSpace || {};

(function (app) {
  let state;
  const page = document.body.dataset.page || "catalog";
  const filters = {
    query: "",
    category: "all",
    availableOnly: false,
    memberId: "all",
    itemId: "all"
  };

  function showStartupError(error) {
    const message = error instanceof Error ? error.message : "ShelfSpace could not start.";
    document.getElementById("app").innerHTML = `<section class="startup-error" role="alert">
      <span class="empty-icon" aria-hidden="true">!</span>
      <h1>ShelfSpace could not start</h1>
      <p>${message.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
      })[character])}</p>
      <p>Check that JavaScript and browser storage are enabled, then reload this page.</p>
    </section>`;
  }

  function render() {
    document.documentElement.dataset.theme = app.storage.getTheme();
    app.ui.render(state, page, filters);
  }

  function runMutation(operation, successMessage) {
    const nextState = JSON.parse(JSON.stringify(state));
    try {
      const result = operation(nextState);
      app.rules.syncFines(nextState);
      app.storage.saveState(nextState);
      state = nextState;
      render();
      if (successMessage) {
        app.ui.showToast(typeof successMessage === "function" ? successMessage(result) : successMessage);
      }
    } catch (error) {
      app.ui.showToast(error instanceof Error ? error.message : "That action could not be completed.", "error");
    }
  }

  function executeAction(action, data = {}) {
    const memberId = state.settings.activeMemberId;
    switch (action) {
      case "borrow":
        runMutation((next) => app.rules.borrow(next, memberId, data.itemId), `${app.ui.itemName(state, data.itemId)} is now checked out to you.`);
        break;
      case "return":
        runMutation((next) => app.rules.returnItem(
          next,
          data.loanId,
          state.settings.activeRole === "Admin" ? undefined : memberId
        ), "The resource has been returned.");
        break;
      case "queue":
        runMutation((next) => app.rules.joinQueue(next, memberId, data.itemId), "You joined the reservation queue.");
        break;
      case "renew":
        runMutation((next) => app.rules.renew(next, data.loanId, memberId), "Your due date has been extended.");
        break;
      case "pay-fine": {
        runMutation(
          (next) => app.rules.payFine(next, memberId),
          (paidAmount) => `Payment recorded: ${app.ui.money(paidAmount)}.`
        );
        break;
      }
      case "book-slot":
        runMutation((next) => app.rules.bookSlot(next, memberId, data.itemId, data.date, data.startTime, data.endTime), "Your booking is confirmed.");
        break;
      case "cancel-booking":
        runMutation((next) => app.rules.cancelBooking(
          next,
          data.bookingId,
          state.settings.activeRole === "Admin" ? undefined : memberId
        ), "The booking has been cancelled.");
        break;
      case "simulate-date":
        runMutation((next) => app.rules.setSimulatedDate(next, data.date), `Demo date updated to ${app.ui.formatDate(data.date)}.`);
        break;
      case "reset":
        try {
          state = app.storage.resetDemoData();
          app.rules.syncFines(state);
          app.storage.saveState(state);
          render();
          app.ui.showToast("Demo data has been reset.");
        } catch (error) {
          app.ui.showToast(error instanceof Error ? error.message : "Demo data could not be reset.", "error");
        }
        break;
      default:
        app.ui.showToast("That action is not available.", "error");
    }
  }

  function openActionConfirmation(action, data = {}) {
    const item = data.itemId ? state.items.find((entry) => entry.id === data.itemId) : null;
    const loan = data.loanId ? state.loans.find((entry) => entry.id === data.loanId) : null;
    const copy = loan ? state.copies.find((entry) => entry.copyId === loan.copyId) : null;
    const loanItem = copy ? state.items.find((entry) => entry.id === copy.itemId) : null;
    const booking = data.bookingId ? state.bookings.find((entry) => entry.id === data.bookingId) : null;
    const bookingItem = booking ? state.items.find((entry) => entry.id === booking.itemId) : null;
    const confirmations = {
      borrow: {
        title: `Borrow ${item?.name || "this resource"}?`,
        message: "The due date will be set automatically using the resource category.",
        confirmLabel: "Confirm borrow"
      },
      return: {
        title: "Return this resource?",
        message: "The copy will become available again, or be held for the next person in the queue.",
        confirmLabel: "Confirm return"
      },
      queue: {
        title: "Join the waiting list?",
        message: `We will hold the next returned copy of ${item?.name || "this resource"} for you.`,
        confirmLabel: "Join queue"
      },
      renew: {
        title: "Renew this loan?",
        message: `The due date for ${loanItem?.name || "this resource"} will be extended if nobody is waiting.`,
        confirmLabel: "Confirm renewal"
      },
      "pay-fine": {
        title: "Pay your outstanding fine?",
        message: `Your current balance of ${app.ui.money(state.members.find((entry) => entry.id === state.settings.activeMemberId)?.unpaidFines)} will be recorded as paid.`,
        confirmLabel: "Pay fine"
      },
      "cancel-booking": {
        title: "Cancel this booking?",
        message: `${bookingItem?.name || "This resource"} will be released for the selected time.`,
        confirmLabel: "Cancel booking"
      },
      reset: {
        title: "Reset demo data?",
        message: "This restores the original sample members, loans, queues, and bookings. This cannot be undone.",
        confirmLabel: "Reset demo"
      }
    };
    const confirmation = confirmations[action];
    if (!confirmation) {
      executeAction(action, data);
      return;
    }
    app.ui.openConfirm({ ...confirmation, action, data });
  }

  function closeModal() {
    const dialog = document.querySelector("#modal-root dialog");
    if (dialog?.open) dialog.close();
  }

  function onClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const { action } = button.dataset;

    if (action === "theme") {
      const nextTheme = app.storage.getTheme() === "light" ? "dark" : "light";
      try {
        app.storage.setTheme(nextTheme);
        render();
      } catch (error) {
        app.ui.showToast(error instanceof Error ? error.message : "Theme preference could not be saved.", "error");
      }
      return;
    }
    if (action === "go-booking") {
      window.location.href = "reservations.html";
      return;
    }
    if (action === "close-modal") {
      closeModal();
      return;
    }
    if (action === "modal-confirm") {
      const data = { ...button.dataset };
      delete data.action;
      delete data.confirmAction;
      closeModal();
      executeAction(button.dataset.confirmAction, data);
      return;
    }
    if (action === "reset") {
      openActionConfirmation("reset");
      return;
    }
    if (action === "pay-fine") {
      openActionConfirmation("pay-fine");
      return;
    }
    if (action === "borrow" || action === "queue" || action === "renew" || action === "return" || action === "cancel-booking") {
      openActionConfirmation(action, button.dataset);
    }
  }

  function onChange(event) {
    const target = event.target;
    if (target.id === "user-switch") {
      const value = target.value;
      const isAdmin = value === "admin";
      const memberId = isAdmin ? state.settings.activeMemberId : value.slice("member:".length);
      const selectedMember = state.members.find((member) => member.id === memberId);
      runMutation((next) => {
        next.settings.activeRole = isAdmin ? "Admin" : "Member";
        next.settings.activeMemberId = memberId;
      }, `Switched to ${isAdmin ? "Admin / Staff" : selectedMember?.name || "Member"}.`);
      if (!isAdmin && ["admin", "reports"].includes(page)) window.location.href = "index.html";
      return;
    }
    if (target.id === "category-filter") filters.category = target.value;
    if (target.id === "available-filter") filters.availableOnly = target.checked;
    if (target.id === "history-member") filters.memberId = target.value;
    if (target.id === "history-item") filters.itemId = target.value;
    if (["category-filter", "available-filter"].includes(target.id)) {
      app.ui.renderCatalogResults(state, filters);
    }
    if (["history-member", "history-item"].includes(target.id)) render();
  }

  function onInput(event) {
    if (event.target.id !== "catalog-search") return;
    filters.query = event.target.value;
    app.ui.renderCatalogResults(state, filters);
  }

  function onSubmit(event) {
    const form = event.target;
    if (form.id === "booking-form") {
      event.preventDefault();
      const values = new FormData(form);
      const data = {
        itemId: values.get("itemId"),
        date: values.get("date"),
        startTime: values.get("startTime"),
        endTime: values.get("endTime")
      };
      const itemName = app.ui.itemName(state, data.itemId);
      app.ui.openConfirm({
        title: "Confirm your booking",
        message: `${itemName} · ${app.ui.formatDate(data.date)} · ${data.startTime}–${data.endTime}. We will check for time conflicts before saving.`,
        confirmLabel: "Confirm booking",
        action: "book-slot",
        data
      });
      return;
    }
    if (form.id === "simulate-date-form") {
      event.preventDefault();
      const date = new FormData(form).get("date") || form.querySelector("#simulated-date").value;
      app.ui.openConfirm({
        title: "Move the demo date forward?",
        message: `The current date will change to ${app.ui.formatDate(date)} and overdue fines will update automatically.`,
        confirmLabel: "Update demo date",
        action: "simulate-date",
        data: { date }
      });
    }
  }

  function init() {
    try {
      state = app.storage.loadState();
      app.rules.syncFines(state);
      app.storage.saveState(state);
      if (state.settings.activeRole !== "Admin" && ["admin", "reports"].includes(page)) {
        window.location.replace("index.html");
        return;
      }
      render();
      document.addEventListener("click", onClick);
      document.addEventListener("change", onChange);
      document.addEventListener("input", onInput);
      document.addEventListener("submit", onSubmit);
    } catch (error) {
      showStartupError(error);
    }
  }

  init();
})(window.ShelfSpace);
