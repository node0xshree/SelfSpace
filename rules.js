window.ShelfSpace = window.ShelfSpace || {};

(function (app) {
  function requireRecord(records, id, label) {
    const record = records.find((entry) => entry.id === id);
    if (!record) throw new Error(`${label} could not be found.`);
    return record;
  }

  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }

  function addDays(dateString, days) {
    const date = parseDate(dateString);
    if (!date) throw new Error("A valid date is required.");
    date.setDate(date.getDate() + days);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function dayDifference(start, end) {
    const first = parseDate(start);
    const second = parseDate(end);
    if (!first || !second) return 0;
    return Math.floor((Date.UTC(second.getFullYear(), second.getMonth(), second.getDate()) -
      Date.UTC(first.getFullYear(), first.getMonth(), first.getDate())) / 86400000);
  }

  function getFineForLoan(state, loan, asOfDate) {
    const endDate = loan.returnDate || asOfDate || state.settings.simulatedDate;
    const overdueDays = Math.max(0, dayDifference(loan.dueDate, endDate));
    return overdueDays * state.settings.finePerDay;
  }

  function getPaidForLoan(state, loanId) {
    return state.finePayments
      .filter((payment) => payment.loanId === loanId)
      .reduce((total, payment) => total + payment.amount, 0);
  }

  function getUnpaidForLoan(state, loan, asOfDate) {
    return Math.max(0, getFineForLoan(state, loan, asOfDate) - getPaidForLoan(state, loan.id));
  }

  function syncFines(state) {
    state.loans.forEach((loan) => {
      loan.fine = getFineForLoan(state, loan);
    });
    state.members.forEach((member) => {
      member.unpaidFines = state.loans
        .filter((loan) => loan.memberId === member.id)
        .reduce((total, loan) => total + getUnpaidForLoan(state, loan), 0);
    });
    return state;
  }

  function getItem(state, itemId) {
    return requireRecord(state.items, itemId, "Resource");
  }

  function getCopyCounts(state, itemId) {
    const copies = state.copies.filter((copy) => copy.itemId === itemId);
    return {
      total: copies.length,
      available: copies.filter((copy) => copy.status === "available").length,
      borrowed: copies.filter((copy) => copy.status === "borrowed").length,
      reserved: copies.filter((copy) => copy.status === "reserved").length
    };
  }

  function getActiveLoan(state, loanId) {
    const loan = requireRecord(state.loans, loanId, "Loan");
    if (loan.returnDate) throw new Error("This loan has already been returned.");
    return loan;
  }

  function dispatchQueue(state, itemId) {
    // Save a returned copy for the next person waiting in line.
    const freeCopy = state.copies.find((copy) => copy.itemId === itemId && copy.status === "available");
    const nextReservation = state.reservations
      .filter((reservation) => reservation.itemId === itemId && reservation.status === "waiting")
      .sort((first, second) => first.createdAt.localeCompare(second.createdAt))[0];

    if (freeCopy && nextReservation) {
      freeCopy.status = "reserved";
      nextReservation.status = "ready";
      nextReservation.copyId = freeCopy.copyId;
      nextReservation.readyDate = state.settings.simulatedDate;
    }
  }

  function getLoanDuration(state, item) {
    return state.settings.loanDays[item.category];
  }

  function borrow(state, memberId, itemId) {
    syncFines(state);
    const member = requireRecord(state.members, memberId, "Member");
    const item = getItem(state, itemId);
    if (member.unpaidFines > 0) throw new Error("Pay your outstanding fine before borrowing another resource.");

    const activeLoans = state.loans.filter((loan) => loan.memberId === memberId && !loan.returnDate);
    if (activeLoans.length >= state.settings.borrowLimit) {
      throw new Error(`You have reached the limit of ${state.settings.borrowLimit} active items.`);
    }

    const readyReservation = state.reservations.find((reservation) =>
      reservation.itemId === itemId &&
      reservation.memberId === memberId &&
      reservation.status === "ready"
    );
    const copy = readyReservation
      ? state.copies.find((entry) => entry.copyId === readyReservation.copyId)
      : state.copies.find((entry) => entry.itemId === itemId && entry.status === "available");

    if (!copy) throw new Error("No copy is available right now. Join the reservation queue instead.");

    copy.status = "borrowed";
    if (readyReservation) readyReservation.status = "fulfilled";

    const loan = {
      id: `L${Date.now()}-${state.loans.length + 1}`,
      copyId: copy.copyId,
      memberId,
      borrowDate: state.settings.simulatedDate,
      dueDate: addDays(state.settings.simulatedDate, getLoanDuration(state, item)),
      returnDate: null,
      renewCount: 0,
      fine: 0
    };
    state.loans.push(loan);
    return loan;
  }

  function returnItem(state, loanId, memberId) {
    const loan = getActiveLoan(state, loanId);
    if (memberId && loan.memberId !== memberId) throw new Error("You can only return your own borrowed resources.");
    loan.returnDate = state.settings.simulatedDate;
    const copy = state.copies.find((entry) => entry.copyId === loan.copyId);
    if (!copy) throw new Error("The borrowed copy could not be found.");
    copy.status = "available";
    dispatchQueue(state, copy.itemId);
    syncFines(state);
    return loan;
  }

  function joinQueue(state, memberId, itemId) {
    const member = requireRecord(state.members, memberId, "Member");
    getItem(state, itemId);
    if (getCopyCounts(state, itemId).available > 0) {
      throw new Error("A copy is available now, so you can borrow it directly.");
    }
    const existing = state.reservations.find((reservation) =>
      reservation.itemId === itemId &&
      reservation.memberId === member.id &&
      ["waiting", "ready"].includes(reservation.status)
    );
    if (existing) throw new Error("You are already in this resource's reservation queue.");

    const reservation = {
      id: `R${Date.now()}-${state.reservations.length + 1}`,
      itemId,
      memberId,
      createdAt: `${state.settings.simulatedDate}T${Date.now()}`,
      status: "waiting",
      copyId: null
    };
    state.reservations.push(reservation);
    return reservation;
  }

  function renew(state, loanId, memberId) {
    const loan = getActiveLoan(state, loanId);
    if (loan.memberId !== memberId) throw new Error("You can only renew your own loan.");
    if (loan.renewCount >= state.settings.renewalLimit) throw new Error("This loan has reached its renewal limit.");
    if (state.reservations.some((reservation) =>
      reservation.itemId === state.copies.find((copy) => copy.copyId === loan.copyId).itemId &&
      reservation.status === "waiting"
    )) {
      throw new Error("This resource has a waiting member, so it cannot be renewed.");
    }

    const item = getItem(state, state.copies.find((copy) => copy.copyId === loan.copyId).itemId);
    const startDate = loan.dueDate < state.settings.simulatedDate ? state.settings.simulatedDate : loan.dueDate;
    loan.dueDate = addDays(startDate, getLoanDuration(state, item));
    loan.renewCount += 1;
    syncFines(state);
    return loan;
  }

  function payFine(state, memberId) {
    syncFines(state);
    const member = requireRecord(state.members, memberId, "Member");
    const loans = state.loans.filter((loan) =>
      loan.memberId === memberId && getUnpaidForLoan(state, loan) > 0
    );
    const amount = member.unpaidFines;
    if (amount <= 0) throw new Error("You do not have an unpaid fine.");

    let remaining = amount;
    loans.forEach((loan) => {
      const owed = getUnpaidForLoan(state, loan);
      if (owed <= 0) return;
      const paymentAmount = Math.min(remaining, owed);
      state.finePayments.push({
        id: `P${Date.now()}-${state.finePayments.length}`,
        loanId: loan.id,
        memberId,
        amount: paymentAmount,
        paidDate: state.settings.simulatedDate
      });
      remaining -= paymentAmount;
    });
    syncFines(state);
    return amount;
  }

  function isValidTime(value) {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value || "")) return false;
    return true;
  }

  function bookSlot(state, memberId, itemId, date, startTime, endTime) {
    const member = requireRecord(state.members, memberId, "Member");
    const item = getItem(state, itemId);
    if (!["Room", "Lab Equipment"].includes(item.category)) {
      throw new Error("Only rooms and lab equipment can be booked by time slot.");
    }
    if (!parseDate(date) || date < state.settings.simulatedDate) throw new Error("Choose today or a future date.");
    if (!isValidTime(startTime) || !isValidTime(endTime) || startTime >= endTime) {
      throw new Error("Enter a valid time range where the end is after the start.");
    }

    const overlaps = state.bookings.some((booking) =>
      booking.itemId === itemId &&
      booking.date === date &&
      !booking.cancelledAt &&
      startTime < booking.endTime &&
      booking.startTime < endTime
    );
    if (overlaps) throw new Error("That time overlaps another booking. Choose a different time.");

    const booking = {
      id: `B${Date.now()}-${state.bookings.length + 1}`,
      itemId,
      memberId: member.id,
      date,
      startTime,
      endTime,
      cancelledAt: null
    };
    state.bookings.push(booking);
    return booking;
  }

  function cancelBooking(state, bookingId, memberId) {
    const booking = requireRecord(state.bookings, bookingId, "Booking");
    if (memberId && booking.memberId !== memberId) throw new Error("You can only cancel your own booking.");
    if (booking.cancelledAt) throw new Error("This booking has already been cancelled.");
    booking.cancelledAt = state.settings.simulatedDate;
    return booking;
  }

  function setSimulatedDate(state, date) {
    if (!parseDate(date)) throw new Error("Enter a valid date.");
    if (date < state.settings.simulatedDate) throw new Error("The simulated date can only move forward.");
    state.settings.simulatedDate = date;
    syncFines(state);
  }

  function getQueuePosition(state, reservation) {
    if (reservation.status === "ready") return 0;
    if (reservation.status !== "waiting") return null;
    return state.reservations
      .filter((entry) => entry.itemId === reservation.itemId && entry.status === "waiting")
      .sort((first, second) => first.createdAt.localeCompare(second.createdAt))
      .findIndex((entry) => entry.id === reservation.id) + 1;
  }

  app.rules = {
    addDays,
    dayDifference,
    getFineForLoan,
    getUnpaidForLoan,
    syncFines,
    getCopyCounts,
    borrow,
    returnItem,
    joinQueue,
    renew,
    payFine,
    bookSlot,
    cancelBooking,
    setSimulatedDate,
    getQueuePosition
  };
})(window.ShelfSpace);
