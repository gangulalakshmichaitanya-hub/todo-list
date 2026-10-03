/**
 * Smart To-Do List Web Application
 * Comprehensive JavaScript logic for state management, LocalStorage,
 * form validation, filtering, dashboard metrics, and interactive modals.
 */

(function () {
  'use strict';

  // ==========================================================================
  // Storage Key & Initial State
  // ==========================================================================
  const STORAGE_KEY = 'smart_todo_tasks_v1';

  let tasks = [];
  let currentFilter = 'all'; // 'all' | 'pending' | 'completed'
  let currentPriorityFilter = 'all'; // 'all' | 'High' | 'Medium' | 'Low'
  let searchQuery = '';
  let pendingDeleteTaskId = null;

  // ==========================================================================
  // DOM Elements
  // ==========================================================================
  const currentDateBadge = document.getElementById('current-date-badge');
  const totalCountEl = document.getElementById('total-count');
  const pendingCountEl = document.getElementById('pending-count');
  const completedCountEl = document.getElementById('completed-count');
  const progressPercentEl = document.getElementById('progress-percent');
  const progressBarFillEl = document.getElementById('progress-bar-fill');
  const showingCountBadge = document.getElementById('showing-count');

  // Form Elements
  const addTaskForm = document.getElementById('add-task-form');
  const taskTitleInput = document.getElementById('task-title');
  const taskTitleError = document.getElementById('task-title-error');
  const taskDescInput = document.getElementById('task-desc');
  const taskPrioritySelect = document.getElementById('task-priority');
  const taskDueDateInput = document.getElementById('task-due-date');

  // Filter & Search Controls
  const filterPills = document.querySelectorAll('.filter-pill');
  const priorityFilterSelect = document.getElementById('priority-filter');
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');

  // Tasks List & Empty State
  const tasksContainer = document.getElementById('tasks-container');
  const emptyState = document.getElementById('empty-state');
  const emptyStateTitle = document.getElementById('empty-state-title');
  const emptyStateDesc = document.getElementById('empty-state-desc');

  // Edit Modal Elements
  const editModal = document.getElementById('edit-modal');
  const editTaskForm = document.getElementById('edit-task-form');
  const editTaskIdInput = document.getElementById('edit-task-id');
  const editTaskTitleInput = document.getElementById('edit-task-title');
  const editTitleError = document.getElementById('edit-title-error');
  const editTaskDescInput = document.getElementById('edit-task-desc');
  const editTaskPrioritySelect = document.getElementById('edit-task-priority');
  const editTaskDueDateInput = document.getElementById('edit-task-due-date');
  const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');

  // Delete Modal Elements
  const deleteModal = document.getElementById('delete-modal');
  const deleteTitlePreview = document.getElementById('delete-task-title-preview');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

  // Toast Container
  const toastContainer = document.getElementById('toast-container');

  // ==========================================================================
  // Helper Utilities
  // ==========================================================================
  
  /**
   * Escape HTML special characters for safe rendering
   */
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Format ISO date string (YYYY-MM-DD) to friendly format
   */
  function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    
    // Parse parts to avoid timezone shifting
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const taskDate = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const timeDiff = taskDate.getTime() - today.getTime();
    const dayDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24));

    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const formatted = taskDate.toLocaleDateString('en-US', options);

    if (dayDiff === 0) return `Today (${formatted})`;
    if (dayDiff === 1) return `Tomorrow (${formatted})`;
    if (dayDiff === -1) return `Yesterday (${formatted})`;

    return formatted;
  }

  /**
   * Determine if a pending task is overdue
   */
  function isTaskOverdue(task) {
    if (task.completed || !task.dueDate) return false;
    
    const parts = task.dueDate.split('-');
    if (parts.length !== 3) return false;

    // End of due day
    const dueTime = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 23, 59, 59).getTime();
    return dueTime < Date.now();
  }

  /**
   * Show temporary toast notification
   */
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'danger') {
      iconSvg = `<svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg} <span>${escapeHTML(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, 2800);
  }

  /**
   * Set live date badge in header
   */
  function initDateBadge() {
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    const dateFormatted = now.toLocaleDateString('en-US', options);
    
    currentDateBadge.innerHTML = `
      <svg width="14" height="14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
      <span>${dateFormatted}</span>
    `;
  }

  // ==========================================================================
  // LocalStorage Persistence
  // ==========================================================================

  /**
   * Generate default realistic college tasks for initial load
   */
  function getDefaultTasks() {
    const today = new Date();
    
    // Tomorrow for assignment
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Yesterday for overdue demonstration
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // 4 days ahead for project presentation
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 4);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    return [
      {
        id: 'task_default_1',
        title: 'Submit Database Management Assignment',
        description: 'Complete SQL schema normalization and indexing queries for lab submission.',
        priority: 'High',
        dueDate: tomorrowStr,
        completed: false,
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        id: 'task_default_2',
        title: 'Review Operating Systems Lecture Notes',
        description: 'Revise virtual memory paging algorithms and process scheduling concepts.',
        priority: 'Medium',
        dueDate: yesterdayStr,
        completed: false,
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
      },
      {
        id: 'task_default_3',
        title: 'Setup Development Environment & Git Repository',
        description: 'Install required text editor, extensions, and clone project template.',
        priority: 'Low',
        dueDate: nextWeekStr,
        completed: true,
        createdAt: new Date(Date.now() - 3600000 * 72).toISOString()
      }
    ];
  }

  /**
   * Load tasks from LocalStorage or initialize with defaults
   */
  function loadTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          tasks = parsed;
          return;
        }
      }
    } catch (err) {
      console.error('Error loading tasks from LocalStorage:', err);
    }
    // Fallback to default college project tasks
    tasks = getDefaultTasks();
    saveTasks();
  }

  /**
   * Save current tasks array to LocalStorage
   */
  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.error('Error saving tasks to LocalStorage:', err);
      showToast('Could not save tasks to local storage.', 'danger');
    }
  }

  // ==========================================================================
  // Dashboard & Metrics Calculation
  // ==========================================================================
  function updateDashboard() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;

    totalCountEl.textContent = total;
    pendingCountEl.textContent = pending;
    completedCountEl.textContent = completed;

    // Progress bar
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    progressPercentEl.textContent = `${percentage}%`;
    progressBarFillEl.style.width = `${percentage}%`;
    document.getElementById('progress-bar-container').setAttribute('aria-valuenow', percentage);
  }

  // ==========================================================================
  // Filter & Search Logic
  // ==========================================================================
  function getFilteredTasks() {
    return tasks.filter(task => {
      // 1. Status Filter
      if (currentFilter === 'pending' && task.completed) return false;
      if (currentFilter === 'completed' && !task.completed) return false;

      // 2. Priority Filter
      if (currentPriorityFilter !== 'all' && task.priority !== currentPriorityFilter) return false;

      // 3. Search Query Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = (task.title || '').toLowerCase().includes(query);
        const descMatch = (task.description || '').toLowerCase().includes(query);
        if (!titleMatch && !descMatch) return false;
      }

      return true;
    });
  }

  // ==========================================================================
  // Render Tasks List
  // ==========================================================================
  function render() {
    updateDashboard();

    const filtered = getFilteredTasks();
    
    // Update showing badge
    if (tasks.length === 0) {
      showingCountBadge.textContent = '0 tasks';
    } else if (filtered.length === tasks.length) {
      showingCountBadge.textContent = `${tasks.length} total`;
    } else {
      showingCountBadge.textContent = `${filtered.length} of ${tasks.length}`;
    }

    tasksContainer.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.style.display = 'block';

      // Dynamic empty state messaging
      if (tasks.length === 0) {
        emptyStateTitle.textContent = 'No tasks yet';
        emptyStateDesc.textContent = 'Your task list is empty. Add a task using the form to get organized!';
      } else if (searchQuery) {
        emptyStateTitle.textContent = 'No matching tasks';
        emptyStateDesc.textContent = `No tasks found matching "${searchQuery}". Try clearing your search query.`;
      } else if (currentFilter === 'completed') {
        emptyStateTitle.textContent = 'No completed tasks';
        emptyStateDesc.textContent = 'You haven\'t completed any tasks yet. Check off a task when you finish it!';
      } else if (currentFilter === 'pending') {
        emptyStateTitle.textContent = 'All caught up!';
        emptyStateDesc.textContent = 'Great job! You have no pending tasks remaining.';
      } else if (currentPriorityFilter !== 'all') {
        emptyStateTitle.textContent = 'No tasks found';
        emptyStateDesc.textContent = `No tasks with ${currentPriorityFilter} priority.`;
      } else {
        emptyStateTitle.textContent = 'No tasks found';
        emptyStateDesc.textContent = 'Try adjusting your filters to see more tasks.';
      }
      return;
    }

    emptyState.style.display = 'none';

    // Build DOM elements for each task
    filtered.forEach(task => {
      const overdue = isTaskOverdue(task);
      const taskCard = document.createElement('article');
      taskCard.className = `task-item ${task.completed ? 'is-completed' : ''} ${overdue ? 'is-overdue' : ''}`;
      taskCard.dataset.id = task.id;

      // Priority class
      const priorityClass = `priority-${task.priority.toLowerCase()}`;

      // Due date markup
      let dueDateMarkup = '';
      if (task.dueDate) {
        const friendlyDate = formatDisplayDate(task.dueDate);
        if (overdue) {
          dueDateMarkup = `
            <span class="meta-pill due-badge overdue" title="This task is past its due date!">
              <svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Overdue: ${escapeHTML(friendlyDate)}
            </span>
          `;
        } else {
          dueDateMarkup = `
            <span class="meta-pill due-badge">
              <svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Due: ${escapeHTML(friendlyDate)}
            </span>
          `;
        }
      }

      // Completed pill markup
      const statusPillMarkup = task.completed
        ? `<span class="meta-pill completed-badge">
             <svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
               <polyline points="20 6 9 17 4 12"></polyline>
             </svg>
             Completed
           </span>`
        : '';

      // Description markup
      const descMarkup = task.description 
        ? `<p class="task-desc">${escapeHTML(task.description)}</p>` 
        : '';

      taskCard.innerHTML = `
        <div class="task-checkbox-wrap">
          <input 
            type="checkbox" 
            class="task-checkbox" 
            id="check-${task.id}" 
            ${task.completed ? 'checked' : ''} 
            aria-label="Mark task '${escapeHTML(task.title)}' as ${task.completed ? 'pending' : 'completed'}"
          >
        </div>
        <div class="task-body">
          <h3 class="task-title">${escapeHTML(task.title)}</h3>
          ${descMarkup}
          <div class="task-meta">
            <span class="meta-pill ${priorityClass}">
              <svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              ${escapeHTML(task.priority)} Priority
            </span>
            ${dueDateMarkup}
            ${statusPillMarkup}
          </div>
        </div>
        <div class="task-actions">
          <button 
            type="button" 
            class="action-btn edit-btn" 
            data-action="edit" 
            data-id="${task.id}" 
            title="Edit task" 
            aria-label="Edit task '${escapeHTML(task.title)}'"
          >
            <svg class="action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <button 
            type="button" 
            class="action-btn delete-btn" 
            data-action="delete" 
            data-id="${task.id}" 
            title="Delete task" 
            aria-label="Delete task '${escapeHTML(task.title)}'"
          >
            <svg class="action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      `;

      // Event listener: Toggle completion
      const checkbox = taskCard.querySelector('.task-checkbox');
      checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));

      // Event listener: Edit task
      const editBtn = taskCard.querySelector('[data-action="edit"]');
      editBtn.addEventListener('click', () => openEditModal(task.id));

      // Event listener: Delete task
      const deleteBtn = taskCard.querySelector('[data-action="delete"]');
      deleteBtn.addEventListener('click', () => openDeleteModal(task.id));

      tasksContainer.appendChild(taskCard);
    });
  }

  // ==========================================================================
  // Task Operations: Add, Edit, Delete, Toggle
  // ==========================================================================

  /**
   * Add a new task
   */
  function handleAddTask(e) {
    e.preventDefault();

    const title = taskTitleInput.value.trim();
    const description = taskDescInput.value.trim();
    const priority = taskPrioritySelect.value;
    const dueDate = taskDueDateInput.value;

    // Validation
    if (!title) {
      taskTitleInput.classList.add('input-error');
      taskTitleError.classList.add('visible');
      taskTitleInput.focus();
      return;
    }

    const newTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: title,
      description: description,
      priority: priority,
      dueDate: dueDate,
      completed: false,
      createdAt: new Date().toISOString()
    };

    // Prepend new task so it appears at top
    tasks.unshift(newTask);
    saveTasks();
    render();

    // Reset Form
    addTaskForm.reset();
    taskTitleInput.classList.remove('input-error');
    taskTitleError.classList.remove('visible');
    taskPrioritySelect.value = 'Medium';

    showToast('Task added successfully!', 'success');
  }

  /**
   * Toggle task completion status
   */
  function toggleTaskCompletion(id) {
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;

    tasks[taskIndex].completed = !tasks[taskIndex].completed;
    saveTasks();
    render();

    const status = tasks[taskIndex].completed ? 'completed' : 'marked pending';
    showToast(`Task ${status}!`, tasks[taskIndex].completed ? 'success' : 'info');
  }

  /**
   * Open Edit Modal with task details
   */
  function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    editTaskIdInput.value = task.id;
    editTaskTitleInput.value = task.title;
    editTaskDescInput.value = task.description || '';
    editTaskPrioritySelect.value = task.priority;
    editTaskDueDateInput.value = task.dueDate || '';

    // Clear previous errors
    editTaskTitleInput.classList.remove('input-error');
    editTitleError.classList.remove('visible');

    editModal.style.display = 'flex';
    editTaskTitleInput.focus();
  }

  /**
   * Close Edit Modal
   */
  function closeEditModal() {
    editModal.style.display = 'none';
  }

  /**
   * Save changes from Edit Modal
   */
  function handleSaveEdit(e) {
    e.preventDefault();

    const id = editTaskIdInput.value;
    const title = editTaskTitleInput.value.trim();
    const description = editTaskDescInput.value.trim();
    const priority = editTaskPrioritySelect.value;
    const dueDate = editTaskDueDateInput.value;

    // Validation
    if (!title) {
      editTaskTitleInput.classList.add('input-error');
      editTitleError.classList.add('visible');
      editTaskTitleInput.focus();
      return;
    }

    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
      tasks[taskIndex].title = title;
      tasks[taskIndex].description = description;
      tasks[taskIndex].priority = priority;
      tasks[taskIndex].dueDate = dueDate;

      saveTasks();
      render();
      closeEditModal();
      showToast('Task updated successfully!', 'success');
    }
  }

  /**
   * Open Delete Confirmation Modal
   */
  function openDeleteModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    pendingDeleteTaskId = id;
    deleteTitlePreview.textContent = task.title;
    deleteModal.style.display = 'flex';
    confirmDeleteBtn.focus();
  }

  /**
   * Close Delete Modal
   */
  function closeDeleteModal() {
    deleteModal.style.display = 'none';
    pendingDeleteTaskId = null;
  }

  /**
   * Confirm and execute task deletion
   */
  function handleConfirmDelete() {
    if (!pendingDeleteTaskId) return;

    const taskIndex = tasks.findIndex(t => t.id === pendingDeleteTaskId);
    if (taskIndex !== -1) {
      tasks.splice(taskIndex, 1);
      saveTasks();
      render();
      showToast('Task deleted successfully.', 'info');
    }

    closeDeleteModal();
  }

  // ==========================================================================
  // Event Listeners Setup
  // ==========================================================================
  function setupEventListeners() {
    // Add task form submission
    addTaskForm.addEventListener('submit', handleAddTask);

    // Clear validation error on typing
    taskTitleInput.addEventListener('input', () => {
      if (taskTitleInput.value.trim()) {
        taskTitleInput.classList.remove('input-error');
        taskTitleError.classList.remove('visible');
      }
    });

    editTaskTitleInput.addEventListener('input', () => {
      if (editTaskTitleInput.value.trim()) {
        editTaskTitleInput.classList.remove('input-error');
        editTitleError.classList.remove('visible');
      }
    });

    // Filter pills (All, Pending, Completed)
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => {
          p.classList.remove('active');
          p.setAttribute('aria-selected', 'false');
        });
        pill.classList.add('active');
        pill.setAttribute('aria-selected', 'true');
        currentFilter = pill.dataset.filter;
        render();
      });
    });

    // Priority filter dropdown
    priorityFilterSelect.addEventListener('change', (e) => {
      currentPriorityFilter = e.target.value;
      render();
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
      render();
    });

    // Clear search button
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      searchInput.focus();
      render();
    });

    // Edit modal events
    editTaskForm.addEventListener('submit', handleSaveEdit);
    closeEditModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeEditModal();
    });

    // Delete modal events
    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) closeDeleteModal();
    });

    // Keyboard navigation: Escape key closes modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (editModal.style.display === 'flex') closeEditModal();
        if (deleteModal.style.display === 'flex') closeDeleteModal();
      }
    });
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================
  function init() {
    initDateBadge();
    loadTasks();
    setupEventListeners();
    render();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
