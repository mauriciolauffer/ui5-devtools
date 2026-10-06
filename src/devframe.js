import { defineDevframe, defineRpcFunction } from "devframe";
import { UI5Hook } from "./backend/ui5-hook.js";
import { ModelInspector } from "./backend/model-inspector.js";
import { AIDebugger } from "./ai/ai-debugger.js";
import { ODataInspector } from "./backend/odata-inspector.js";
import { BindingInspector } from "./backend/binding-inspector.js";

export const ui5Devframe = defineDevframe({
  id: "ui5-devtools",
  name: "DevFrame SAPUI5 DevTools",
  version: "1.0.0",
  packageName: "ui5-devtools",
  description:
    "DevFrame DevTools for SAPUI5 - Advanced developer cockpit with AI diagnostics, OData inspector, and Binding inspector",
  icon: "ph:gauge-duotone",
  clientAssets: "./dist",
  setup(ctx) {
    const scope = ctx.scope("ui5-devtools");

    const hook = new UI5Hook(globalThis);
    const modelInspector = new ModelInspector(hook);
    const aiDebugger = new AIDebugger(modelInspector);
    const odataInspector = new ODataInspector(hook);
    const bindingInspector = new BindingInspector(hook);

    scope.rpc.register(
      defineRpcFunction({
        name: "getControlTree",
        type: "query",
        jsonSerializable: true,
        handler: () => ({
          version: hook.getUI5Version(),
          tree: hook.getControlTree(),
        }),
      }),
    );

    scope.rpc.register(
      defineRpcFunction({
        name: "getControlDetails",
        type: "query",
        jsonSerializable: true,
        handler: (controlId) => {
          const details = modelInspector.inspectControlDetails(controlId);
          const diagnostics = aiDebugger.analyzeControl(details);
          const bindings = bindingInspector.inspectBindings(controlId);
          return { details, diagnostics, bindings };
        },
      }),
    );

    scope.rpc.register(
      defineRpcFunction({
        name: "whyValueEmpty",
        type: "action",
        jsonSerializable: true,
        handler: ({ controlId, propertyName }) => {
          return bindingInspector.diagnoseWhyValueIsEmpty(controlId, propertyName || "text");
        },
      }),
    );

    scope.rpc.register(
      defineRpcFunction({
        name: "getODataRequests",
        type: "query",
        jsonSerializable: true,
        handler: () => {
          return odataInspector.getRequests();
        },
      }),
    );
  },
});

export default ui5Devframe;
