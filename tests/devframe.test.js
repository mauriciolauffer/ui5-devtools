import { describe, it, expect } from 'vitest';
import { UI5Hook } from '../src/backend/ui5-hook.js';
import { ModelInspector } from '../src/backend/model-inspector.js';
import { AIDebugger } from '../src/ai/ai-debugger.js';

describe('DevFrame SAPUI5 Engine Unit Tests', () => {
  // Mock SAPUI5 environment
  function createMockUI5Environment() {
    const mockSaveButton = {
      getId: () => 'application::ObjectPage--fe::table::STTA_C_MP_Product::Save',
      getMetadata: () => ({
        getName: () => 'sap.m.Button',
        getAllProperties: () => ({
          text: {},
          enabled: {},
          visible: {}
        }),
        getAllAggregations: () => ({})
      }),
      getText: () => 'Save',
      getEnabled: () => true,
      getVisible: () => true,
      getParent: () => null,
      getModel: (name) => {
        if (name === 'i18n') return { getMetadata: () => ({ getName: () => 'sap.ui.model.resource.ResourceModel' }) };
        return { getMetadata: () => ({ getName: () => 'sap.ui.model.odata.v4.ODataModel' }) };
      },
      getBindingContext: () => ({
        getPath: () => '/Product(100)',
        getModel: () => ({ getMetadata: () => ({ getName: () => 'sap.ui.model.odata.v4.ODataModel' }) }),
        getObject: () => ({ ID: 100, Name: 'Test Product' })
      }),
      mBindingInfos: {
        text: { model: 'i18n', path: 'SAVE_BUTTON' },
        enabled: { model: 'default', path: 'isSaveAllowed', parts: [{ model: 'default', path: 'isSaveAllowed' }] }
      },
      mEventRegistry: {
        press: [
          {
            fFunction: function onSave() {},
            oListener: { constructor: { name: 'MainController' } }
          }
        ]
      }
    };

    const mockWin = {
      sap: {
        ui: {
          version: '1.120.0',
          getCore: () => ({
            mElements: {
              'btn-save': mockSaveButton
            }
          }),
          core: {
            ElementRegistry: {
              all: () => [mockSaveButton],
              get: (id) => id === mockSaveButton.getId() ? mockSaveButton : null
            }
          }
        }
      }
    };

    return { mockWin, mockSaveButton };
  }

  it('UI5Hook extracts UI5 version and control tree correctly', () => {
    const { mockWin } = createMockUI5Environment();
    const hook = new UI5Hook(mockWin);

    expect(hook.getUI5Version()).toBe('1.120.0');

    const tree = hook.getControlTree();
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('application::ObjectPage--fe::table::STTA_C_MP_Product::Save');
    expect(tree[0].type).toBe('sap.m.Button');
    expect(tree[0].text).toBe('Save');
    expect(tree[0].enabled).toBe(true);
    expect(tree[0].visible).toBe(true);
  });

  it('ModelInspector extracts button details, bindings, events, and Fiori context', () => {
    const { mockWin, mockSaveButton } = createMockUI5Environment();
    const hook = new UI5Hook(mockWin);
    const inspector = new ModelInspector(hook);

    const details = inspector.inspectControlDetails(mockSaveButton.getId());

    expect(details.id).toBe('application::ObjectPage--fe::table::STTA_C_MP_Product::Save');
    expect(details.type).toBe('sap.m.Button');
    expect(details.fioriContext.floorplan).toBe('Fiori Elements Object Page');
    expect(details.fioriContext.actionContext).toBe('Edit flow → Save');
    expect(details.bindings.text.path).toBe('SAVE_BUTTON');
    expect(details.eventHandlers.press[0].functionName).toBe('onSave');
  });

  it('AIDebugger scores healthy controls accurately', () => {
    const { mockWin, mockSaveButton } = createMockUI5Environment();
    const hook = new UI5Hook(mockWin);
    const inspector = new ModelInspector(hook);
    const debuggerEngine = new AIDebugger(inspector);

    const analysis = debuggerEngine.analyzeControl(mockSaveButton.getId());

    expect(analysis.controlId).toBe('application::ObjectPage--fe::table::STTA_C_MP_Product::Save');
    expect(analysis.score).toBeGreaterThanOrEqual(90);
  });

  it('AIDebugger identifies missing event handlers and unmapped bindings', () => {
    const brokenButton = {
      getId: () => 'btn-broken',
      getMetadata: () => ({
        getName: () => 'sap.m.Button',
        getAllProperties: () => ({ visible: {}, enabled: {} }),
        getAllAggregations: () => ({})
      }),
      getText: () => 'Broken',
      getVisible: () => true,
      getEnabled: () => true,
      getParent: () => null,
      mBindingInfos: {
        text: { model: 'default', path: '' } // broken path
      },
      mEventRegistry: {} // no press handler
    };

    const mockWin = {
      sap: {
        ui: {
          version: '1.120.0',
          core: {
            ElementRegistry: {
              all: () => [brokenButton],
              get: () => brokenButton
            }
          }
        }
      }
    };

    const hook = new UI5Hook(mockWin);
    const inspector = new ModelInspector(hook);
    const debuggerEngine = new AIDebugger(inspector);

    const analysis = debuggerEngine.analyzeControl('btn-broken');

    expect(analysis.diagnostics.some(d => d.category === 'Binding')).toBe(true);
    expect(analysis.diagnostics.some(d => d.category === 'Event Handler')).toBe(true);
    expect(analysis.score).toBeLessThan(100);
  });
});
