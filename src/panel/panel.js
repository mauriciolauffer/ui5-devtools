import { UI5Hook } from "../backend/ui5-hook.js";
import { ModelInspector } from "../backend/model-inspector.js";
import { AIDebugger } from "../ai/ai-debugger.js";
import { ODataInspector } from "../backend/odata-inspector.js";

class PanelUI {
  constructor() {
    this.localHook = new UI5Hook(window);
    this.localInspector = new ModelInspector(this.localHook);
    this.localAiDebugger = new AIDebugger(this.localInspector);
    this.localODataInspector = new ODataInspector(this.localHook);

    this.selectedControlId = null;
    this.selectedRequestId = null;

    // Seed mock initial requests for standalone/test inspection
    this.localODataInspector.recordRequest({
      method: "GET",
      url: "/sap/opu/odata4/sap/zui_products_v4/srvd/sap/zui_products/0001/Products?$select=ID,Name,Price&$filter=Status%20eq%20%27A%27&$expand=Category",
      status: 200,
      duration: 143,
      controlId: "application::ObjectPage--fe::table::STTA_C_MP_Product::Table",
    });

    this.initTabs();
    this.bindEvents();
    this.refresh();
  }

  isDevToolsEnv() {
    return typeof chrome !== "undefined" && chrome.devtools && chrome.devtools.inspectedWindow;
  }

