/**
 * UI5 DevFrame - Model, Binding, Controller & Fiori Context Extractor
 * Extracts detailed model bindings (OData V2/V4, JSON, i18n), event handlers, and Fiori Elements floorplan info.
 */

export class ModelInspector {
  constructor(hook) {
    this.hook = hook;
  }

  inspectControlDetails(controlId) {
    const control = typeof controlId === "string" ? this.hook.getControlById(controlId) : controlId;
    if (!control) {
      return null;
    }

    const id = typeof control.getId === "function" ? control.getId() : "unknown";
    const type =
      typeof control.getMetadata === "function" ? control.getMetadata().getName() : "Unknown";
    const parent =
      typeof control.getParent === "function" && control.getParent()
        ? { id: control.getParent().getId(), type: control.getParent().getMetadata().getName() }
        : null;

    // Properties
    const properties = this.extractProperties(control);

    // Bindings & Contexts
    const bindings = this.extractBindings(control);
    const bindingContext = this.extractBindingContext(control);

    // Event Handlers
    const eventHandlers = this.extractEventHandlers(control);

    // Controller & View
    const controllerInfo = this.extractControllerInfo(control);

    // Fiori Elements Context
    const fioriContext = this.extractFioriContext(control, controllerInfo);

    return {
      id,
      type,
      parent,
      properties,
      bindings,
      bindingContext,
      eventHandlers,
      controller: controllerInfo,
      fioriContext,
    };
  }

  extractProperties(control) {
    const props = {};
    if (typeof control.getMetadata !== "function") return props;

    const metadata = control.getMetadata();
    const allProps = metadata.getAllProperties();

    for (const propName in allProps) {
      const getterName =
        allProps[propName]._sGetter || "get" + propName.charAt(0).toUpperCase() + propName.slice(1);
      if (typeof control[getterName] === "function") {
        try {
          const val = control[getterName]();
          // Filter out complex object instances if necessary
          if (val === null || val === undefined || typeof val !== "object" || Array.isArray(val)) {
            props[propName] = val;
          } else {
            props[propName] = val.toString();
          }
        } catch {
          props[propName] = "<error reading property>";
        }
      }
    }
    return props;
  }

  extractBindings(control) {
    const bindings = {};
    if (!control.mBindingInfos) return bindings;

    for (const propName in control.mBindingInfos) {
      const info = control.mBindingInfos[propName];
      if (info) {
        const parts = info.parts || [];
        const modelName = info.model || (parts[0] ? parts[0].model : undefined) || "default";
        const path = info.path || parts.map((p) => p.path).join(", ") || "";

        let modelType = "UnknownModel";

        if (typeof control.getModel === "function") {
          const model = control.getModel(modelName === "default" ? undefined : modelName);
          if (model) {
            modelType = model.getMetadata ? model.getMetadata().getName() : model.constructor.name;
          }
        }

        bindings[propName] = {
          model: modelName,
          path: path,
          modelType: modelType,
          isODataV4:
            modelType.includes("ODataModel") &&
            (modelType.includes("v4") || modelType.includes("V4")),
          isODataV2:
            modelType.includes("ODataModel") &&
            !modelType.includes("v4") &&
            !modelType.includes("V4"),
        };
      }
    }
    return bindings;
  }

  extractBindingContext(control) {
    if (typeof control.getBindingContext !== "function") return null;

    const context = control.getBindingContext();
    if (!context) return null;

    const path = typeof context.getPath === "function" ? context.getPath() : "";
    const model = typeof context.getModel === "function" ? context.getModel() : null;
    const modelType = model && model.getMetadata ? model.getMetadata().getName() : "Unknown";

    let odataVersion = "JSON/Other";
    if (modelType.includes("v4") || modelType.includes("V4")) {
      odataVersion = "OData V4";
    } else if (modelType.includes("OData")) {
      odataVersion = "OData V2";
    }

    let contextObject = null;
    if (typeof context.getObject === "function") {
      try {
        contextObject = context.getObject();
      } catch {
        contextObject = null;
      }
    }

    return {
      path,
      modelType,
      odataVersion,
      data: contextObject,
    };
  }

  extractEventHandlers(control) {
    const handlers = {};
    if (!control.mEventRegistry) return handlers;

    for (const eventName in control.mEventRegistry) {
      const listeners = control.mEventRegistry[eventName];
      if (Array.isArray(listeners) && listeners.length > 0) {
        handlers[eventName] = listeners.map((listener) => {
          let fnName = "anonymousFunction";
          if (listener.fFunction && listener.fFunction.name) {
            fnName = listener.fFunction.name;
          }

          let listenerObj = "";
          if (listener.oListener) {
            if (typeof listener.oListener.getMetadata === "function") {
              listenerObj = listener.oListener.getMetadata().getName();
            } else if (listener.oListener.constructor) {
              listenerObj = listener.oListener.constructor.name;
            }
          }

          return {
            functionName: fnName,
            listener: listenerObj,
            handlerString: `${eventName} → ${fnName}()`,
          };
        });
      }
    }

    return handlers;
  }

  extractControllerInfo(control) {
    let current = control;
    while (current && typeof current.getParent === "function") {
      if (typeof current.getController === "function") {
        const controller = current.getController();
        if (controller) {
          const name =
            typeof controller.getMetadata === "function"
              ? controller.getMetadata().getName()
              : "Controller";
          return {
            name,
            viewId: typeof current.getId === "function" ? current.getId() : null,
          };
        }
      }
      current = current.getParent();
    }
    return null;
  }

  extractFioriContext(control, _controllerInfo) {
    const id = typeof control.getId === "function" ? control.getId() : "";
    const text = typeof control.getText === "function" ? control.getText() : "";

    let floorplan = "Custom UI5 App";
    let actionContext = "";

    if (id.includes("ListReport") || id.includes("::LR::")) {
      floorplan = "Fiori Elements List Report";
    } else if (
      id.includes("ObjectPage") ||
      id.includes("::OP::") ||
      id.includes("STTA_C_MP_Product")
    ) {
      floorplan = "Fiori Elements Object Page";
    } else if (id.includes("AnalyticalListPage")) {
      floorplan = "Fiori Elements Analytical List Page";
    } else if (id.includes("OverviewPage")) {
      floorplan = "Fiori Elements Overview Page";
    }

    if (id.includes("Save") || text === "Save" || id.includes("edit")) {
      actionContext = "Edit flow → Save";
    } else if (id.includes("fe::table") || id.includes("Table")) {
      actionContext = "Table Action";
    } else if (id.includes("fe::header") || id.includes("Header")) {
      actionContext = "Header Action";
    } else {
      actionContext = text ? `Action (${text})` : "Standard Control";
    }

    return {
      isFioriElements: floorplan.startsWith("Fiori Elements"),
      floorplan,
      actionContext,
      summary: `${floorplan}: ${actionContext}`,
    };
  }
}
