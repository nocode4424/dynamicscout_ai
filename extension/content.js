/**
 * DynamicScout AI Extension - Content Script
 * 
 * Records user interactions with the page and sends them
 * to the background script for processing.
 */

// State
const state = {
  isRecording: false,
  highlightElements: true,
  elementSelectors: new Map(),
  mouseoverElement: null,
  selectedElements: [],
  hoverOverlay: null,
  recordingInterval: null,
  lastAction: null
};

// Initialize content script
function initialize() {
  console.log('DynamicScout AI Content Script initialized');
  
  // Check if recording was already active
  if (window.dynamicScoutRecording?.isRecording) {
    startRecording(window.dynamicScoutRecording.highlightElements);
  }
  
  // Create hover overlay for element highlighting
  createHoverOverlay();
  
  // Add event listeners
  addEventListeners();
}

// Create hover overlay for highlighting elements
function createHoverOverlay() {
  // Create overlay if it doesn't exist
  if (!state.hoverOverlay) {
    state.hoverOverlay = document.createElement('div');
    state.hoverOverlay.id = 'dynamicscout-hover-overlay';
    state.hoverOverlay.style.position = 'absolute';
    state.hoverOverlay.style.pointerEvents = 'none';
    state.hoverOverlay.style.zIndex = '2147483647';
    state.hoverOverlay.style.border = '2px solid #4285f4';
    state.hoverOverlay.style.backgroundColor = 'rgba(66, 133, 244, 0.1)';
    state.hoverOverlay.style.display = 'none';
    
    document.body.appendChild(state.hoverOverlay);
  }
}

// Start recording
function startRecording(highlightElements = true) {
  state.isRecording = true;
  state.highlightElements = highlightElements;
  
  console.log('Started recording with highlighting:', highlightElements);
  
  // Record initial page state
  recordPageState();
  
  // Start interval for periodic state recording
  startRecordingInterval();
}

// Stop recording
function stopRecording() {
  state.isRecording = false;
  
  // Clear interval
  if (state.recordingInterval) {
    clearInterval(state.recordingInterval);
    state.recordingInterval = null;
  }
  
  // Hide overlay
  if (state.hoverOverlay) {
    state.hoverOverlay.style.display = 'none';
  }
  
  // Remove highlights
  clearElementHighlights();
  
  console.log('Stopped recording');
}

// Add event listeners for user interactions
function addEventListeners() {
  // Listen for recording state changes from background script
  document.addEventListener('dynamicScout:recordingStateChanged', (event) => {
    const { isRecording, highlightElements } = event.detail;
    
    if (isRecording) {
      startRecording(highlightElements);
    } else {
      stopRecording();
    }
  });
  
  // Mouse movement for element highlighting
  document.addEventListener('mousemove', handleMouseMove, { passive: true });
  
  // Click events
  document.addEventListener('click', handleClick, { capture: true });
  
  // Form interactions
  document.addEventListener('input', handleInput, { capture: true });
  document.addEventListener('change', handleChange, { capture: true });
  
  // Scroll events (throttled)
  let scrollTimeout;
  document.addEventListener('scroll', () => {
    if (!state.isRecording) return;
    
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      recordAction({
        type: 'scroll',
        position: {
          x: window.scrollX,
          y: window.scrollY
        },
        viewportHeight: window.innerHeight,
        documentHeight: document.documentElement.scrollHeight
      });
    }, 250);
  }, { passive: true });
}

// Handle mouse movement for element highlighting
function handleMouseMove(event) {
  if (!state.isRecording || !state.highlightElements) return;
  
  // Get element under mouse pointer
  const element = document.elementFromPoint(event.clientX, event.clientY);
  
  // Skip if same as last element or no element
  if (!element || element === state.mouseoverElement) return;
  
  state.mouseoverElement = element;
  
  // Don't highlight the overlay itself
  if (element.id === 'dynamicscout-hover-overlay') {
    state.hoverOverlay.style.display = 'none';
    return;
  }
  
  // Highlight element
  const rect = element.getBoundingClientRect();
  state.hoverOverlay.style.display = 'block';
  state.hoverOverlay.style.top = `${window.scrollY + rect.top}px`;
  state.hoverOverlay.style.left = `${window.scrollX + rect.left}px`;
  state.hoverOverlay.style.width = `${rect.width}px`;
  state.hoverOverlay.style.height = `${rect.height}px`;
}

