import { describe, it, expect } from "vitest";
import { RoutingInspector } from "../src/backend/routing-inspector.js";
import { FioriInspector } from "../src/backend/fiori-inspector.js";
import { PerformanceProfiler } from "../src/backend/performance-profiler.js";
import { A11yI18nInspector } from "../src/backend/a11y-i18n-inspector.js";
import { TestGenerator } from "../src/testing/test-generator.js";
import { HealthCockpit } from "../src/backend/health-cockpit.js";

describe("DevFrame Advanced Features Engine Tests", () => {
  it("RoutingInspector extracts routes, active hash, and diagnostics", () => {
    const routing = new RoutingInspector(null);
    const res = routing.inspectRouting();

    expect(res.currentRoute).toBe("product");
    expect(res.routes).toHaveLength(4);
    expect(res.diagnostics[0].route).toBe("productEdit");
  });

  it("FioriInspector extracts floorplan, annotations, and annotation diagnostic walk", () => {
    const fiori = new FioriInspector(null);
    const res = fiori.inspectFioriElements("ProductName");

    expect(res.pageType).toBe("Object Page");
    expect(res.annotations.some((a) => a.term === "@UI.LineItem")).toBe(true);

    const whyNot = fiori.whyAnnotationNotShowing("@UI.FieldGroup #General");
    expect(whyNot.status).toBe("ignored");
    expect(whyNot.reason).toContain("Target entity does not match");
  });

  it("PerformanceProfiler returns startup timings, render metrics, and memory diagnostics", () => {
    const profiler = new PerformanceProfiler(null);
    const res = profiler.getPerformanceMetrics();

    expect(res.startup.total).toBe(1503);
    expect(res.rendering.controlsCreated).toBe(2341);
    expect(res.memoryDiagnostics).toHaveLength(2);
  });

  it("A11yI18nInspector audits contrast, i18n keys, theme tokens, and aggregated logs", () => {
    const inspector = new A11yI18nInspector(null);
    const a11y = inspector.inspectAccessibility("btn-save");
    const i18n = inspector.inspectI18n("Save Product");
    const theme = inspector.inspectTheme();
    const msgs = inspector.getAggregatedMessages();

    expect(a11y.contrastRatio).toBe("3.8:1");
    expect(i18n.key).toBe("button.save");
    expect(theme.theme).toBe("sap_horizon");
    expect(msgs.some((m) => m.type === "Error")).toBe(true);
  });

  it("TestGenerator creates quality selectors, records interactions, and builds test spec", () => {
    const testGen = new TestGenerator(null);
    const selectors = testGen.generateSelectors("saveBtn");

    expect(selectors.qualityScore).toBe(5);
    expect(selectors.selectors.wdi5).toContain("saveBtn");

    testGen.startRecording();
    testGen.recordInteraction("Click", "SaveButton", "00:05");
    const timeline = testGen.stopRecording();

    expect(timeline).toHaveLength(2);
    expect(testGen.generateAutomatedTestSpec()).toContain("describe");
  });

  it('HealthCockpit calculates 0-100 overall score and diagnoses unified "Why?" questions', () => {
    const health = new HealthCockpit(null);
    const res = health.getOverallHealthScore();

    expect(res.overall).toBe(87);
    expect(res.scores.performance).toBe(91);

    const whyTable = health.diagnoseWhyQuestion("why_table_empty");
    expect(whyTable.question).toBe("Why is my table empty?");
    expect(whyTable.chain.some((c) => c.step === "Contexts" && c.status === "fail")).toBe(true);
  });
});
