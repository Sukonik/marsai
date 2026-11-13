/* Main-thread wrapper for the optional in-browser AI brain (see brain-worker.js). */
(function () {
  'use strict';
  var worker = null, state = 'off', device = '', nextId = 1, pending = {}, listeners = [];
  function emit(extra) { listeners.forEach(function (f) { f(state, extra); }); }
  function start(cpuOnly) {
    if (worker) return;
    state = 'loading'; emit({ pct: 0 });
    try { worker = new Worker('assets/brain-worker.js', { type: 'module' }); }
    catch (e) { state = 'error'; emit({ message: 'This browser cannot run the AI brain (module workers unavailable).' }); return; }
    worker.onmessage = function (e) {
      var m = e.data;
      if (m.type === 'progress') emit({ pct: m.pct, file: m.file });
      else if (m.type === 'ready') { state = 'ready'; device = m.device; emit({ device: m.device }); }
      else if (m.type === 'error' && !m.id) {
        worker.terminate(); worker = null;
        if (m.retryCpu) { start(true); return; }         // GPU path failed: restart cleanly on CPU
        state = 'error'; emit({ message: m.message });
      }
      else if (m.id && pending[m.id]) {
        var p = pending[m.id];
        if (m.type === 'token') p.onToken && p.onToken(m.text);
        else if (m.type === 'done') { delete pending[m.id]; p.resolve(m.text); }
        else if (m.type === 'error') { delete pending[m.id]; p.reject(new Error(m.message)); }
      }
    };
    worker.onerror = function () { state = 'error'; if (worker) worker.terminate(); worker = null; emit({ message: 'The AI brain failed to start.' }); };
    worker.postMessage({ type: 'load', preferGpu: !cpuOnly });
  }
  window.MarsBrain = {
    enable: function () { start(false); },
    disable: function () { if (worker) worker.terminate(); worker = null; state = 'off'; pending = {}; emit(); },
    state: function () { return state; },
    device: function () { return device; },
    onChange: function (f) { listeners.push(f); },
    chat: function (messages, onToken) {
      if (state !== 'ready') return Promise.reject(new Error('brain not ready'));
      return new Promise(function (resolve, reject) {
        var id = nextId++; pending[id] = { resolve: resolve, reject: reject, onToken: onToken };
        worker.postMessage({ type: 'chat', id: id, messages: messages });
      });
    }
  };
})();
