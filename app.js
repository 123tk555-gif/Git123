const STORAGE_KEY = "trello-app-tasks";
const STATUSES = ["todo", "doing", "done"];

let tasks = loadTasks();

function loadTasks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function addTask(text) {
    tasks.push({ id: crypto.randomUUID(), text, status: "todo" });
    saveTasks();
    render();
}

function deleteTask(id) {
    tasks = tasks.filter((task) => task.id !== id);
    saveTasks();
    render();
}

function moveTask(id, status) {
    const task = tasks.find((t) => t.id === id);
    if (task) {
        task.status = status;
        saveTasks();
        render();
    }
}

function createCardElement(task) {
    const card = document.createElement("div");
    card.className = "card";
    card.draggable = true;
    card.dataset.id = task.id;

    const text = document.createElement("span");
    text.className = "card-text";
    text.textContent = task.text;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "card-delete";
    deleteBtn.textContent = "×";
    deleteBtn.setAttribute("aria-label", "削除");
    deleteBtn.addEventListener("click", () => deleteTask(task.id));

    card.append(text, deleteBtn);

    card.addEventListener("dragstart", () => {
        card.classList.add("dragging");
        card.dataset.dragging = "true";
    });
    card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
    });

    return card;
}

function render() {
    for (const status of STATUSES) {
        const list = document.getElementById(`list-${status}`);
        list.innerHTML = "";
        tasks
            .filter((task) => task.status === status)
            .forEach((task) => list.appendChild(createCardElement(task)));
    }
}

function setupDropZones() {
    for (const status of STATUSES) {
        const list = document.getElementById(`list-${status}`);

        list.addEventListener("dragover", (e) => {
            e.preventDefault();
            list.classList.add("drag-over");
        });

        list.addEventListener("dragleave", () => {
            list.classList.remove("drag-over");
        });

        list.addEventListener("drop", (e) => {
            e.preventDefault();
            list.classList.remove("drag-over");
            const dragging = document.querySelector(".card.dragging");
            if (dragging) {
                moveTask(dragging.dataset.id, status);
            }
        });
    }
}

document.getElementById("add-task-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("new-task-input");
    const text = input.value.trim();
    if (text) {
        addTask(text);
        input.value = "";
        input.focus();
    }
});

setupDropZones();
render();
