class Task {
  constructor(id, text, date, priority) {
    this.id = id;
    this.text = text;
    this.date = date;
    this.priority = priority;
    this.completed = false;
    this.createdAt = new Date();
  }
}

class TodoList {
  constructor() {
    this.tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    this.currentFilter = "all";
    this.init();
    this.loadInitialContent();
  }

  init() {
    // DOM Elements
    this.taskInput = document.getElementById("taskInput");
    this.taskDate = document.getElementById("taskDate");
    this.taskPriority = document.getElementById("taskPriority");
    this.addTaskButton = document.getElementById("addTaskButton");
    this.taskList = document.getElementById("taskList");
    this.clearAllButton = document.getElementById("clearAllButton");
    this.themeToggleButton = document.getElementById("themeToggleButton");
    this.filterButtons = document.querySelectorAll(".filters button");

    // Event Listeners
    this.addTaskButton.addEventListener("click", () => this.addTask());
    this.taskInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.addTask();
    });
    this.clearAllButton.addEventListener("click", () => this.clearAllTasks());
    this.themeToggleButton.addEventListener("click", () => this.toggleTheme());

    // Enhanced filter button handling
    this.filterButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        this.filterButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
        this.filterTasks(e);
      });
    });

    // Initial render
    this.renderTasks();
    this.updateTaskStats();
    this.loadTheme();
  }

  async makeOpenAIRequest(prompt) {
    try {
      // Make request to your backend instead of directly to OpenAI
      const response = await fetch("/api/ai-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });
      return await response.json();
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  }

  addTask() {
    const text = this.taskInput.value.trim();
    const date = this.taskDate.value;
    const priority = this.taskPriority.value;

    if (text) {
      const task = new Task(Date.now(), text, date, priority);
      this.tasks.unshift(task); // Add new tasks at the beginning
      this.saveTasks();
      this.renderTasks();
      this.taskInput.value = "";
      this.showNotification("Task added successfully!", "success");
    }
  }

  toggleTaskComplete(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.completed = !task.completed;
      // Add animation class
      const taskElement = document.querySelector(`[data-task-id="${id}"]`);
      taskElement.classList.add("task-transition");

      setTimeout(() => {
        this.saveTasks();
        this.renderTasks();
        this.showNotification(
          task.completed ? "Task completed!" : "Task uncompleted!",
          "info"
        );
      }, 300);
    }
  }

  deleteTask(id) {
    this.tasks = this.tasks.filter((task) => task.id !== id);
    this.saveTasks();
    this.renderTasks();
    this.showNotification("Task deleted!", "error");
  }

  clearAllTasks() {
    if (confirm("Are you sure you want to clear all tasks?")) {
      this.tasks = [];
      this.saveTasks();
      this.renderTasks();
      this.showNotification("All tasks cleared!", "info");
    }
  }

  filterTasks(e) {
    const filter = e.target.id.replace("filter", "").toLowerCase();
    this.currentFilter = filter;

    // Add animation to container
    this.taskList.classList.add("fade-transition");

    setTimeout(() => {
      this.renderTasks();
      this.taskList.classList.remove("fade-transition");
    }, 300);
  }

  getFilteredTasks() {
    switch (this.currentFilter) {
      case "completed":
        return this.tasks.filter((task) => task.completed);
      case "pending":
        return this.tasks.filter((task) => !task.completed);
      default:
        return this.tasks;
    }
  }

  // Using a different quotes API
  async getMotivationalQuote() {
    try {
      const response = await fetch("https://type.fit/api/quotes", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });
      const quotes = await response.json();
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      return {
        quote: randomQuote.text,
        author: randomQuote.author || "Unknown",
      };
    } catch (error) {
      console.error("Error fetching quote:", error);
      return {
        quote: "The only way to do great work is to love what you do.",
        author: "Steve Jobs",
      };
    }
  }

  // Using local activity suggestions instead of API
  getActivitySuggestion() {
    const activities = [
      {
        activity: "Start a daily meditation practice",
        type: "wellness",
      },
      {
        activity: "Create a weekly meal plan",
        type: "planning",
      },
      {
        activity: "Organize your digital files",
        type: "productivity",
      },
      {
        activity: "Take a 30-minute walk",
        type: "health",
      },
      {
        activity: "Learn a new programming concept",
        type: "education",
      },
      {
        activity: "Write in a gratitude journal",
        type: "mindfulness",
      },
      {
        activity: "Clean and organize your workspace",
        type: "organization",
      },
      {
        activity: "Practice a new language for 20 minutes",
        type: "learning",
      },
      {
        activity: "Do a 15-minute workout",
        type: "fitness",
      },
      {
        activity: "Read a chapter of a book",
        type: "personal development",
      },
    ];

    return activities[Math.floor(Math.random() * activities.length)];
  }

  async renderEmptyState() {
    const quote = await this.getMotivationalQuote();
    const activity = this.getActivitySuggestion();

    this.taskList.innerHTML = `
      <div class="empty-state">
        <i class="fas ${this.getEmptyStateIcon()}"></i>
        <p class="empty-message">${this.getEmptyStateMessage()}</p>
        
        ${
          quote
            ? `
          <div class="motivation-quote">
            <p>"${quote.quote}"</p>
            <span>- ${quote.author}</span>
          </div>
        `
            : ""
        }
        
        ${
          activity
            ? `
          <div class="activity-suggestion">
            <h4>Why not try this?</h4>
            <p>${activity.activity}</p>
            <button class="add-suggestion-btn">
              <i class="fas fa-plus"></i> Add as Task
            </button>
          </div>
        `
            : ""
        }
      </div>
    `;

    // Add event listener for suggestion button
    const suggestionBtn = this.taskList.querySelector(".add-suggestion-btn");
    if (suggestionBtn && activity) {
      suggestionBtn.addEventListener("click", () => {
        this.taskInput.value = activity.activity;
        this.addTask();
      });
    }
  }

  // Override the original renderTasks method
  async renderTasks() {
    const filteredTasks = this.getFilteredTasks();
    this.taskList.innerHTML = "";

    if (filteredTasks.length === 0) {
      this.taskList.innerHTML = `
        <div class="empty-state">
          <i class="fas ${this.getEmptyStateIcon()}"></i>
          <p class="empty-message">${this.getEmptyStateMessage()}</p>
        </div>
      `;
      await this.updateMotivationalQuote();
      await this.updateActivitySuggestion();
    } else {
      document.getElementById("motivationalQuote").style.display = "none";
      document.getElementById("activitySuggestion").style.display = "none";

      filteredTasks.forEach((task) => {
        const li = document.createElement("li");
        li.className = task.completed ? "completed" : "";
        li.setAttribute("data-task-id", task.id);

        li.innerHTML = `
          <div class="task-info">
            <input type="checkbox" ${task.completed ? "checked" : ""}>
            <span class="task-text">${task.text}</span>
            <span class="priority-badge priority-${task.priority}">${
          task.priority
        }</span>
            ${
              task.date
                ? `<span class="task-date">${this.formatDate(task.date)}</span>`
                : ""
            }
          </div>
          <div class="task-actions">
            <button class="delete-btn" title="Delete task">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;

        // Event listeners
        const checkbox = li.querySelector('input[type="checkbox"]');
        checkbox.addEventListener("change", () => {
          li.classList.add("task-transition");
          this.toggleTaskComplete(task.id);
        });

        const deleteBtn = li.querySelector(".delete-btn");
        deleteBtn.addEventListener("click", () => this.deleteTask(task.id));

        this.taskList.appendChild(li);
      });
    }

    this.updateTaskStats();
  }

  getEmptyStateIcon() {
    switch (this.currentFilter) {
      case "completed":
        return "fa-check-circle";
      case "pending":
        return "fa-clock";
      default:
        return "fa-tasks";
    }
  }

  getEmptyStateMessage() {
    switch (this.currentFilter) {
      case "completed":
        return "No completed tasks yet";
      case "pending":
        return "No pending tasks";
      default:
        return "No tasks added yet";
    }
  }

  formatDate(date) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  updateTaskStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter((task) => task.completed).length;
    const pending = total - completed;

    document.getElementById("totalTasks").textContent = total;
    document.getElementById("completedTasksCount").textContent = completed;
    document.getElementById("pendingTasksCount").textContent = pending;
  }

  saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(this.tasks));
  }

  toggleTheme() {
    document.body.classList.toggle("dark-theme");
    const isDark = document.body.classList.contains("dark-theme");
    localStorage.setItem("darkTheme", isDark);
    this.themeToggleButton.innerHTML = isDark
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
  }

  loadTheme() {
    const isDark = localStorage.getItem("darkTheme") === "true";
    if (isDark) {
      document.body.classList.add("dark-theme");
      this.themeToggleButton.innerHTML = '<i class="fas fa-sun"></i>';
    }
  }

  showNotification(message, type = "success") {
    const toastContainer = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    toast.innerHTML = `
        ${message}
        <button class="toast-close">&times;</button>
    `;

    toastContainer.appendChild(toast);

    // Add click event to close button
    const closeButton = toast.querySelector(".toast-close");
    closeButton.addEventListener("click", () => {
      toast.style.animation = "slideOut 0.3s ease forwards";
      setTimeout(() => {
        toast.remove();
      }, 300);
    });

    // Automatically remove toast after 3 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = "slideOut 0.3s ease forwards";
        setTimeout(() => {
          toast.remove();
        }, 300);
      }
    }, 3000);
  }

  async loadInitialContent() {
    await this.updateMotivationalQuote();
    await this.updateActivitySuggestion();
  }

  async updateMotivationalQuote() {
    try {
      const quote = await this.getMotivationalQuote();
      const quoteElement = document.getElementById("motivationalQuote");
      if (quote && quoteElement) {
        quoteElement.innerHTML = `
          <p>"${quote.quote}"</p>
          <span>- ${quote.author}</span>
        `;
        quoteElement.style.display = "block";
      }
    } catch (error) {
      console.error("Error updating quote:", error);
    }
  }

  async updateActivitySuggestion() {
    try {
      const activity = this.getActivitySuggestion();
      const suggestionElement = document.getElementById("activitySuggestion");
      if (activity && suggestionElement) {
        suggestionElement.innerHTML = `
          <h4>Suggested Activity</h4>
          <p>${activity.activity}</p>
          <span class="activity-type">${activity.type}</span>
          <button class="add-suggestion-btn">
            <i class="fas fa-plus"></i> Add as Task
          </button>
        `;
        suggestionElement.style.display = "block";

        const suggestionBtn = suggestionElement.querySelector(
          ".add-suggestion-btn"
        );
        suggestionBtn.addEventListener("click", () => {
          this.taskInput.value = activity.activity;
          this.addTask();
        });
      }
    } catch (error) {
      console.error("Error updating activity:", error);
    }
  }
}

// Initialize the app
const todoList = new TodoList();

// Add dark mode toggle with local storage persistence
function toggleDarkMode() {
  const isDark = document.body.classList.toggle("dark-theme");
  localStorage.setItem("darkMode", isDark);

  // Update toggle button icon
  const icon = document.getElementById("darkModeIcon");
  icon.className = isDark ? "fas fa-sun" : "fas fa-moon";
}

// Search and filter functionality
function searchTasks(query) {
  const tasks = document.querySelectorAll("li");
  tasks.forEach((task) => {
    const text = task.textContent.toLowerCase();
    task.style.display = text.includes(query.toLowerCase()) ? "" : "none";
  });
}

// Task categories with color coding
function addTask(text, category = "default") {
  const task = document.createElement("li");
  task.innerHTML = `
    <span class="category-tag ${category}">${category}</span>
    <p>${text}</p>
    <div class="task-actions">
      <button onclick="editTask(this)" class="edit-btn">
        <i class="fas fa-edit"></i>
      </button>
      <button onclick="deleteTask(this)" class="delete-btn">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;
  taskList.appendChild(task);
  saveTasks();
}

// Task editing functionality
function editTask(button) {
  const taskItem = button.closest("li");
  const taskText = taskItem.querySelector("p").textContent;
  const newText = prompt("Edit task:", taskText);

  if (newText !== null && newText.trim() !== "") {
    taskItem.querySelector("p").textContent = newText;
    saveTasks();
    showToast("Task updated successfully!");
  }
}

// Enhanced toast notifications
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${type === "success" ? "fa-check" : "fa-exclamation"}"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Task statistics
function updateStats() {
  const total = document.querySelectorAll("li").length;
  const completed = document.querySelectorAll("li.completed").length;

  document.getElementById("totalTasks").textContent = total;
  document.getElementById("completedTasks").textContent = completed;
  document.getElementById("pendingTasks").textContent = total - completed;
}

// Drag and drop reordering
function enableDragAndDrop() {
  const taskList = document.querySelector("ul");
  new Sortable(taskList, {
    animation: 150,
    onEnd: () => saveTasks(),
  });
}

// Initialize features
document.addEventListener("DOMContentLoaded", () => {
  // Load dark mode preference
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-theme");
  }

  enableDragAndDrop();
  updateStats();
});
