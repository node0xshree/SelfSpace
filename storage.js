window.ShelfSpace = window.ShelfSpace || {};

(function (app) {
  const DATA_KEY = "shelfspace.data.v1";
  const THEME_KEY = "shelfspace.theme.v1";

  function saveState(state) {
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Could not save ShelfSpace data.", error);
      throw new Error("Your browser could not save the changes. Check that site storage is enabled.");
    }
  }

  function loadState() {
    const saved = localStorage.getItem(DATA_KEY);
    if (!saved) {
      const initialState = app.data.createDemoData();
      saveState(initialState);
      return initialState;
    }

    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error("Could not read saved ShelfSpace data.", error);
      throw new Error("Saved ShelfSpace data could not be read. Use Reset demo data to start fresh.");
    }
  }

  function resetDemoData() {
    const state = app.data.createDemoData();
    saveState(state);
    return state;
  }

  function getTheme() {
    return localStorage.getItem(THEME_KEY) || "light";
  }

  function setTheme(theme) {
    if (theme !== "light" && theme !== "dark") {
      throw new Error("Choose either light or dark mode.");
    }
    localStorage.setItem(THEME_KEY, theme);
  }

  app.storage = { loadState, saveState, resetDemoData, getTheme, setTheme };
})(window.ShelfSpace);
