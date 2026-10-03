const STORAGE_KEY = "trello-app-board";
const COLORS = { red: "赤", orange: "橙", yellow: "黄", green: "緑", blue: "青", purple: "紫", pink: "ピンク", gray: "灰" };
const COLOR_KEYS = Object.keys(COLORS);
const PRIORITIES = {
    high: { name: "高", symbol: "▲" },
    medium: { name: "中", symbol: "◆" },
    low: { name: "低", symbol: "▼" },
};
const PRIORITY_KEYS = Object.keys(PRIORITIES);
const LIMITS = { title: 200, description: 2000, column: 50, category: 30 };
const WEEKDAYS = "日月火水木金土";
const DUE_SOON_DAYS = 3;

const boardEl = document.getElementById("board");
const noticeEl = document.getElementById("notice");
const noticeTextEl = document.getElementById("notice-text");
const dialog = document.getElementById("card-dialog");
const cardForm = document.getElementById("card-form");
const titleInput = document.getElementById("card-title-input");
const descriptionInput = document.getElementById("card-description-input");
const dueInput = document.getElementById("card-due-input");
const categorySelect = document.getElementById("card-category-select");
const colorOptionsEl = document.getElementById("card-color-options");
const formErrorEl = document.getElementById("card-form-error");
const categoryDialog = document.getElementById("category-dialog");
const categoryListEl = document.getElementById("category-list");
const categoryAddForm = document.getElementById("category-add-form");
const categoryNameInput = document.getElementById("category-name-input");
const categoryColorSelect = document.getElementById("category-color-select");
const categoryErrorEl = document.getElementById("category-error");

let board = loadBoard();
let editingCardId = null;
let draggingId = null;
const dropIndicator = createEl("div", "drop-indicator");

function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function newId() {
    // crypto.randomUUID は https / localhost / file 以外では使えない
    return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// ---- 入力の正規化 ----

function sanitizeText(value, max) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const exists = date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    return exists ? value : "";
}

function normalizeColor(value) {
    return COLOR_KEYS.includes(value) ? value : "";
}

function normalizePriority(value) {
    return PRIORITY_KEYS.includes(value) ? value : "";
}

// ---- 期限の表示 ----

function daysUntil(dueDate) {
    const [y, m, d] = dueDate.split("-").map(Number);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((new Date(y, m - 1, d) - today) / 86400000);
}

function formatDueDate(dueDate) {
    const [y, m, d] = dueDate.split("-").map(Number);
    const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
    const year = y === new Date().getFullYear() ? "" : `${y}年`;
    return `${year}${m}月${d}日(${weekday})`;
}

// 色だけに頼らず、文言でも状態が分かるようにする
function describeDue(dueDate) {
    const days = daysUntil(dueDate);
    const date = formatDueDate(dueDate);
    if (days < 0) return { text: `期限切れ ${date} ・ ${-days}日超過`, state: "overdue" };
    if (days === 0) return { text: `今日が期限 ${date}`, state: "today" };
    if (days <= DUE_SOON_DAYS) return { text: `期限 ${date} ・ あと${days}日`, state: "soon" };
    return { text: `期限 ${date}`, state: "later" };
}

// ---- 保存・読み込み ----

function createDefaultCategories() {
    return [
        { id: "work", name: "仕事", color: "blue" },
        { id: "private", name: "プライベート", color: "green" },
        { id: "study", name: "勉強", color: "purple" },
    ];
}

function createDefaultBoard() {
    return {
        columns: [
            { id: "todo", title: "未着手" },
            { id: "doing", title: "進行中" },
            { id: "done", title: "完了" },
        ],
        categories: createDefaultCategories(),
        cards: [],
    };
}

function loadBoard() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return createDefaultBoard();
        return sanitizeBoard(JSON.parse(raw)) ?? createDefaultBoard();
    } catch {
        return createDefaultBoard();
    }
}

function sanitizeCategories(list) {
    const categories = [];
    const ids = new Set();
    for (const category of list) {
        if (!category || typeof category.id !== "string" || ids.has(category.id)) continue;
        const name = sanitizeText(category.name, LIMITS.category);
        if (!name) continue;
        ids.add(category.id);
        categories.push({ id: category.id, name, color: normalizeColor(category.color) || "gray" });
    }
    return categories;
}

