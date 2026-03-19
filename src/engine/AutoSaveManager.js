export class AutoSaveManager {
  constructor(state, intervalMs = 60000) {
    this.intervalMs = intervalMs;
    this.timer = null;
    this.lastSaved = null;
  }

  start(onSave) {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      onSave();
      this.lastSaved = Date.now();
      console.log('Project Auto-Saved at:', new Date(this.lastSaved).toLocaleTimeString());
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  saveToLocal(state, projectName = 'autoscore_autosave') {
    try {
      const data = JSON.stringify({
        notes: state.notes,
        measures: state.measures,
        scoreTitle: state.scoreTitle,
        preferences: state.preferences,
        timestamp: Date.now()
      });
      localStorage.setItem(projectName, data);
      return true;
    } catch (err) {
      console.error('AutoSave failed:', err);
      return false;
    }
  }

  loadFromLocal(projectName = 'autoscore_autosave') {
    try {
      const data = localStorage.getItem(projectName);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error('Load AutoSave failed:', err);
      return null;
    }
  }
}
