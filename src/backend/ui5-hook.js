/**
 * UI5 DevFrame - UI5 Runtime Hook Engine
 * Inspects SAPUI5 runtime controls, registry, properties, and tree structures.
 */

export class UI5Hook {
  constructor(win = typeof window !== 'undefined' ? window : globalThis) {
    this.window = win;
  }

  getSapCore() {
    if (this.window.sap && this.window.sap.ui && typeof this.window.sap.ui.getCore === 'function') {
      return this.window.sap.ui.getCore();
    }
    return null;
  }

  getElementRegistry() {
    if (this.window.sap && this.window.sap.ui && this.window.sap.ui.core && this.window.sap.ui.core.ElementRegistry) {
      return this.window.sap.ui.core.ElementRegistry;
    }
    return null;
  }

  getUI5Version() {
    if (this.window.sap && this.window.sap.ui) {
      return this.window.sap.ui.version || 'Unknown';
    }
    return 'Not Loaded';
  }

  getAllControls() {
    const registry = this.getElementRegistry();
    if (registry && typeof registry.all === 'function') {
      return registry.all();
    }
    const core = this.getSapCore();
    if (core && typeof core.mElements === 'object') {
      return core.mElements;
    }
    return {};
  }

  getControlById(id) {
    const registry = this.getElementRegistry();
    if (registry && typeof registry.get === 'function') {
      const control = registry.get(id);
      if (control) return control;
    }
    const core = this.getSapCore();
    if (core && typeof core.byId === 'function') {
      return core.byId(id);
    }
    return null;
  }

  getControlTree() {
    const controlsMap = this.getAllControls();
    const controls = Array.isArray(controlsMap)
      ? controlsMap
      : Object.values(controlsMap || {});

    if (!controls || controls.length === 0) {
      return [];
    }

    // Find root controls (controls without a UI5 parent control)
    const rootControls = controls.filter(c => {
      if (!c || typeof c.getParent !== 'function') return false;
      const parent = c.getParent();
      return !parent;
    });

    return rootControls.map(c => this.serializeControlNode(c));
  }

  serializeControlNode(control) {
    if (!control) return null;

    const id = typeof control.getId === 'function' ? control.getId() : 'unknown';
    const type = typeof control.getMetadata === 'function' ? control.getMetadata().getName() : 'UnknownControl';

    let text = '';
    if (typeof control.getText === 'function') {
      text = control.getText();
    } else if (typeof control.getTitle === 'function') {
      text = control.getTitle();
    } else if (typeof control.getValue === 'function') {
      text = control.getValue();
    }

    const visible = typeof control.getVisible === 'function' ? control.getVisible() : true;
    const enabled = typeof control.getEnabled === 'function' ? control.getEnabled() : true;

    // Collect child aggregation elements
    const children = [];
    if (typeof control.getMetadata === 'function') {
      const metadata = control.getMetadata();
      const aggregations = metadata.getAllAggregations();

      for (const aggName in aggregations) {
        const getterName = aggregations[aggName]._sGetter || ('get' + aggName.charAt(0).toUpperCase() + aggName.slice(1));
        if (typeof control[getterName] === 'function') {
          try {
            const aggContent = control[getterName]();
            if (Array.isArray(aggContent)) {
              aggContent.forEach(child => {
                if (child && typeof child.getId === 'function') {
                  children.push(this.serializeControlNode(child));
                }
              });
            } else if (aggContent && typeof aggContent.getId === 'function') {
              children.push(this.serializeControlNode(aggContent));
            }
          } catch (e) {
            // Ignore errors when querying dynamic aggregations
          }
        }
      }
    }

    return {
      id,
      type,
      text: typeof text === 'string' ? text : String(text || ''),
      visible,
      enabled,
      children
    };
  }
}
