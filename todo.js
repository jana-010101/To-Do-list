const STORAGE_KEY = "little-progress-tasks";
const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-name");
const taskList = document.querySelector("#tasks");
const tabs = document.querySelectorAll("[data-filter]");
const activeCount = document.querySelector("#active-count");
const completedCount = document.querySelector("#completed-count");
const progressCount = document.querySelector("#progress-count");
const progressTrack = document.querySelector(".progress-track");
const progressFill = document.querySelector("#progress-fill");
const taskSummary = document.querySelector("#task-summary");
const clearCompletedButton = document.querySelector("#clear-completed");

let currentFilter = "active";
let editingTaskId = null;
let tasks = loadTasks();

function loadTasks() {
    try {
        const savedTasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(savedTasks)
            ? savedTasks.filter((task) => task && typeof task.text === "string").map((task) => ({
                id: String(task.id || createId()),
                text: task.text,
                completed: Boolean(task.completed)
            }))
            : [];
    } catch {
        return [];
    }
}

function createId() {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
        taskSummary.textContent = "Storage is unavailable. Your tasks may not be saved.";
    }
}

function makeIcon(name) {
    const paths = {
        edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
        delete: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/>',
        close: '<path d="m18 6-12 12M6 6l12 12"/>',
        check: '<path d="m5 12 4 4L19 6"/>',
        sparkle: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1 2.5 2 1-2 1L19 21l-1-2.5-2-1 2-1 1-2.5Z"/>'
    };
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = paths[name];
    return svg;
}

function render() {
    const completedTasks = tasks.filter((task) => task.completed).length;
    const remainingTasks = tasks.length - completedTasks;
    const progress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

    activeCount.textContent = remainingTasks;
    completedCount.textContent = completedTasks;
    progressCount.textContent = `${progress}%`;
    progressFill.style.width = `${progress}%`;
    progressTrack.setAttribute("aria-valuenow", progress);
    taskSummary.textContent = remainingTasks
        ? `${remainingTasks} ${remainingTasks === 1 ? "task" : "tasks"} left to make today count`
        : tasks.length
            ? "Everything is done. Take a moment to enjoy that."
            : "A fresh start. Add one small thing to get moving.";
    clearCompletedButton.disabled = completedTasks === 0;

    tabs.forEach((tab) => {
        const selected = tab.dataset.filter === currentFilter;
        tab.setAttribute("aria-selected", selected);
        tab.tabIndex = selected ? 0 : -1;
    });
    taskList.setAttribute("aria-labelledby", `${currentFilter}-tab`);

    const visibleTasks = tasks.filter((task) => currentFilter === "active" ? !task.completed : task.completed);
    taskList.replaceChildren();

    if (!visibleTasks.length) {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";
        const icon = document.createElement("span");
        icon.className = "empty-icon";
        icon.append(makeIcon("sparkle"));
        const message = document.createElement("p");
        message.textContent = currentFilter === "active"
            ? "Nothing on your list. Enjoy the breathing room, or add a task above."
            : "Your completed tasks will land here. Every checkmark counts.";
        emptyState.append(icon, message);
        taskList.append(emptyState);
        return;
    }

    visibleTasks.forEach((task) => taskList.append(createTaskRow(task)));
}

function createTaskRow(task) {
    const row = document.createElement("article");
    row.className = `task-row${task.completed ? " is-completed" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.dataset.action = "toggle";
    checkbox.dataset.id = task.id;
    checkbox.setAttribute("aria-label", `Mark ${task.text} as ${task.completed ? "active" : "completed"}`);

    const content = document.createElement("div");
    content.className = "task-content";

    if (editingTaskId === task.id) {
        const editForm = document.createElement("form");
        editForm.className = "edit-form";
        editForm.dataset.id = task.id;
        const editInput = document.createElement("input");
        editInput.className = "edit-input";
        editInput.value = task.text;
        editInput.maxLength = 180;
        editInput.setAttribute("aria-label", "Edit task");
        const saveButton = document.createElement("button");
        saveButton.className = "icon-button save-edit";
        saveButton.type = "submit";
        saveButton.setAttribute("aria-label", "Save task");
        saveButton.title = "Save task";
        saveButton.append(makeIcon("check"));
        const cancelButton = document.createElement("button");
        cancelButton.className = "icon-button";
        cancelButton.type = "button";
        cancelButton.dataset.action = "cancel-edit";
        cancelButton.setAttribute("aria-label", "Cancel editing");
        cancelButton.title = "Cancel editing";
        cancelButton.append(makeIcon("close"));
        editForm.append(editInput, saveButton, cancelButton);
        content.append(editForm);
        requestAnimationFrame(() => {
            editInput.focus();
            editInput.select();
        });
    } else {
        const text = document.createElement("p");
        text.className = "task-text";
        text.textContent = task.text;
        content.append(text);
    }

    const actions = document.createElement("div");
    actions.className = "task-actions";
    if (!task.completed && editingTaskId !== task.id) {
        actions.append(makeActionButton("edit", "Edit task", task.id));
    }
    actions.append(makeActionButton("delete", "Delete task", task.id));
    row.append(checkbox, content, actions);
    return row;
}

function makeActionButton(action, label, id) {
    const button = document.createElement("button");
    button.className = "icon-button";
    button.type = "button";
    button.dataset.action = action;
    button.dataset.id = id;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.append(makeIcon(action));
    return button;
}

taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = taskInput.value.trim();
    if (!text) {
        taskInput.focus();
        return;
    }
    tasks.unshift({ id: createId(), text, completed: false });
    currentFilter = "active";
    taskForm.reset();
    saveTasks();
    render();
    taskInput.focus();
});

taskList.addEventListener("change", (event) => {
    const checkbox = event.target.closest('[data-action="toggle"]');
    if (!checkbox) return;
    const task = tasks.find((item) => item.id === checkbox.dataset.id);
    if (task) task.completed = checkbox.checked;
    saveTasks();
    render();
});

taskList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const { action, id } = button.dataset;

    if (action === "edit") {
        editingTaskId = id;
    } else if (action === "cancel-edit") {
        editingTaskId = null;
    } else if (action === "delete") {
        tasks = tasks.filter((task) => task.id !== id);
        editingTaskId = null;
        saveTasks();
    } else {
        return;
    }
    render();
});

taskList.addEventListener("submit", (event) => {
    const form = event.target.closest(".edit-form");
    if (!form) return;
    event.preventDefault();
    const text = form.querySelector(".edit-input").value.trim();
    const task = tasks.find((item) => item.id === form.dataset.id);
    if (task && text) {
        task.text = text;
        saveTasks();
        editingTaskId = null;
        render();
    } else {
        form.querySelector(".edit-input").focus();
    }
});

taskList.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && event.target.matches(".edit-input")) {
        editingTaskId = null;
        render();
    }
});

tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        currentFilter = tab.dataset.filter;
        editingTaskId = null;
        render();
    });

    tab.addEventListener("keydown", (event) => {
        const index = Array.from(tabs).indexOf(tab);
        let nextIndex;
        if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = tabs.length - 1;
        else return;

        event.preventDefault();
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
    });
});

clearCompletedButton.addEventListener("click", () => {
    tasks = tasks.filter((task) => !task.completed);
    saveTasks();
    render();
});

document.querySelector("#today-date").textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
}).format(new Date());

render();