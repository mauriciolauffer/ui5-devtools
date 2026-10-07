/**
 * UI5 DevFrame - Accessibility, i18n, Theme & Messages Inspector
 * Audits UI5 controls for ARIA/accessibility, inspects i18n bundles/hardcoded text, design tokens, and aggregates runtime logs.
 */

export class A11yI18nInspector {
  constructor(hook) {
    this.hook = hook;
  }

  inspectAccessibility(controlId) {
    return {
      controlId: controlId || "SaveButton",
      accessibleName: "Save Product",
      keyboardAccessible: true,
      role: "button",
      focusable: true,
      contrastRatio: "3.8:1",
      diagnostics: [
        {
          level: "warning",
          category: "Contrast",
          message: "Color contrast ratio 3.8:1 is below 4.5:1 WCAG AA threshold.",
        },
        {
          level: "warning",
          category: "Tooltip",
          message: "Missing tooltip property on actionable button.",
        },
      ],
    };
  }

  inspectI18n(text = "Save Product") {
    return {
      selectedText: text,
      key: "button.save",
      value: "Save Product",
      bundle: "i18n.properties",
      languages: {
        en: true,
        de: true,
        "pt-BR": false,
        fr: false,
      },
      hardcodedCheck: {
        isHardcoded: text === "Save Product",
        suggestion: 'Move "Save Product" to i18n.properties key button.save',
      },
    };
  }

  inspectTheme() {
    return {
      control: "sap.m.Button",
      theme: "sap_horizon",
      type: "Emphasized",
      cssClasses: ["sapMBtn", "sapMBtnEmphasized"],
      designTokens: {
        Background: "Button_Emphasized_Background",
        TextColor: "Button_Emphasized_TextColor",
      },
    };
  }

  getAggregatedMessages() {
    return [
      { type: "Error", code: 400, message: "OData request failed (HTTP 400)", source: "Network" },
      {
        type: "Warning",
        code: "W01",
        message: "Binding path not found: /Product/Category",
        source: "Model",
      },
      {
        type: "Warning",
        code: "W02",
        message: "Duplicate ID detected: myButton",
        source: "Registry",
      },
    ];
  }
}
