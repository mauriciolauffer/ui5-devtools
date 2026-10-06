import { describe, it, expect } from "vitest";
import { BindingInspector } from "../src/backend/binding-inspector.js";
import { UI5Hook } from "../src/backend/ui5-hook.js";

describe("Flagship Binding Inspector Engine Tests", () => {
  function createMockUI5Control() {
    const mockControl = {
      getId: () => "btn-product-name",
      getMetadata: () => ({
        getName: () => "sap.m.Text",
        getAllAggregations: () => ({
          items: {},
        }),
      }),
      getText: () => "Gaming Laptop",
      getBinding: (_prop) => ({
        getMetadata: () => ({ getName: () => "PropertyBinding" }),
        getBindingMode: () => "TwoWay",
      }),
      getBindingContext: () => ({
        getPath: () => "/Products(123)",
        getObject: () => ({ Name: "Gaming Laptop" }),
      }),
      mBindingInfos: {
        text: {
          model: "oData",
          path: "/Products(123)/Name",
          mode: "TwoWay",
        },
        items: {
          path: "/Products",
          template: { getMetadata: () => ({ getName: () => "sap.m.ColumnListItem" }) },
          templateShareable: true,
        },
      },
    };

    const mockHook = new UI5Hook({
      sap: {
        ui: {
          version: "1.120.0",
          core: {
            ElementRegistry: {
              all: () => [mockControl],
              get: () => mockControl,
            },
          },
        },
      },
    });

    return { mockHook, mockControl };
  }

  it("extracts property binding details (Property, Model, Path, Value, Type, Binding, Mode)", () => {
    const { mockHook } = createMockUI5Control();
    const bindingInspector = new BindingInspector(mockHook);
    const result = bindingInspector.inspectBindings("btn-product-name");

    expect(result.propertyBindings).toHaveLength(1);
    const textBinding = result.propertyBindings[0];

    expect(textBinding.property).toBe("text");
    expect(textBinding.model).toBe("oData");
    expect(textBinding.path).toBe("/Products(123)/Name");
    expect(textBinding.value).toBe("Gaming Laptop");
    expect(textBinding.type).toBe("Edm.String");
    expect(textBinding.binding).toBe("PropertyBinding");
    expect(textBinding.mode).toBe("TwoWay");
  });

  it("extracts aggregation binding details (items, path, template, shareable)", () => {
    const { mockHook } = createMockUI5Control();
    const bindingInspector = new BindingInspector(mockHook);
    const result = bindingInspector.inspectBindings("btn-product-name");

    expect(result.aggregationBindings).toHaveLength(1);
    const itemsAggregation = result.aggregationBindings[0];

    expect(itemsAggregation.aggregation).toBe("items");
    expect(itemsAggregation.path).toBe("/Products");
    expect(itemsAggregation.template).toBe("sap.m.ColumnListItem");
    expect(itemsAggregation.templateShareable).toBe(true);
  });

  it('walks "Why is this value empty?" diagnostic chain step-by-step', () => {
    const { mockHook } = createMockUI5Control();
    const bindingInspector = new BindingInspector(mockHook);

    const diagnosis = bindingInspector.diagnoseWhyValueIsEmpty("btn-product-name", "text");

    expect(diagnosis.isResolved).toBe(true);
    expect(diagnosis.chain).toHaveLength(5);
    expect(diagnosis.chain[0].step).toBe("sap.m.Text.text");
    expect(diagnosis.chain[1].step).toBe("Binding exists?");
    expect(diagnosis.chain[2].step).toBe("Binding path exists?");
    expect(diagnosis.chain[3].step).toBe("Context exists?");
    expect(diagnosis.chain[4].step).toBe("Model data loaded?");
  });

  it('detects missing binding context during "Why is this value empty?" diagnosis', () => {
    const uncontextualControl = {
      getId: () => "btn-empty",
      getMetadata: () => ({ getName: () => "sap.m.Button" }),
      getText: () => "",
      getBindingContext: () => null,
      getParent: () => null,
      mBindingInfos: {
        text: { model: "oData", path: "/Products(123)/Name" },
      },
    };

    const mockHook = new UI5Hook({
      sap: {
        ui: {
          version: "1.120.0",
          core: {
            ElementRegistry: { get: () => uncontextualControl },
          },
        },
      },
    });

    const bindingInspector = new BindingInspector(mockHook);
    const diagnosis = bindingInspector.diagnoseWhyValueIsEmpty("btn-empty", "text");

    expect(diagnosis.isResolved).toBe(false);
    expect(diagnosis.reason).toContain("No binding context");
    expect(
      diagnosis.chain.some((c) =>
        c.message.includes("No parent element provides a binding context"),
      ),
    ).toBe(true);
  });
});
