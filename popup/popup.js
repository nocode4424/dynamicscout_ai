/**
 * DynamicScout AI Extension - Popup Script
 * 
 * Manages the popup UI and communicates with the background script.
 */

// State
const state = {
  isRecording: false,
  currentSession: null,
  timerInterval: null,
  startTime: null,
  recordings: [],
  activePanel: 'recording-controls',
  config: {
    apiUrl: '',
    recordingInterval: 500,
    highlightElements: true,
    captureClicks: true,
    captureNavigation: true,
    captureInputs: true
  }
};

// Cache DOM elements
const elements = {
  // Panels
  recordingControls: document.getElementById('recording-controls'),
  sessionComplete: document.getElementById('session-complete'),
  recordingsList: document.getElementById('recordings-list'),
  uploadProgress: document.getElementById('upload-progress'),
  settingsPanel: document.getElementById('settings-panel'),
  
  // Status
  statusIndicator: document.getElementById('status-indicator'),
  statusText: document.getElementById('status-text'),
  
  // Recording controls
  sessionName: document.getElementById('session-name'),
  urlDisplay: document.getElementById('url-display').querySelector('span'),
  startRecordingBtn: document.getElementById('start-recording'),
  stopRecordingBtn: document.getElementById('stop-recording'),
  recordingTimer: document.getElementById('recording-timer'),
  timerValue: document.getElementById('timer-value'),
  actionCounter: document.getElementById('action-counter'),
  counterValue: document.getElementById('counter-value'),
  highlightElements: document.getElementById('highlight-elements'),
  
  // Session complete
  summaryName: document.getElementById('summary-name'),
  summaryUrl: document.getElementById('summary-url'),
  summaryDuration: document.getElementById('summary-duration'),
  summaryActions: document.getElementById('summary-actions'),
  uploadRecordingBtn: document.getElementById('upload-recording'),
  viewRecordingsBtn: document.getElementById('view-recordings'),
  newRecordingBtn: document.getElementById('new-recording'),
  
  // Recordings list
  recordingsList: document.getElementById('recordings'),
  backToRecordingBtn: document.getElementById('back-to-recording'),
  
  // Upload progress
  progressValue: document.getElementById('progress-value'),
  uploadStatus: document.getElementById('upload-status'),
  
  // Settings
  openSettingsBtn: document.getElementById('open-settings'),
  apiUrl: document.getElementById('api-url'),
  recordingInterval: document.getElementById('recording-interval'),
  captureNavigation: document.getElementById('capture-navigation'),
  captureClicks: document.getElementById('capture-clicks'),
  captureInputs: document.getElementById('capture-inputs'),
  saveSettingsBtn: document.getElementById('save-settings'),
  cancelSettingsBtn: document.getElementById('cancel-settings')
};

// Initialize popup
async function initialize() {
  // Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  
  // Display current URL
  elements.urlDisplay.textContent = currentTab.url;
  
  // Load config
  await loadConfig();
  
  // Get recording state
  await getRecordingState();
  
  // Set up event listeners
  setupEventListeners(currentTab.id);
  
  // Load recordings
  await loadRecordings();
  
  console.log('Popup initialized');
}

// Load configuration
async function loadConfig() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'getConfig' });
    
    if (response.success) {
      state.config = response.config;
      
      // Update form fields
      elements.apiUrl.value = state.config.apiUrl || '';
      elements.recordingInterval.value = state.config.recordingInterval || 500;
      elements.captureNavigation.checked = state.config.captureNavigation !== false;
      elements.captureClicks.checked = state.config.captureClicks !== false;
      elements.captureInputs.checked = state.config.captureInputs !== false;
      elements.highlightElements.checked = state.config.highlightElements !== false;
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
}

// Get recording state from background script
async function getRecordingState() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'getRecordingState' });
    
    state.isRecording = response.isRecording;
    state.currentSession = response.currentSession;
    
    updateUI();
  } catch (error) {
    console.error('Error getting recording state:', error);
  }
}

// Load recordings from storage
async function loadRecordings() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'getRecordings' });
    
    if (response.success) {
      state.recordings = response.recordings || [];
      renderRecordingsList();
    }
  } catch (error) {
    console.error('Error loading recordings:', error);
  }
}

