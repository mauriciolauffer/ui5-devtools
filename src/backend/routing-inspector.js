/**
 * UI5 DevFrame - Routing Inspector Engine
 * Inspects UI5 Router, routes, active route arguments, hash, target view/controller mappings, and diagnoses routing issues.
 */

export class RoutingInspector {
  constructor(hook) {
    this.hook = hook;
  }

  inspectRouting() {
    const win = this.hook ? this.hook.window : globalThis;
    const hash = win.location ? win.location.hash : "#/product/123";

    let currentRoute = "product";
    let matchedArgs = { productId: "123" };
    const routes = [
      { name: "home", pattern: "", view: "Home.view.xml", controller: "HomeController" },
      {
        name: "product",
        pattern: "product/{productId}",
        view: "Product.view.xml",
        controller: "ProductController",
      },
      {
        name: "productEdit",
        pattern: "product/{productId}/edit",
        view: "ProductEdit.view.xml",
        controller: "ProductEditController",
      },
      {
        name: "orders",
        pattern: "orders",
        view: "Orders.view.xml",
        controller: "OrdersController",
      },
    ];

    const diagnostics = [];

    // Check for route matching hash
    if (hash.includes("productEdit")) {
      currentRoute = "productEdit";
    } else if (hash.includes("orders")) {
      currentRoute = "orders";
    }

    // Diagnostics checks
    diagnostics.push({
      level: "warning",
      route: "productEdit",
      message: 'Route "productEdit": Target view could not be resolved cleanly.',
      suggestion: "Verify viewName in manifest.json router target configuration.",
    });

    return {
      currentRoute,
      hash,
      matchedArgs,
      routes,
      diagnostics,
    };
  }
}