// Handle click events
function handleClick(event) {
  if (!state.isRecording) return;
  
  // Get clicked element
  const element = event.target;
  
  // Generate selector for element
  const selector = generateSelector(element);
  
  // Record click action
  recordAction({
    type: 'click',
    selector: selector,
    tagName: element.tagName.toLowerCase(),
    attributes: getElementAttributes(element),
    text: element.textContent?.trim().substring(0, 100),
    position: {
      x: event.clientX,
      y: event.clientY
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  });
  
  // Add to selected elements
  if (element.tagName !== 'BODY' && element.tagName !== 'HTML') {
    addSelectedElement(element, selector);
  }
}

// Handle input events
function handleInput(event) {
  if (!state.isRecording) return;
  
  const element = event.target;
  
  // Only record for input, textarea, and select elements
  if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) return;
  
  // Get value (safely)
  let value = '';
  
  if (element.type === 'password') {
    value = '********'; // Don't record actual passwords
  } else if (element.type === 'file') {
    value = element.files && element.files.length > 0 ? 
      `[${element.files.length} file(s)]` : '';
  } else {
    value = element.value;
  }
  
  // Record input action
  recordAction({
    type: 'input',
    selector: generateSelector(element),
    tagName: element.tagName.toLowerCase(),
    inputType: element.type || 'text',
    value: value,
    attributes: getElementAttributes(element)
  });
}

// Handle change events
function handleChange(event) {
  if (!state.isRecording) return;
  
  const element = event.target;
  
  // Only record for select elements and checkboxes/radios
  if (element.tagName !== 'SELECT' && 
      !(element.tagName === 'INPUT' && 
        (element.type === 'checkbox' || element.type === 'radio'))) {
    return;
  }
  
  // Get selected value(s)
  let value = '';
  
  if (element.tagName === 'SELECT') {
    if (element.multiple) {
      const selected = Array.from(element.selectedOptions).map(opt => opt.value);
      value = selected;
    } else {
      value = element.value;
    }
  } else if (element.type === 'checkbox' || element.type === 'radio') {
    value = element.checked;
  }
  
  // Record change action
  recordAction({
    type: 'change',
    selector: generateSelector(element),
    tagName: element.tagName.toLowerCase(),
    inputType: element.type || 'select',
    value: value,
    attributes: getElementAttributes(element)
  });
}

// Record page state
function recordPageState() {
  if (!state.isRecording) return;
  
  // Record basic page information
  recordAction({
    type: 'pageState',
    url: window.location.href,
    title: document.title,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    scroll: {
      x: window.scrollX,
      y: window.scrollY
    },
    documentSize: {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight
    },
    timestamp: new Date().toISOString()
  });
  
  // Record visible data tables
  const tables = Array.from(document.querySelectorAll('table')).filter(isElementVisible);
  
  if (tables.length > 0) {
    tables.forEach(table => {
      const tableData = extractTableData(table);
      if (tableData.headers.length > 0 || tableData.rows.length > 0) {
        recordAction({
          type: 'dataTable',
          selector: generateSelector(table),
          table: tableData
        });
      }
    });
  }
  
  // Record visible lists
  const lists = Array.from(document.querySelectorAll('ul, ol')).filter(isElementVisible);
  
  if (lists.length > 0) {
    lists.forEach(list => {
      if (list.children.length >= 3) { // Only record lists with at least 3 items
        const listData = extractListData(list);
        if (listData.items.length > 0) {
          recordAction({
            type: 'dataList',
            selector: generateSelector(list),
            list: listData
          });
        }
      }
    });
  }
  
  // Record repeated elements (potential product cards or similar)
  detectRepeatedElements();
}

// Start interval for periodic state recording
function startRecordingInterval() {
  if (state.recordingInterval) {
    clearInterval(state.recordingInterval);
  }
  
  // Record state periodically
  state.recordingInterval = setInterval(() => {
    if (state.isRecording) {
      // Only record if something has likely changed
      const currentUrl = window.location.href;
      const currentScroll = window.scrollY;
      
      if (!state.lastAction || 
          state.lastAction.url !== currentUrl ||
          Math.abs(state.lastAction.scrollY - currentScroll) > 200) {
        
        recordPageState();
        
        state.lastAction = {
          url: currentUrl,
          scrollY: currentScroll,
          time: Date.now()
        };
      }
    }
  }, 3000); // Check every 3 seconds
}

// Record action and send to background script
function recordAction(action) {
  if (!state.isRecording) return;
  
  // Add page URL and timestamp if not present
  if (!action.url) {
    action.url = window.location.href;
  }
  
  if (!action.timestamp) {
    action.timestamp = new Date().toISOString();
  }
  
  // Send to background script
  chrome.runtime.sendMessage({
    type: 'recordAction',
    action: action
  });
  
  console.log('Recorded action:', action.type);
}