// 壊れたデータでも画面が落ちないよう、読み込んだ内容を検証して不正な要素は捨てる
function sanitizeBoard(data) {
    if (!data || !Array.isArray(data.columns) || !Array.isArray(data.cards)) return null;

    const columns = [];
    const columnIds = new Set();
    for (const col of data.columns) {
        if (!col || typeof col.id !== "string" || columnIds.has(col.id)) continue;
        const title = sanitizeText(col.title, LIMITS.column);
        if (!title) continue;
        columnIds.add(col.id);
        columns.push({ id: col.id, title });
    }
    if (columns.length === 0) return null;

    const categories = Array.isArray(data.categories) ? sanitizeCategories(data.categories) : createDefaultCategories();
    const categoryIds = new Set(categories.map((category) => category.id));

    const cards = [];
    const cardIds = new Set();
    for (const card of data.cards) {
        if (!card || typeof card.id !== "string" || cardIds.has(card.id)) continue;
        if (!columnIds.has(card.columnId)) continue;
        const text = sanitizeText(card.text, LIMITS.title);
        if (!text) continue;
        cardIds.add(card.id);
        cards.push({
            id: card.id,
            columnId: card.columnId,
            text,
            description: sanitizeText(card.description, LIMITS.description),
            dueDate: normalizeDate(card.dueDate),
            priority: normalizePriority(card.priority),
            categoryId: categoryIds.has(card.categoryId) ? card.categoryId : "",
            color: normalizeColor(card.color),
        });
    }
    return { columns, categories, cards };
}

function saveBoard() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
        hideNotice();
    } catch {
        showNotice("保存できませんでした。ブラウザの保存領域が使えないか、容量がいっぱいです。操作は続けられますが、ページを閉じると内容が失われる可能性があります。");
    }
}

function commit() {
    saveBoard();
    render();
}

function showNotice(message) {
    noticeTextEl.textContent = message;
    noticeEl.hidden = false;
}

function hideNotice() {
    noticeEl.hidden = true;
}

// ---- データ操作 ----

function findColumn(id) {
    return board.columns.find((column) => column.id === id);
}

function findCard(id) {
    return board.cards.find((card) => card.id === id);
}

function findCategory(id) {
    return board.categories.find((category) => category.id === id);
}

function addCard(columnId, rawText) {
    const text = sanitizeText(rawText, LIMITS.title);
    if (!text || !findColumn(columnId)) return false;
    board.cards.push({
        id: newId(),
        columnId,
        text,
        description: "",
        dueDate: "",
        priority: "",
        categoryId: "",
        color: "",
    });
    commit();
    return true;
}

function updateCard(id, patch) {
    const card = findCard(id);
    if (!card) return false;
    if ("text" in patch) {
        const text = sanitizeText(patch.text, LIMITS.title);
        if (!text) return false;
        card.text = text;
    }
    if ("description" in patch) card.description = sanitizeText(patch.description, LIMITS.description);
    if ("dueDate" in patch) card.dueDate = normalizeDate(patch.dueDate);
    if ("priority" in patch) card.priority = normalizePriority(patch.priority);
    if ("categoryId" in patch) card.categoryId = findCategory(patch.categoryId) ? patch.categoryId : "";
    if ("color" in patch) card.color = normalizeColor(patch.color);
    commit();
    return true;
}

function deleteCard(id) {
    if (!findCard(id)) return;
    board.cards = board.cards.filter((card) => card.id !== id);
    commit();
}

// beforeCardId の直前に挿入する。null なら移動先の列の末尾に追加する
function moveCard(id, columnId, beforeCardId = null) {
    const card = findCard(id);
    if (!card || !findColumn(columnId) || id === beforeCardId) return;
    const before = beforeCardId ? findCard(beforeCardId) : null;
    if (beforeCardId && !before) return;

    board.cards = board.cards.filter((c) => c.id !== id);
    card.columnId = columnId;
    if (before) {
        board.cards.splice(board.cards.indexOf(before), 0, card);
    } else {
        board.cards.push(card);
    }
    commit();
}

