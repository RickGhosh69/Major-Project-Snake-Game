export const Storage = {
    KEY_PREFIX: 'adv-snake::',

    save(key, val) {
        try { localStorage.setItem(this.KEY_PREFIX + key, JSON.stringify(val)); }
        catch (e) { console.warn('Storage save failed', e); }
    },

    load(key, fallback = null) {
        try {
            const raw = localStorage.getItem(this.KEY_PREFIX + key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { console.warn('Storage load failed', e); return fallback; }
    },

    clearAll() {
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith(this.KEY_PREFIX)) localStorage.removeItem(k);
        });
    }
};