// Set up event listeners
function setupEventListeners(tabId) {
  // Start recording button
  elements.startRecordingBtn.addEventListener('click', () => {
    startRecording(tabId);
  });
  
  // Stop recording button
  elements.stopRecordingBtn.addEventListener('click', () => {
    stopRecording();
  });
  
  // Upload recording button
  elements.uploadRecordingBtn.addEventListener('click', () => {
    uploadRecording();
  });
  
  // View recordings button
  elements.viewRecordingsBtn.addEventListener('click', () => {
    showPanel('recordings-list');
  });
  
  // New recording button
  elements.newRecordingBtn.addEventListener('click', () => {
    resetUI();
  });
  
  // Back to recording button
  elements.backToRecordingBtn.addEventListener('click', () => {
    showPanel('recording-controls');
  });
  
  // Open settings button
  elements.openSettingsBtn.addEventListener('click', () => {
    showPanel('settings-panel');
  });
  
  // Save settings button
  elements.saveSettingsBtn.addEventListener('click', () => {
    saveSettings();
  });
  
  // Cancel settings button
  elements.cancelSettingsBtn.addEventListener('click', () => {
    loadConfig(); // Reset form
    showPanel(state.activePanel === 'settings-panel' ? 'recording-controls' : state.activePanel);
  });
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message) => {
    // Recording state changed
    if (message.type === 'recordingStateChanged') {
      state.isRecording = message.isRecording;
      
      if (message.isRecording) {
        state.currentSession = message.sessionInfo;
        state.startTime = new Date();
        startTimer();
      } else {
        state.currentSession = message.completedSession;
        showSessionComplete();
      }
      
      updateUI();
    }
    
    // Action recorded
    if (message.type === 'actionRecorded') {
      updateActionCounter(message.count);
    }
  });
}

// Start recording
async function startRecording(tabId) {
  const sessionName = elements.sessionName.value || `Session ${Date.now()}`;
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'startRecording',
      tabId: tabId,
      sessionName: sessionName
    });
    
    if (response.success) {
      state.isRecording = true;
      state.currentSession = response.session;
      state.startTime = new Date();
      
      startTimer();
      updateUI();
    }
  } catch (error) {
    console.error('Error starting recording:', error);
  }
}

// Stop recording
async function stopRecording() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'stopRecording'
    });
    
    if (response.success) {
      state.isRecording = false;
      state.currentSession = response.session;
      
      stopTimer();
      showSessionComplete();
      updateUI();
    }
  } catch (error) {
    console.error('Error stopping recording:', error);
  }
}

// Upload recording
async function uploadRecording() {
  if (!state.currentSession) return;
  
  showPanel('upload-progress');
  elements.progressValue.style.width = '10%';
  elements.uploadStatus.textContent = 'Preparing recording data...';
  
  try {
    elements.progressValue.style.width = '50%';
    elements.uploadStatus.textContent = 'Uploading to server...';
    
    const response = await chrome.runtime.sendMessage({
      type: 'uploadRecording',
      session: state.currentSession
    });
    
    if (response.success) {
      elements.progressValue.style.width = '100%';
      elements.uploadStatus.textContent = 'Upload complete!';
      
      // Wait a moment before showing success
      setTimeout(() => {
        elements.uploadStatus.textContent = 'Recording uploaded and being analyzed';
      }, 1000);
      
      // After a delay, go back to recording controls
      setTimeout(() => {
        resetUI();
      }, 3000);
    } else {
      elements.uploadStatus.textContent = `Error: ${response.error}`;
    }
  } catch (error) {
    console.error('Error uploading recording:', error);
    elements.uploadStatus.textContent = `Error: ${error.message}`;
  }
}

// Save settings
async function saveSettings() {
  const newConfig = {
    apiUrl: elements.apiUrl.value,
    recordingInterval: parseInt(elements.recordingInterval.value) || 500,
    captureNavigation: elements.captureNavigation.checked,
    captureClicks: elements.captureClicks.checked,
    captureInputs: elements.captureInputs.checked,
    highlightElements: elements.highlightElements.checked
  };
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'updateConfig',
      config: newConfig
    });
    
    if (response.success) {
      state.config = newConfig;
      
      // Show success message
      const saveBtn = elements.saveSettingsBtn;
      const originalText = saveBtn.textContent;
      
      saveBtn.textContent = 'Saved!';
      
      setTimeout(() => {
        saveBtn.textContent = originalText;
        
        // Go back to previous panel
        showPanel(state.activePanel === 'settings-panel' ? 'recording-controls' : state.activePanel);
      }, 1500);
    }
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Start timer
function startTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
  }
  
  state.startTime = state.startTime || new Date();
  
  // Show timer
  elements.recordingTimer.classList.remove('hidden');
  elements.actionCounter.classList.remove('hidden');
  
  // Update timer every second
  state.timerInterval = setInterval(() => {
    updateTimer();
  }, 1000);
  
  // Initial update
  updateTimer();
}

