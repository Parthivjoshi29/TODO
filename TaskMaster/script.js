class Task {
  constructor(id, text, date, priority, category, dueDate, recurrence) {
    this.id = id;
    this.text = text;
    this.date = date;
    this.priority = priority;
    this.category = category;
    this.dueDate = dueDate;
    this.recurrence = recurrence;
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
    this.setReminderInterval();

    // Add event listener for search input
    document.getElementById("searchInput").addEventListener("input", () => {
      this.renderTasks(); // Re-render tasks on search input
      this.updateStats(); // Update stats on search input
    });

    // Initial stats update
    this.updateStats();

    // Add event listener for filtering
    document.getElementById("filterTasks").addEventListener("change", () => {
      this.renderTasks(); // Re-render tasks when filtering changes
    });
  }

  init() {
    // DOM Elements
    this.taskInput = document.getElementById("taskInput");
    this.taskDate = document.getElementById("taskDate");
    this.taskPriority = document.getElementById("taskPriority");
    this.taskDueDate = document.getElementById("taskDueDate");
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

    // Add event listener for sorting
    document.getElementById("sortTasks").addEventListener("change", () => {
      this.renderTasks(); // Re-render tasks when sorting changes
    });

    // Add event listener for filtering
    document.getElementById("filterTasks").addEventListener("change", () => {
      this.renderTasks(); // Re-render tasks when filtering changes
    });
  }

  async makeOpenAIRequest(prompt) {
    try {
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
    const dueDate = this.taskDueDate.value;
    const priority = this.taskPriority.value;
    const category = document.getElementById("taskCategory").value;
    const recurrence = document.getElementById("taskRecurrence").value;

    if (text) {
      const task = new Task(
        Date.now(),
        text,
        date,
        priority,
        category,
        dueDate,
        recurrence
      );
      this.tasks.unshift(task);

      // Handle recurrence
      if (recurrence !== "none") {
        const nextTask = this.createRecurringTask(task);
        this.tasks.unshift(nextTask); // Add the next occurrence
      }

      this.saveTasks();
      this.renderTasks();
      this.taskInput.value = "";
      this.taskDueDate.value = "";
      this.showNotification("Task added successfully!", "success");
      this.updateStats();
    }
  }

  // Function to create the next occurrence of a task
  createRecurringTask(task) {
    const nextDueDate = new Date(task.dueDate);
    switch (task.recurrence) {
      case "daily":
        nextDueDate.setDate(nextDueDate.getDate() + 1);
        break;
      case "weekly":
        nextDueDate.setDate(nextDueDate.getDate() + 7);
        break;
      case "monthly":
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        break;
    }
    return new Task(
      Date.now(),
      task.text,
      task.date,
      task.priority,
      task.category,
      nextDueDate.toISOString().split("T")[0],
      task.recurrence
    );
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
    this.updateTaskStats();
  }

  clearAllTasks() {
    const confirmationToast = document.getElementById("confirmationToast");
    confirmationToast.style.display = "flex"; // Show the confirmation toast

    // Handle confirmation
    document.getElementById("confirmClear").onclick = () => {
      this.tasks = []; // Clear all tasks
      this.saveTasks();
      this.renderTasks();
      this.showNotification("All tasks cleared!", "info"); // Use your custom toast notification
      confirmationToast.style.display = "none"; // Hide the confirmation toast
    };

    // Handle cancellation
    document.getElementById("cancelClear").onclick = () => {
      confirmationToast.style.display = "none"; // Hide the confirmation toast
    };
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
    const activity = this.getActivitySuggestion();

    this.taskList.innerHTML = `
      <div class="empty-state">
        <i class="fas ${this.getEmptyStateIcon()}"></i>
        <p class="empty-message">${this.getEmptyStateMessage()}</p>
        
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
    const searchTerm = document
      .getElementById("searchInput")
      .value.toLowerCase();
    const sortCriteria = document.getElementById("sortTasks").value;
    const filterCriteria = document.getElementById("filterTasks").value;

    // Get all tasks and filter based on search term
    let filteredTasks = this.tasks.filter((task) =>
      task.text.toLowerCase().includes(searchTerm)
    );

    // Apply filtering
    filteredTasks = this.filterTasks(filteredTasks, filterCriteria);

    // Apply sorting
    filteredTasks = this.sortTasks(filteredTasks, sortCriteria);

    // Render the filtered and sorted tasks
    this.taskList.innerHTML = ""; // Clear the current task list

    if (filteredTasks.length === 0) {
      this.taskList.innerHTML = `
        <div class="empty-state">
          <i class="fas ${this.getEmptyStateIcon()}"></i>
          <p class="empty-message">${this.getEmptyStateMessage()}</p>
        </div>
      `;
      await this.updateActivitySuggestion();
    } else {
      document.getElementById("activitySuggestion").style.display = "none";

      filteredTasks.forEach((task) => {
        const li = document.createElement("li");
        li.className = task.completed ? "completed" : "";
        li.setAttribute("data-task-id", task.id);

        li.innerHTML = `
          <div class="task-info">
            <input type="checkbox" ${task.completed ? "checked" : ""}>
            <span class="task-text">${task.text}</span>
            <span class="due-date">${
              task.dueDate ? `Due: ${this.formatDate(task.dueDate)}` : ""
            }</span>
            <span class="priority-badge priority-${task.priority}">${
          task.priority
        }</span>
            <span class="category-badge">${task.category}</span>
            ${
              task.date
                ? `<span class="task-date">${this.formatDate(task.date)}</span>`
                : ""
            }
          </div>
          <div class="task-actions">
            <button class="edit-btn" title="Edit task">
              <i class="fas fa-edit"></i>
            </button>
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

        // Add event listener for the edit button
        const editBtn = li.querySelector(".edit-btn");
        editBtn.addEventListener("click", () => this.editTask(task));

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

  formatDate(dateString) {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  updateTaskStats() {
    if (!this.tasks) {
      console.error("Tasks array is not defined.");
      return; // Exit the function if tasks is undefined
    }

    const total = this.tasks.length;
    const completed = this.tasks.filter((task) => task.completed).length;
    const pending = total - completed;

    const totalTasksElement = document.getElementById("totalTasks");
    const completedTasksCountElement = document.getElementById(
      "completedTasksCount"
    );
    const pendingTasksCountElement =
      document.getElementById("pendingTasksCount");

    if (
      totalTasksElement &&
      completedTasksCountElement &&
      pendingTasksCountElement
    ) {
      totalTasksElement.textContent = total;
      completedTasksCountElement.textContent = completed;
      pendingTasksCountElement.textContent = pending;
    } else {
      console.error("One or more elements not found in the DOM.");
    }
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
    await this.updateActivitySuggestion();
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

  // Check if the task is due soon (within the next 24 hours)
  isTaskDueSoon(taskDate) {
    const now = new Date();
    const dueDate = new Date(taskDate);
    const timeDifference = dueDate - now;
    const oneDayInMillis = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    return timeDifference > 0 && timeDifference <= oneDayInMillis;
  }

  // Function to handle task editing in the modal
  editTask(task) {
    // Populate the modal fields with the task details
    document.getElementById("editTaskText").value = task.text;
    document.getElementById("editTaskDate").value = task.date || "";
    document.getElementById("editTaskPriority").value = task.priority;
    document.getElementById("editTaskCategory").value = task.category;

    // Show the modal
    const modal = document.getElementById("editTaskModal");
    modal.style.display = "block";

    // Save changes when the button is clicked
    document.getElementById("saveTaskButton").onclick = () => {
      const updatedText = document.getElementById("editTaskText").value.trim();
      const updatedDate = document.getElementById("editTaskDate").value;
      const updatedPriority = document.getElementById("editTaskPriority").value;
      const updatedCategory = document.getElementById("editTaskCategory").value;

      if (updatedText) {
        const updatedTask = new Task(
          task.id,
          updatedText,
          updatedDate,
          updatedPriority,
          updatedCategory
        );
        const taskIndex = this.tasks.findIndex((t) => t.id === task.id);
        this.tasks[taskIndex] = updatedTask; // Update the task in the array
        this.saveTasks();
        this.renderTasks(); // Re-render the tasks
        this.showNotification("Task updated successfully!", "success");
        modal.style.display = "none"; // Close the modal
      }
    };

    // Close the modal when the close button is clicked
    document.querySelector(".close-button").onclick = () => {
      modal.classList.add("fade-out"); // Add fade-out class
      setTimeout(() => {
        modal.style.display = "none"; // Hide modal after animation
        modal.classList.remove("fade-out"); // Remove fade-out class for next open
      }, 300); // Match the duration of the fade-out animation
    };

    // Close the modal when clicking outside of it
    window.onclick = (event) => {
      if (event.target === modal) {
        modal.classList.add("fade-out"); // Add fade-out class
        setTimeout(() => {
          modal.style.display = "none"; // Hide modal after animation
          modal.classList.remove("fade-out"); // Remove fade-out class for next open
        }, 300); // Match the duration of the fade-out animation
      }
    };
  }

  checkForReminders() {
    const now = new Date();
    this.tasks.forEach((task) => {
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const timeDiff = dueDate - now;

        // Check if the due date is within the next 24 hours
        if (timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000) {
          this.showNotification(
            `Reminder: Task "${task.text}" is due soon!`,
            "info"
          );
        }
      }
    });
  }

  setReminderInterval() {
    // Call this function periodically, e.g., every hour
    setInterval(() => {
      this.checkForReminders();
    }, 60 * 60 * 1000); // Check every hour
  }

  updateStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter((task) => task.completed).length;
    const pending = total - completed;

    const totalTasksElement = document.getElementById("totalTasks");
    const completedTasksCountElement = document.getElementById(
      "completedTasksCount"
    );
    const pendingTasksCountElement =
      document.getElementById("pendingTasksCount");

    if (
      totalTasksElement &&
      completedTasksCountElement &&
      pendingTasksCountElement
    ) {
      totalTasksElement.textContent = total;
      completedTasksCountElement.textContent = completed;
      pendingTasksCountElement.textContent = pending;
    } else {
      console.error("One or more elements not found in the DOM.");
    }
  }

  generateRecurringTasks(task) {
    const now = new Date();
    let nextOccurrence = new Date(task.dueDate);

    while (nextOccurrence <= now) {
      switch (task.recurrence) {
        case "daily":
          nextOccurrence.setDate(nextOccurrence.getDate() + 1);
          break;
        case "weekly":
          nextOccurrence.setDate(nextOccurrence.getDate() + 7);
          break;
        case "monthly":
          nextOccurrence.setMonth(nextOccurrence.getMonth() + 1);
          break;
        default:
          return; // No recurrence
      }

      const newTask = new Task(
        Date.now(),
        task.text,
        task.date,
        task.priority,
        task.category,
        nextOccurrence.toISOString().split("T")[0],
        task.recurrence
      );
      this.tasks.push(newTask);
    }
  }

  sortTasks(tasks, criteria) {
    switch (criteria) {
      case "date":
        return tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      case "priority":
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        return tasks.sort(
          (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
        );
      case "category":
        return tasks.sort((a, b) => a.category.localeCompare(b.category));
      default:
        return tasks;
    }
  }

  filterTasks(tasks, filter) {
    switch (filter) {
      case "completed":
        return tasks.filter((task) => task.completed);
      case "pending":
        return tasks.filter((task) => !task.completed);
      case "all":
      default:
        return tasks;
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

  // Load tasks and then update stats
  todoList.loadInitialContent().then(() => {
    this.updateStats(); // Call updateStats after loading tasks
  });
  enableDragAndDrop();
  updateStats();

  // Scroll to Top Button Logic
  const scrollToTopButton = document.getElementById("scrollToTop");

  // Show or hide the button based on scroll position
  window.onscroll = function () {
    if (
      document.body.scrollTop > 100 ||
      document.documentElement.scrollTop > 100
    ) {
      scrollToTopButton.style.display = "block"; // Show button
    } else {
      scrollToTopButton.style.display = "none"; // Hide button
    }
  };

  // Scroll to top when the button is clicked
  scrollToTopButton.onclick = function () {
    window.scrollTo({
      top: 0,
      behavior: "smooth", // Smooth scroll to top
    });
  };

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();

      document.querySelector(this.getAttribute("href")).scrollIntoView({
        behavior: "smooth",
      });
    });
  });
});

function updateColorPicker() {
  const categorySelect = document.getElementById("taskCategory");
  const selectedOption = categorySelect.options[categorySelect.selectedIndex];
  const color = selectedOption.getAttribute("data-color");
  document.getElementById("categoryColor").value = color; // Update color picker
}

function setColor(color) {
  document.getElementById("categoryColor").value = color; // Set the hidden color input
}

function sortTasks(tasks, criteria) {
  switch (criteria) {
    case "date":
      return tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    case "priority":
      const priorityOrder = { high: 1, medium: 2, low: 3 };
      return tasks.sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
      );
    case "category":
      return tasks.sort((a, b) => a.category.localeCompare(b.category));
    default:
      return tasks;
  }
}

function filterTasks(tasks, filter) {
  switch (filter) {
    case "completed":
      return tasks.filter((task) => task.completed);
    case "pending":
      return tasks.filter((task) => !task.completed);
    case "all":
    default:
      return tasks;
  }
}
