/**
 * UI5 DevFrame - OData Inspector Engine
 * Captures, parses, and connects OData V2/V4 requests to SAPUI5 Models, Bindings, Controls, and Lifecycle Stages.
 */

export class ODataInspector {
  constructor(hook) {
    this.hook = hook;
    this.requests = [];
  }

  recordRequest(req) {
    const parsedParams = this.parseQueryParams(req.url || "");
    const trace = this.traceRequestToUI5(req, parsedParams);
    const lifecycle = this.buildLifecycleStages(req, parsedParams, trace);

    const record = {
      id: req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      method: req.method || "GET",
      url: req.url || "",
      entitySet: parsedParams.entitySet || "UnknownSet",
      version:
        req.version ||
        (req.url.includes("odata4") || req.url.includes("v4") ? "OData V4" : "OData V2"),
      status: req.status || 200,
      duration: req.duration || 120,
      timestamp: req.timestamp || new Date().toISOString(),
      queryParams: parsedParams.params,
      trace: trace,
      lifecycle: lifecycle,
    };

    this.requests.unshift(record);
    if (this.requests.length > 200) {
      this.requests.pop();
    }
    return record;
  }

  getRequests() {
    return this.requests;
  }

  getRequestById(id) {
    return this.requests.find((r) => r.id === id);
  }

  parseQueryParams(fullUrl) {
    const result = {
      entitySet: "",
      params: {},
    };

    try {
      const urlObj = new URL(fullUrl, "http://localhost");
      const pathname = urlObj.pathname;
      const pathSegments = pathname.split("/").filter(Boolean);
      const lastSegment = pathSegments[pathSegments.length - 1] || "";

      // Clean entitySet name e.g. Products(123) -> Products
      result.entitySet = lastSegment.replace(/\(.*\)/, "");

      urlObj.searchParams.forEach((value, key) => {
        result.params[key] = value;
      });
    } catch {
      // Fallback regex parsing
      const queryIdx = fullUrl.indexOf("?");
      if (queryIdx !== -1) {
        const pathPart = fullUrl.substring(0, queryIdx);
        const segments = pathPart.split("/").filter(Boolean);
        result.entitySet = (segments[segments.length - 1] || "").replace(/\(.*\)/, "");

        const queryString = fullUrl.substring(queryIdx + 1);
        queryString.split("&").forEach((part) => {
          const [k, v] = part.split("=");
          if (k) {
            result.params[decodeURIComponent(k)] = decodeURIComponent(v || "");
          }
        });
      }
    }

    return result;
  }

  traceRequestToUI5(req, parsedParams) {
    // Connects Request -> ODataModel -> Binding -> Control -> View
    const targetEntity = parsedParams.entitySet;
    let boundControl = null;

    if (this.hook && typeof this.hook.getAllControls === "function") {
      const controlsMap = this.hook.getAllControls();
      const controls = Array.isArray(controlsMap) ? controlsMap : Object.values(controlsMap || {});

      boundControl = controls.find((c) => {
        if (!c || !c.mBindingInfos) return false;
        for (const propKey in c.mBindingInfos) {
          const bInfo = c.mBindingInfos[propKey];
          if (
            bInfo &&
            bInfo.path &&
            (bInfo.path.includes(targetEntity) || targetEntity.includes(bInfo.path))
          ) {
            return true;
          }
        }
        return false;
      });
    }

    const controlId =
      boundControl && typeof boundControl.getId === "function"
        ? boundControl.getId()
        : req.controlId || `application::ObjectPage--fe::table::${targetEntity}`;
    const controlType =
      boundControl && typeof boundControl.getMetadata === "function"
        ? boundControl.getMetadata().getName()
        : req.controlType || "sap.m.Table";

    let viewName = "MainView";
    if (controlId.includes("--")) {
      viewName = controlId.split("--")[0];
    }

    return {
      networkRequest: `${req.method || "GET"} ${req.url}`,
      odataModel: req.modelName || "ODataV4Model (/sap/opu/odata4)",
      bindingPath: req.bindingPath || `/${targetEntity}`,
      control: `${controlType} (${controlId})`,
      controlId: controlId,
      controlType: controlType,
      view: viewName,
      chain: [
        { stage: "Network Request", detail: `${req.method || "GET"} ${req.url}` },
        { stage: "OData Model", detail: req.modelName || "ODataV4Model" },
        { stage: "Binding", detail: req.bindingPath || `/${targetEntity}` },
        { stage: "Control", detail: `${controlType}#${controlId}` },
        { stage: "View", detail: viewName },
      ],
    };
  }

  buildLifecycleStages(req, parsedParams, trace) {
    // Stages: UI interaction -> Binding -> Context -> ODataModel -> Request -> Backend -> Response -> Binding update -> Control rendering
    return [
      {
        id: "ui_interaction",
        title: "1. UI Interaction",
        description: `User triggered event on control '${trace.controlId}' (e.g. Navigation / Filter / Refresh)`,
        status: "completed",
        data: { controlId: trace.controlId, controlType: trace.controlType },
      },
      {
        id: "binding",
        title: "2. Binding",
        description: `Binding path resolved: '${trace.bindingPath}'`,
        status: "completed",
        data: { bindingPath: trace.bindingPath },
      },
      {
        id: "context",
        title: "3. Context",
        description: `OData Binding Context created for entity '${parsedParams.entitySet}'`,
        status: "completed",
        data: { entitySet: parsedParams.entitySet },
      },
      {
        id: "odatamodel",
        title: "4. ODataModel",
        description: `Model constructed $select=${parsedParams.params["$select"] || "all"}, $expand=${parsedParams.params["$expand"] || "none"}`,
        status: "completed",
        data: { model: trace.odataModel, queryParams: parsedParams.params },
      },
      {
        id: "request",
        title: "5. Request Sent",
        description: `${req.method || "GET"} ${req.url}`,
        status: "completed",
        data: { method: req.method || "GET", url: req.url },
      },
      {
        id: "backend",
        title: "6. Backend Processing",
        description: `SAP Gateway / S/4HANA processed request in ${req.duration || 120} ms`,
        status: "completed",
        data: { duration: `${req.duration || 120} ms` },
      },
      {
        id: "response",
        title: "7. Response Received",
        description: `HTTP Status ${req.status || 200} OK`,
        status: "completed",
        data: { status: req.status || 200 },
      },
      {
        id: "binding_update",
        title: "8. Binding Update",
        description: "OData Model updated internal JSON cache and notified binding listeners",
        status: "completed",
        data: { updatedEntities: parsedParams.entitySet },
      },
      {
        id: "control_rendering",
        title: "9. Control Rendering",
        description: `Control '${trace.controlId}' re-rendered with fresh OData response data`,
        status: "completed",
        data: { reRenderedControl: trace.controlId },
      },
    ];
  }
}
