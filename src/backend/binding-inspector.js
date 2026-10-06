/**
 * UI5 DevFrame - Binding Inspector Engine
 * Flagship module for inspecting UI5 Property Bindings, Aggregation Bindings, and walking "Why is this value empty?" binding chains.
 */

export class BindingInspector {
  constructor(hook) {
    this.hook = hook;
  }

  inspectBindings(controlId) {
    const control = typeof controlId === "string" ? this.hook.getControlById(controlId) : controlId;
    if (!control) {
      return null;
    }

    const propertyBindings = this.extractPropertyBindings(control);
    const aggregationBindings = this.extractAggregationBindings(control);

    return {
      controlId: typeof control.getId === "function" ? control.getId() : "unknown",
      controlType:
        typeof control.getMetadata === "function" ? control.getMetadata().getName() : "Unknown",
      propertyBindings,
      aggregationBindings,
    };
  }

  extractPropertyBindings(control) {
    const bindings = [];
    if (!control || !control.mBindingInfos) return bindings;

    const aggregations =
      control.getMetadata && typeof control.getMetadata === "function"
        ? control.getMetadata().getAllAggregations()
        : {};

    for (const propName in control.mBindingInfos) {
      if (aggregations && aggregations[propName]) {
        // Skip aggregation bindings
        continue;
      }

      const info = control.mBindingInfos[propName];
      if (!info) continue;

      const bindingObj =
        typeof control.getBinding === "function" ? control.getBinding(propName) : null;
      const modelName = info.model || "default";
      const path = info.path || (info.parts ? info.parts.map((p) => p.path).join(", ") : "");

      let value = undefined;
      const getterName = "get" + propName.charAt(0).toUpperCase() + propName.slice(1);
      if (typeof control[getterName] === "function") {
        try {
          value = control[getterName]();
        } catch {
          value = "<error reading property>";
        }
      }

      let edmType = "Edm.String";
      if (typeof value === "number") edmType = "Edm.Decimal";
      else if (typeof value === "boolean") edmType = "Edm.Boolean";
      else if (value instanceof Date) edmType = "Edm.DateTimeOffset";

      let bindingType = "PropertyBinding";
      let bindingMode = info.mode || "TwoWay";

      if (bindingObj) {
        if (bindingObj.getMetadata) {
          bindingType = bindingObj.getMetadata().getName();
        }
        if (typeof bindingObj.getBindingMode === "function") {
          bindingMode = bindingObj.getBindingMode();
        }
      }

      bindings.push({
        property: propName,
        model: modelName,
        path: path,
        value: value === undefined ? "" : value,
        type: edmType,
        binding: bindingType,
        mode: bindingMode,
      });
    }

    return bindings;
  }

  extractAggregationBindings(control) {
    const aggregations = [];
    if (!control || typeof control.getMetadata !== "function") return aggregations;

    const metadata = control.getMetadata();
    const allAggs = metadata.getAllAggregations();

    for (const aggName in allAggs) {
      const bindingInfo = control.mBindingInfos ? control.mBindingInfos[aggName] : null;
      if (bindingInfo) {
        const path = bindingInfo.path || "";
        const template = bindingInfo.template;
        const templateType =
          template && typeof template.getMetadata === "function"
            ? template.getMetadata().getName()
            : "sap.m.ColumnListItem";
        const templateShareable =
          bindingInfo.templateShareable !== undefined ? bindingInfo.templateShareable : true;

        aggregations.push({
          aggregation: aggName,
          path: path,
          template: templateType,
          templateShareable: templateShareable,
        });
      }
    }

    return aggregations;
  }

