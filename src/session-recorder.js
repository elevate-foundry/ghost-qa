const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { IntentSummarizer } = require('./intent-summarizer');

class SessionRecorder {
  constructor(config, callbacks) {
    this.config = {
      url: config.url || 'http://localhost:3000',
      sessionName: config.sessionName || `session-${Date.now()}`,
      ...config
    };
    
    this.callbacks = callbacks || {};
    this.browser = null;
    this.page = null;
    this.context = null;
    this.recording = false;
    this.actions = [];
    
    // Initialize IntentSummarizer with LLM config if provided
    const llmProvider = config.llmProvider || 'ollama';
    this.intentSummarizer = new IntentSummarizer({
      llmEnabled: config.llmEnabled || false,
      provider: llmProvider,
      apiKey: config.llmApiKey || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
      ollamaHost: config.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434'
    });
    this.useLLMIntents = config.llmEnabled || false;
    
    if (this.useLLMIntents) {
      console.log(`[SessionRecorder] LLM intents enabled with provider: ${llmProvider}`);
    }
    
    this.sessionStartTime = null;
    this.lastActionTime = null;
    
    // Session storage directory
    this.sessionsDir = path.join(app.getPath('userData'), 'ghost-sessions');
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  async start() {
    this.recording = true;
    this.sessionStartTime = Date.now();
    this.actions = [];
    
    this.log('info', `Starting session recording: ${this.config.sessionName}`);
    
    try {
      this.browser = await chromium.launch({
        headless: false,
        args: ['--disable-web-security']
      });
      
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true
      });
      
      this.page = await this.context.newPage();
      
      // Inject recording script before page loads
      await this.page.addInitScript(() => {
        window.__ghostRecorder = {
          actions: [],
          recording: true,
          
          getElementDescriptor(el) {
            if (!el || !el.tagName) return null;
            
            const descriptor = {
              tag: el.tagName.toLowerCase(),
              id: el.id || null,
              classes: Array.from(el.classList || []),
              text: (el.textContent || '').trim().slice(0, 100),
              type: el.type || null,
              name: el.name || null,
              placeholder: el.placeholder || null,
              role: el.getAttribute('role') || null,
              ariaLabel: el.getAttribute('aria-label') || null,
              href: el.href || null,
              value: el.value || null,
            };
            
            // Generate a readable selector
            if (el.id) {
              descriptor.selector = `#${el.id}`;
            } else if (el.name) {
              descriptor.selector = `[name="${el.name}"]`;
            } else if (descriptor.ariaLabel) {
              descriptor.selector = `[aria-label="${descriptor.ariaLabel}"]`;
            } else if (descriptor.role && descriptor.text) {
              descriptor.selector = `[role="${descriptor.role}"]:has-text("${descriptor.text.slice(0, 30)}")`;
            } else if (descriptor.text && descriptor.tag === 'button') {
              descriptor.selector = `button:has-text("${descriptor.text.slice(0, 30)}")`;
            } else if (descriptor.text && descriptor.tag === 'a') {
              descriptor.selector = `a:has-text("${descriptor.text.slice(0, 30)}")`;
            } else {
              // Build a path-based selector
              const path = [];
              let current = el;
              while (current && current !== document.body && path.length < 3) {
                let selector = current.tagName.toLowerCase();
                if (current.id) {
                  selector = `#${current.id}`;
                  path.unshift(selector);
                  break;
                }
                if (current.className && typeof current.className === 'string') {
                  const mainClass = current.className.split(' ')[0];
                  if (mainClass) selector += `.${mainClass}`;
                }
                path.unshift(selector);
                current = current.parentElement;
              }
              descriptor.selector = path.join(' > ');
            }
            
            return descriptor;
          },
          
          recordAction(type, data) {
            if (!this.recording) return;
            
            const action = {
              type,
              timestamp: Date.now(),
              url: window.location.href,
              ...data
            };
            
            this.actions.push(action);
            
            // Send to main process
            if (window.__ghostSendAction) {
              window.__ghostSendAction(action);
            }
          }
        };
        
        // Click handler
        document.addEventListener('click', (e) => {
          const descriptor = window.__ghostRecorder.getElementDescriptor(e.target);
          if (descriptor) {
            window.__ghostRecorder.recordAction('click', {
              element: descriptor,
              x: e.clientX,
              y: e.clientY
            });
          }
        }, true);
        
        // Input handler (debounced)
        let inputTimeout = null;
        document.addEventListener('input', (e) => {
          clearTimeout(inputTimeout);
          inputTimeout = setTimeout(() => {
            const descriptor = window.__ghostRecorder.getElementDescriptor(e.target);
            if (descriptor) {
              window.__ghostRecorder.recordAction('input', {
                element: descriptor,
                value: e.target.value,
                inputType: e.target.type || 'text'
              });
            }
          }, 500);
        }, true);
        
        // Form submit handler
        document.addEventListener('submit', (e) => {
          const descriptor = window.__ghostRecorder.getElementDescriptor(e.target);
          if (descriptor) {
            window.__ghostRecorder.recordAction('submit', {
              element: descriptor
            });
          }
        }, true);
        
        // Select change handler
        document.addEventListener('change', (e) => {
          if (e.target.tagName === 'SELECT') {
            const descriptor = window.__ghostRecorder.getElementDescriptor(e.target);
            if (descriptor) {
              const selectedOption = e.target.options[e.target.selectedIndex];
              window.__ghostRecorder.recordAction('select', {
                element: descriptor,
                value: e.target.value,
                optionText: selectedOption ? selectedOption.text : null
              });
            }
          }
        }, true);
        
        // Keyboard shortcuts (for special keys)
        document.addEventListener('keydown', (e) => {
          // Only record special keys like Enter, Escape, Tab
          if (['Enter', 'Escape', 'Tab'].includes(e.key)) {
            const descriptor = window.__ghostRecorder.getElementDescriptor(e.target);
            window.__ghostRecorder.recordAction('keypress', {
              element: descriptor,
              key: e.key,
              modifiers: {
                ctrl: e.ctrlKey,
                alt: e.altKey,
                shift: e.shiftKey,
                meta: e.metaKey
              }
            });
          }
        }, true);
        
        // Scroll handler (debounced)
        let scrollTimeout = null;
        window.addEventListener('scroll', () => {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            window.__ghostRecorder.recordAction('scroll', {
              scrollX: window.scrollX,
              scrollY: window.scrollY
            });
          }, 300);
        }, true);
      });
      
      // Expose function to receive actions from page
      await this.page.exposeFunction('__ghostSendAction', (action) => {
        this.handleAction(action);
      });
      
      // Listen for navigation
      this.page.on('framenavigated', (frame) => {
        if (frame === this.page.mainFrame()) {
          this.handleAction({
            type: 'navigation',
            timestamp: Date.now(),
            url: frame.url(),
            element: null
          });
        }
      });
      
      // Navigate to initial URL
      await this.page.goto(this.config.url, { waitUntil: 'networkidle', timeout: 30000 });
      
      this.log('success', `Recording started. Interact with the page naturally.`);
      this.log('info', `Your actions will be recorded as natural language intent.`);
      
      if (this.callbacks.onRecordingStarted) {
        this.callbacks.onRecordingStarted({
          sessionName: this.config.sessionName,
          url: this.config.url,
          startTime: this.sessionStartTime
        });
      }
      
    } catch (err) {
      this.log('error', `Failed to start recording: ${err.message}`);
      throw err;
    }
  }

  handleAction(action) {
    if (!this.recording) return;
    
    // Calculate time since last action
    const timeSinceLastAction = this.lastActionTime 
      ? action.timestamp - this.lastActionTime 
      : 0;
    this.lastActionTime = action.timestamp;
    
    // Generate local intent first (fast, synchronous)
    const localIntent = this.intentSummarizer.summarize(action);
    
    const enrichedAction = {
      ...action,
      intent: localIntent,
      localIntent,
      timeSinceLastAction,
      actionIndex: this.actions.length
    };
    
    this.actions.push(enrichedAction);
    
    this.log('action', localIntent);
    
    if (this.callbacks.onAction) {
      this.callbacks.onAction(enrichedAction);
    }
    
    // If LLM is enabled, enhance the intent asynchronously
    if (this.useLLMIntents) {
      this.enhanceIntentWithLLM(enrichedAction);
    }
  }
  
  async enhanceIntentWithLLM(action) {
    console.log('[LLM] Starting enhancement for action:', action.actionIndex);
    try {
      const llmIntent = await this.intentSummarizer.summarizeWithLLM(action, {
        url: this.config.url
      });
      
      console.log('[LLM] Got response:', llmIntent);
      
      // Update the action in our array with the LLM-enhanced intent
      const idx = this.actions.findIndex(a => a.actionIndex === action.actionIndex);
      if (idx !== -1) {
        this.actions[idx].intent = llmIntent;
        this.actions[idx].llmIntent = llmIntent;
        
        this.log('llm', `Enhanced: "${llmIntent}"`);
        
        // Notify UI of the enhanced intent
        if (this.callbacks.onAction) {
          this.callbacks.onAction(this.actions[idx]);
        }
      }
    } catch (err) {
      // LLM enhancement failed, keep local intent
      console.error('[LLM] Enhancement failed:', err.message);
    }
  }

  async stop() {
    if (!this.recording) return null;
    
    this.recording = false;
    this.log('info', 'Stopping recording...');
    
    // Take final screenshot
    let finalScreenshot = null;
    if (this.page) {
      try {
        const buffer = await this.page.screenshot({ type: 'jpeg', quality: 80 });
        finalScreenshot = buffer.toString('base64');
      } catch (err) {
        // Page may be closed
      }
    }
    
    // Create session object
    const session = {
      id: this.config.sessionName,
      url: this.config.url,
      startTime: this.sessionStartTime,
      endTime: Date.now(),
      duration: Date.now() - this.sessionStartTime,
      actionCount: this.actions.length,
      actions: this.actions,
      finalScreenshot,
      metadata: {
        version: '1.0',
        recordedAt: new Date().toISOString()
      }
    };
    
    // Save session to disk
    const sessionPath = path.join(this.sessionsDir, `${this.config.sessionName}.json`);
    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
    
    this.log('success', `Session saved: ${this.config.sessionName} (${this.actions.length} actions)`);
    
    // Close browser
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
    
    if (this.callbacks.onRecordingStopped) {
      this.callbacks.onRecordingStopped(session);
    }
    
    return session;
  }

  async pause() {
    this.recording = false;
    this.log('info', 'Recording paused');
    
    if (this.page) {
      await this.page.evaluate(() => {
        window.__ghostRecorder.recording = false;
      });
    }
  }

  async resume() {
    this.recording = true;
    this.log('info', 'Recording resumed');
    
    if (this.page) {
      await this.page.evaluate(() => {
        window.__ghostRecorder.recording = true;
      });
    }
  }

  isRecording() {
    return this.recording;
  }

  getActions() {
    return this.actions;
  }

  getSessionInfo() {
    return {
      sessionName: this.config.sessionName,
      url: this.config.url,
      startTime: this.sessionStartTime,
      actionCount: this.actions.length,
      recording: this.recording,
      duration: this.sessionStartTime ? Date.now() - this.sessionStartTime : 0
    };
  }

  log(level, message) {
    const log = {
      level,
      message,
      timestamp: new Date().toISOString()
    };
    
    if (this.callbacks.onLog) {
      this.callbacks.onLog(log);
    }
  }

  // Static methods for session management
  static getSessions() {
    const sessionsDir = path.join(app.getPath('userData'), 'ghost-sessions');
    if (!fs.existsSync(sessionsDir)) {
      return [];
    }
    
    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));
    return files.map(f => {
      try {
        const content = fs.readFileSync(path.join(sessionsDir, f), 'utf-8');
        const session = JSON.parse(content);
        return {
          id: session.id,
          url: session.url,
          startTime: session.startTime,
          duration: session.duration,
          actionCount: session.actionCount,
          recordedAt: session.metadata?.recordedAt
        };
      } catch (err) {
        return null;
      }
    }).filter(Boolean);
  }

  static getSession(sessionId) {
    const sessionsDir = path.join(app.getPath('userData'), 'ghost-sessions');
    const sessionPath = path.join(sessionsDir, `${sessionId}.json`);
    
    if (!fs.existsSync(sessionPath)) {
      return null;
    }
    
    try {
      const content = fs.readFileSync(sessionPath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      return null;
    }
  }

  static deleteSession(sessionId) {
    const sessionsDir = path.join(app.getPath('userData'), 'ghost-sessions');
    const sessionPath = path.join(sessionsDir, `${sessionId}.json`);
    
    if (fs.existsSync(sessionPath)) {
      fs.unlinkSync(sessionPath);
      return true;
    }
    return false;
  }
}

module.exports = { SessionRecorder };
