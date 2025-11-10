"use strict";
/* global it, describe, beforeEach */

var assert = require("chai").assert;

describe('generate_scopes', function() {
  var generate_scopes;
  var HookManager;
  var Scope;
  var ZoneEntryScope;

  beforeEach(function() {
    // Load dependencies
    HookManager = require('../../hook_manager');
    Scope = require('../../ir/scope');
    ZoneEntryScope = require('../../ir/zone_entry_scope');
    generate_scopes = require('../../ir_gen/generate_scopes');
  });

  describe('ScopeRef internal class', function() {
    it('should be accessible through generate_scopes internals', function() {
      // ScopeRef is an internal function, we test it indirectly through generate_scopes
      assert.isFunction(generate_scopes);
    });
  });

  describe('generate_scopes function', function() {
    var hookManager;
    var cData;

    beforeEach(function() {
      hookManager = new HookManager();
      cData = {
        event_handler_virtual_params_hash: {},
        callback_handler_virtual_params_hash: {}
      };
    });

    it('should be a function', function() {
      assert.isFunction(generate_scopes);
    });

    it('should call callback with scope data', function(done) {
      var ordered_sources = [
        {
          type: 'element',
          name: 'test_element',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.isObject(scope_data);
        assert.property(scope_data, 'root_element_scopes');
        assert.property(scope_data, 'element_scopes');
        assert.property(scope_data, 'model_scopes');
        assert.property(scope_data, 'scopes');
        done();
      });
    });

    it('should handle empty sources array', function(done) {
      var ordered_sources = [];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.isObject(scope_data);
        assert.property(scope_data, 'root_element_scopes');
        assert.property(scope_data, 'element_scopes');
        assert.property(scope_data, 'model_scopes');
        assert.isArray(scope_data.scopes);
        assert.equal(scope_data.scopes.length, 0);
        done();
      });
    });

    it('should create Scope for non-zone-entry elements', function(done) {
      var ordered_sources = [
        {
          type: 'element',
          name: 'regular_element',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.equal(scope_data.scopes.length, 1);
        assert.instanceOf(scope_data.scopes[0], Scope);
        assert.notInstanceOf(scope_data.scopes[0], ZoneEntryScope);
        done();
      });
    });

    it('should create ZoneEntryScope for zone entry elements', function(done) {
      var ordered_sources = [
        {
          type: 'element',
          name: 'zone_entry_element',
          params: [],
          outputs: {},
          refs: [],
          is_root: true,
          is_zone_entry_scope: true,
          preload: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.equal(scope_data.scopes.length, 1);
        assert.instanceOf(scope_data.scopes[0], ZoneEntryScope);
        done();
      });
    });

    it('should handle model sources', function(done) {
      var ordered_sources = [
        {
          type: 'model',
          name: 'test_model',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.equal(scope_data.scopes.length, 1);
        assert.property(scope_data.model_scopes, 'test_model');
        done();
      });
    });

    it('should identify root elements', function(done) {
      var ordered_sources = [
        {
          type: 'element',
          name: 'root_element',
          params: [],
          outputs: {},
          refs: [],
          is_root: true,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.property(scope_data.root_element_scopes, 'root_element');
        assert.instanceOf(scope_data.root_element_scopes.root_element, Scope);
        done();
      });
    });

    it('should handle multiple sources', function(done) {
      var ordered_sources = [
        {
          type: 'element',
          name: 'element1',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        },
        {
          type: 'element',
          name: 'element2',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        },
        {
          type: 'model',
          name: 'model1',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.equal(scope_data.scopes.length, 3);
        assert.property(scope_data.element_scopes, 'element1');
        assert.property(scope_data.element_scopes, 'element2');
        assert.property(scope_data.model_scopes, 'model1');
        done();
      });
    });

    it('should set shard metadata when present', function(done) {
      var ordered_sources = [
        {
          type: 'element',
          name: 'sharded_element',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false,
          shard: {
            id: 'shard1',
            dependencies: []
          }
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        var scope = scope_data.scopes[0];
        var shard_metadata = scope.get_shard_metadata();
        assert.isObject(shard_metadata);
        assert.equal(shard_metadata.id, 'shard1');
        done();
      });
    });

    it('should process params refs', function(done) {
      var ordered_sources = [
        {
          type: 'element',
          name: 'element_with_params',
          params: ['param1', 'param2'],
          outputs: {},
          refs: [
            {
              name: 'param1',
              type: 'params',
              value: 'param1'
            },
            {
              name: 'param2',
              type: 'params',
              value: 'param2'
            }
          ],
          is_root: false,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.equal(scope_data.scopes.length, 1);
        var scope = scope_data.scopes[0];
        assert.isObject(scope);
        done();
      });
    });

    it('should process constants refs', function(done) {
      var ordered_sources = [
        {
          type: 'element',
          name: 'element_with_constants',
          params: [],
          outputs: {},
          refs: [
            {
              name: 'MY_CONSTANT',
              type: 'constants',
              value: 42
            }
          ],
          is_root: false,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.equal(scope_data.scopes.length, 1);
        done();
      });
    });

    it('should add outputs to scope', function(done) {
      var ordered_sources = [
        {
          type: 'element',
          name: 'element_with_output',
          params: [],
          outputs: {
            result: 'MY_CONSTANT'
          },
          refs: [
            {
              name: 'MY_CONSTANT',
              type: 'constants',
              value: 100
            }
          ],
          is_root: false,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        var scope = scope_data.scopes[0];
        assert.equal(scope.get_output_count(), 1);
        var resultOutput = scope.get_output_by_field_name('result');
        assert.isDefined(resultOutput);
        done();
      });
    });

    it('should handle preload flag on zone entry scopes', function(done) {
      var ordered_sources = [
        {
          type: 'element',
          name: 'preload_zone',
          params: [],
          outputs: {},
          refs: [],
          is_root: true,
          is_zone_entry_scope: true,
          preload: true
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.instanceOf(scope_data.scopes[0], ZoneEntryScope);
        done();
      });
    });

    it('should throw error for unknown source type', function(done) {
      var ordered_sources = [
        {
          type: 'unknown_type',
          name: 'bad_source',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        }
      ];

      try {
        generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
          done(new Error('Should have thrown error'));
        });
      } catch(e) {
        assert.match(e.message, /Unknown source type/);
        done();
      }
    });

    it('should maintain scope order', function(done) {
      var ordered_sources = [
        {
          type: 'element',
          name: 'first',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        },
        {
          type: 'element',
          name: 'second',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        },
        {
          type: 'element',
          name: 'third',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.equal(scope_data.scopes.length, 3);
        assert.include(scope_data.scopes[0].get_name(), 'first');
        assert.include(scope_data.scopes[1].get_name(), 'second');
        assert.include(scope_data.scopes[2].get_name(), 'third');
        done();
      });
    });
  });

  describe('Hook integration', function() {
    var hookManager;
    var cData;

    beforeEach(function() {
      hookManager = new HookManager();
      cData = {
        event_handler_virtual_params_hash: {},
        callback_handler_virtual_params_hash: {}
      };
    });

    it('should call pipeline_ir_gen:modify_params_by_scope_type hook', function(done) {
      var hookCalled = false;

      hookManager.onPipelineHook('pipeline_ir_gen:modify_params_by_scope_type', function(next, params_by_scope_type) {
        hookCalled = true;
        next(params_by_scope_type);
      });

      var ordered_sources = [
        {
          type: 'element',
          name: 'test',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.isTrue(hookCalled);
        done();
      });
    });

    it('should call pipeline_ir_gen:computable_creators_by_event_type hook', function(done) {
      var hookCalled = false;

      hookManager.onPipelineHook('pipeline_ir_gen:computable_creators_by_event_type', function(next, creators) {
        hookCalled = true;
        next(creators);
      });

      var ordered_sources = [
        {
          type: 'element',
          name: 'test',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.isTrue(hookCalled);
        done();
      });
    });

    it('should call ir_gen:register_computable_creators_by_source_type hook', function(done) {
      var hookCalled = false;

      hookManager.onHook('ir_gen:register_computable_creators_by_source_type', function(callback, creators) {
        hookCalled = true;
        callback();
      });

      var ordered_sources = [
        {
          type: 'element',
          name: 'test',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.isTrue(hookCalled);
        done();
      });
    });

    it('should call ir_gen:register_initialization_handling hook', function(done) {
      var hookCalled = false;

      hookManager.onHook('ir_gen:register_initialization_handling', function(callback, handling) {
        hookCalled = true;
        assert.isObject(handling);
        assert.property(handling, 'BEGIN');
        assert.property(handling, 'END');
        callback();
      });

      var ordered_sources = [
        {
          type: 'element',
          name: 'test',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.isTrue(hookCalled);
        done();
      });
    });

    it('should call ir_gen:register_finalization_handling hook', function(done) {
      var hookCalled = false;

      hookManager.onHook('ir_gen:register_finalization_handling', function(callback, handling) {
        hookCalled = true;
        assert.isObject(handling);
        assert.property(handling, 'BEGIN');
        assert.property(handling, 'END');
        callback();
      });

      var ordered_sources = [
        {
          type: 'element',
          name: 'test',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.isTrue(hookCalled);
        done();
      });
    });

    it('should allow hooks to modify params_by_scope_type', function(done) {
      hookManager.onPipelineHook('pipeline_ir_gen:modify_params_by_scope_type', function(next, params_by_scope_type) {
        params_by_scope_type.custom_type = function() { return []; };
        next(params_by_scope_type);
      });

      var ordered_sources = [
        {
          type: 'element',
          name: 'test',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        // If we got here without error, the hook modification worked
        done();
      });
    });
  });

  describe('Edge cases', function() {
    var hookManager;
    var cData;

    beforeEach(function() {
      hookManager = new HookManager();
      cData = {
        event_handler_virtual_params_hash: {},
        callback_handler_virtual_params_hash: {}
      };
    });

    it('should handle source with no refs', function(done) {
      var ordered_sources = [
        {
          type: 'element',
          name: 'empty_element',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.equal(scope_data.scopes.length, 1);
        done();
      });
    });

    it('should handle source with no outputs', function(done) {
      var ordered_sources = [
        {
          type: 'element',
          name: 'no_output_element',
          params: [],
          outputs: {},
          refs: [
            {
              name: 'internal_const',
              type: 'constants',
              value: 123
            }
          ],
          is_root: false,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        var scope = scope_data.scopes[0];
        assert.equal(scope.get_output_count(), 0);
        done();
      });
    });

    it('should handle both elements and models together', function(done) {
      var ordered_sources = [
        {
          type: 'model',
          name: 'data_model',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        },
        {
          type: 'element',
          name: 'view_element',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.equal(scope_data.scopes.length, 2);
        assert.property(scope_data.model_scopes, 'data_model');
        assert.property(scope_data.element_scopes, 'view_element');
        done();
      });
    });

    it('should handle multiple root elements', function(done) {
      var ordered_sources = [
        {
          type: 'element',
          name: 'root1',
          params: [],
          outputs: {},
          refs: [],
          is_root: true,
          is_zone_entry_scope: false
        },
        {
          type: 'element',
          name: 'root2',
          params: [],
          outputs: {},
          refs: [],
          is_root: true,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.property(scope_data.root_element_scopes, 'root1');
        assert.property(scope_data.root_element_scopes, 'root2');
        done();
      });
    });

    it('should handle scope names with special characters', function(done) {
      var ordered_sources = [
        {
          type: 'element',
          name: 'element-with-dashes',
          params: [],
          outputs: {},
          refs: [],
          is_root: false,
          is_zone_entry_scope: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.property(scope_data.element_scopes, 'element-with-dashes');
        done();
      });
    });
  });

  describe('Integration scenarios', function() {
    var hookManager;
    var cData;

    beforeEach(function() {
      hookManager = new HookManager();
      cData = {
        event_handler_virtual_params_hash: {},
        callback_handler_virtual_params_hash: {}
      };
    });

    it('should handle complete application structure', function(done) {
      var ordered_sources = [
        {
          type: 'model',
          name: 'app_state',
          params: [],
          outputs: { state: 'state_value' },
          refs: [
            {
              name: 'state_value',
              type: 'constants',
              value: { initialized: true }
            }
          ],
          is_root: false,
          is_zone_entry_scope: false
        },
        {
          type: 'element',
          name: 'app_root',
          params: [],
          outputs: {},
          refs: [],
          is_root: true,
          is_zone_entry_scope: true,
          preload: false
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        assert.equal(scope_data.scopes.length, 2);
        assert.property(scope_data.model_scopes, 'app_state');
        assert.property(scope_data.root_element_scopes, 'app_root');
        assert.instanceOf(scope_data.root_element_scopes.app_root, ZoneEntryScope);
        done();
      });
    });

    it('should preserve scope metadata throughout generation', function(done) {
      var ordered_sources = [
        {
          type: 'element',
          name: 'tracked_element',
          params: ['input'],
          outputs: { output: 'result' },
          refs: [
            {
              name: 'input',
              type: 'params',
              value: 'input'
            },
            {
              name: 'result',
              type: 'constants',
              value: 42
            }
          ],
          is_root: false,
          is_zone_entry_scope: false,
          shard: {
            id: 'main_shard',
            dependencies: []
          }
        }
      ];

      generate_scopes(cData, ordered_sources, hookManager, function(scope_data) {
        var scope = scope_data.scopes[0];
        var shard_metadata = scope.get_shard_metadata();
        assert.equal(shard_metadata.id, 'main_shard');

        assert.equal(scope.get_output_count(), 1);
        var outputField = scope.get_output_by_field_name('output');
        assert.isDefined(outputField);

        done();
      });
    });
  });
});
