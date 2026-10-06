// content.js - Injected into the web page main world to bridge messaging between UI5 DevFrame and DevTools
import { UI5Hook } from "../backend/ui5-hook.js";
import { ModelInspector } from "../backend/model-inspector.js";
import { AIDebugger } from "../ai/ai-debugger.js";
import { ODataInspector } from "../backend/odata-inspector.js";

const hook = new UI5Hook(typeof window !== "undefined" ? window : globalThis);
const inspector = new ModelInspector(hook);
const aiDebugger = new AIDebugger(inspector);
const odataInspector = new ODataInspector(hook);

// Hook network/OData requests
hook.attachODataInterceptor((req) => {
  odataInspector.recordRequest(req);
});

// Seed sample initial requests for UI demo/testing if none exist yet
odataInspector.recordRequest({
  method: "GET",
  url: "/sap/opu/odata4/sap/zui_products_v4/srvd/sap/zui_products/0001/Products?$select=ID,Name,Price&$filter=Status%20eq%20%27A%27&$expand=Category",
  status: 200,
  duration: 143,
  controlId: "application::ObjectPage--fe::table::STTA_C_MP_Product::Table",
});

odataInspector.recordRequest({
  method: "PATCH",
  url: "/sap/opu/odata4/sap/zui_products_v4/srvd/sap/zui_products/0001/Products('1024')",
  status: 200,
  duration: 88,
  controlId: "application::ObjectPage--fe::table::STTA_C_MP_Product::Save",
});

// Expose DevFrame instances on window for inspectedWindow.eval or postMessage access
if (typeof window !== "undefined") {
  window.__DEVFRAME_HOOK__ = hook;
  window.__DEVFRAME_INSPECTOR__ = inspector;
  window.__DEVFRAME_AI__ = aiDebugger;
  window.__DEVFRAME_ODATA__ = odataInspector;

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.source !== "devframe-devtools") {
      return;
    }

    const { action, controlId, requestId } = event.data;

    if (action === "GET_TREE") {
      const tree = hook.getControlTree();
      const version = hook.getUI5Version();
      window.postMessage({ source: "devframe-content", action: "TREE_DATA", tree, version }, "*");
    } else if (action === "GET_DETAILS" && controlId) {
      const details = inspector.inspectControlDetails(controlId);
      const diagnostics = aiDebugger.analyzeControl(details);
      window.postMessage(
        { source: "devframe-content", action: "DETAILS_DATA", details, diagnostics },
        "*",
      );
    } else if (action === "GET_ODATA_REQUESTS") {
      const requests = odataInspector.getRequests();
      window.postMessage(
        { source: "devframe-content", action: "ODATA_REQUESTS_DATA", requests },
        "*",
      );
    } else if (action === "GET_ODATA_REQUEST_DETAILS" && requestId) {
      const request = odataInspector.getRequestById(requestId);
      window.postMessage(
        { source: "devframe-content", action: "ODATA_REQUEST_DETAILS_DATA", request },
        "*",
      );
    }
  });
}