// Stop timer
function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

// Update timer display
function updateTimer() {
  if (!state.startTime) return;
  
  const now = new Date();
  const diff = now - state.startTime;
  
  // Format as MM:SS
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  
  elements.timerValue.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Update action counter
function updateActionCounter(count) {
  elements.counterValue.textContent = count || 0;
}

// Show session complete view
function showSessionComplete() {
  if (!state.currentSession) return;
  
  // Update summary
  elements.summaryName.textContent = state.currentSession.name || 'Unnamed Session';
  elements.summaryUrl.textContent = state.currentSession.url || '';
  
  // Format duration
  let duration = 'Unknown';
  if (state.currentSession.duration) {
    const seconds = Math.floor(state.currentSession.duration / 1000);
    const minutes = Math.floor(seconds / 60);
    duration = `${minutes}m ${seconds % 60}s`;
  }
  elements.summaryDuration.textContent = duration;
  
  // Actions count
  elements.summaryActions.textContent = state.currentSession.actions ? state.currentSession.actions.length : 0;
  
  showPanel('session-complete');
}

// Render recordings list
function renderRecordingsList() {
  const listElement = elements.recordingsList;
  listElement.innerHTML = '';
  
  if (state.recordings.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.textContent = 'No recordings found';
    listElement.appendChild(emptyItem);
    return;
  }
  
  state.recordings.forEach((recording, index) => {
    const item = document.createElement('li');
    
    // Create title
    const title = document.createElement('div');
    title.className = 'recording-item-title';
    title.textContent = recording.name || `Recording ${index + 1}`;
    
    // Create details
    const details = document.createElement('div');
    details.className = 'recording-item-details';
    
    // Format date
    let dateStr = 'Unknown date';
    if (recording.startTime) {
      const date = new Date(recording.startTime);
      dateStr = date.toLocaleString();
    }
    
    // Format duration
    let durationStr = 'Unknown duration';
    if (recording.duration) {
      const seconds = Math.floor(recording.duration / 1000);
      const minutes = Math.floor(seconds / 60);
      durationStr = `${minutes}m ${seconds % 60}s`;
    }
    
    details.textContent = `${dateStr} • ${durationStr} • ${recording.actions ? recording.actions.length : 0} actions`;
    
    // Add to item
    item.appendChild(title);
    item.appendChild(details);
    
    // Add click handler
    item.addEventListener('click', () => {
      state.currentSession = recording;
      showSessionComplete();
    });
    
    listElement.appendChild(item);
  });
}

// Show panel
function showPanel(panelId) {
  // Hide all panels
  document.querySelectorAll('.panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  // Show requested panel
  document.getElementById(panelId).classList.add('active');
  
  // Remember active panel (except upload progress)
  if (panelId !== 'upload-progress') {
    state.activePanel = panelId;
  }
}

// Update UI based on current state
function updateUI() {
  // Update status indicator
  if (state.isRecording) {
    elements.statusIndicator.classList.add('recording');
    elements.statusIndicator.classList.remove('ready');
    elements.statusText.textContent = 'Recording';
    
    // Update buttons
    elements.startRecordingBtn.disabled = true;
    elements.stopRecordingBtn.disabled = false;
  } else {
    elements.statusIndicator.classList.remove('recording');
    elements.statusIndicator.classList.add('ready');
    elements.statusText.textContent = 'Ready';
    
    // Update buttons
    elements.startRecordingBtn.disabled = false;
    elements.stopRecordingBtn.disabled = true;
    
    // Hide timer if not recording
    if (state.activePanel === 'recording-controls') {
      elements.recordingTimer.classList.add('hidden');
      elements.actionCounter.classList.add('hidden');
    }
  }
}

// Reset UI to initial state
function resetUI() {
  // Reset session name
  elements.sessionName.value = '';
  
  // Reset timer and counter
  stopTimer();
  state.startTime = null;
  elements.timerValue.textContent = '00:00';
  elements.counterValue.textContent = '0';
  
  // Hide timer and counter
  elements.recordingTimer.classList.add('hidden');
  elements.actionCounter.classList.add('hidden');
  
  // Show recording controls panel
  showPanel('recording-controls');
  
  // Reset current session
  state.currentSession = null;
  
  updateUI();
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', initialize);