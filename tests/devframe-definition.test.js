import { describe, it, expect } from "vitest";
import { ui5Devframe } from "../src/devframe.js";

describe("Devframe Definition & RPC Unit Tests", () => {
  it("exports valid Devframe definition object", () => {
    expect(ui5Devframe.id).toBe("ui5-devtools");
    expect(ui5Devframe.name).toBe("DevFrame SAPUI5 DevTools");
    expect(ui5Devframe.version).toBe("1.0.0");
    expect(typeof ui5Devframe.setup).toBe("function");
  });

  it("registers all RPC functions in setup context", () => {
    const registeredRpc = [];
    const mockCtx = {
      scope: (_id) => ({
        rpc: {
          register: (fn) => registeredRpc.push(fn),
        },
      }),
    };

    ui5Devframe.setup(mockCtx);

    expect(registeredRpc).toHaveLength(11);
    const names = registeredRpc.map((r) => r.name);
    expect(names).toContain("getControlTree");
    expect(names).toContain("getControlDetails");
    expect(names).toContain("whyValueEmpty");
    expect(names).toContain("getODataRequests");
    expect(names).toContain("getRoutingInfo");
    expect(names).toContain("getFioriInfo");
    expect(names).toContain("getPerformanceMetrics");
    expect(names).toContain("getA11yAndI18nInfo");
    expect(names).toContain("getTestSelectors");
    expect(names).toContain("getHealthCockpit");
    expect(names).toContain("diagnoseWhyQuestion");
  });

  it("executes whyValueEmpty RPC handler cleanly", () => {
    const registeredRpc = [];
    const mockCtx = {
      scope: () => ({
        rpc: {
          register: (fn) => registeredRpc.push(fn),
        },
      }),
    };

    ui5Devframe.setup(mockCtx);
    const whyRpc = registeredRpc.find((r) => r.name === "whyValueEmpty");

    const result = whyRpc.handler({ controlId: "non-existent-btn", propertyName: "text" });
    expect(result.isResolved).toBe(false);
    expect(result.chain[0].message).toContain("Control not found");
  });
});
