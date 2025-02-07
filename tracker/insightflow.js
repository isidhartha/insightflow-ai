/**
 * InsightFlow AI - Client-side analytics tracker
 * Drop-in JavaScript tracker for event capture
 */
(function (window) {
  "use strict";

  var InsightFlow = {
    _apiKey: null,
    _host: null,
    _distinctId: null,
    _sessionId: null,
    _sessionStart: null,
    _sessionTimeout: 30 * 60 * 1000,
    _lastActivity: null,
    _queue: [],
    _initialized: false,

    init: function (apiKey, options) {
      options = options || {};
      this._apiKey = apiKey;
      this._host = options.host || window.location.origin;
      this._distinctId = this._getOrCreateDistinctId();
      this._sessionId = this._getOrCreateSession();
      this._initialized = true;

      if (options.autoCapture !== false) {
        this._setupAutoCapture();
      }

      this._capture("$pageview", this._getPageProperties());
      this._flushQueue();
    },

    capture: function (event, properties) {
      properties = properties || {};
      var payload = this._buildPayload(event, properties);
      if (!this._initialized) {
        this._queue.push(payload);
        return;
      }
      this._send(payload);
    },

    identify: function (distinctId, properties) {
      this._distinctId = distinctId;
      this._setDistinctId(distinctId);
      this.capture("$identify", { $set: properties || {} });
    },

    reset: function () {
      this._distinctId = this._generateUUID();
      this._setDistinctId(this._distinctId);
      this._sessionId = this._generateUUID();
    },

    _capture: function (event, properties) {
      this.capture(event, properties);
    },

    _buildPayload: function (event, properties) {
      var baseProps = this._getBaseProperties();
      var merged = Object.assign({}, baseProps, properties);
      return {
        event: event,
        distinct_id: this._distinctId,
        properties: merged,
        timestamp: new Date().toISOString(),
      };
    },

    _getBaseProperties: function () {
      return {
        $current_url: window.location.href,
        $pathname: window.location.pathname,
        $host: window.location.hostname,
        $referrer: document.referrer || "",
        $browser: this._getBrowser(),
        $os: this._getOS(),
        $screen_width: window.screen.width,
        $screen_height: window.screen.height,
        $viewport_width: window.innerWidth,
        $viewport_height: window.innerHeight,
        $session_id: this._sessionId,
        $lib: "insightflow-js",
        $lib_version: "1.0.0",
      };
    },

    _getPageProperties: function () {
      return {
        $title: document.title,
        $url: window.location.href,
        $pathname: window.location.pathname,
      };
    },

    _send: function (payload) {
      var url = this._host + "/api/v1/capture";
      var data = JSON.stringify(payload);

      if (navigator.sendBeacon) {
        var blob = new Blob([data], { type: "application/json" });
        navigator.sendBeacon(url, blob);
      } else {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        if (this._apiKey) {
          xhr.setRequestHeader("X-API-Key", this._apiKey);
        }
        xhr.send(data);
      }
    },

    _flushQueue: function () {
      while (this._queue.length > 0) {
        this._send(this._queue.shift());
      }
    },

    _setupAutoCapture: function () {
      var self = this;

      document.addEventListener("click", function (e) {
        var target = e.target;
        var props = {
          $element_tag: target.tagName,
          $element_text: target.innerText ? target.innerText.slice(0, 100) : "",
          $element_id: target.id || "",
          $element_class: target.className || "",
          $click_x: e.clientX,
          $click_y: e.clientY,
          $click_x_pct: Math.round((e.clientX / window.innerWidth) * 100),
          $click_y_pct: Math.round((e.clientY / window.innerHeight) * 100),
        };

        if (target.tagName === "A" && target.href) {
          props.$href = target.href;
        }

        self._capture("$click", props);
        self._updateActivity();
      });

      window.addEventListener("popstate", function () {
        self._capture("$pageview", self._getPageProperties());
      });

      var originalPushState = history.pushState;
      history.pushState = function () {
        originalPushState.apply(this, arguments);
        self._capture("$pageview", self._getPageProperties());
      };

      window.addEventListener("beforeunload", function () {
        var duration = Date.now() - self._sessionStart;
        self._capture("$pageleave", {
          $duration: Math.round(duration / 1000),
        });
      });

      document.querySelectorAll("form").forEach(function (form) {
        form.addEventListener("submit", function (e) {
          self._capture("$form_submit", {
            $form_id: form.id || "",
            $form_action: form.action || "",
          });
        });
      });

      this._updateActivity();
    },

    _updateActivity: function () {
      this._lastActivity = Date.now();
      this._checkSession();
    },

    _checkSession: function () {
      if (
        this._lastActivity &&
        Date.now() - this._lastActivity > this._sessionTimeout
      ) {
        this._sessionId = this._generateUUID();
        this._sessionStart = Date.now();
        this._setSession(this._sessionId);
      }
    },

    _getOrCreateDistinctId: function () {
      var stored = this._getCookie("if_distinct_id");
      if (stored) return stored;
      var id = this._generateUUID();
      this._setDistinctId(id);
      return id;
    },

    _setDistinctId: function (id) {
      this._setCookie("if_distinct_id", id, 365);
    },

    _getOrCreateSession: function () {
      var stored = sessionStorage.getItem("if_session_id");
      if (stored) {
        this._sessionStart = parseInt(
          sessionStorage.getItem("if_session_start") || Date.now()
        );
        return stored;
      }
      var id = this._generateUUID();
      this._sessionStart = Date.now();
      this._setSession(id);
      return id;
    },

    _setSession: function (id) {
      sessionStorage.setItem("if_session_id", id);
      sessionStorage.setItem("if_session_start", this._sessionStart.toString());
    },

    _generateUUID: function () {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          var r = (Math.random() * 16) | 0;
          var v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }
      );
    },

    _getCookie: function (name) {
      var match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
      return match ? decodeURIComponent(match[2]) : null;
    },

    _setCookie: function (name, value, days) {
      var expires = new Date();
      expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
      document.cookie =
        name +
        "=" +
        encodeURIComponent(value) +
        ";expires=" +
        expires.toUTCString() +
        ";path=/;SameSite=Lax";
    },

    _getBrowser: function () {
      var ua = navigator.userAgent;
      if (ua.includes("Chrome")) return "Chrome";
      if (ua.includes("Firefox")) return "Firefox";
      if (ua.includes("Safari")) return "Safari";
      if (ua.includes("Edge")) return "Edge";
      return "Other";
    },

    _getOS: function () {
      var ua = navigator.userAgent;
      if (ua.includes("Windows")) return "Windows";
      if (ua.includes("Mac")) return "macOS";
      if (ua.includes("Linux")) return "Linux";
      if (ua.includes("Android")) return "Android";
      if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
      return "Other";
    },
  };

  window.InsightFlow = InsightFlow;
})(window);