function addColumn(rawTitle) {
    const title = sanitizeText(rawTitle, LIMITS.column);
    if (!title) return false;
    board.columns.push({ id: newId(), title });
    commit();
    return true;
}

function renameColumn(id, rawTitle) {
    const column = findColumn(id);
    const title = sanitizeText(rawTitle, LIMITS.column);
    if (!column || !title) return false;
    column.title = title;
    commit();
    return true;
}

function deleteColumn(id) {
    if (board.columns.length <= 1 || !findColumn(id)) return false;
    const count = board.cards.filter((card) => card.columnId === id).length;
    if (count > 0 && !confirm(`この列には${count}枚のカードがあります。列とカードをすべて削除しますか?`)) {
        return false;
    }
    board.columns = board.columns.filter((column) => column.id !== id);
    board.cards = board.cards.filter((card) => card.columnId !== id);
    commit();
    return true;
}

// カテゴリーの操作は、失敗したときに画面へ出すメッセージを返す(成功時は空文字)
function categoryNameError(name, exceptId) {
    if (!name) return "カテゴリー名を入力してください。";
    if (board.categories.some((category) => category.id !== exceptId && category.name === name)) {
        return "同じ名前のカテゴリーがすでにあります。";
    }
    return "";
}

function addCategory(rawName, color) {
    const name = sanitizeText(rawName, LIMITS.category);
    const error = categoryNameError(name, null);
    if (error) return error;
    board.categories.push({ id: newId(), name, color: normalizeColor(color) || "gray" });
    commit();
    return "";
}

function updateCategory(id, patch) {
    const category = findCategory(id);
    if (!category) return "カテゴリーが見つかりません。";
    if ("name" in patch) {
        const name = sanitizeText(patch.name, LIMITS.category);
        const error = categoryNameError(name, id);
        if (error) return error;
        category.name = name;
    }
    if ("color" in patch) category.color = normalizeColor(patch.color) || category.color;
    commit();
    return "";
}

function deleteCategory(id) {
    const category = findCategory(id);
    if (!category) return false;
    const used = board.cards.filter((card) => card.categoryId === id);
    if (used.length > 0 && !confirm(`「${category.name}」は${used.length}枚のカードで使われています。削除すると、これらのカードはカテゴリーなしになります。削除しますか?`)) {
        return false;
    }
    used.forEach((card) => {
        card.categoryId = "";
    });
    board.categories = board.categories.filter((c) => c.id !== id);
    commit();
    return true;
}

// ---- 描画 ----

function render() {
    boardEl.replaceChildren(...board.columns.map(createColumnElement), createAddColumnForm());
}

function createColumnElement(column) {
    const section = createEl("section", "column");
    section.dataset.columnId = column.id;

    const header = createEl("div", "column-header");
    const title = createEl("h2", "column-title", column.title);
    title.tabIndex = 0;
    title.title = "クリックして名前を変更";
    title.addEventListener("click", () => startRenameColumn(title, column));
    title.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.isComposing) startRenameColumn(title, column);
    });

    const renameBtn = createEl("button", "btn-secondary btn-small", "名前変更");
    renameBtn.type = "button";
    renameBtn.setAttribute("aria-label", `列「${column.title}」の名前を変更`);
    renameBtn.addEventListener("click", () => startRenameColumn(title, column));

    const deleteBtn = createEl("button", "btn-danger btn-small", "列を削除");
    deleteBtn.type = "button";
    deleteBtn.setAttribute("aria-label", `列「${column.title}」を削除`);
    deleteBtn.disabled = board.columns.length <= 1;
    deleteBtn.title = deleteBtn.disabled ? "最後の列は削除できません" : "この列を削除";
    deleteBtn.addEventListener("click", () => deleteColumn(column.id));

    const actions = createEl("div", "column-actions");
    actions.append(renameBtn, deleteBtn);
    header.append(title, actions);

    const list = createEl("div", "card-list");
    board.cards
        .filter((card) => card.columnId === column.id)
        .forEach((card) => list.appendChild(createCardElement(card)));

    section.append(header, list, createAddCardForm(column));
    setupDropZone(section, list, column.id);
    return section;
}

