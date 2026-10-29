window.ShelfSpace = window.ShelfSpace || {};

(function (app) {
  const categories = ["Book", "Lab Equipment", "Room", "Sports Gear"];

  const loanDays = {
    Book: 14,
    "Lab Equipment": 3,
    Room: 1,
    "Sports Gear": 5
  };

  function dateOffset(days) {
    // Keep sample dates fresh whenever the demo is reset.
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function createDemoData() {
    const items = [
      { id: "BK101", name: "Clean Code", category: "Book", description: "A practical guide to writing clear, maintainable software.", totalCopies: 3 },
      { id: "BK102", name: "Designing Data-Intensive Applications", category: "Book", description: "Foundational ideas behind reliable, scalable data systems.", totalCopies: 2 },
      { id: "BK103", name: "The Pragmatic Programmer", category: "Book", description: "Field-tested advice for thoughtful software development.", totalCopies: 2 },
      { id: "LB201", name: "Arduino Starter Kit", category: "Lab Equipment", description: "Microcontroller board and components for electronics projects.", totalCopies: 3 },
      { id: "LB202", name: "Digital Multimeter", category: "Lab Equipment", description: "Portable meter for common electrical measurements.", totalCopies: 2 },
      { id: "LB203", name: "Oscilloscope Lab Kit", category: "Lab Equipment", description: "Shared oscilloscope kit for signals and circuits practice.", totalCopies: 1 },
      { id: "RM301", name: "Collaboration Study Room", category: "Room", description: "A quiet four-person room with a whiteboard.", totalCopies: 1 },
      { id: "RM302", name: "Project Room", category: "Room", description: "A team workspace with a large display.", totalCopies: 1 },
      { id: "RM303", name: "Seminar Room", category: "Room", description: "A flexible room for small group presentations.", totalCopies: 1 },
      { id: "SG401", name: "Badminton Set", category: "Sports Gear", description: "Two rackets and shuttlecocks for campus recreation.", totalCopies: 3 },
      { id: "SG402", name: "Football Kit", category: "Sports Gear", description: "A match ball and training cones.", totalCopies: 2 },
      { id: "SG403", name: "Basketball", category: "Sports Gear", description: "Indoor/outdoor basketball for the campus courts.", totalCopies: 2 }
    ];

    const copies = items.flatMap((item) =>
      Array.from({ length: item.totalCopies }, (_, index) => ({
        copyId: `${item.id}-C${index + 1}`,
        itemId: item.id,
        status: "available"
      }))
    );

    const members = [
      { id: "M001", name: "Aarav Sharma", role: "Member", unpaidFines: 0 },
      { id: "M002", name: "Diya Patel", role: "Member", unpaidFines: 0 },
      { id: "M003", name: "Kabir Nair", role: "Member", unpaidFines: 0 },
      { id: "M004", name: "Ananya Iyer", role: "Member", unpaidFines: 0 },
      { id: "M005", name: "Rohan Mehta", role: "Member", unpaidFines: 0 },
      { id: "M006", name: "Zoya Khan", role: "Member", unpaidFines: 0 }
    ];

    const loans = [
      {
        id: "L001", copyId: "BK101-C1", memberId: "M001",
        borrowDate: dateOffset(-17), dueDate: dateOffset(-3), returnDate: null,
        renewCount: 0, fine: 0
      },
      {
        id: "L002", copyId: "LB201-C1", memberId: "M002",
        borrowDate: dateOffset(-1), dueDate: dateOffset(2), returnDate: null,
        renewCount: 0, fine: 0
      },
      {
        id: "L003", copyId: "SG401-C1", memberId: "M003",
        borrowDate: dateOffset(-7), dueDate: dateOffset(-2), returnDate: null,
        renewCount: 1, fine: 0
      },
      {
        id: "L004", copyId: "BK102-C1", memberId: "M004",
        borrowDate: dateOffset(-35), dueDate: dateOffset(-21), returnDate: dateOffset(-19),
        renewCount: 0, fine: 0
      }
    ];

    copies.find((copy) => copy.copyId === "BK101-C1").status = "borrowed";
    copies.find((copy) => copy.copyId === "LB201-C1").status = "borrowed";
    copies.find((copy) => copy.copyId === "SG401-C1").status = "borrowed";

    return {
      version: 1,
      items,
      copies,
      members,
      loans,
      reservations: [],
      bookings: [],
      finePayments: [],
      settings: {
        borrowLimit: 4,
        loanDays,
        finePerDay: 5,
        renewalLimit: 2,
        simulatedDate: dateOffset(0),
        activeMemberId: "M001",
        activeRole: "Member"
      }
    };
  }

  app.data = { categories, createDemoData, dateOffset };
})(window.ShelfSpace);
