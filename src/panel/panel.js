import { UI5Hook } from "../backend/ui5-hook.js";
import { ModelInspector } from "../backend/model-inspector.js";
import { AIDebugger } from "../ai/ai-debugger.js";
import { ODataInspector } from "../backend/odata-inspector.js";
import { BindingInspector } from "../backend/binding-inspector.js";
import { RoutingInspector } from "../backend/routing-inspector.js";
import { FioriInspector } from "../backend/fiori-inspector.js";
import { PerformanceProfiler } from "../backend/performance-profiler.js";
import { A11yI18nInspector } from "../backend/a11y-i18n-inspector.js";
import { TestGenerator } from "../testing/test-generator.js";
import { HealthCockpit } from "../backend/health-cockpit.js";

class PanelUI {
  constructor() {
    this.localHook = new UI5Hook(window);
    this.localInspector = new ModelInspector(this.localHook);
    this.localAiDebugger = new AIDebugger(this.localInspector);
    this.localODataInspector = new ODataInspector(this.localHook);
    this.localBindingInspector = new BindingInspector(this.localHook);
    this.localRoutingInspector = new RoutingInspector(this.localHook);
    this.localFioriInspector = new FioriInspector(this.localHook);
    this.localPerfProfiler = new PerformanceProfiler(this.localHook);
    this.localA11yInspector = new A11yI18nInspector(this.localHook);
    this.localTestGenerator = new TestGenerator(this.localHook);
    this.localHealthCockpit = new HealthCockpit(this.localHook);

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
        document.getElementById(targetTab)?.classList.add("active");
      });
    });
  }

  bindEvents() {
    document.getElementById("btn-refresh")?.addEventListener("click", () => this.refresh());
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
            const versionEl = document.getElementById("ui5-version");
            if (versionEl) versionEl.textContent = result.version || "Not Loaded";
            this.renderTree(result.tree || []);
            this.renderODataRequests(result.odataRequests || []);
            this.renderStaticTabs();
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
    if (versionEl) versionEl.textContent = this.localHook.getUI5Version();

    const treeData = this.localHook.getControlTree();
    this.renderTree(treeData);

    const odataRequests = this.localODataInspector.getRequests();
    this.renderODataRequests(odataRequests);

    this.renderStaticTabs();

    if (this.selectedControlId) {
      this.inspectControl(this.selectedControlId);
    }
  }

  renderStaticTabs() {
    this.renderRoutingTab(this.localRoutingInspector.inspectRouting());
    this.renderFioriTab(this.localFioriInspector.inspectFioriElements());
    this.renderPerfTab(this.localPerfProfiler.getPerformanceMetrics());
    this.renderA11yTab(
      this.localA11yInspector.inspectAccessibility(),
      this.localA11yInspector.inspectI18n(),
      this.localA11yInspector.inspectTheme(),
      this.localA11yInspector.getAggregatedMessages(),
    );
    this.renderTestingTab(
      this.localTestGenerator.generateSelectors("application-product-save"),
      this.localTestGenerator.generateAutomatedTestSpec(),
    );
    this.renderHealthTab(this.localHealthCockpit.getOverallHealthScore());
  }

  renderTree(treeNodes) {
    const container = document.getElementById("tree-container");
    if (!container) return;
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
          if (window.__DEVFRAME_INSPECTOR__ && window.__DEVFRAME_AI__ && window.__DEVFRAME_BINDINGS__) {
            var details = window.__DEVFRAME_INSPECTOR__.inspectControlDetails(${JSON.stringify(controlId)});
            var analysis = window.__DEVFRAME_AI__.analyzeControl(details);
            var bindings = window.__DEVFRAME_BINDINGS__.inspectBindings(${JSON.stringify(controlId)});
            return { details: details, analysis: analysis, bindings: bindings };
          }
          return null;
        })()
      `;
      chrome.devtools.inspectedWindow.eval(expr, (res, err) => {
        if (!err && res && res.details) {
          this.renderInspectorTab(res.details);
          this.renderModelsTab(res.details);
          this.renderAITab(res.analysis);
          this.renderBindingsTab(res.bindings);
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
    const bindings = this.localBindingInspector.inspectBindings(controlId);

    this.renderInspectorTab(details);
    this.renderModelsTab(details);
    this.renderAITab(aiAnalysis);
    this.renderBindingsTab(bindings);
  }

  renderInspectorTab(details) {
    const container = document.getElementById("inspector-details");
    if (!container) return;
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

  renderBindingsTab(bindingsData) {
    const container = document.getElementById("bindings-container");
    if (!container) return;
    if (!bindingsData) {
      container.innerHTML =
        '<div class="empty-state">Select a control in the tree to inspect detailed bindings</div>';
      return;
    }

    const { propertyBindings, aggregationBindings, controlId } = bindingsData;

    let propsHtml = "";
    if (propertyBindings && propertyBindings.length > 0) {
      propsHtml = propertyBindings
        .map(
          (b) => `
        <div class="binding-card">
          <div class="binding-header">
            <span class="binding-prop-name">Property: ${b.property}</span>
            <button class="btn-why-empty" data-control-id="${controlId}" data-prop="${b.property}">❓ Why is this value empty?</button>
          </div>
          <div class="prop-row"><span class="prop-key">Model</span><span class="prop-val">${b.model}</span></div>
          <div class="prop-row"><span class="prop-key">Path</span><span class="prop-val">${b.path}</span></div>
          <div class="prop-row"><span class="prop-key">Value</span><span class="prop-val">"${b.value}"</span></div>
          <div class="prop-row"><span class="prop-key">Type</span><span class="prop-val">${b.type}</span></div>
          <div class="prop-row"><span class="prop-key">Binding</span><span class="prop-val">${b.binding}</span></div>
          <div class="prop-row"><span class="prop-key">Mode</span><span class="prop-val">${b.mode}</span></div>
          <div id="chain-result-${b.property}"></div>
        </div>
      `,
        )
        .join("");
    } else {
      propsHtml = '<div class="empty-state">No property bindings configured on this control.</div>';
    }

    let aggsHtml = "";
    if (aggregationBindings && aggregationBindings.length > 0) {
      aggsHtml = aggregationBindings
        .map(
          (a) => `
        <div class="binding-card">
          <div class="binding-header">
            <span class="binding-prop-name">Aggregation: ${a.aggregation}</span>
          </div>
          <div class="prop-row"><span class="prop-key">Path</span><span class="prop-val">${a.path}</span></div>
          <div class="prop-row"><span class="prop-key">Template</span><span class="prop-val">${a.template}</span></div>
          <div class="prop-row"><span class="prop-key">Template Shareable</span><span class="prop-val">${a.templateShareable}</span></div>
        </div>
      `,
        )
        .join("");
    } else {
      aggsHtml = '<div class="empty-state">No aggregation bindings on this control.</div>';
    }

    container.innerHTML = `
      <div class="details-section">
        <h4>Property Bindings</h4>
        ${propsHtml}
      </div>

      <div class="details-section">
        <h4>Aggregation Bindings</h4>
        ${aggsHtml}
      </div>
    `;

    // Bind "Why is this value empty?" buttons
    container.querySelectorAll(".btn-why-empty").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const cId = e.target.getAttribute("data-control-id");
        const prop = e.target.getAttribute("data-prop");
        this.runWhyEmptyDiagnosis(cId, prop);
      });
    });
  }

  runWhyEmptyDiagnosis(controlId, propertyName) {
    if (this.isDevToolsEnv()) {
      const expr = `
        (function() {
          if (window.__DEVFRAME_BINDINGS__) {
            return window.__DEVFRAME_BINDINGS__.diagnoseWhyValueIsEmpty(${JSON.stringify(controlId)}, ${JSON.stringify(propertyName)});
          }
          return null;
        })()
      `;
      chrome.devtools.inspectedWindow.eval(expr, (res, err) => {
        if (!err && res) {
          this.renderChainDiagnosisResult(propertyName, res);
        } else {
          const resLocal = this.localBindingInspector.diagnoseWhyValueIsEmpty(
            controlId,
            propertyName,
          );
          this.renderChainDiagnosisResult(propertyName, resLocal);
        }
      });
    } else {
      const res = this.localBindingInspector.diagnoseWhyValueIsEmpty(controlId, propertyName);
      this.renderChainDiagnosisResult(propertyName, res);
    }
  }

  renderChainDiagnosisResult(propertyName, result) {
    const targetEl = document.getElementById(`chain-result-${propertyName}`);
    if (!targetEl || !result || !result.chain) return;

    targetEl.innerHTML = `
      <div class="chain-walker">
        <strong>Binding Chain Diagnostic Walk:</strong>
        ${result.chain
          .map(
            (step) => `
          <div class="chain-node ${step.status}">
            <span>${step.icon}</span>
            <span><strong>${step.step}:</strong> ${step.message}</span>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  }

  renderRoutingTab(routing) {
    const container = document.getElementById("routing-container");
    if (!container || !routing) return;

    container.innerHTML = `
      <div class="details-section">
        <h4>Router Active Status</h4>
        <div class="prop-row"><span class="prop-key">Current Route</span><span class="prop-val">${routing.currentRoute}</span></div>
        <div class="prop-row"><span class="prop-key">Hash</span><span class="prop-val">${routing.hash}</span></div>
        <div class="prop-row"><span class="prop-key">Matched Arguments</span><span class="prop-val">${JSON.stringify(routing.matchedArgs)}</span></div>
      </div>

      <div class="details-section">
        <h4>Registered Routes</h4>
        ${routing.routes
          .map(
            (r) => `
          <div class="prop-row"><span class="prop-key">${r.name} (${r.pattern})</span><span class="prop-val">${r.view} → ${r.controller}</span></div>
        `,
          )
          .join("")}
      </div>

      <div class="details-section">
        <h4>Routing Diagnostics</h4>
        ${routing.diagnostics
          .map(
            (d) => `
          <div class="card-diagnostic ${d.level}">
            <div>${d.message}</div>
            <div class="diag-fix">💡 Fix: ${d.suggestion}</div>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  }

  renderFioriTab(fiori) {
    const container = document.getElementById("fiori-container");
    if (!container || !fiori) return;

    container.innerHTML = `
      <div class="details-section">
        <h4>Fiori Elements Floorplan</h4>
        <div class="prop-row"><span class="prop-key">Page Type</span><span class="prop-val">${fiori.pageType}</span></div>
        <div class="prop-row"><span class="prop-key">Target Entity</span><span class="prop-val">${fiori.entity}</span></div>
      </div>

      <div class="details-section">
        <h4>Sections & Facets</h4>
        ${fiori.sections
          .map(
            (s) => `
          <div class="prop-row"><span class="prop-key">${s.name}</span><span class="prop-val">ID: ${s.id}</span></div>
        `,
          )
          .join("")}
      </div>

      <div class="details-section">
        <h4>OData Annotations</h4>
        ${fiori.annotations
          .map(
            (a) => `
          <div class="prop-row"><span class="prop-key">${a.term} (${a.type})</span><span class="prop-val">Target: ${a.target}</span></div>
        `,
          )
          .join("")}
      </div>
    `;
  }

  renderPerfTab(perf) {
    const container = document.getElementById("perf-container");
    if (!container || !perf) return;

    container.innerHTML = `
      <div class="details-section">
        <h4>Startup Timings</h4>
        <div class="prop-row"><span class="prop-key">Bootstrap</span><span class="prop-val">${perf.startup.bootstrap} ms</span></div>
        <div class="prop-row"><span class="prop-key">Component</span><span class="prop-val">${perf.startup.component} ms</span></div>
        <div class="prop-row"><span class="prop-key">Libraries</span><span class="prop-val">${perf.startup.libraries} ms</span></div>
        <div class="prop-row"><span class="prop-key">Initial Rendering</span><span class="prop-val">${perf.startup.initialRendering} ms</span></div>
        <div class="prop-row"><span class="prop-key">Total Time</span><span class="prop-val">${perf.startup.total} ms</span></div>
      </div>

      <div class="details-section">
        <h4>Rendering & Controls Lifecycle</h4>
        <div class="prop-row"><span class="prop-key">Controls Created</span><span class="prop-val">${perf.rendering.controlsCreated}</span></div>
        <div class="prop-row"><span class="prop-key">Controls Destroyed</span><span class="prop-val">${perf.rendering.controlsDestroyed}</span></div>
        <div class="prop-row"><span class="prop-key">Render Cycles</span><span class="prop-val">${perf.rendering.renderCycles}</span></div>
        <div class="prop-row"><span class="prop-key">Longest Render</span><span class="prop-val">${perf.rendering.longestRender.control} (${perf.rendering.longestRender.duration} ms)</span></div>
      </div>

      <div class="details-section">
        <h4>Memory & Listener Diagnostics</h4>
        ${perf.memoryDiagnostics
          .map(
            (m) => `
          <div class="card-diagnostic ${m.level}">
            <div>[${m.category}] ${m.message}</div>
            <div class="diag-fix">💡 Fix: ${m.suggestion}</div>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  }

  renderA11yTab(a11y, i18n, theme, messages) {
    const container = document.getElementById("a11y-container");
    if (!container) return;
    container.innerHTML = `
      <div class="details-section">
        <h4>Accessibility (ARIA) Audit</h4>
        <div class="prop-row"><span class="prop-key">Accessible Name</span><span class="prop-val">${a11y.accessibleName}</span></div>
        <div class="prop-row"><span class="prop-key">Role</span><span class="prop-val">${a11y.role}</span></div>
        <div class="prop-row"><span class="prop-key">Contrast Ratio</span><span class="prop-val">${a11y.contrastRatio}</span></div>
        ${a11y.diagnostics.map((d) => `<div class="card-diagnostic ${d.level}">[${d.category}] ${d.message}</div>`).join("")}
      </div>

      <div class="details-section">
        <h4>i18n Bundle Inspector</h4>
        <div class="prop-row"><span class="prop-key">Text</span><span class="prop-val">"${i18n.selectedText}"</span></div>
        <div class="prop-row"><span class="prop-key">Key</span><span class="prop-val">${i18n.key}</span></div>
        <div class="prop-row"><span class="prop-key">Hardcoded Suggestion</span><span class="prop-val">${i18n.hardcodedCheck.suggestion}</span></div>
      </div>

      <div class="details-section">
        <h4>UI5 Theme & Design Tokens</h4>
        <div class="prop-row"><span class="prop-key">Theme</span><span class="prop-val">${theme.theme}</span></div>
        <div class="prop-row"><span class="prop-key">Background Token</span><span class="prop-val">${theme.designTokens.Background}</span></div>
      </div>

      <div class="details-section">
        <h4>Aggregated Messages & Logs</h4>
        ${messages
          .map(
            (m) => `
          <div class="prop-row"><span class="prop-key">[${m.type}] ${m.source}</span><span class="prop-val">${m.message}</span></div>
        `,
          )
          .join("")}
      </div>
    `;
  }

  renderTestingTab(testGen, spec) {
    const container = document.getElementById("testing-container");
    if (!container) return;
    container.innerHTML = `
      <div class="details-section">
        <h4>Selector Quality Score: ${testGen.qualityStars} (${testGen.qualityScore}/5)</h4>
        ${testGen.checks.map((c) => `<div>${c}</div>`).join("")}
      </div>

      <div class="details-section">
        <h4>Generated Selectors</h4>
        <div class="prop-row"><span class="prop-key">wdi5</span><span class="prop-val">${testGen.selectors.wdi5}</span></div>
        <div class="prop-row"><span class="prop-key">OPA5</span><span class="prop-val">${testGen.selectors.opa5}</span></div>
        <div class="prop-row"><span class="prop-key">Playwright</span><span class="prop-val">${testGen.selectors.playwright}</span></div>
        <div class="prop-row"><span class="prop-key">ARIA</span><span class="prop-val">${testGen.selectors.aria}</span></div>
      </div>

      <div class="details-section">
        <h4>Generated Test Spec Code</h4>
        <pre class="code-block">${spec}</pre>
      </div>
    `;
  }

  renderHealthTab(health) {
    const container = document.getElementById("health-container");
    if (!container) return;
    container.innerHTML = `
      <div class="health-score-card">
        <div>
          <div class="health-number">${health.overall} / 100</div>
          <div class="health-label">UI5 Application Health Score</div>
        </div>
      </div>

      <div class="details-section">
        <h4>Subsystem Scores</h4>
        ${Object.entries(health.scores)
          .map(
            ([k, v]) => `
          <div class="prop-row"><span class="prop-key">${k.toUpperCase()}</span><span class="prop-val">${v} / 100</span></div>
        `,
          )
          .join("")}
      </div>

      <div class="details-section">
        <h4>Unified "Why?" Diagnostic Questions</h4>
        <div style="display:flex; gap:8px; margin-bottom:12px;">
          <button class="btn-refresh" id="btn-why-table">Why is my table empty?</button>
          <button class="btn-refresh" id="btn-why-fragment">Why isn't my fragment showing?</button>
          <button class="btn-why-empty" id="btn-why-route">Why doesn't my route work?</button>
        </div>
        <div id="health-why-result"></div>
      </div>
    `;

    document
      .getElementById("btn-why-table")
      ?.addEventListener("click", () => this.runWhyQuestion("why_table_empty"));
    document
      .getElementById("btn-why-fragment")
      ?.addEventListener("click", () => this.runWhyQuestion("why_fragment_not_showing"));
    document
      .getElementById("btn-why-route")
      ?.addEventListener("click", () => this.runWhyQuestion("why_route_not_working"));
  }

  runWhyQuestion(questionType) {
    const res = this.localHealthCockpit.diagnoseWhyQuestion(questionType);
    const targetEl = document.getElementById("health-why-result");
    if (!targetEl || !res) return;

    targetEl.innerHTML = `
      <div class="chain-walker">
        <strong>${res.question}</strong>
        <div style="margin: 6px 0; color: var(--warning-color);">Reason: ${res.reason}</div>
        ${res.chain
          .map(
            (c) => `
          <div class="chain-node ${c.status}">
            <span>${c.icon}</span>
            <span><strong>${c.step}:</strong> ${c.detail}</span>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  }

  renderModelsTab(details) {
    const container = document.getElementById("models-container");
    if (!container) return;
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

    if (badge) badge.textContent = analysis.diagnostics.length;
    if (!container) return;

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
    if (!container) return;
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
    if (!container) return;
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
