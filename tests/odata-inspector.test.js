import { describe, it, expect } from "vitest";
import { ODataInspector } from "../src/backend/odata-inspector.js";
import { UI5Hook } from "../src/backend/ui5-hook.js";

describe("OData Inspector Engine Tests", () => {
  it("parses OData V4 query parameters ($select, $filter, $expand) correctly", () => {
    const odataInspector = new ODataInspector(null);
    const result = odataInspector.parseQueryParams(
      "/sap/opu/odata4/sap/zui_products_v4/srvd/sap/zui_products/0001/Products?$select=ID,Name,Price&$filter=Status%20eq%20%27A%27&$expand=Category",
    );

    expect(result.entitySet).toBe("Products");
    expect(result.params["$select"]).toBe("ID,Name,Price");
    expect(result.params["$filter"]).toBe("Status eq 'A'");
    expect(result.params["$expand"]).toBe("Category");
  });

  it("records request and connects trace from Network Request down to View", () => {
    const mockHook = new UI5Hook({
      sap: {
        ui: {
          version: "1.120.0",
          core: {
            ElementRegistry: {
              all: () => [
                {
                  getId: () => "application::ObjectPage--fe::table::Products::Table",
                  getMetadata: () => ({ getName: () => "sap.m.Table" }),
                  mBindingInfos: { items: { path: "/Products" } },
                },
              ],
            },
          },
        },
      },
    });

    const odataInspector = new ODataInspector(mockHook);
    const record = odataInspector.recordRequest({
      method: "GET",
      url: "/sap/opu/odata4/Products?$select=ID,Name",
      status: 200,
      duration: 110,
    });

    expect(record.entitySet).toBe("Products");
    expect(record.version).toBe("OData V4");
    expect(record.trace.controlId).toBe("application::ObjectPage--fe::table::Products::Table");
    expect(record.trace.view).toBe("application::ObjectPage");
    expect(record.trace.chain).toHaveLength(5);
  });

  it("generates 9 lifecycle stages for OData V4 request lifecycle", () => {
    const odataInspector = new ODataInspector(null);
    const record = odataInspector.recordRequest({
      method: "PATCH",
      url: "/sap/opu/odata4/Products('1024')",
      status: 200,
      duration: 85,
    });

    expect(record.lifecycle).toHaveLength(9);
    expect(record.lifecycle[0].id).toBe("ui_interaction");
    expect(record.lifecycle[4].id).toBe("request");
    expect(record.lifecycle[8].id).toBe("control_rendering");
  });
});
