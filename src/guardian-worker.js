const { SessionReplayer } = require('./session-replayer');
const { SessionRecorder } = require('./session-recorder');

class GuardianWorker {
  constructor(config, callbacks) {
    this.config = {
      sessions: config.sessions || [], // Session IDs to watch
      interval: config.interval || 60000, // Check every minute
      headless: config.headless !== false,
      notifyOnRegression: config.notifyOnRegression !== false,
      autoReplay: config.autoReplay !== false,
      ...config
    };
    
    this.callbacks = callbacks || {};
    this.running = false;
    this.watchTimer = null;
    this.currentReplay = null;
    this.lastResults = new Map(); // sessionId -> last result
    this.stats = {
      totalRuns: 0,
      passedRuns: 0,
      failedRuns: 0,
      lastRunTime: null,
      regressionsFound: 0
    };
  }

  async start() {
    if (this.running) return;
    
    this.running = true;
    this.log('info', '👻 Guardian mode activated');
    this.log('info', `Watching ${this.config.sessions.length} session(s)`);
    
    // Run initial check
    if (this.config.autoReplay) {
      await this.runAllSessions();
    }
    
    // Set up periodic checks
    this.watchTimer = setInterval(() => {
      if (this.running && !this.currentReplay) {
        this.runAllSessions();
      }
    }, this.config.interval);
    
    if (this.callbacks.onStarted) {
      this.callbacks.onStarted({
        sessions: this.config.sessions,
        interval: this.config.interval
      });
    }
  }

  async stop() {
    this.running = false;
    
    if (this.watchTimer) {
      clearInterval(this.watchTimer);
      this.watchTimer = null;
    }
    
    if (this.currentReplay) {
      this.currentReplay.abort();
      this.currentReplay = null;
    }
    
    this.log('info', '👻 Guardian mode deactivated');
    
    if (this.callbacks.onStopped) {
      this.callbacks.onStopped(this.stats);
    }
  }

  async runAllSessions() {
    if (!this.running) return;
    
    this.log('info', '🔍 Running guardian check...');
    
    for (const sessionId of this.config.sessions) {
      if (!this.running) break;
      
      await this.runSession(sessionId);
    }
    
    this.stats.lastRunTime = Date.now();
    this.log('info', `Guardian check complete. Pass rate: ${this.getPassRate()}%`);
    
    if (this.callbacks.onCheckComplete) {
      this.callbacks.onCheckComplete({
        stats: this.stats,
        results: Object.fromEntries(this.lastResults)
      });
    }
  }

  async runSession(sessionId) {
    const session = SessionRecorder.getSession(sessionId);
    if (!session) {
      this.log('warning', `Session not found: ${sessionId}`);
      return null;
    }
    
    this.log('info', `Replaying: ${sessionId} (${session.actionCount} actions)`);
    
    const replayer = new SessionReplayer(session, {
      headless: this.config.headless,
      slowMo: 50,
      screenshotOnFailure: true
    }, {
      onLog: (log) => {
        // Only forward errors and important messages
        if (log.level === 'error' || log.level === 'warning') {
          this.log(log.level, `[${sessionId}] ${log.message}`);
        }
      },
      onActionComplete: (data) => {
        if (this.callbacks.onReplayProgress) {
          this.callbacks.onReplayProgress({
            sessionId,
            ...data
          });
        }
      }
    });
    
    this.currentReplay = replayer;
    
    try {
      const results = await replayer.start();
      this.stats.totalRuns++;
      
      if (results.status === 'passed') {
        this.stats.passedRuns++;
        this.log('success', `✅ ${sessionId}: PASSED`);
      } else {
        this.stats.failedRuns++;
        this.stats.regressionsFound += results.regressions.length;
        this.log('error', `❌ ${sessionId}: FAILED (${results.regressions.length} regression(s))`);
        
        // Notify about regression
        if (this.config.notifyOnRegression && this.callbacks.onRegression) {
          this.callbacks.onRegression({
            sessionId,
            session,
            results
          });
        }
      }
      
      this.lastResults.set(sessionId, {
        status: results.status,
        successRate: results.successRate,
        regressions: results.regressions.length,
        timestamp: Date.now()
      });
      
      return results;
    } catch (err) {
      this.log('error', `Failed to replay ${sessionId}: ${err.message}`);
      this.stats.failedRuns++;
      return null;
    } finally {
      this.currentReplay = null;
    }
  }

  // Add a session to watch list
  addSession(sessionId) {
    if (!this.config.sessions.includes(sessionId)) {
      this.config.sessions.push(sessionId);
      this.log('info', `Added session to guardian: ${sessionId}`);
    }
  }

  // Remove a session from watch list
  removeSession(sessionId) {
    const index = this.config.sessions.indexOf(sessionId);
    if (index > -1) {
      this.config.sessions.splice(index, 1);
      this.lastResults.delete(sessionId);
      this.log('info', `Removed session from guardian: ${sessionId}`);
    }
  }

  // Get all watched sessions with their last status
  getWatchedSessions() {
    return this.config.sessions.map(id => {
      const session = SessionRecorder.getSession(id);
      const lastResult = this.lastResults.get(id);
      
      return {
        id,
        url: session?.url,
        actionCount: session?.actionCount,
        lastResult: lastResult || null
      };
    });
  }

  getStats() {
    return {
      ...this.stats,
      passRate: this.getPassRate(),
      watchedSessions: this.config.sessions.length,
      running: this.running
    };
  }

  getPassRate() {
    if (this.stats.totalRuns === 0) return 100;
    return Math.round((this.stats.passedRuns / this.stats.totalRuns) * 100);
  }

  isRunning() {
    return this.running;
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

  // Trigger an immediate check
  async triggerCheck() {
    if (this.currentReplay) {
      this.log('warning', 'A replay is already in progress');
      return;
    }
    
    await this.runAllSessions();
  }

  // Update check interval
  setInterval(intervalMs) {
    this.config.interval = intervalMs;
    
    if (this.watchTimer) {
      clearInterval(this.watchTimer);
      this.watchTimer = setInterval(() => {
        if (this.running && !this.currentReplay) {
          this.runAllSessions();
        }
      }, this.config.interval);
    }
    
    this.log('info', `Guardian interval updated to ${intervalMs / 1000}s`);
  }
}

module.exports = { GuardianWorker };
