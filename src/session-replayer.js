const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class SessionReplayer {
  constructor(session, config, callbacks) {
    this.session = session;
    this.config = {
      headless: config.headless !== false,
      slowMo: config.slowMo || 100,
      timeout: config.timeout || 10000,
      screenshotOnFailure: config.screenshotOnFailure !== false,
      compareScreenshots: config.compareScreenshots || false,
      ...config
    };
    
    this.callbacks = callbacks || {};
    this.browser = null;
    this.page = null;
    this.running = false;
    this.results = {
      sessionId: session.id,
      startTime: null,
      endTime: null,
      totalActions: session.actions?.length || 0,
      successfulActions: 0,
      failedActions: 0,
      skippedActions: 0,
      errors: [],
      warnings: [],
      regressions: []
    };
    
    this.currentActionIndex = 0;
  }

  async start() {
    this.running = true;
    this.results.startTime = Date.now();
    
    this.log('info', `Starting replay of session: ${this.session.id}`);
    this.log('info', `Total actions to replay: ${this.session.actions?.length || 0}`);
    
    try {
      this.browser = await chromium.launch({
        headless: this.config.headless,
        slowMo: this.config.slowMo
      });
      
      const context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true
      });
      
      this.page = await context.newPage();
      
      // Track errors during replay
      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          this.results.errors.push({
            type: 'console',
            message: msg.text(),
            actionIndex: this.currentActionIndex
          });
        }
      });
      
      this.page.on('pageerror', error => {
        this.results.errors.push({
          type: 'page',
          message: error.message,
          actionIndex: this.currentActionIndex
        });
      });
      
      // Navigate to initial URL
      await this.page.goto(this.session.url, { waitUntil: 'networkidle', timeout: 30000 });
      this.log('success', `Loaded ${this.session.url}`);
      
      // Replay each action
      for (let i = 0; i < this.session.actions.length; i++) {
        if (!this.running) break;
        
        this.currentActionIndex = i;
        const action = this.session.actions[i];
        
        try {
          await this.replayAction(action, i);
          this.results.successfulActions++;
          
          if (this.callbacks.onActionComplete) {
            this.callbacks.onActionComplete({
              index: i,
              action,
              success: true,
              total: this.session.actions.length
            });
          }
        } catch (err) {
          this.results.failedActions++;
          
          const failure = {
            actionIndex: i,
            action,
            error: err.message,
            screenshot: null
          };
          
          // Take screenshot on failure
          if (this.config.screenshotOnFailure && this.page) {
            try {
              const buffer = await this.page.screenshot({ type: 'jpeg', quality: 80 });
              failure.screenshot = buffer.toString('base64');
            } catch (e) {
              // Screenshot failed
            }
          }
          
          this.results.regressions.push(failure);
          this.log('error', `Action ${i} failed: ${action.intent || action.type} - ${err.message}`);
          
          if (this.callbacks.onActionComplete) {
            this.callbacks.onActionComplete({
              index: i,
              action,
              success: false,
              error: err.message,
              total: this.session.actions.length
            });
          }
          
          // Continue with next action unless it's a critical navigation failure
          if (action.type === 'navigation') {
            this.log('warning', 'Navigation failed, attempting to continue...');
          }
        }
        
        // Small delay between actions
        await this.sleep(50);
      }
      
      // Take final screenshot for comparison
      if (this.page) {
        try {
          const buffer = await this.page.screenshot({ type: 'jpeg', quality: 80 });
          this.results.finalScreenshot = buffer.toString('base64');
        } catch (e) {
          // Page may be closed
        }
      }
      
    } catch (err) {
      this.log('error', `Replay failed: ${err.message}`);
      this.results.errors.push({
        type: 'fatal',
        message: err.message,
        actionIndex: this.currentActionIndex
      });
    }
    
    await this.stop();
    return this.results;
  }

  async replayAction(action, index) {
    const { type, element } = action;
    
    this.log('action', `[${index + 1}/${this.session.actions.length}] ${action.intent || type}`);
    
    switch (type) {
      case 'click':
        await this.replayClick(action);
        break;
      case 'input':
        await this.replayInput(action);
        break;
      case 'submit':
        await this.replaySubmit(action);
        break;
      case 'select':
        await this.replaySelect(action);
        break;
      case 'keypress':
        await this.replayKeypress(action);
        break;
      case 'scroll':
        await this.replayScroll(action);
        break;
      case 'navigation':
        await this.replayNavigation(action);
        break;
      default:
        this.results.skippedActions++;
        this.log('warning', `Unknown action type: ${type}`);
    }
  }

  async replayClick(action) {
    const element = await this.findElement(action.element);
    if (!element) {
      throw new Error(`Element not found: ${action.element?.selector}`);
    }
    
    await element.click({ timeout: this.config.timeout });
    await this.waitForStability();
  }

  async replayInput(action) {
    const element = await this.findElement(action.element);
    if (!element) {
      throw new Error(`Input field not found: ${action.element?.selector}`);
    }
    
    // Clear existing value and type new one
    await element.fill(action.value || '', { timeout: this.config.timeout });
  }

  async replaySubmit(action) {
    // Try to find and click submit button, or press Enter
    const form = await this.findElement(action.element);
    if (form) {
      const submitBtn = await form.$('button[type="submit"], input[type="submit"]');
      if (submitBtn) {
        await submitBtn.click({ timeout: this.config.timeout });
      } else {
        await this.page.keyboard.press('Enter');
      }
    } else {
      await this.page.keyboard.press('Enter');
    }
    
    await this.waitForStability();
  }

  async replaySelect(action) {
    const element = await this.findElement(action.element);
    if (!element) {
      throw new Error(`Select field not found: ${action.element?.selector}`);
    }
    
    await element.selectOption(action.value, { timeout: this.config.timeout });
  }

  async replayKeypress(action) {
    const key = action.key;
    const modifiers = action.modifiers || {};
    
    // Build key combination
    const keys = [];
    if (modifiers.ctrl) keys.push('Control');
    if (modifiers.alt) keys.push('Alt');
    if (modifiers.shift) keys.push('Shift');
    if (modifiers.meta) keys.push('Meta');
    keys.push(key);
    
    await this.page.keyboard.press(keys.join('+'));
  }

  async replayScroll(action) {
    await this.page.evaluate(({ x, y }) => {
      window.scrollTo(x, y);
    }, { x: action.scrollX || 0, y: action.scrollY || 0 });
  }

  async replayNavigation(action) {
    // Check if we're already on the target URL
    const currentUrl = this.page.url();
    if (currentUrl === action.url) {
      return;
    }
    
    // Wait for navigation to complete naturally, or navigate directly
    try {
      await this.page.waitForURL(action.url, { timeout: 5000 });
    } catch {
      // If natural navigation didn't happen, navigate directly
      await this.page.goto(action.url, { waitUntil: 'networkidle', timeout: this.config.timeout });
    }
  }

  async findElement(elementDescriptor) {
    if (!elementDescriptor) return null;
    
    const selectors = this.generateSelectors(elementDescriptor);
    
    for (const selector of selectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            return element;
          }
        }
      } catch {
        // Selector may be invalid, try next
      }
    }
    
    // Try text-based fallback
    if (elementDescriptor.text) {
      try {
        const element = await this.page.getByText(elementDescriptor.text.slice(0, 50), { exact: false }).first();
        if (element) {
          const isVisible = await element.isVisible();
          if (isVisible) return element;
        }
      } catch {
        // Text search failed
      }
    }
    
    return null;
  }

  generateSelectors(el) {
    const selectors = [];
    
    // Primary selector from recording
    if (el.selector) {
      selectors.push(el.selector);
    }
    
    // ID-based selector
    if (el.id) {
      selectors.push(`#${el.id}`);
    }
    
    // Name-based selector
    if (el.name) {
      selectors.push(`[name="${el.name}"]`);
    }
    
    // Aria-label selector
    if (el.ariaLabel) {
      selectors.push(`[aria-label="${el.ariaLabel}"]`);
    }
    
    // Role + text selector
    if (el.role && el.text) {
      selectors.push(`[role="${el.role}"]:has-text("${el.text.slice(0, 30)}")`);
    }
    
    // Tag + text selector for buttons/links
    if (el.tag === 'button' && el.text) {
      selectors.push(`button:has-text("${el.text.slice(0, 30)}")`);
    }
    if (el.tag === 'a' && el.text) {
      selectors.push(`a:has-text("${el.text.slice(0, 30)}")`);
    }
    
    // Placeholder selector for inputs
    if (el.placeholder) {
      selectors.push(`[placeholder="${el.placeholder}"]`);
    }
    
    return selectors;
  }

  async waitForStability() {
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch {
      // Timeout is acceptable, page may have long-polling
    }
    await this.sleep(100);
  }

  async stop() {
    this.running = false;
    this.results.endTime = Date.now();
    this.results.duration = this.results.endTime - this.results.startTime;
    
    // Calculate success rate
    const total = this.results.successfulActions + this.results.failedActions;
    this.results.successRate = total > 0 ? (this.results.successfulActions / total * 100).toFixed(1) : 0;
    
    // Determine overall status
    if (this.results.failedActions === 0 && this.results.errors.length === 0) {
      this.results.status = 'passed';
      this.log('success', `Replay completed successfully! ${this.results.successfulActions}/${this.results.totalActions} actions passed.`);
    } else if (this.results.failedActions > 0) {
      this.results.status = 'failed';
      this.log('error', `Replay found ${this.results.regressions.length} regression(s)!`);
    } else {
      this.results.status = 'warning';
      this.log('warning', `Replay completed with ${this.results.errors.length} error(s).`);
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
    
    if (this.callbacks.onComplete) {
      this.callbacks.onComplete(this.results);
    }
    
    return this.results;
  }

  abort() {
    this.running = false;
    this.log('warning', 'Replay aborted by user');
  }

  isRunning() {
    return this.running;
  }

  getProgress() {
    return {
      current: this.currentActionIndex,
      total: this.session.actions?.length || 0,
      percentage: this.session.actions?.length 
        ? Math.round((this.currentActionIndex / this.session.actions.length) * 100)
        : 0
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

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Compare current screenshot with baseline
  async compareWithBaseline(baselineScreenshot) {
    if (!this.page || !baselineScreenshot) return null;
    
    try {
      const currentBuffer = await this.page.screenshot({ type: 'png' });
      const baselineBuffer = Buffer.from(baselineScreenshot, 'base64');
      
      // Simple pixel comparison (for more advanced, use pixelmatch library)
      const currentB64 = currentBuffer.toString('base64');
      const isSame = currentB64 === baselineScreenshot;
      
      return {
        match: isSame,
        current: currentB64,
        baseline: baselineScreenshot
      };
    } catch (err) {
      return { error: err.message };
    }
  }
}

module.exports = { SessionReplayer };
