const https = require('https');
const http = require('http');

class IntentSummarizer {
  constructor(config = {}) {
    this.llmEnabled = config.llmEnabled || false;
    this.provider = config.provider || 'groq'; // Default to Groq for speed
    this.apiKey = config.apiKey || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    this.ollamaHost = config.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.model = config.model || this.getDefaultModel();
    
    // Cache for LLM responses to avoid duplicate calls
    this.intentCache = new Map();
    
    // Common UI patterns for better intent descriptions
    this.patterns = {
      login: ['login', 'sign in', 'signin', 'log in'],
      logout: ['logout', 'sign out', 'signout', 'log out'],
      signup: ['signup', 'sign up', 'register', 'create account'],
      search: ['search', 'find', 'query'],
      submit: ['submit', 'send', 'save', 'confirm', 'ok', 'done'],
      cancel: ['cancel', 'close', 'dismiss', 'back'],
      delete: ['delete', 'remove', 'trash'],
      edit: ['edit', 'modify', 'update', 'change'],
      add: ['add', 'create', 'new', 'plus'],
      navigation: ['menu', 'nav', 'sidebar', 'header', 'footer'],
    };
  }

  getDefaultModel() {
    switch (this.provider) {
      case 'groq': return 'llama-3.1-8b-instant'; // ~100ms latency
      case 'anthropic': return 'claude-3-haiku-20240307'; // Fast Anthropic model
      case 'ollama': return 'llama3.2:1b'; // Smallest/fastest local
      default: return 'gpt-4o-mini';
    }
  }

  // Main entry point - returns local summary, queues LLM enhancement
  summarize(action) {
    // Always generate a local summary first (fast, synchronous)
    const localIntent = this.summarizeLocal(action);
    return localIntent;
  }

  // Async version that uses LLM for high-level intent
  async summarizeWithLLM(action, context = {}) {
    // Ollama doesn't need an API key
    const needsApiKey = this.provider !== 'ollama';
    if (!this.llmEnabled || (needsApiKey && !this.apiKey)) {
      console.log('[IntentSummarizer] LLM disabled or missing API key, using local');
      return this.summarizeLocal(action);
    }

    // Generate cache key from action signature
    const cacheKey = this.getCacheKey(action);
    if (this.intentCache.has(cacheKey)) {
      return this.intentCache.get(cacheKey);
    }

    try {
      const llmIntent = await this.generateLLMIntent(action, context);
      this.intentCache.set(cacheKey, llmIntent);
      return llmIntent;
    } catch (err) {
      console.error('LLM intent generation failed:', err.message);
      return this.summarizeLocal(action);
    }
  }

  getCacheKey(action) {
    const el = action.element || {};
    return `${action.type}:${el.tag}:${el.text?.slice(0, 20)}:${el.ariaLabel}:${el.role}`;
  }

  async generateLLMIntent(action, context) {
    const prompt = this.buildIntentPrompt(action, context);
    
    switch (this.provider) {
      case 'groq':
        return await this.callGroq(prompt);
      case 'anthropic':
        return await this.callAnthropic(prompt);
      case 'ollama':
        return await this.callOllama(prompt);
      default:
        return await this.callOpenAI(prompt);
    }
  }

