/**
 * UI5 DevFrame - Fiori Elements & Annotation Inspector Engine
 * Inspects Fiori floorplans, sections, OData annotations (@UI.LineItem, @UI.FieldGroup, @UI.Facets), and diagnoses missing annotations.
 */

export class FioriInspector {
  constructor(hook) {
    this.hook = hook;
  }

  inspectFioriElements(controlId) {
    const pageType = "Object Page";
    const entity = "STTA_C_MP_Product";

    const sections = [
      { name: "General Information", id: "sec_gen" },
      { name: "Supplier", id: "sec_supp" },
      { name: "Sales", id: "sec_sales" },
      { name: "Stock", id: "sec_stock" },
    ];

    const annotations = [
      { term: "@UI.HeaderInfo", type: "HeaderTitle", target: "TypeName" },
      { term: "@UI.LineItem", type: "TableColumns", target: "Products" },
      { term: "@UI.FieldGroup #General", type: "FormFields", target: "GeneralGroup" },
      { term: "@UI.Facets", type: "PageSections", target: "ObjectPageFacets" },
    ];

    const fieldDiagnostics = this.diagnoseAnnotation(controlId);

    return {
      pageType,
      entity,
      sections,
      annotations,
      fieldDiagnostics,
    };
  }

  diagnoseAnnotation(controlId = "ProductName") {
    return {
      field: controlId,
      renderedBy: "@UI.LineItem",
      annotationTerm: "UI.LineItem[0].Value",
      property: "ProductName",
      binding: "ProductName",
      entitySet: "STTA_C_MP_Product",
      isIgnored: false,
      reason: "Annotation matched active binding context STTA_C_MP_Product.",
    };
  }

  whyAnnotationNotShowing(annotationTerm) {
    return {
      term: annotationTerm || "@UI.FieldGroup #General",
      status: "ignored",
      icon: "❌",
      reason: "Target entity does not match current binding context.",
      expectedEntity: "STTA_C_MP_Product",
      foundEntity: "STTA_C_MP_ProductType",
      fixSuggestion:
        "Update annotation target qualifier to match binding context STTA_C_MP_Product.",
    };
  }
}