function startRenameColumn(titleEl, column) {
    if (!titleEl.isConnected) return;
    const input = createEl("input", "text-input column-title-input");
    input.type = "text";
    input.value = column.title;
    input.maxLength = LIMITS.column;
    input.setAttribute("aria-label", "列名");

    let finished = false;
    const finish = (save) => {
        if (finished) return;
        finished = true;
        // 空の列名は受け付けず、再描画で元の名前に戻す
        if (!save || !renameColumn(column.id, input.value)) render();
    };
    input.addEventListener("keydown", (e) => {
        if (e.isComposing) return;
        if (e.key === "Enter") {
            e.preventDefault();
            finish(true);
        } else if (e.key === "Escape") {
            finish(false);
        }
    });
    input.addEventListener("blur", () => finish(true));

    titleEl.replaceWith(input);
    input.focus();
    input.select();
}

function createAddCardForm(column) {
    const form = createEl("form", "add-card-form");
    const input = createEl("input", "text-input add-card-input");
    input.type = "text";
    input.placeholder = "＋ カードを追加";
    input.maxLength = LIMITS.title;
    input.autocomplete = "off";
    input.setAttribute("aria-label", `「${column.title}」にカードを追加`);
    input.addEventListener("input", () => input.removeAttribute("aria-invalid"));

    const button = createEl("button", "btn-primary", "追加");
    button.type = "submit";
    form.append(input, button);

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (addCard(column.id, input.value)) {
            focusAddCardInput(column.id);
        } else {
            input.setAttribute("aria-invalid", "true");
            input.focus();
        }
    });
    return form;
}

function focusAddCardInput(columnId) {
    const section = [...boardEl.querySelectorAll(".column")].find((el) => el.dataset.columnId === columnId);
    section?.querySelector(".add-card-input")?.focus();
}

function createAddColumnForm() {
    const form = createEl("form", "add-column-form");
    const input = createEl("input", "text-input");
    input.type = "text";
    input.id = "new-column-input";
    input.placeholder = "＋ 列を追加";
    input.maxLength = LIMITS.column;
    input.autocomplete = "off";
    input.setAttribute("aria-label", "新しい列の名前");
    input.addEventListener("input", () => input.removeAttribute("aria-invalid"));

    const button = createEl("button", "btn-primary", "追加");
    button.type = "submit";
    form.append(input, button);

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (addColumn(input.value)) {
            document.getElementById("new-column-input")?.focus();
        } else {
            input.setAttribute("aria-invalid", "true");
            input.focus();
        }
    });
    return form;
}

function createCardElement(card) {
    const el = createEl("div", "card");
    el.draggable = true;
    el.tabIndex = 0;
    el.dataset.id = card.id;
    if (card.color) el.classList.add("has-color", `color-${card.color}`);

    const content = createEl("div", "card-content");

    const category = card.categoryId ? findCategory(card.categoryId) : null;
    if (category) {
        const tags = createEl("div", "card-tags");
        tags.appendChild(createEl("span", `chip color-${category.color}`, category.name));
        content.appendChild(tags);
    }

    content.appendChild(createEl("span", "card-text", card.text));

    const meta = createEl("div", "card-meta");
    if (card.priority) {
        const { name, symbol } = PRIORITIES[card.priority];
        meta.appendChild(createEl("span", `badge priority-${card.priority}`, `${symbol} 優先度 ${name}`));
    }
    if (card.dueDate) {
        const due = describeDue(card.dueDate);
        meta.appendChild(createEl("span", `badge due-${due.state}`, due.text));
    }
    if (card.description) meta.appendChild(createEl("span", "badge", "説明あり"));
    if (meta.hasChildNodes()) content.appendChild(meta);

    const deleteBtn = createEl("button", "icon-btn", "×");
    deleteBtn.type = "button";
    deleteBtn.setAttribute("aria-label", `カード「${card.text}」を削除`);
    deleteBtn.title = "削除";
    deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteCard(card.id);
    });

    const main = createEl("div", "card-main");
    main.append(content, deleteBtn);
    el.appendChild(main);

    el.addEventListener("click", () => openCardDialog(card.id));
    el.addEventListener("keydown", (e) => {
        if (e.target !== el || e.isComposing) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openCardDialog(card.id);
        }
    });

    el.addEventListener("dragstart", (e) => {
        draggingId = card.id;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", card.text); // Firefox はデータがないとドラッグできない
        // ドラッグ画像が半透明にならないよう、スナップショット後にクラスを付ける
        setTimeout(() => el.classList.add("dragging"), 0);
    });
    el.addEventListener("dragend", () => {
        el.classList.remove("dragging");
        clearDragState();
    });

    return el;
}

