import { defineDevframe, defineRpcFunction } from "devframe";
import { UI5Hook } from "./backend/ui5-hook.js";
import { ModelInspector } from "./backend/model-inspector.js";
import { AIDebugger } from "./ai/ai-debugger.js";
import { ODataInspector } from "./backend/odata-inspector.js";
import { BindingInspector } from "./backend/binding-inspector.js";
import { RoutingInspector } from "./backend/routing-inspector.js";
import { FioriInspector } from "./backend/fiori-inspector.js";
import { PerformanceProfiler } from "./backend/performance-profiler.js";
import { A11yI18nInspector } from "./backend/a11y-i18n-inspector.js";
import { TestGenerator } from "./testing/test-generator.js";
import { HealthCockpit } from "./backend/health-cockpit.js";

export const ui5Devframe = defineDevframe({
  id: "ui5-devtools",
  name: "DevFrame SAPUI5 DevTools",
  version: "1.0.0",
  packageName: "ui5-devtools",
  description:
    "DevFrame DevTools for SAPUI5 - Complete application debugging, analysis, and development cockpit",
  icon: "ph:gauge-duotone",
  clientAssets: "./dist",
  setup(ctx) {
    const scope = ctx.scope("ui5-devtools");

    const hook = new UI5Hook(globalThis);
    const modelInspector = new ModelInspector(hook);
    const aiDebugger = new AIDebugger(modelInspector);
    const odataInspector = new ODataInspector(hook);
    const bindingInspector = new BindingInspector(hook);
    const routingInspector = new RoutingInspector(hook);
    const fioriInspector = new FioriInspector(hook);
    const performanceProfiler = new PerformanceProfiler(hook);
    const a11yI18nInspector = new A11yI18nInspector(hook);
    const testGenerator = new TestGenerator(hook);
    const healthCockpit = new HealthCockpit(hook);

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
        handler: () => odataInspector.getRequests(),
      }),
    );

    scope.rpc.register(
      defineRpcFunction({
        name: "getRoutingInfo",
        type: "query",
        jsonSerializable: true,
        handler: () => routingInspector.inspectRouting(),
      }),
    );

    scope.rpc.register(
      defineRpcFunction({
        name: "getFioriInfo",
        type: "query",
        jsonSerializable: true,
        handler: (controlId) => fioriInspector.inspectFioriElements(controlId),
      }),
    );

    scope.rpc.register(
      defineRpcFunction({
        name: "getPerformanceMetrics",
        type: "query",
        jsonSerializable: true,
        handler: () => performanceProfiler.getPerformanceMetrics(),
      }),
    );

    scope.rpc.register(
      defineRpcFunction({
        name: "getA11yAndI18nInfo",
        type: "query",
        jsonSerializable: true,
        handler: (controlId) => ({
          a11y: a11yI18nInspector.inspectAccessibility(controlId),
          i18n: a11yI18nInspector.inspectI18n("Save Product"),
          theme: a11yI18nInspector.inspectTheme(),
          messages: a11yI18nInspector.getAggregatedMessages(),
        }),
      }),
    );

    scope.rpc.register(
      defineRpcFunction({
        name: "getTestSelectors",
        type: "query",
        jsonSerializable: true,
        handler: (controlId) => ({
          selectors: testGenerator.generateSelectors(controlId),
          spec: testGenerator.generateAutomatedTestSpec(),
        }),
      }),
    );

    scope.rpc.register(
      defineRpcFunction({
        name: "getHealthCockpit",
        type: "query",
        jsonSerializable: true,
        handler: () => healthCockpit.getOverallHealthScore(),
      }),
    );

    scope.rpc.register(
      defineRpcFunction({
        name: "diagnoseWhyQuestion",
        type: "action",
        jsonSerializable: true,
        handler: (questionType) => healthCockpit.diagnoseWhyQuestion(questionType),
      }),
    );
  },
});

export default ui5Devframe;