// Add selected element
function addSelectedElement(element, selector) {
  // Check if element is already selected
  const existingIndex = state.selectedElements.findIndex(item => 
    item.selector === selector || item.element === element
  );
  
  if (existingIndex >= 0) {
    // Update existing element
    state.selectedElements[existingIndex].count++;
    return;
  }
  
  // Add new selected element
  state.selectedElements.push({
    element: element,
    selector: selector,
    tagName: element.tagName.toLowerCase(),
    text: element.textContent?.trim().substring(0, 100),
    count: 1,
    timestamp: new Date().toISOString()
  });
  
  // Keep array at reasonable size
  if (state.selectedElements.length > 20) {
    state.selectedElements.shift();
  }
  
  // If we have multiple selections, check for patterns
  if (state.selectedElements.length >= 3) {
    detectPatterns();
  }
}

// Clear element highlights
function clearElementHighlights() {
  // Hide hover overlay
  if (state.hoverOverlay) {
    state.hoverOverlay.style.display = 'none';
  }
  
  // Clear any custom highlights
  document.querySelectorAll('.dynamicscout-highlight').forEach(el => {
    el.classList.remove('dynamicscout-highlight');
  });
}

// Generate CSS selector for element
function generateSelector(element) {
  // Check if we already have a selector for this element
  if (state.elementSelectors.has(element)) {
    return state.elementSelectors.get(element);
  }
  
  // Generate selector
  let selector = '';
  
  try {
    // Try ID first
    if (element.id) {
      selector = `#${CSS.escape(element.id)}`;
    } 
    // Try data-* attributes
    else if (element.dataset && Object.keys(element.dataset).length > 0) {
      const dataAttr = Object.keys(element.dataset)[0];
      selector = `[data-${dataAttr}="${CSS.escape(element.dataset[dataAttr])}"]`;
    }
    // Try classes
    else if (element.classList && element.classList.length > 0) {
      // Use up to 2 classes for better specificity
      selector = Array.from(element.classList)
        .slice(0, 2)
        .map(cls => `.${CSS.escape(cls)}`)
        .join('');
    }
    
    // If selector is still empty, use tag name
    if (!selector) {
      selector = element.tagName.toLowerCase();
      
      // Add some attributes for better specificity
      if (element.name) {
        selector += `[name="${CSS.escape(element.name)}"]`;
      } else if (element.placeholder) {
        selector += `[placeholder="${CSS.escape(element.placeholder)}"]`;
      } else if (element.title) {
        selector += `[title="${CSS.escape(element.title)}"]`;
      } else if (element.href) {
        // For links, use href or its text
        const hrefValue = element.href.split('/').pop() || '';
        if (hrefValue.length > 0 && hrefValue.length < 20) {
          selector += `[href*="${CSS.escape(hrefValue)}"]`;
        } else if (element.textContent && element.textContent.trim().length > 0) {
          const text = element.textContent.trim().substring(0, 20);
          selector += `:contains("${text}")`;
        }
      }
    }
    
    // Check uniqueness
    let selectorElements = document.querySelectorAll(selector);
    
    // If not unique, add parent context
    if (selectorElements.length > 1 && element.parentElement) {
      // Get parent selector
      let parentSelector = '';
      
      if (element.parentElement.id) {
        parentSelector = `#${CSS.escape(element.parentElement.id)}`;
      } else if (element.parentElement.classList && element.parentElement.classList.length > 0) {
        parentSelector = `.${CSS.escape(element.parentElement.classList[0])}`;
      } else {
        parentSelector = element.parentElement.tagName.toLowerCase();
      }
      
      // Combine selectors
      selector = `${parentSelector} > ${selector}`;
      
      // Check uniqueness again
      selectorElements = document.querySelectorAll(selector);
      
      // If still not unique, add :nth-child
      if (selectorElements.length > 1) {
        const siblings = Array.from(element.parentElement.children);
        const index = siblings.indexOf(element);
        selector = `${parentSelector} > ${element.tagName.toLowerCase()}:nth-child(${index + 1})`;
      }
    }
  } catch (error) {
    console.error('Error generating selector:', error);
    // Fallback to simple tag name
    selector = element.tagName.toLowerCase();
  }
  
  // Cache selector for future use
  state.elementSelectors.set(element, selector);
  
  return selector;
}

