# ui5-devtools

> **DevFrame DevTools for SAPUI5** — Advanced developer cockpit and Chrome extension for SAPUI5 & SAP Fiori Elements application debugging, model inspection, OData analysis, AI diagnostics, and test generation.

---

## 🚀 Overview

`ui5-devtools` is a developer cockpit for **SAPUI5** and **SAP Fiori Elements** applications built on top of the **DevFrame** framework. It provides rich runtime inspection, automated issue diagnosis, OData V2/V4 request tracing, binding hierarchy walks, accessibility audits, performance profiling, and test selector generation in both Chrome DevTools and standalone CLI environments.

---

## ✨ Features

### 🔍 1. UI5 Runtime Control Inspector & Hierarchy

- **Control Tree Extraction**: Deeply extracts and displays the SAPUI5 control hierarchy tree from `sap.ui.core.ElementRegistry` or `sap.ui.getCore()`.
- **Control Details**: Inspects active properties, control metadata, view controller associations, parent relationships, and attached event handlers (e.g. `press` listeners).

### 🔗 2. Binding Inspector & "Why is this value empty?" Chain Walker

- **Property & Aggregation Bindings**: Inspects model names, binding paths, binding types, binding modes (`TwoWay`, `OneWay`), and aggregation templates.
- **Binding Diagnostic Chain Walker**: Step-by-step diagnostic engine that walks the binding resolution chain to pinpoint why a property value is empty (verifying control, binding existence, path validity, active binding context, parent context, and model data availability).

### 🌐 3. OData Request Inspector & Lifecycle Tracing

- **OData V2 & V4 Tracing**: Captures and parses OData query parameters (`$select`, `$filter`, `$expand`, etc.).
- **End-to-End Connection Trace**: Maps network requests directly to SAPUI5 models, binding paths, UI controls, and views (`Network Request → ODataModel → Binding → Control → View`).
- **9-Stage Request Lifecycle**: Visualizes request lifecycle stages from initial UI interaction to Gateway response processing and control re-rendering.

### 🤖 4. AI Diagnostics Assistant Engine

- **Automated Control Analysis**: Evaluates control health score (0–100) and identifies runtime issues.
- **Smart Fix Suggestions**: Detects broken or empty binding paths, missing event handlers, invisible or disabled actionable controls, uninitialized draft contexts, and unmapped view controllers.

### 🧭 5. Routing Inspector

- **Route & Hash Tracking**: Inspects SAPUI5 Router status, active route parameters, matched URL hash, registered routes, and target view/controller mappings.
- **Routing Diagnostics**: Flags routing issues such as unresolved view targets or parameter mismatches.

### 📊 6. Fiori Elements & Annotation Inspector

- **Floorplan Detection**: Identifies Fiori Elements floorplans (List Report, Object Page, Analytical List Page, Overview Page), page sections, and facets.
- **OData Annotations Inspection**: Audits UI annotations (e.g., `@UI.LineItem`, `@UI.FieldGroup`, `@UI.Facets`) and diagnoses why annotations fail to render or match binding contexts.

### ⚡ 7. Performance & Memory Profiler

- **Startup Timings**: Measures bootstrap, component initialization, UI library loading, and initial rendering performance.
- **Render Metrics & Lifecycle**: Tracks control creation, destruction, render cycles, and expensive bindings.
- **Memory Leak Detection**: Identifies retained controls and un-subscribed event listeners on the UI5 `EventBus`.

### ♿ 8. Accessibility (ARIA), i18n & Theme Inspector

- **ARIA & WCAG Audit**: Audits accessible names, roles, focusability, and contrast ratios (flagging WCAG AA threshold warnings).
- **i18n & Hardcoded Text Detection**: Checks resource bundles (`i18n.properties`), language support, and detects hardcoded strings with migration suggestions.
- **Theme & Design Tokens**: Inspects active UI5 themes (`sap_horizon`) and CSS design tokens.
- **Aggregated Log Console**: Aggregates runtime network errors, model warnings, and duplicate ID notices.

### 🧪 9. Test Selector & Spec Generator

- **Multi-Framework Selectors**: Generates selectors for **wdi5**, **OPA5**, **Playwright**, and **ARIA** with a 5-star quality score based on stability and UI5-native properties.
- **Interaction Timeline Recorder**: Records UI interactions into structured action timelines.
- **Automated Spec Generation**: Outputs ready-to-run automated test specifications.

### 🩺 10. Application Health Score Cockpit & Unified "Why?" Engine

