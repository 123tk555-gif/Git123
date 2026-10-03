// 表示設定(配色・文字サイズ)。<head> で読み込み、最初の描画前に適用して画面のちらつきを防ぐ
const PREFS_KEY = "trello-app-prefs";
const THEMES = ["light", "dark", "contrast"];
const FONT_SIZES = ["normal", "large", "xlarge"];

let prefs = loadPrefs();
applyPrefs();

function loadPrefs() {
    const loaded = { theme: "light", fontSize: "normal" };
    try {
        const data = JSON.parse(localStorage.getItem(PREFS_KEY));
        if (data && THEMES.includes(data.theme)) loaded.theme = data.theme;
        if (data && FONT_SIZES.includes(data.fontSize)) loaded.fontSize = data.fontSize;
    } catch {
        // 読み込めなければ既定の設定のまま
    }
    return loaded;
}

function savePrefs() {
    try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
        // 保存できなくても今回の表示には影響しない
    }
}

function applyPrefs() {
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.dataset.fontSize = prefs.fontSize;
    document.querySelectorAll("[data-theme-value]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.themeValue === prefs.theme));
    });
    document.querySelectorAll("[data-font-size-value]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.fontSizeValue === prefs.fontSize));
    });
}

function setTheme(theme) {
    if (!THEMES.includes(theme)) return;
    prefs.theme = theme;
    savePrefs();
    applyPrefs();
}

function setFontSize(size) {
    if (!FONT_SIZES.includes(size)) return;
    prefs.fontSize = size;
    savePrefs();
    applyPrefs();
}