  diagnoseWhyValueIsEmpty(controlId, propertyName = "text") {
    const control = typeof controlId === "string" ? this.hook.getControlById(controlId) : controlId;
    const chain = [];

    if (!control) {
      chain.push({
        step: `${propertyName}`,
        status: "fail",
        message: "Control not found in SAPUI5 registry",
        icon: "❌",
      });
      return { controlId, propertyName, isResolved: false, chain };
    }

    const cId = typeof control.getId === "function" ? control.getId() : "control";
    const cType =
      typeof control.getMetadata === "function" ? control.getMetadata().getName() : "Control";

    // Step 1: Control & Property
    chain.push({
      step: `${cType}.${propertyName}`,
      status: "pass",
      message: `Inspecting control '${cId}' property '${propertyName}'`,
      icon: "✓",
    });

    // Step 2: Binding exists?
    const bindingInfo = control.mBindingInfos ? control.mBindingInfos[propertyName] : null;
    if (!bindingInfo) {
      chain.push({
        step: "Binding exists?",
        status: "fail",
        message: `No binding info configured for property '${propertyName}'`,
        icon: "❌",
      });
      return {
        controlId: cId,
        propertyName,
        isResolved: false,
        reason: "No binding info configured",
        chain,
      };
    }

    chain.push({
      step: "Binding exists?",
      status: "pass",
      message: `Binding info found (model: '${bindingInfo.model || "default"}')`,
      icon: "✓",
    });

    // Step 3: Binding path exists?
    const path =
      bindingInfo.path ||
      (bindingInfo.parts ? bindingInfo.parts.map((p) => p.path).join(", ") : "");
    if (!path) {
      chain.push({
        step: "Binding path exists?",
        status: "fail",
        message: "Binding path is empty",
        icon: "❌",
      });
      return {
        controlId: cId,
        propertyName,
        isResolved: false,
        reason: "Binding path is empty",
        chain,
      };
    }

    chain.push({
      step: "Binding path exists?",
      status: "pass",
      message: `Path resolved: '${path}'`,
      icon: "✓",
    });

    // Step 4: Context exists?
    const bindingContext =
      typeof control.getBindingContext === "function"
        ? control.getBindingContext(bindingInfo.model)
        : null;
    if (!bindingContext) {
      chain.push({
        step: "Context exists?",
        status: "fail",
        message: "No binding context active on this control",
        icon: "❌",
      });

      // Step 5: Parent binding context
      let parent = typeof control.getParent === "function" ? control.getParent() : null;
      let parentContextFound = false;
      while (parent) {
        if (
          typeof parent.getBindingContext === "function" &&
          parent.getBindingContext(bindingInfo.model)
        ) {
          parentContextFound = true;
          break;
        }
        parent = typeof parent.getParent === "function" ? parent.getParent() : null;
      }

      if (!parentContextFound) {
        chain.push({
          step: "Parent binding context",
          status: "fail",
          message: "No parent element provides a binding context",
          icon: "❌",
        });
        chain.push({
          step: "Result",
          status: "error",
          message: "❌ No binding context. Set binding context on parent view or table item.",
          icon: "🚨",
        });
        return {
          controlId: cId,
          propertyName,
          isResolved: false,
          reason: "No binding context on control or parent",
          chain,
        };
      }
    } else {
      chain.push({
        step: "Context exists?",
        status: "pass",
        message: `Active context path: '${bindingContext.getPath()}'`,
        icon: "✓",
      });

      // Step 6: Value in model data?
      let contextData = null;
      if (typeof bindingContext.getObject === "function") {
        try {
          contextData = bindingContext.getObject();
        } catch {
          contextData = null;
        }
      }

      if (!contextData) {
        chain.push({
          step: "Model data loaded?",
          status: "fail",
          message: "Binding context object is empty or data has not returned from backend",
          icon: "❌",
        });
        chain.push({
          step: "Result",
          status: "error",
          message: "❌ Context data not loaded from OData/JSON model.",
          icon: "🚨",
        });
        return {
          controlId: cId,
          propertyName,
          isResolved: false,
          reason: "Model data not loaded",
          chain,
        };
      }

      chain.push({
        step: "Model data loaded?",
        status: "pass",
        message: `Context data present`,
        icon: "✓",
      });
    }

    return { controlId: cId, propertyName, isResolved: true, chain };
  }
}