  // Groq - FASTEST (~100ms)
  async callGroq(prompt) {
    const body = JSON.stringify({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 60,
      temperature: 0.1
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(json.error.message));
              return;
            }
            const content = json.choices?.[0]?.message?.content || '';
            resolve(content.trim());
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  buildIntentPrompt(action, context) {
    const el = action.element || {};
    const localDesc = this.summarizeLocal(action);
    
    return `You are analyzing a user interaction with a web application to determine their HIGH-LEVEL INTENT.

The user performed this action:
- Type: ${action.type}
- Element: ${el.tag || 'unknown'} ${el.role ? `(role: ${el.role})` : ''}
- Text/Label: "${el.text || el.ariaLabel || el.placeholder || 'none'}"
- Element ID: ${el.id || 'none'}
- Element Classes: ${el.classes?.join(' ') || 'none'}
- Current URL: ${action.url || context.url || 'unknown'}
${action.value ? `- Input Value: "${this.maskSensitive(action.value, el)}"` : ''}

Local description: "${localDesc}"

Respond with ONLY a single, concise sentence describing the USER'S GOAL, not the technical action.

Examples of good responses:
- "User attempts to log in" (not "User clicked button with id btn-login")
- "User searches for products" (not "User typed in search input")
- "User adds item to cart" (not "User clicked Add to Cart button")
- "User navigates to checkout" (not "User clicked link /checkout")

Your response (one sentence only):`;
  }

  maskSensitive(value, el) {
    if (this.isSensitiveField(el)) {
      return '[REDACTED]';
    }
    return value.length > 50 ? value.slice(0, 50) + '...' : value;
  }

  async callOpenAI(prompt) {
    const body = JSON.stringify({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.3
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(json.error.message));
              return;
            }
            const content = json.choices?.[0]?.message?.content || '';
            resolve(content.trim());
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  async callAnthropic(prompt) {
    const body = JSON.stringify({
      model: this.model,
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }]
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(json.error.message));
              return;
            }
            const content = json.content?.[0]?.text || '';
            resolve(content.trim());
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  async callOllama(prompt) {
    const url = new URL('/api/generate', this.ollamaHost);
    const body = JSON.stringify({
      model: this.model,
      prompt: prompt,
      stream: false
    });

    return new Promise((resolve, reject) => {
      const protocol = url.protocol === 'https:' ? https : http;
      const req = protocol.request({
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(json.error));
              return;
            }
            resolve((json.response || '').trim());
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  // Local (non-LLM) summarization - fast fallback
  summarizeLocal(action) {
    switch (action.type) {
      case 'click':
        return this.summarizeClick(action);
      case 'input':
        return this.summarizeInput(action);
      case 'submit':
        return this.summarizeSubmit(action);
      case 'select':
        return this.summarizeSelect(action);
      case 'keypress':
        return this.summarizeKeypress(action);
      case 'scroll':
        return this.summarizeScroll(action);
      case 'navigation':
        return this.summarizeNavigation(action);
      default:
        return `Performed ${action.type} action`;
    }
  }

  summarizeClick(action) {
    const el = action.element;
    if (!el) return 'Clicked on the page';

    const elementDesc = this.getElementDescription(el);
    const context = this.detectContext(el);

    // Button clicks
    if (el.tag === 'button' || el.role === 'button') {
      const buttonText = el.text || el.ariaLabel || 'button';
      if (context) {
        return `Clicked "${buttonText}" button (${context})`;
      }
      return `Clicked "${buttonText}" button`;
    }

    // Link clicks
    if (el.tag === 'a') {
      const linkText = el.text || 'link';
      if (el.href) {
        const url = this.simplifyUrl(el.href);
        return `Clicked link "${linkText}" → ${url}`;
      }
      return `Clicked link "${linkText}"`;
    }

    // Checkbox/Radio
    if (el.type === 'checkbox') {
      return `Toggled checkbox "${el.name || el.ariaLabel || 'option'}"`;
    }
    if (el.type === 'radio') {
      return `Selected radio option "${el.value || el.ariaLabel || 'option'}"`;
    }

    // Generic element
    return `Clicked ${elementDesc}`;
  }

  summarizeInput(action) {
    const el = action.element;
    if (!el) return 'Entered text';

    const fieldName = this.getFieldName(el);
    const value = action.value || '';
    
    // Mask sensitive fields
    if (this.isSensitiveField(el)) {
      return `Entered ${this.getMaskedDescription(el.type)} in "${fieldName}"`;
    }

    // Truncate long values
    const displayValue = value.length > 30 ? value.slice(0, 30) + '...' : value;
    
    return `Typed "${displayValue}" in "${fieldName}"`;
  }

  summarizeSubmit(action) {
    const el = action.element;
    const formName = el?.id || el?.name || 'form';
    const context = this.detectContext(el);
    
    if (context) {
      return `Submitted ${context} form`;
    }
    return `Submitted form "${formName}"`;
  }

  summarizeSelect(action) {
    const el = action.element;
    const fieldName = this.getFieldName(el);
    const optionText = action.optionText || action.value || 'option';
    
    return `Selected "${optionText}" from "${fieldName}" dropdown`;
  }

  summarizeKeypress(action) {
    const key = action.key;
    const el = action.element;
    
    if (key === 'Enter') {
      if (el?.tag === 'input' || el?.tag === 'textarea') {
        return `Pressed Enter to submit "${this.getFieldName(el)}"`;
      }
      return 'Pressed Enter';
    }
    
    if (key === 'Escape') {
      return 'Pressed Escape (likely closing modal/dialog)';
    }
    
    if (key === 'Tab') {
      return 'Pressed Tab to navigate';
    }
    
    // Handle modifier combinations
    const modifiers = action.modifiers || {};
    const modifierStr = [
      modifiers.ctrl ? 'Ctrl' : '',
      modifiers.alt ? 'Alt' : '',
      modifiers.shift ? 'Shift' : '',
      modifiers.meta ? 'Cmd' : ''
    ].filter(Boolean).join('+');
    
    if (modifierStr) {
      return `Pressed ${modifierStr}+${key}`;
    }
    
    return `Pressed ${key}`;
  }

  summarizeScroll(action) {
    const direction = action.scrollY > 0 ? 'down' : 'up';
    return `Scrolled ${direction} the page`;
  }

  summarizeNavigation(action) {
    const url = this.simplifyUrl(action.url);
    return `Navigated to ${url}`;
  }

  getElementDescription(el) {
    if (!el) return 'element';

    // Priority: aria-label > text > placeholder > name > tag
    if (el.ariaLabel) return `"${el.ariaLabel}"`;
    if (el.text && el.text.length < 50) return `"${el.text}"`;
    if (el.placeholder) return `"${el.placeholder}" field`;
    if (el.name) return `"${el.name}"`;
    if (el.id) return `#${el.id}`;
    
    return el.tag || 'element';
  }

  getFieldName(el) {
    if (!el) return 'field';
    
    // Priority order for field identification
    if (el.ariaLabel) return el.ariaLabel;
    if (el.placeholder) return el.placeholder;
    if (el.name) return this.humanizeName(el.name);
    if (el.id) return this.humanizeName(el.id);
    
    return el.type || 'field';
  }

  humanizeName(name) {
    // Convert camelCase or snake_case to readable text
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  detectContext(el) {
    if (!el) return null;
    
    const searchText = [
      el.text?.toLowerCase() || '',
      el.ariaLabel?.toLowerCase() || '',
      el.name?.toLowerCase() || '',
      el.id?.toLowerCase() || '',
      el.classes?.join(' ').toLowerCase() || ''
    ].join(' ');
    
    for (const [context, keywords] of Object.entries(this.patterns)) {
      if (keywords.some(kw => searchText.includes(kw))) {
        return context;
      }
    }
    
    return null;
  }

  isSensitiveField(el) {
    if (!el) return false;
    
    const sensitiveTypes = ['password'];
    const sensitiveNames = ['password', 'pwd', 'secret', 'token', 'ssn', 'credit', 'card', 'cvv', 'pin'];
    
    if (sensitiveTypes.includes(el.type)) return true;
    
    const name = (el.name || el.id || '').toLowerCase();
    return sensitiveNames.some(s => name.includes(s));
  }

  getMaskedDescription(type) {
    if (type === 'password') return 'password';
    return 'sensitive data';
  }

  simplifyUrl(url) {
    try {
      const parsed = new URL(url);
      // Return just the pathname for same-origin
      if (parsed.pathname === '/') return 'home page';
      return parsed.pathname;
    } catch {
      return url;
    }
  }

  // Generate a summary of an entire session
  summarizeSession(actions) {
    if (!actions || actions.length === 0) {
      return 'Empty session';
    }

    const summary = {
      totalActions: actions.length,
      clicks: 0,
      inputs: 0,
      navigations: 0,
      forms: 0,
      keyFlows: [],
      pagesVisited: new Set()
    };

    // Analyze actions
    for (const action of actions) {
      switch (action.type) {
        case 'click':
          summary.clicks++;
          break;
        case 'input':
          summary.inputs++;
          break;
        case 'navigation':
          summary.navigations++;
          if (action.url) summary.pagesVisited.add(action.url);
          break;
        case 'submit':
          summary.forms++;
          break;
      }
    }

    // Detect key user flows
    summary.keyFlows = this.detectFlows(actions);

    // Generate human-readable summary
    const parts = [];
    parts.push(`${summary.totalActions} actions recorded`);
    
    if (summary.pagesVisited.size > 0) {
      parts.push(`visited ${summary.pagesVisited.size} page(s)`);
    }
    
    if (summary.forms > 0) {
      parts.push(`submitted ${summary.forms} form(s)`);
    }
    
    if (summary.keyFlows.length > 0) {
      parts.push(`Key flows: ${summary.keyFlows.join(', ')}`);
    }

    return parts.join('. ');
  }

  detectFlows(actions) {
    const flows = [];
    
    // Look for common patterns
    const actionTexts = actions.map(a => a.intent || '').join(' ').toLowerCase();
    
    if (actionTexts.includes('login') || actionTexts.includes('sign in')) {
      flows.push('Login');
    }
    if (actionTexts.includes('signup') || actionTexts.includes('register')) {
      flows.push('Registration');
    }
    if (actionTexts.includes('search')) {
      flows.push('Search');
    }
    if (actionTexts.includes('checkout') || actionTexts.includes('payment')) {
      flows.push('Checkout');
    }
    if (actionTexts.includes('profile') || actionTexts.includes('settings')) {
      flows.push('Profile/Settings');
    }
    
    return flows;
  }
}

module.exports = { IntentSummarizer };