// Get element attributes
function getElementAttributes(element) {
  const result = {};
  
  // Get all attributes
  for (const attr of element.attributes) {
    // Skip style attribute
    if (attr.name === 'style') continue;
    
    result[attr.name] = attr.value;
  }
  
  return result;
}

// Check if element is visible
function isElementVisible(element) {
  const style = window.getComputedStyle(element);
  
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         element.offsetWidth > 0 && 
         element.offsetHeight > 0;
}

// Extract data from table
function extractTableData(table) {
  const result = {
    headers: [],
    rows: []
  };
  
  // Get headers
  const headerRow = table.querySelector('thead tr');
  if (headerRow) {
    result.headers = Array.from(headerRow.querySelectorAll('th')).map(th => th.textContent.trim());
  } else {
    // Try first row as headers
    const firstRow = table.querySelector('tr');
    if (firstRow) {
      result.headers = Array.from(firstRow.querySelectorAll('th, td')).map(cell => cell.textContent.trim());
    }
  }
  
  // Get rows
  const rows = table.querySelectorAll('tbody tr, tr');
  
  // Skip first row if it was used as headers
  const startIndex = (!headerRow && rows.length > 0) ? 1 : 0;
  
  // Limit to 10 rows for performance
  const processRows = Array.from(rows).slice(startIndex, startIndex + 10);
  
  for (const row of processRows) {
    const rowData = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
    
    if (rowData.length > 0) {
      result.rows.push(rowData);
    }
  }
  
  return result;
}

// Extract data from list
function extractListData(list) {
  const result = {
    type: list.tagName.toLowerCase(),
    items: []
  };
  
  // Get list items
  const items = list.querySelectorAll('li');
  
  // Limit to 10 items for performance
  const processItems = Array.from(items).slice(0, 10);
  
  for (const item of processItems) {
    result.items.push({
      text: item.textContent.trim(),
      html: item.innerHTML.trim()
    });
  }
  
  return result;
}

// Detect repeated elements (like product cards)
function detectRepeatedElements() {
  // Common container selectors
  const containerSelectors = [
    '.products', '.items', '.cards', '.grid', '.results',
    '.product-list', '.item-list', '.card-list',
    '[class*="product"]', '[class*="item"]', '[class*="card"]'
  ];
  
  for (const selector of containerSelectors) {
    try {
      const containers = document.querySelectorAll(selector);
      
      for (const container of containers) {
        // Get direct children
        const children = Array.from(container.children);
        
        // Only consider containers with multiple similar children
        if (children.length >= 3) {
          // Check if children have similar structure
          const firstChild = children[0];
          const tagName = firstChild.tagName;
          const className = firstChild.className;
          
          // Count children with same structure
          const similarChildren = children.filter(child => 
            child.tagName === tagName && child.className === className
          );
          
          // If most children are similar, consider it a repeated pattern
          if (similarChildren.length >= children.length * 0.7) {
            // Extract data from sample items
            const samples = similarChildren.slice(0, 3).map(child => {
              return {
                selector: generateSelector(child),
                html: child.innerHTML.trim().substring(0, 200),
                text: child.textContent.trim().substring(0, 100)
              };
            });
            
            recordAction({
              type: 'repeatedElements',
              containerSelector: generateSelector(container),
              itemSelector: generateSelector(similarChildren[0]),
              count: similarChildren.length,
              samples: samples
            });
            
            // Only record one pattern per page for performance
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error detecting repeated elements:', error);
    }
  }
}

// Detect patterns in user selections
function detectPatterns() {
  // Minimum 3 selections to detect patterns
  if (state.selectedElements.length < 3) return;
  
  // Check if selections might be a data table
  const lastThree = state.selectedElements.slice(-3);
  
  // Check if they have the same parent
  const parents = new Set(lastThree.map(item => item.element.parentElement));
  
  if (parents.size === 1) {
    // Same parent, might be table row or list
    const parent = lastThree[0].element.parentElement;
    
    recordAction({
      type: 'selectionPattern',
      pattern: 'siblingElements',
      parentSelector: generateSelector(parent),
      childSelectors: lastThree.map(item => item.selector)
    });
  }
  
  // Check if they are the same type of element in different containers
  const tagNames = new Set(lastThree.map(item => item.tagName));
  
  if (tagNames.size === 1) {
    // Same tag, might be repeated pattern
    const tagName = lastThree[0].tagName;
    
    recordAction({
      type: 'selectionPattern',
      pattern: 'repeatedElementType',
      elementType: tagName,
      selectors: lastThree.map(item => item.selector)
    });
  }
}

// Initialize on load
initialize();