- **Subsystem Health Scores**: Calculates 0–100 overall app health score across 8 subsystems (Performance, Accessibility, Bindings, OData, Lifecycle, Fiori, i18n, Testing).
- **Unified Diagnostic Engine**: Answers high-level developer questions with diagnostic decision trees:
  - _"Why is my table empty?"_
  - _"Why isn't my fragment showing?"_
  - _"Why doesn't my route work?"_

---

## 🛠️ DevFrame RPC API

The package defines a standard `DevFrame` instance (`ui5Devframe`) registered with the following RPC functions:

| RPC Function            | Type   | Description                                                                                            |
| :---------------------- | :----- | :----------------------------------------------------------------------------------------------------- |
| `getControlTree`        | Query  | Returns SAPUI5 runtime version and full control hierarchy tree                                         |
| `getControlDetails`     | Query  | Returns control properties, bindings, event handlers, and AI diagnostics for a given control ID        |
| `whyValueEmpty`         | Action | Runs the diagnostic chain walker for a control property (default `text`)                               |
| `getODataRequests`      | Query  | Returns recorded OData V2/V4 network requests with query params and lifecycle traces                   |
| `getRoutingInfo`        | Query  | Returns router state, active route, hash, and route diagnostics                                        |
| `getFioriInfo`          | Query  | Returns Fiori Elements floorplan info, annotations, and section structure                              |
| `getPerformanceMetrics` | Query  | Returns startup timings, render cycles, and memory leak warnings                                       |
| `getA11yAndI18nInfo`    | Query  | Returns ARIA accessibility metrics, i18n properties, theme tokens, and logs                            |
| `getTestSelectors`      | Query  | Generates wdi5/OPA5/Playwright selectors and automated test specs                                      |
| `getHealthCockpit`      | Query  | Returns overall health score breakdown across all subsystems                                           |
| `diagnoseWhyQuestion`   | Action | Runs unified diagnostic trees (`why_table_empty`, `why_fragment_not_showing`, `why_route_not_working`) |

---

## 🖥️ Extension & Project Architecture

```
ui5-devtools/
├── bin/
│   └── devframe-ui5.js       # CLI entry point (DevFrame CAC CLI adapter)
├── dist/
│   └── content.js            # Bundled content script injected into web pages
├── src/
│   ├── ai/
│   │   └── ai-debugger.js    # AI Diagnostics Assistant Engine
│   ├── backend/
│   │   ├── a11y-i18n-inspector.js   # Accessibility, i18n, Theme & Log Inspector
│   │   ├── binding-inspector.js     # Property & Aggregation Binding Inspector
│   │   ├── fiori-inspector.js       # Fiori Elements & Annotation Inspector
│   │   ├── health-cockpit.js        # Health Cockpit & Unified "Why?" Engine
│   │   ├── model-inspector.js       # Control & Model Inspector
│   │   ├── odata-inspector.js       # OData Request & Lifecycle Inspector
│   │   ├── performance-profiler.js  # Startup & Memory Profiler
│   │   ├── routing-inspector.js     # Router & Hash Inspector
│   │   └── ui5-hook.js              # SAPUI5 Runtime Hook Engine
│   ├── bridge/
│   │   ├── background.js     # Chrome Extension MV3 Background Service Worker
│   │   └── content.js        # Bridge Content Script injected into main page world
│   ├── devtools/
│   │   ├── devtools.html     # DevTools entry HTML
│   │   └── devtools.js       # DevTools panel creation script
│   ├── panel/
│   │   ├── panel.html        # DevTools Panel UI layout & tabs
│   │   ├── panel.js          # DevTools Panel UI event handlers & renderers
│   │   └── panel.css         # DevTools Panel styling
│   ├── testing/
│   │   └── test-generator.js # Selector generator & test spec builder
│   ├── devframe.js           # Core DevFrame definition & RPC registrations
│   └── index.js              # Main library entry point
├── manifest.json             # Chrome Extension Manifest V3
└── package.json              # Project configuration & npm scripts
```

---

## 💻 CLI Usage

The package provides a CLI binary adapter `devframe-ui5`:

```bash
# Run CLI via devframe-ui5
npx devframe-ui5 --help
```

---

## 🔧 Development Scripts

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)

### Commands

```bash
# Install dependencies
pnpm install

# Bundle content scripts into dist/content.js
pnpm build

# Run unit tests (Vitest)
pnpm test

# Run linter (oxlint)
pnpm lint

# Format code (oxfmt)
pnpm fmt
```

---

## 📄 License

[MIT](LICENSE)
