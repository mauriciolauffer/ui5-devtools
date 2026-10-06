/**
 * UI5 DevFrame - AI Diagnostics Assistant Engine
 * Analyzes SAPUI5 controls, models, bindings, and Fiori Elements contexts to generate smart diagnostic findings and fix suggestions.
 */

export class AIDebugger {
  constructor(inspector) {
    this.inspector = inspector;
  }

  analyzeControl(controlId) {
    const details = typeof controlId === 'string' ? this.inspector.inspectControlDetails(controlId) : controlId;
    if (!details) {
      return {
        score: 0,
        diagnostics: [{
          level: 'error',
          category: 'Registry',
          message: 'Control not found in SAPUI5 ElementRegistry.',
          suggestion: 'Ensure the control ID is correct and instantiated in the view.'
        }]
      };
    }

    const diagnostics = [];

    // Rule 1: Check for broken or missing bindings
    if (details.bindings) {
      for (const propName in details.bindings) {
        const binding = details.bindings[propName];
        if (!binding.path) {
          diagnostics.push({
            level: 'warning',
            category: 'Binding',
            message: `Property '${propName}' has a binding info defined but path is empty.`,
            suggestion: `Define a valid property path in model '${binding.model}'.`
          });
        }
        if (binding.isODataV4 && !details.bindingContext) {
          diagnostics.push({
            level: 'warning',
            category: 'OData V4 Context',
            message: `Property '${propName}' uses OData V4 model '${binding.model}' but control has no active binding context.`,
            suggestion: `Ensure the parent element (e.g., Table or ObjectPage) has set a valid binding context (e.g., /Product('100')).`
          });
        }
      }
    }

    // Rule 2: Check for invisible or disabled actionable controls (e.g. Buttons)
    if (details.type.includes('Button')) {
      if (details.properties.visible === false) {
        diagnostics.push({
          level: 'info',
          category: 'Visibility',
          message: `Button '${details.id}' is set to visible=false.`,
          suggestion: 'Check if conditional visibility rules or manifest annotations hid this action.'
        });
      }
      if (details.properties.enabled === false) {
        diagnostics.push({
          level: 'info',
          category: 'State',
          message: `Button '${details.id}' is set to enabled=false.`,
          suggestion: 'Verify authorization or model validation state controlling the enabled property.'
        });
      }
      if (!details.eventHandlers || !details.eventHandlers.press) {
        diagnostics.push({
          level: 'warning',
          category: 'Event Handler',
          message: `Button '${details.id}' has no press event handler attached.`,
          suggestion: "Attach a press event handler in view XML (press='.onSave') or controller."
        });
      }
    }

    // Rule 3: Fiori Elements floorplan diagnostics
    if (details.fioriContext && details.fioriContext.isFioriElements) {
      if (details.fioriContext.actionContext.includes('Save') && !details.bindingContext) {
        diagnostics.push({
          level: 'error',
          category: 'Fiori Elements Edit Flow',
          message: 'Save button triggered without active draft or ObjectPage context.',
          suggestion: 'Ensure draft context is initialized before edit/save action triggers.'
        });
      }
    }

    // Rule 4: Controller attachment check
    if (!details.controller) {
      diagnostics.push({
        level: 'info',
        category: 'Architecture',
        message: 'Control is not associated with an explicit controller instance.',
        suggestion: 'Ensure view defines controllerName attribute if controller logic is required.'
      });
    }

    // Calculate diagnostic score (100 = perfect, lower if issues found)
    let score = 100;
    diagnostics.forEach(d => {
      if (d.level === 'error') score -= 30;
      else if (d.level === 'warning') score -= 15;
      else if (d.level === 'info') score -= 5;
    });

    return {
      controlId: details.id,
      type: details.type,
      score: Math.max(0, score),
      diagnostics
    };
  }
}