  initTabs() {
    const tabBtns = document.querySelectorAll(".tab-btn");
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabBtns.forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));

        btn.classList.add("active");
        const targetTab = btn.getAttribute("data-tab");
        document.getElementById(targetTab).classList.add("active");
      });
    });
  }

  bindEvents() {
    document.getElementById("btn-refresh").addEventListener("click", () => this.refresh());
  }

  refresh() {
    if (this.isDevToolsEnv()) {
      chrome.devtools.inspectedWindow.eval(
        `({
          version: (window.__DEVFRAME_HOOK__ ? window.__DEVFRAME_HOOK__.getUI5Version() : (window.sap && window.sap.ui && window.sap.ui.version) || 'Not Loaded'),
          tree: (window.__DEVFRAME_HOOK__ ? window.__DEVFRAME_HOOK__.getControlTree() : []),
          odataRequests: (window.__DEVFRAME_ODATA__ ? window.__DEVFRAME_ODATA__.getRequests() : [])
        })`,
        (result, isException) => {
          if (!isException && result) {
            document.getElementById("ui5-version").textContent = result.version || "Not Loaded";
            this.renderTree(result.tree || []);
            this.renderODataRequests(result.odataRequests || []);
            if (this.selectedControlId) {
              this.inspectControl(this.selectedControlId);
            }
          } else {
            this.renderLocalFallback();
          }
        },
      );
    } else {
      this.renderLocalFallback();
    }
  }

  renderLocalFallback() {
    const versionEl = document.getElementById("ui5-version");
    versionEl.textContent = this.localHook.getUI5Version();

    const treeData = this.localHook.getControlTree();
    this.renderTree(treeData);

    const odataRequests = this.localODataInspector.getRequests();
    this.renderODataRequests(odataRequests);

    if (this.selectedControlId) {
      this.inspectControl(this.selectedControlId);
    }
  }

  renderTree(treeNodes) {
    const container = document.getElementById("tree-container");
    container.innerHTML = "";

    if (!treeNodes || treeNodes.length === 0) {
      container.innerHTML = '<div class="empty-state">No UI5 controls found on this page.</div>';
      return;
    }

    const ul = document.createElement("div");
    treeNodes.forEach((node) => {
      ul.appendChild(this.createTreeNodeEl(node));
    });
    container.appendChild(ul);
  }

  createTreeNodeEl(node) {
    const div = document.createElement("div");
    div.className = "tree-node";
    if (this.selectedControlId === node.id) {
      div.classList.add("selected");
    }

    const textLabel = node.text ? ` "${node.text}"` : "";
    div.innerHTML = `
      <span class="node-type">${node.type.split(".").pop()}</span>
      <span class="node-text">${textLabel}</span>
      <div class="node-id">${node.id}</div>
    `;

    div.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".tree-node").forEach((n) => n.classList.remove("selected"));
      div.classList.add("selected");
      this.selectedControlId = node.id;
      this.inspectControl(node.id);
    });

    if (node.children && node.children.length > 0) {
      const childrenContainer = document.createElement("div");
      childrenContainer.style.marginLeft = "12px";
      node.children.forEach((child) => {
        childrenContainer.appendChild(this.createTreeNodeEl(child));
      });
      div.appendChild(childrenContainer);
    }

    return div;
  }

  inspectControl(controlId) {
    if (this.isDevToolsEnv()) {
      const expr = `
        (function() {
          if (window.__DEVFRAME_INSPECTOR__ && window.__DEVFRAME_AI__) {
            var details = window.__DEVFRAME_INSPECTOR__.inspectControlDetails(${JSON.stringify(controlId)});
            var analysis = window.__DEVFRAME_AI__.analyzeControl(details);
            return { details: details, analysis: analysis };
          }
          return null;
        })()
      `;
      chrome.devtools.inspectedWindow.eval(expr, (res, err) => {
        if (!err && res && res.details) {
          this.renderInspectorTab(res.details);
          this.renderModelsTab(res.details);
          this.renderAITab(res.analysis);
        } else {
          this.inspectLocalControl(controlId);
        }
      });
    } else {
      this.inspectLocalControl(controlId);
    }
  }

  inspectLocalControl(controlId) {
    const details = this.localInspector.inspectControlDetails(controlId);
    const aiAnalysis = this.localAiDebugger.analyzeControl(details);

    this.renderInspectorTab(details);
    this.renderModelsTab(details);
    this.renderAITab(aiAnalysis);
  }

  renderInspectorTab(details) {
    const container = document.getElementById("inspector-details");
    if (!details) {
      container.innerHTML = '<div class="empty-state">Control details not available</div>';
      return;
    }

    let handlersHtml = "";
    if (details.eventHandlers && Object.keys(details.eventHandlers).length > 0) {
      for (const eventName in details.eventHandlers) {
        details.eventHandlers[eventName].forEach((h) => {
          handlersHtml += `<div class="prop-row"><span class="prop-key">${eventName}</span><span class="prop-val">${h.handlerString}</span></div>`;
        });
      }
    } else {
      handlersHtml =
        '<div class="prop-row"><span class="prop-key">Listeners</span><span class="prop-val">None</span></div>';
    }

    container.innerHTML = `
      <div class="details-section">
        <h4>Overview</h4>
        <div class="prop-row"><span class="prop-key">ID</span><span class="prop-val">${details.id}</span></div>
        <div class="prop-row"><span class="prop-key">Type</span><span class="prop-val">${details.type}</span></div>
        <div class="prop-row"><span class="prop-key">Parent</span><span class="prop-val">${details.parent ? details.parent.id : "None"}</span></div>
        <div class="prop-row"><span class="prop-key">Controller</span><span class="prop-val">${details.controller ? details.controller.name : "None"}</span></div>
      </div>

      <div class="details-section">
        <h4>Fiori Context</h4>
        <div class="prop-row"><span class="prop-key">Floorplan</span><span class="prop-val">${details.fioriContext.floorplan}</span></div>
        <div class="prop-row"><span class="prop-key">Action Context</span><span class="prop-val">${details.fioriContext.actionContext}</span></div>
      </div>

      <div class="details-section">
        <h4>Event Handlers</h4>
        ${handlersHtml}
      </div>

      <div class="details-section">
        <h4>Properties</h4>
        ${Object.entries(details.properties)
          .map(
            ([k, v]) => `
          <div class="prop-row"><span class="prop-key">${k}</span><span class="prop-val">${v}</span></div>
        `,
          )
          .join("")}
      </div>
    `;
  }

  renderModelsTab(details) {
    const container = document.getElementById("models-container");
    if (!details) {
      container.innerHTML = '<div class="empty-state">No control selected</div>';
      return;
    }

    let bindingsHtml = "";
    if (details.bindings && Object.keys(details.bindings).length > 0) {
      for (const propName in details.bindings) {
        const b = details.bindings[propName];
        bindingsHtml += `
          <div class="prop-row"><span class="prop-key">${propName}</span><span class="prop-val">${b.model} : ${b.path} (${b.modelType})</span></div>
        `;
      }
    } else {
      bindingsHtml =
        '<div class="prop-row"><span class="prop-key">Bindings</span><span class="prop-val">No direct property bindings</span></div>';
    }

    let contextHtml = "None";
    if (details.bindingContext) {
      contextHtml = `${details.bindingContext.odataVersion} Path: ${details.bindingContext.path}`;
    }

    container.innerHTML = `
      <div class="details-section">
        <h4>Active Binding Context</h4>
        <div class="prop-row"><span class="prop-key">Context Path</span><span class="prop-val">${contextHtml}</span></div>
      </div>

      <div class="details-section">
        <h4>Property Bindings</h4>
        ${bindingsHtml}
      </div>
    `;
  }

  renderAITab(analysis) {
    const container = document.getElementById("ai-container");
    const badge = document.getElementById("ai-badge");

    badge.textContent = analysis.diagnostics.length;

    if (!analysis.diagnostics || analysis.diagnostics.length === 0) {
      container.innerHTML =
        '<div class="empty-state">✨ No UI5 runtime issues detected for this control!</div>';
      return;
    }

    container.innerHTML = `
      <div class="details-section">
        <h4>Control Health Score: ${analysis.score}/100</h4>
        ${analysis.diagnostics
          .map(
            (d) => `
          <div class="card-diagnostic ${d.level}">
            <div class="diag-header">
              <span>[${d.category}] ${d.level.toUpperCase()}</span>
            </div>
            <div>${d.message}</div>
            <div class="diag-fix">💡 Fix Suggestion: ${d.suggestion}</div>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  }

  renderODataRequests(requests) {
    const container = document.getElementById("odata-requests-container");
    container.innerHTML = "";

    if (!requests || requests.length === 0) {
      container.innerHTML = '<div class="empty-state">No OData requests recorded yet</div>';
      return;
    }

    requests.forEach((req) => {
      const el = document.createElement("div");
      el.className = "odata-item";
      if (this.selectedRequestId === req.id) el.classList.add("selected");

      el.innerHTML = `
        <div>
          <span class="odata-method ${req.method}">${req.method}</span>
          <strong>${req.entitySet}</strong> (${req.version})
        </div>
        <div class="odata-url">${req.url}</div>
      `;

      el.addEventListener("click", () => {
        document.querySelectorAll(".odata-item").forEach((i) => i.classList.remove("selected"));
        el.classList.add("selected");
        this.selectedRequestId = req.id;
        this.renderODataRequestDetails(req);
      });

      container.appendChild(el);
    });

    if (!this.selectedRequestId && requests[0]) {
      this.selectedRequestId = requests[0].id;
      this.renderODataRequestDetails(requests[0]);
    }
  }

  renderODataRequestDetails(req) {
    const container = document.getElementById("odata-details-container");
    if (!req) {
      container.innerHTML = '<div class="empty-state">Select an OData request to inspect</div>';
      return;
    }

    const queryParamsHtml =
      Object.keys(req.queryParams || {}).length > 0
        ? Object.entries(req.queryParams)
            .map(
              ([k, v]) => `
          <div class="prop-row"><span class="prop-key">${k}</span><span class="prop-val">${v}</span></div>
        `,
            )
            .join("")
        : '<div class="prop-row"><span class="prop-key">Query Params</span><span class="prop-val">None</span></div>';

    const trace = req.trace || {};
    const lifecycle = req.lifecycle || [];

    container.innerHTML = `
      <div class="details-section">
        <h4>Request Summary</h4>
        <div class="prop-row"><span class="prop-key">Method</span><span class="prop-val">${req.method}</span></div>
        <div class="prop-row"><span class="prop-key">URL</span><span class="prop-val">${req.url}</span></div>
        <div class="prop-row"><span class="prop-key">Status</span><span class="prop-val">${req.status} OK</span></div>
        <div class="prop-row"><span class="prop-key">Duration</span><span class="prop-val">${req.duration} ms</span></div>
      </div>

      <div class="details-section">
        <h4>OData System Query Options ($select, $filter, $expand)</h4>
        ${queryParamsHtml}
      </div>

      <div class="details-section">
        <h4>UI5 Control Connection Trace (Network Request → Control → View)</h4>
        <div class="trace-flow">
          <div class="trace-step">Network Request</div>
          <span class="trace-arrow">↓</span>
          <div class="trace-step">${trace.odataModel || "ODataModel"}</div>
          <span class="trace-arrow">↓</span>
          <div class="trace-step">${trace.bindingPath || "/EntitySet"}</div>
          <span class="trace-arrow">↓</span>
          <div class="trace-step">${trace.control || "Control"}</div>
          <span class="trace-arrow">↓</span>
          <div class="trace-step">${trace.view || "View"}</div>
        </div>
      </div>

      <div class="details-section">
        <h4>OData V4 Request Lifecycle Stages</h4>
        <div class="lifecycle-container">
          ${lifecycle
            .map(
              (stage) => `
            <div class="lifecycle-node">
              <div class="lifecycle-title">${stage.title}</div>
              <div class="lifecycle-desc">${stage.description}</div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.panelUI = new PanelUI();
});