// ---- ドラッグ&ドロップ(列内の並び替え・列間の移動) ----

function getDragAfterElement(list, y) {
    const cards = [...list.querySelectorAll(".card")].filter((el) => el.dataset.id !== draggingId);
    return cards.find((el) => {
        const box = el.getBoundingClientRect();
        return y < box.top + box.height / 2;
    }) ?? null;
}

function clearDragState() {
    draggingId = null;
    dropIndicator.remove();
    document.querySelectorAll(".card-list.drag-over").forEach((el) => el.classList.remove("drag-over"));
}

function setupDropZone(section, list, columnId) {
    section.addEventListener("dragover", (e) => {
        if (!draggingId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        list.classList.add("drag-over");
        const after = getDragAfterElement(list, e.clientY);
        if (dropIndicator.parentNode !== list || dropIndicator.nextSibling !== after) {
            list.insertBefore(dropIndicator, after);
        }
    });

    section.addEventListener("dragleave", (e) => {
        if (section.contains(e.relatedTarget)) return;
        list.classList.remove("drag-over");
        dropIndicator.remove();
    });

    section.addEventListener("drop", (e) => {
        if (!draggingId) return;
        e.preventDefault();
        const id = draggingId;
        const after = getDragAfterElement(list, e.clientY);
        clearDragState();
        moveCard(id, columnId, after?.dataset.id ?? null);
    });
}

// カード以外(外部のファイルやテキスト)のドラッグは受け付けない。
// ブラウザ標準の「ファイルを開く」動作でボードが閉じてしまうのも防ぐ
window.addEventListener("dragover", (e) => {
    if (draggingId || e.target.closest?.("input, textarea")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "none";
});

// ---- カード編集ダイアログ ----

function showFormError(message) {
    formErrorEl.textContent = message;
    formErrorEl.hidden = false;
}

function checkedValue(name) {
    return cardForm.querySelector(`input[name="${name}"]:checked`)?.value ?? "";
}

function setCheckedValue(name, value) {
    cardForm.querySelectorAll(`input[name="${name}"]`).forEach((radio) => {
        radio.checked = radio.value === value;
    });
}

function buildColorOptions() {
    for (const [value, name] of [["", "なし"], ...Object.entries(COLORS)]) {
        const label = createEl("label", "option");
        const radio = createEl("input");
        radio.type = "radio";
        radio.name = "card-color";
        radio.value = value;
        label.append(radio, createEl("span", value ? `option-face color-${value}` : "option-face", name));
        colorOptionsEl.appendChild(label);
    }
}

function fillCategorySelect(selectedId) {
    categorySelect.replaceChildren(
        new Option("なし", ""),
        ...board.categories.map((category) => new Option(category.name, category.id)),
    );
    categorySelect.value = selectedId;
}

function openCardDialog(id) {
    const card = findCard(id);
    if (!card) return;
    editingCardId = id;
    titleInput.value = card.text;
    descriptionInput.value = card.description;
    dueInput.value = card.dueDate;
    setCheckedValue("card-priority", card.priority);
    fillCategorySelect(card.categoryId);
    setCheckedValue("card-color", card.color);
    formErrorEl.hidden = true;
    dialog.showModal();
    titleInput.focus();
}

cardForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!findCard(editingCardId)) {
        dialog.close();
        return;
    }
    if (!sanitizeText(titleInput.value, LIMITS.title)) {
        showFormError("タイトルを入力してください。");
        titleInput.focus();
        return;
    }
    updateCard(editingCardId, {
        text: titleInput.value,
        description: descriptionInput.value,
        dueDate: dueInput.value,
        priority: checkedValue("card-priority"),
        categoryId: categorySelect.value,
        color: checkedValue("card-color"),
    });
    dialog.close();
});

