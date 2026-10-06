// content.js - Injected into the web page main world to bridge messaging between UI5 DevFrame and DevTools
import { UI5Hook } from '../backend/ui5-hook.js';
import { ModelInspector } from '../backend/model-inspector.js';
import { AIDebugger } from '../ai/ai-debugger.js';

const hook = new UI5Hook(typeof window !== 'undefined' ? window : globalThis);
const inspector = new ModelInspector(hook);
const aiDebugger = new AIDebugger(inspector);

// Expose DevFrame hook on window for inspectedWindow.eval or postMessage access
if (typeof window !== 'undefined') {
  window.__DEVFRAME_HOOK__ = hook;
  window.__DEVFRAME_INSPECTOR__ = inspector;
  window.__DEVFRAME_AI__ = aiDebugger;

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.source !== 'devframe-devtools') {
      return;
    }

    const { action, controlId } = event.data;

    if (action === 'GET_TREE') {
      const tree = hook.getControlTree();
      const version = hook.getUI5Version();
      window.postMessage({ source: 'devframe-content', action: 'TREE_DATA', tree, version }, '*');
    } else if (action === 'GET_DETAILS' && controlId) {
      const details = inspector.inspectControlDetails(controlId);
      const diagnostics = aiDebugger.analyzeControl(details);
      window.postMessage({ source: 'devframe-content', action: 'DETAILS_DATA', details, diagnostics }, '*');
    }
  });
}
