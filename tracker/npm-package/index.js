/**
 * InsightFlow AI — analytics tracker
 * Self-hosted product analytics with AI-powered insights
 */

'use strict';

class InsightFlowNode {
  constructor(options = {}) {
    this.apiKey = options.apiKey || null;
    this.host = options.host || 'http://localhost:8000';
    this.batchSize = options.batchSize || 10;
    this.flushInterval = options.flushInterval || 5000;
    this._queue = [];
    this._timer = null;
    if (options.autoFlush !== false) this._startTimer();
  }

  init(apiKey, host) {
    this.apiKey = apiKey;
    if (host) this.host = host;
    return this;
  }

  capture(event, properties = {}) {
    if (!this.apiKey) throw new Error('InsightFlow: call init(apiKey) first');
    this._queue.push({
      event,
      properties,
      timestamp: new Date().toISOString(),
      api_key: this.apiKey,
    });
    if (this._queue.length >= this.batchSize) this.flush();
    return this;
  }

  async flush() {
    if (!this._queue.length) return;
    const events = this._queue.splice(0, this._queue.length);
    try {
      const res = await fetch(`${this.host}/api/v1/capture/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });
      if (!res.ok) throw new Error(`InsightFlow: flush failed with ${res.status}`);
    } catch (err) {
      this._queue.unshift(...events);
      throw err;
    }
    return this;
  }

  identify(userId, traits = {}) {
    return this.capture('$identify', { distinct_id: userId, ...traits });
  }

  page(name, properties = {}) {
    return this.capture('$pageview', { page: name, ...properties });
  }

  _startTimer() {
    this._timer = setInterval(() => this.flush().catch(() => {}), this.flushInterval);
    if (typeof this._timer.unref === 'function') this._timer.unref();
  }

  destroy() {
    if (this._timer) clearInterval(this._timer);
    return this.flush();
  }
}

module.exports = InsightFlowNode;
module.exports.default = InsightFlowNode;