document.getElementById("card-cancel-button").addEventListener("click", () => dialog.close());
document.getElementById("card-delete-button").addEventListener("click", () => {
    deleteCard(editingCardId);
    dialog.close();
});
dialog.addEventListener("close", () => {
    editingCardId = null;
});
titleInput.addEventListener("input", () => {
    formErrorEl.hidden = true;
});

// ---- カテゴリー設定ダイアログ ----

function showCategoryError(message) {
    categoryErrorEl.textContent = message;
    categoryErrorEl.hidden = false;
}

function fillColorSelect(select, selected) {
    select.replaceChildren(...Object.entries(COLORS).map(([value, name]) => new Option(name, value)));
    select.value = selected;
}

function createCategoryRow(category) {
    const row = createEl("li", "category-row");
    const chip = createEl("span", `chip color-${category.color}`, category.name);

    const nameInput = createEl("input", "text-input");
    nameInput.type = "text";
    nameInput.value = category.name;
    nameInput.maxLength = LIMITS.category;
    nameInput.setAttribute("aria-label", `カテゴリー名(${category.name})`);
    nameInput.addEventListener("change", () => {
        const error = updateCategory(category.id, { name: nameInput.value });
        if (error) {
            showCategoryError(error);
            nameInput.value = category.name;
            return;
        }
        categoryErrorEl.hidden = true;
        chip.textContent = category.name;
        nameInput.setAttribute("aria-label", `カテゴリー名(${category.name})`);
    });

    const colorSelect = createEl("select", "text-input");
    colorSelect.setAttribute("aria-label", `${category.name}の色`);
    fillColorSelect(colorSelect, category.color);
    colorSelect.addEventListener("change", () => {
        updateCategory(category.id, { color: colorSelect.value });
        chip.className = `chip color-${category.color}`;
    });

    const deleteBtn = createEl("button", "btn-danger btn-small", "削除");
    deleteBtn.type = "button";
    deleteBtn.setAttribute("aria-label", `カテゴリー「${category.name}」を削除`);
    deleteBtn.addEventListener("click", () => {
        if (deleteCategory(category.id)) {
            categoryErrorEl.hidden = true;
            renderCategoryList();
        }
    });

    row.append(chip, nameInput, colorSelect, deleteBtn);
    return row;
}

function renderCategoryList() {
    const rows = board.categories.map(createCategoryRow);
    if (rows.length === 0) rows.push(createEl("li", "empty-note", "カテゴリーはまだありません。下から追加できます。"));
    categoryListEl.replaceChildren(...rows);
}

document.getElementById("open-category-dialog").addEventListener("click", () => {
    renderCategoryList();
    categoryErrorEl.hidden = true;
    categoryNameInput.value = "";
    fillColorSelect(categoryColorSelect, "blue");
    categoryDialog.showModal();
});

document.getElementById("category-close-button").addEventListener("click", () => categoryDialog.close());

categoryAddForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const error = addCategory(categoryNameInput.value, categoryColorSelect.value);
    if (error) {
        showCategoryError(error);
        categoryNameInput.setAttribute("aria-invalid", "true");
        categoryNameInput.focus();
        return;
    }
    categoryErrorEl.hidden = true;
    categoryNameInput.value = "";
    renderCategoryList();
    categoryNameInput.focus();
});
categoryNameInput.addEventListener("input", () => categoryNameInput.removeAttribute("aria-invalid"));

// ---- 表示設定(配色・文字サイズ) ----

document.querySelectorAll("[data-theme-value]").forEach((button) => {
    button.addEventListener("click", () => setTheme(button.dataset.themeValue));
});
document.querySelectorAll("[data-font-size-value]").forEach((button) => {
    button.addEventListener("click", () => setFontSize(button.dataset.fontSizeValue));
});
document.getElementById("notice-close").addEventListener("click", hideNotice);

buildColorOptions();
applyPrefs();
render();
