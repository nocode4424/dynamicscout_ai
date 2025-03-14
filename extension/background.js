/**
 * DynamicScout AI Extension - Background Script
 * 
 * Manages the recording state and communication between
 * the popup, content script, and backend API.
 */

// Recording state
const state = {
  isRecording: false,
  currentSession: null,
  recordingData: [],
  config: {
    apiUrl: '',
    recordingInterval: 500, // ms
    highlightElements: true,
    captureClicks: true,
    captureNavigation: true,
    captureInputs: true
  }
};

// Initialize extension state
async function initializeExtension() {
  try {
    // Load configuration from storage
    const storedConfig = await chrome.storage.local.get('config');
    if (storedConfig.config) {
      state.config = { ...state.config, ...storedConfig.config };
    }
    
    // Check if there's an API URL in the config
    if (!state.config.apiUrl) {
      // Default API URL
      state.config.apiUrl = 'http://localhost:3000/api';
      // Save the default config
      await chrome.storage.local.set({ config: state.config });
    }
    
    console.log('DynamicScout AI Extension initialized with config:', state.config);
  } catch (error) {
    console.error('Error initializing extension:', error);
  }
}

// Start recording session
async function startRecording(tabId, sessionName) {
  try {
    // Generate a unique session ID
    const sessionId = Date.now().toString();
    
    // Initialize session data
    state.isRecording = true;
    state.currentSession = {
      id: sessionId,
      name: sessionName || `Session ${sessionId}`,
      startTime: new Date().toISOString(),
      tabId: tabId,
      url: null
    };
    
    state.recordingData = [];
    
    // Get current tab URL
    const tab = await chrome.tabs.get(tabId);
    state.currentSession.url = tab.url;
    
    // Inject content script if needed
    await chrome.scripting.executeScript({
      target: { tabId },
      function: injectRecordingState,
      args: [true, state.config.highlightElements]
    });
    
    // Change icon to show recording state
    await chrome.action.setIcon({ 
      path: {
        "16": "/assets/icon16-recording.png",
        "48": "/assets/icon48-recording.png",
        "128": "/assets/icon128-recording.png"
      } 
    });
    
    console.log('Started recording session:', state.currentSession);
    
    // Notify popup about recording state
    chrome.runtime.sendMessage({ 
      type: 'recordingStateChanged', 
      isRecording: true,
      sessionInfo: state.currentSession
    });
    
    return state.currentSession;
  } catch (error) {
    console.error('Error starting recording:', error);
    return null;
  }
}

// Stop recording session
async function stopRecording() {
  try {
    if (!state.isRecording) {
      return null;
    }
    
    // Update session data
    state.isRecording = false;
    state.currentSession.endTime = new Date().toISOString();
    
    // Calculate duration
    const startTime = new Date(state.currentSession.startTime);
    const endTime = new Date(state.currentSession.endTime);
    state.currentSession.duration = endTime - startTime;
    
    // Complete session object
    const completedSession = {
      ...state.currentSession,
      actions: state.recordingData,
      recordingCount: state.recordingData.length
    };
    
    // Stop recording in content script
    if (state.currentSession.tabId) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: state.currentSession.tabId },
          function: injectRecordingState,
          args: [false, false]
        });
      } catch (error) {
        console.warn('Content script execution failed, tab might be closed:', error);
      }
    }
    
    // Reset icon
    await chrome.action.setIcon({ 
      path: {
        "16": "/assets/icon16.png",
        "48": "/assets/icon48.png",
        "128": "/assets/icon128.png"
      } 
    });
    
    // Save session to storage
    await saveRecordingToStorage(completedSession);
    
    // Notify popup about recording state
    chrome.runtime.sendMessage({ 
      type: 'recordingStateChanged', 
      isRecording: false,
      completedSession: completedSession
    });
    
    console.log('Stopped recording session:', completedSession);
    
    return completedSession;
  } catch (error) {
    console.error('Error stopping recording:', error);
    return null;
  }
}

// Save recording to storage
async function saveRecordingToStorage(session) {
  try {
    // Get existing recordings
    const { recordings = [] } = await chrome.storage.local.get('recordings');
    
    // Add new recording
    recordings.push(session);
    
    // Keep only the last 10 recordings
    if (recordings.length > 10) {
      recordings.splice(0, recordings.length - 10);
    }
    
    // Save to storage
    await chrome.storage.local.set({ recordings });
    
    console.log('Saved recording to storage, total recordings:', recordings.length);
  } catch (error) {
    console.error('Error saving recording to storage:', error);
  }
}

// Upload recording to backend API
async function uploadRecording(session) {
  try {
    if (!state.config.apiUrl) {
      throw new Error('API URL not configured');
    }
    
    // Prepare request data
    const recordingData = {
      name: session.name,
      target_url: session.url,
      start_time: session.startTime,
      end_time: session.endTime,
      duration: session.duration,
      actions: session.actions
    };
    
    // Send to API
    const response = await fetch(`${state.config.apiUrl}/recordings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(recordingData)
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Recording uploaded successfully:', result);
    
    return result;
  } catch (error) {
    console.error('Error uploading recording:', error);
    throw error;
  }
}

// Function to inject into content script
function injectRecordingState(isRecording, highlightElements) {
  window.dynamicScoutRecording = {
    isRecording,
    highlightElements
  };
  
  // Dispatch custom event to notify content script
  document.dispatchEvent(new CustomEvent('dynamicScout:recordingStateChanged', {
    detail: { isRecording, highlightElements }
  }));
  
  return true;
}

// Message handling from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle requests from popup
  if (message.type === 'getRecordingState') {
    sendResponse({
      isRecording: state.isRecording,
      currentSession: state.currentSession
    });
    return true;
  }
  
  // Handle start recording request
  if (message.type === 'startRecording') {
    startRecording(message.tabId, message.sessionName)
      .then(session => sendResponse({ success: true, session }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  // Handle stop recording request
  if (message.type === 'stopRecording') {
    stopRecording()
      .then(session => sendResponse({ success: true, session }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  // Handle upload recording request
  if (message.type === 'uploadRecording') {
    uploadRecording(message.session)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  // Handle action recording from content script
  if (message.type === 'recordAction' && state.isRecording) {
    // Add timestamp
    message.action.timestamp = new Date().toISOString();
    
    // Add to recording data
    state.recordingData.push(message.action);
    
    // Notify popup to update count
    chrome.runtime.sendMessage({
      type: 'actionRecorded',
      action: message.action,
      count: state.recordingData.length
    });
    
    sendResponse({ success: true });
    return true;
  }
  
  // Handle config update request
  if (message.type === 'updateConfig') {
    state.config = { ...state.config, ...message.config };
    chrome.storage.local.set({ config: state.config })
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  // Handle get config request
  if (message.type === 'getConfig') {
    sendResponse({ success: true, config: state.config });
    return true;
  }
  
  // Handle get recordings request
  if (message.type === 'getRecordings') {
    chrome.storage.local.get('recordings')
      .then(({ recordings = [] }) => sendResponse({ success: true, recordings }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Initialize extension
initializeExtension();

// Listen for tab updates to track navigation during recording
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (state.isRecording && state.currentSession && state.currentSession.tabId === tabId) {
    if (changeInfo.status === 'complete' && tab.url) {
      // Record navigation action
      const navigationAction = {
        type: 'navigation',
        url: tab.url,
        title: tab.title,
        timestamp: new Date().toISOString()
      };
      
      state.recordingData.push(navigationAction);
      
      // Notify popup to update count
      chrome.runtime.sendMessage({
        type: 'actionRecorded',
        action: navigationAction,
        count: state.recordingData.length
      });
      
      // Update session URL
      state.currentSession.url = tab.url;
      
      console.log('Recorded navigation:', navigationAction);
    }
  }
});

// Listen for tab close to stop recording if necessary
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (state.isRecording && state.currentSession && state.currentSession.tabId === tabId) {
    console.log('Recorded tab closed, stopping recording');
    stopRecording();
  }
});