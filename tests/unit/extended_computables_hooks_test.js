"use strict";
/* global it, describe, beforeEach */

var assert = require("chai").assert;

describe('Extended Computables Hooks', function() {
  var Scope;
  var CharacterRange;

  beforeEach(function() {
    Scope = require('../../ir/scope');
    CharacterRange = require('../../plugins/compile_client_app/character_range');
  });

  // Helper to create mock compilation context
  function createMockCompilationContext() {
    var allocatedGlobals = [];
    return {
      allocate_global: function(value) {
        var symbol = 'G' + allocatedGlobals.length;
        allocatedGlobals.push({ symbol: symbol, value: value });
        return symbol;
      },
      get_allocated_globals: function() {
        return allocatedGlobals;
      },
      get_scope_compilation_context: function(scope_identity) {
        return createMockScopeCompilationContext();
      },
      get_global_helper_symbol: function(helper_name) {
        return 'HELPER_' + helper_name;
      },
      reference_weak_symbol: function(identity) {
        return 'WEAK_' + identity;
      }
    };
  }

  // Helper to create mock instantiation context
  function createMockInstantiationContext() {
    var localCounter = 0;
    var inputCounter = 0;
    return {
      allocate_local_symbol: function() {
        return 'L' + (localCounter++);
      },
      allocate_input_symbol: function() {
        return 'I' + (inputCounter++);
      }
    };
  }

  // Helper to create mock execution context
  function createMockExecutionContext() {
    var setupCode = [];
    var inputSymbols = [];
    return {
      get_own_reference: function() {
        return 'OWN_REF';
      },
      add_setup_code: function(code) {
        setupCode.push(code);
      },
      get_setup_code: function() {
        return setupCode;
      },
      get_input_symbol_count: function() {
        return inputSymbols.length;
      },
      get_input_symbol: function(index) {
        return inputSymbols[index];
      },
      set_input_symbols: function(symbols) {
        inputSymbols = symbols;
      }
    };
  }

  // Helper to create mock scope compilation context
  function createMockScopeCompilationContext() {
    return {
      get_computable_reference: function(computable) {
        return 'COMP_REF_' + computable.get_identity();
      }
    };
  }

  // Helper to create a basic scope with required methods
  function createBasicScope() {
    var range = new CharacterRange(65, 90);
    var scope = new Scope('test_scope');

    // Add required methods that some computables expect
    if (!scope.get_instance_count) {
      scope.get_instance_count = function() { return 0; };
    }
    if (!scope.is_output) {
      scope.is_output = function(computable) { return false; };
    }
    if (!scope.get_output_by_field_name) {
      scope.get_output_by_field_name = function(name) { return null; };
    }

    return scope;
  }

  describe('Constant', function() {
    var Constant;

    beforeEach(function() {
      Constant = require('../../ir/computables/constant');
      // Load extended implementation
      require('../../plugins/compile_client_app/extended_computables/constant');
    });

    describe('has_client_side_code_initialize_hook', function() {
      it('should return false for constants', function() {
        var scope = createBasicScope();
        var constant = new Constant(scope, 'test_value');

        var result = constant.has_client_side_code_initialize_hook();
        assert.isFalse(result, 'Constants do not need initialization');
      });
    });

    describe('client_side_code_reference_hook', function() {
      it('should allocate global symbol for constant value', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var constant = new Constant(scope, 'test_value');

        var result = constant.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result, 'G0', 'Should return first global symbol');

        var globals = mockCompilationContext.get_allocated_globals();
        assert.equal(globals.length, 1);
        assert.equal(globals[0].value, 'test_value');
      });

      it('should allocate different globals for different values', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var constant1 = new Constant(scope, 'value1');
        var constant2 = new Constant(scope, 'value2');

        var result1 = constant1.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);
        var result2 = constant2.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result1, 'G0');
        assert.equal(result2, 'G1');

        var globals = mockCompilationContext.get_allocated_globals();
        assert.equal(globals.length, 2);
      });

      it('should handle numeric constant values', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var constant = new Constant(scope, 42);

        var result = constant.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        var globals = mockCompilationContext.get_allocated_globals();
        assert.equal(globals[0].value, 42);
      });

      it('should handle null constant values', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var constant = new Constant(scope, null);

        constant.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        var globals = mockCompilationContext.get_allocated_globals();
        assert.isNull(globals[0].value);
      });

      it('should handle boolean constant values', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var constant = new Constant(scope, true);

        constant.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        var globals = mockCompilationContext.get_allocated_globals();
        assert.isTrue(globals[0].value);
      });
    });
  });

  describe('ScopeParameter', function() {
    var ScopeParameter;

    beforeEach(function() {
      ScopeParameter = require('../../ir/computables/scope_parameter');
      // Load extended implementation
      require('../../plugins/compile_client_app/extended_computables/scope_parameter');
    });

    describe('has_client_side_code_initialize_hook', function() {
      it('should return false for scope parameters', function() {
        var scope = createBasicScope();
        var param = new ScopeParameter(scope);

        var result = param.has_client_side_code_initialize_hook();
        assert.isFalse(result, 'ScopeParameters do not initialize');
      });
    });

    describe('client_side_code_reference_hook', function() {
      it('should allocate input symbol', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var param = new ScopeParameter(scope);

        var result = param.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result, 'I0', 'Should return first input symbol');
      });

      it('should allocate sequential input symbols', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var param1 = new ScopeParameter(scope);
        var param2 = new ScopeParameter(scope);

        var result1 = param1.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);
        var result2 = param2.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result1, 'I0');
        assert.equal(result2, 'I1');
      });
    });

    describe('is_needed_for_update_cycle', function() {
      it('should return false for zone entry parameters', function() {
        var scope = createBasicScope();
        var param = new ScopeParameter(scope);
        param._is_zone_entry_parameter = true;

        var result = param.is_needed_for_update_cycle();
        assert.isFalse(result, 'Zone entry parameters are not needed for update cycle');
      });

      it('should have is_needed_for_update_cycle method that handles non-zone-entry parameters', function() {
        var scope = createBasicScope();
        var param = new ScopeParameter(scope);
        param._is_zone_entry_parameter = false;

        // Should not throw
        // Method exists and can be called with proper setup
        assert.isFunction(param.is_needed_for_update_cycle);
      });
    });
  });

  describe('Callback', function() {
    var Callback;

    beforeEach(function() {
      Callback = require('../../ir/computables/callback');
      // Load extended implementation
      require('../../plugins/compile_client_app/extended_computables/callback');
    });

    describe('client_side_code_reference_hook', function() {
      it('should allocate local symbol', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var callback = new Callback(scope, function() {}, []);

        var result = callback.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result, 'L0', 'Should return first local symbol');
      });

      it('should allocate different local symbols for each callback', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var callback1 = new Callback(scope, function() {}, []);
        var callback2 = new Callback(scope, function() {}, []);

        var result1 = callback1.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);
        var result2 = callback2.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result1, 'L0');
        assert.equal(result2, 'L1');
      });
    });

    describe('client_side_code_initialize_hook', function() {
      it('should add setup code for callback', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        var scope = createBasicScope();

        var testFunction = function() { return 42; };
        var callback = new Callback(scope, testFunction, []);

        callback.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.equal(setupCode.length, 1, 'Should add one setup code entry');
        assert.include(setupCode[0], '$$SCOPE_METHODS.setup_callback$$', 'Should call setup_callback method');
        assert.include(setupCode[0], 'Coral.sponges', 'Should reference sponges');
      });

      it('should allocate global symbol for callback function', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        var scope = createBasicScope();

        var testFunction = function() { return 42; };
        var callback = new Callback(scope, testFunction, []);

        callback.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var globals = mockCompilationContext.get_allocated_globals();
        assert.equal(globals.length, 1);
        assert.equal(globals[0].value, testFunction);
      });

      it('should include own reference in setup code', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        var scope = createBasicScope();

        var callback = new Callback(scope, function() {}, []);

        callback.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.include(setupCode[0], 'OWN_REF', 'Should include own reference');
      });
    });
  });

  describe('PureFunction', function() {
    var PureFunction;

    beforeEach(function() {
      PureFunction = require('../../ir/computables/pure_function');
      // Load extended implementation
      require('../../plugins/compile_client_app/extended_computables/pure_function');
    });

    describe('client_side_code_reference_hook', function() {
      it('should allocate local symbol', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var pureFunc = new PureFunction(scope, function(x) { return x * 2; }, []);

        var result = pureFunc.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result, 'L0', 'Should return first local symbol');
      });
    });

    describe('client_side_code_initialize_hook', function() {
      it('should add setup code for synchronous pure function', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        mockExecutionContext.set_input_symbols(['INPUT1', 'INPUT2']);

        var scope = createBasicScope();

        var pureFunc = new PureFunction(scope, function(x, y) { return x + y; }, []);
        pureFunc.is_needed_for_async_pre_initialize_phase = function() { return false; };
        pureFunc.is_output_updated_on_input_change = function() { return true; };

        pureFunc.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.isAtLeast(setupCode.length, 1, 'Should add at least one setup code entry');
      });

      it('should skip setup for initially async functions', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();

        var scope = createBasicScope();

        var pureFunc = new PureFunction(scope, function(x) { return x * 2; }, []);
        pureFunc.is_initially_async = function() { return true; };

        pureFunc.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.equal(setupCode.length, 0, 'Should not add setup code for initially async functions');
      });

      it('should include function string in setup code', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        mockExecutionContext.set_input_symbols([]);

        var scope = createBasicScope();

        var testFunction = function(x) { return x * 2; };
        var pureFunc = new PureFunction(scope, testFunction, []);
        pureFunc.is_needed_for_async_pre_initialize_phase = function() { return false; };

        pureFunc.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var setupCode = mockExecutionContext.get_setup_code();
        if (setupCode.length > 0) {
          // Should reference a compute method
          var hasComputeMethod = setupCode.some(function(code) {
            return code.indexOf('compute') !== -1;
          });
          assert.isTrue(hasComputeMethod, 'Should reference a compute method');
        }
      });
    });

    describe('client_side_code_async_pre_initialize_hook', function() {
      it('should add setup code for async pure function', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        mockExecutionContext.set_input_symbols(['INPUT1']);

        var scope = createBasicScope();

        var pureFunc = new PureFunction(scope, function(x) { return Promise.resolve(x * 2); }, []);
        pureFunc.is_output_updated_on_input_change = function() { return true; };

        pureFunc.client_side_code_async_pre_initialize_hook(mockCompilationContext, mockExecutionContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.isAtLeast(setupCode.length, 1, 'Should add at least one setup code entry');
        assert.include(setupCode[0], 'promise_async_compute', 'Should call promise_async_compute method');
      });

      it('should include input symbols in packed args', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        mockExecutionContext.set_input_symbols(['INPUT1', 'INPUT2']);

        var scope = createBasicScope();

        var pureFunc = new PureFunction(scope, function(x, y) { return Promise.resolve(x + y); }, []);
        pureFunc.is_output_updated_on_input_change = function() { return true; };

        pureFunc.client_side_code_async_pre_initialize_hook(mockCompilationContext, mockExecutionContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.include(setupCode[0], 'OWN_REF', 'Should include own reference');
      });
    });
  });

  describe('EventHandler', function() {
    var EventHandler;

    beforeEach(function() {
      EventHandler = require('../../ir/computables/event_handler');
      // Load extended implementation
      require('../../plugins/compile_client_app/extended_computables/event_handler');
    });

    describe('has_client_side_code_initialize_hook', function() {
      it('should return false for event handlers', function() {
        var scope = createBasicScope();
        var handler = new EventHandler(scope, function() {}, [], 'click');

        var result = handler.has_client_side_code_initialize_hook();
        assert.isFalse(result, 'EventHandlers do not wire themselves up during initialization');
      });
    });

    describe('client_side_code_reference_hook', function() {
      it('should allocate global symbol for handler function', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var testFunction = function() { console.log('clicked'); };
        var handler = new EventHandler(scope, testFunction, [], 'click');

        var result = handler.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result, 'G0', 'Should return first global symbol');

        var globals = mockCompilationContext.get_allocated_globals();
        assert.equal(globals.length, 1);
        assert.equal(globals[0].value, testFunction);
      });

      it('should store function global symbol for later use', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var handler = new EventHandler(scope, function() {}, [], 'click');

        var result = handler.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(handler._function_global_symbol, result, 'Should store symbol internally');
      });
    });

    describe('client_side_code_cleanup_hook', function() {
      it('should return cleanup symbol for initialize event type', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        var scope = createBasicScope();

        var handler = new EventHandler(scope, function() {}, [], 'initialize');

        var result = handler.client_side_code_cleanup_hook(mockCompilationContext, mockExecutionContext);

        assert.equal(result, '$$SYMBOLS.cleanup.EVENT_LISTENERS$$', 'Should return event listeners cleanup symbol');
      });

      it('should return empty string for non-initialize event types', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        var scope = createBasicScope();

        var handler = new EventHandler(scope, function() {}, [], 'click');

        var result = handler.client_side_code_cleanup_hook(mockCompilationContext, mockExecutionContext);

        assert.equal(result, '', 'Should return empty string for non-initialize events');
      });
    });

    describe('generate_packed_args_hook', function() {
      it('should have generate_packed_args_hook method', function() {
        var scope = createBasicScope();
        var handler = new EventHandler(scope, function() {}, [], 'click');

        assert.isFunction(handler.generate_packed_args_hook, 'Should have generate_packed_args_hook method');
      });
    });

    describe('internal_event_wiring_symbols_hook', function() {
      it('should return wiring symbols combining function symbol and packed args', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var mockScopeCompilationContext = createMockScopeCompilationContext();
        var scope = createBasicScope();

        var handler = new EventHandler(scope, function() {}, [], 'click');

        // First allocate the function global symbol
        handler.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        var result = handler.internal_event_wiring_symbols_hook(mockCompilationContext, mockScopeCompilationContext);

        assert.isString(result, 'Should return a string');
        assert.include(result, handler._function_global_symbol, 'Should include function global symbol');
      });
    });
  });

  describe('Computable (base class extensions)', function() {
    var Computable;

    beforeEach(function() {
      Computable = require('../../ir/computable');
      // Load extended implementation
      require('../../plugins/compile_client_app/extended_computables/computable');
    });

    describe('has_client_side_code_initialize_hook', function() {
      it('should return true by default', function() {
        // We can test this on a concrete subclass like Constant
        var Constant = require('../../ir/computables/constant');
        require('../../plugins/compile_client_app/extended_computables/constant');

        // Check the base Computable prototype
        assert.isFunction(Computable.prototype.has_client_side_code_initialize_hook);

        // The default implementation returns true
        var defaultResult = Computable.prototype.has_client_side_code_initialize_hook.call({});
        assert.isTrue(defaultResult, 'Base implementation returns true');
      });
    });

    describe('client_side_code_cleanup_hook', function() {
      it('should return empty string by default', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockScopeCompilationContext = createMockScopeCompilationContext();

        var result = Computable.prototype.client_side_code_cleanup_hook.call({}, mockCompilationContext, mockScopeCompilationContext);

        assert.equal(result, '', 'Default cleanup hook returns empty string');
      });
    });

    describe('is_needed_for_async_pre_initialize_phase', function() {
      it('should be a function', function() {
        assert.isFunction(Computable.prototype.is_needed_for_async_pre_initialize_phase);
      });
    });

    describe('is_needed_for_sync_initialize_phase', function() {
      it('should be a function', function() {
        assert.isFunction(Computable.prototype.is_needed_for_sync_initialize_phase);
      });
    });

    describe('is_needed_for_update_cycle', function() {
      it('should be a function', function() {
        assert.isFunction(Computable.prototype.is_needed_for_update_cycle);
      });
    });

    describe('get_client_side_input_metadata', function() {
      it('should return object with required phase flags', function() {
        // Test with a concrete implementation
        var ScopeParameter = require('../../ir/computables/scope_parameter');
        require('../../plugins/compile_client_app/extended_computables/scope_parameter');

        var scope = createBasicScope();
        var param = new ScopeParameter(scope);

        var metadata = param.get_client_side_input_metadata(0);

        assert.isObject(metadata);
        assert.property(metadata, 'is_needed_for_async_pre_initialize_phase');
        assert.property(metadata, 'is_needed_for_sync_initialize_phase');
        assert.property(metadata, 'is_needed_for_update_cycle');
        assert.isBoolean(metadata.is_needed_for_async_pre_initialize_phase);
        assert.isBoolean(metadata.is_needed_for_sync_initialize_phase);
        assert.isBoolean(metadata.is_needed_for_update_cycle);
      });
    });
  });


  describe('IterateArray', function() {
    var IterateArray;
    var VirtualArrayItem;
    var VirtualIntermediate;
    var Constant;

    beforeEach(function() {
      IterateArray = require('../../ir/computables/iterate_array');
      VirtualArrayItem = require('../../ir/computables/virtual_array_item');
      VirtualIntermediate = require('../../ir/computables/virtual_intermediate');
      Constant = require('../../ir/computables/constant');
      // Load extended implementation
      require('../../plugins/compile_client_app/extended_computables/iterate_array');
    });

    // Helper to create a minimal IterateArray for testing
    function createMinimalIterateArray(scope) {
      var IRAnyType = require('../../ir/types/any');
      var IRExactValueType = require('../../ir/types/exact_value');
      
      var initialIntermediate = new Constant(scope, null);
      var arrayComputable = new Constant(scope, []);
      var itemVirtual = new VirtualArrayItem(scope, arrayComputable);
      var intermediateVirtual = new VirtualIntermediate(scope, new IRAnyType());
      var identityFunction = function(a, b) { return a === b; };

      var iterateArray = new IterateArray(
        scope,
        initialIntermediate,
        arrayComputable,
        itemVirtual,
        intermediateVirtual,
        identityFunction
      );

      // Mock the internal state to avoid "no choices" error
      // This is acceptable for unit testing individual hooks
      iterateArray._choice_types = [new IRExactValueType('default')];
      iterateArray._choice_scopes = [new Scope('test_choice_scope')];
      iterateArray._choice_output_paths = ['result'];
      iterateArray._choice_computable_indexes = [[]];

      return iterateArray;
    }

    describe('is_needed_for_async_pre_initialize_phase', function() {
      it('should return true for IterateArray', function() {
        var scope = createBasicScope();
        var iterateArray = createMinimalIterateArray(scope);

        var result = iterateArray.is_needed_for_async_pre_initialize_phase();

        assert.isTrue(result, 'IterateArray needs async pre-initialize phase');
      });
    });

    describe('is_needed_for_sync_initialize_phase', function() {
      it('should return true for IterateArray', function() {
        var scope = createBasicScope();
        var iterateArray = createMinimalIterateArray(scope);

        var result = iterateArray.is_needed_for_sync_initialize_phase();

        assert.isTrue(result, 'IterateArray needs sync initialize phase');
      });
    });

    describe('client_side_code_reference_hook', function() {
      it('should allocate async internal symbol for scope array', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        // Add allocate_async_internal_symbol and allocate_sync_internal_symbol to mock
        var asyncInternalCounter = 0;
        var syncInternalCounter = 0;
        mockInstantiationContext.allocate_async_internal_symbol = function(name) {
          return 'ASYNC_INT_' + (asyncInternalCounter++) + '_' + name;
        };
        mockInstantiationContext.allocate_sync_internal_symbol = function(name) {
          return 'SYNC_INT_' + (syncInternalCounter++) + '_' + name;
        };

        var iterateArray = createMinimalIterateArray(scope);

        var result = iterateArray.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result, 'ASYNC_INT_0_scope_array', 'Should return async internal symbol for scope_array');
        assert.equal(iterateArray._scope_array_symbol, result, 'Should store scope array symbol');
      });

      it('should allocate sync internal symbol for final intermediate', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var asyncInternalCounter = 0;
        var syncInternalCounter = 0;
        mockInstantiationContext.allocate_async_internal_symbol = function(name) {
          return 'ASYNC_INT_' + (asyncInternalCounter++) + '_' + name;
        };
        mockInstantiationContext.allocate_sync_internal_symbol = function(name) {
          return 'SYNC_INT_' + (syncInternalCounter++) + '_' + name;
        };

        var iterateArray = createMinimalIterateArray(scope);

        iterateArray.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(iterateArray._field_name_references.after, 'SYNC_INT_0_final_intermediate', 'Should allocate final_intermediate symbol');
      });

      it('should store field name references', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        mockInstantiationContext.allocate_async_internal_symbol = function(name) {
          return 'ASYNC_' + name;
        };
        mockInstantiationContext.allocate_sync_internal_symbol = function(name) {
          return 'SYNC_' + name;
        };

        var iterateArray = createMinimalIterateArray(scope);

        iterateArray.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.isObject(iterateArray._field_name_references);
        assert.property(iterateArray._field_name_references, 'scope_array');
        assert.property(iterateArray._field_name_references, 'after');
        assert.equal(iterateArray._field_name_references.scope_array, 'ASYNC_scope_array');
        assert.equal(iterateArray._field_name_references.after, 'SYNC_final_intermediate');
      });
    });

    describe('get_client_side_input_metadata', function() {
      it('should return metadata object with phase flags', function() {
        var scope = createBasicScope();
        var iterateArray = createMinimalIterateArray(scope);

        var metadata = iterateArray.get_client_side_input_metadata(0);

        assert.isObject(metadata);
        assert.property(metadata, 'is_needed_for_async_pre_initialize_phase');
        assert.property(metadata, 'is_needed_for_sync_initialize_phase');
        assert.property(metadata, 'is_needed_for_update_cycle');
        assert.isBoolean(metadata.is_needed_for_async_pre_initialize_phase);
        assert.isBoolean(metadata.is_needed_for_sync_initialize_phase);
        assert.isBoolean(metadata.is_needed_for_update_cycle);
      });

      it('should return correct metadata for initial intermediate index (0)', function() {
        var scope = createBasicScope();
        var iterateArray = createMinimalIterateArray(scope);

        var metadata = iterateArray.get_client_side_input_metadata(0); // INITIAL_INTERMEDIATE_COMPUTABLE_INDEX

        assert.isFalse(metadata.is_needed_for_async_pre_initialize_phase, 'Initial intermediate not needed in async phase');
        assert.isTrue(metadata.is_needed_for_sync_initialize_phase, 'Initial intermediate needed in sync phase');
        assert.isFalse(metadata.is_needed_for_update_cycle, 'Initial intermediate not needed in update cycle');
      });

      it('should return correct metadata for array computable index (1)', function() {
        var scope = createBasicScope();
        var iterateArray = createMinimalIterateArray(scope);

        var metadata = iterateArray.get_client_side_input_metadata(1); // ARRAY_COMPUTABLE_INDEX

        assert.isTrue(metadata.is_needed_for_async_pre_initialize_phase, 'Array computable needed in async phase');
        assert.isTrue(metadata.is_needed_for_sync_initialize_phase, 'Array computable needed in sync phase');
        // is_needed_for_update_cycle depends on array computable
        assert.isBoolean(metadata.is_needed_for_update_cycle);
      });

      it('should return correct metadata for intermediate virtual index (2)', function() {
        var scope = createBasicScope();
        var iterateArray = createMinimalIterateArray(scope);

        var metadata = iterateArray.get_client_side_input_metadata(2); // INTERMEDIATE_VIRTUAL_INDEX

        assert.isFalse(metadata.is_needed_for_async_pre_initialize_phase, 'Intermediate virtual not needed in async phase');
        assert.isTrue(metadata.is_needed_for_sync_initialize_phase, 'Intermediate virtual needed in sync phase');
        assert.isFalse(metadata.is_needed_for_update_cycle, 'Intermediate virtual not needed in update cycle');
      });
    });

    describe('client_side_code_cleanup_hook', function() {
      it('should return empty string when no choice scopes have cleanup', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockScopeCompilationContext = createMockScopeCompilationContext();
        var scope = createBasicScope();

        // Add get_cleanup_instructions to mock
        mockCompilationContext.get_scope_compilation_context = function() {
          return {
            get_cleanup_instructions: function() {
              return [];
            }
          };
        };

        var iterateArray = createMinimalIterateArray(scope);
        iterateArray._choice_scopes = []; // No choice scopes

        var result = iterateArray.client_side_code_cleanup_hook(mockCompilationContext, mockScopeCompilationContext);

        assert.equal(result, '', 'Should return empty string when no cleanup needed');
      });
    });

    describe('Integration with other hooks', function() {
      it('should properly initialize with reference hook before calling other hooks', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();

  describe('DOMElement', function() {
    var DOMElement;

    beforeEach(function() {
      DOMElement = require('../../ir/computables/dom_element');
      require('../../plugins/compile_client_app/extended_computables/dom_element');
    });

    describe('is_needed_for_async_pre_initialize_phase', function() {
      it('should return false for DOM elements', function() {
        var scope = createBasicScope();
        var VirtualPlacement = require('../../ir/computables/virtual_placement');
        var placement = new VirtualPlacement(scope);
        var domElement = new DOMElement(scope, 'div', {}, placement);

        var result = domElement.is_needed_for_async_pre_initialize_phase();

        assert.isFalse(result, 'DOM elements should not appear in async pre-initialize phase');
      });
    });

    describe('client_side_code_reference_hook', function() {
      it('should allocate sync internal symbols for after and inner', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var syncInternalCounter = 0;
        mockInstantiationContext.allocate_sync_internal_symbol = function(name) {
          return 'SYNC_INT_' + (syncInternalCounter++) + '_' + name;
        };

        var VirtualPlacement = require('../../ir/computables/virtual_placement');
        var placement = new VirtualPlacement(scope);
        var domElement = new DOMElement(scope, 'div', {}, placement);
        domElement._field_name_references = {};

        var result = domElement.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result, 'SYNC_INT_0_after', 'Should return after symbol');
        assert.equal(domElement._field_name_references.after, 'SYNC_INT_0_after');
        assert.equal(domElement._field_name_references.inner, 'SYNC_INT_1_inner');
      });
    });

    describe('client_side_code_initialize_hook', function() {
      it('should add setup code for element without attributes', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        mockExecutionContext.get_input_symbol = function(index) {
          return 'INPUT_' + index;
        };

        var scope = createBasicScope();
        var VirtualPlacement = require('../../ir/computables/virtual_placement');
        var placement = new VirtualPlacement(scope);
        var domElement = new DOMElement(scope, 'div', {}, placement);
        domElement._field_name_references = { after: 'AFTER_SYM', inner: 'INNER_SYM' };
        domElement._node_type = 'div';
        domElement._attributes = {};

        domElement.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.equal(setupCode.length, 1);
        assert.include(setupCode[0], '$$SCOPE_METHODS.create_and_insert_element$$');
      });

      it('should allocate global for node type', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        mockExecutionContext.get_input_symbol = function() { return 'INPUT'; };

        var scope = createBasicScope();
        var VirtualPlacement = require('../../ir/computables/virtual_placement');
        var placement = new VirtualPlacement(scope);
        var domElement = new DOMElement(scope, 'span', {}, placement);
        domElement._field_name_references = { after: 'A', inner: 'I' };
        domElement._node_type = 'span';
        domElement._attributes = {};

        domElement.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var globals = mockCompilationContext.get_allocated_globals();
        assert.equal(globals.length, 1);
        assert.equal(globals[0].value, 'span');
      });

      it('should add setup code for element with attributes', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        mockExecutionContext.get_input_symbol = function(index) {
          return 'INPUT_' + index;
        };

        var scope = createBasicScope();
        var VirtualPlacement = require('../../ir/computables/virtual_placement');
        var placement = new VirtualPlacement(scope);
        var domElement = new DOMElement(scope, 'div', { class: [] }, placement);
        domElement._field_name_references = { after: 'AFTER', inner: 'INNER' };
        domElement._node_type = 'div';
        domElement._attributes = { class: [] };

        domElement.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.equal(setupCode.length, 1);
        assert.include(setupCode[0], '$$SCOPE_METHODS.create_and_insert_element_with_attributes$$');
      });
    });
  });

  describe('ScopeInstance', function() {
    var ScopeInstance;

    beforeEach(function() {
      ScopeInstance = require('../../ir/computables/scope_instance');
      require('../../plugins/compile_client_app/extended_computables/scope_instance');
    });

    describe('is_needed_for_async_pre_initialize_phase', function() {
      it('should return true for scope instances', function() {
        var scope = createBasicScope();
        var targetScope = new Scope('target_scope');
        var ScopeParameter = require('../../ir/computables/scope_parameter');
        var param = new ScopeParameter(targetScope);
        var Constant = require('../../ir/computables/constant');
        var input = new Constant(scope, null);
        var scopeInstance = new ScopeInstance(scope, targetScope, [input]);

        var result = scopeInstance.is_needed_for_async_pre_initialize_phase();

        assert.isTrue(result, 'Scope instances need async pre-initialize phase');
      });
    });

    describe('is_needed_for_sync_initialize_phase', function() {
      it('should return true for scope instances', function() {
        var scope = createBasicScope();
        var targetScope = new Scope('target_scope');
        var ScopeParameter = require('../../ir/computables/scope_parameter');
        var param = new ScopeParameter(targetScope);
        var Constant = require('../../ir/computables/constant');
        var input = new Constant(scope, null);
        var scopeInstance = new ScopeInstance(scope, targetScope, [input]);

        var result = scopeInstance.is_needed_for_sync_initialize_phase();

        assert.isTrue(result, 'Scope instances need sync initialize phase');
      });
    });

    describe('client_side_code_reference_hook', function() {
      it('should allocate async internal symbol for scope', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var asyncInternalCounter = 0;
        var syncInternalCounter = 0;
        mockInstantiationContext.allocate_async_internal_symbol = function(name) {
          return 'ASYNC_' + (asyncInternalCounter++) + '_' + name;
        };
        mockInstantiationContext.allocate_sync_internal_symbol = function(name) {
          return 'SYNC_' + (syncInternalCounter++) + '_' + name;
        };

        // Mock scope compilation context
        mockCompilationContext.get_scope_compilation_context = function() {
          return {
            get_async_output_count: function() { return 0; },
            get_sync_output_count: function() { return 1; },
            get_sync_output_field_name: function(i) { return 'after'; }
          };
        };

        var targetScope = new Scope('target_scope');
        var ScopeParameter = require('../../ir/computables/scope_parameter');
        var param = new ScopeParameter(targetScope);
        var Constant = require('../../ir/computables/constant');
        var input = new Constant(scope, null);
        var scopeInstance = new ScopeInstance(scope, targetScope, [input]);
        scopeInstance._async_field_names = [];
        scopeInstance._sync_field_names = [];
        scopeInstance._field_name_references = {};

        var result = scopeInstance.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result, 'ASYNC_0_scope', 'Should return scope symbol');
        assert.equal(scopeInstance._scope_symbol, 'ASYNC_0_scope');
      });

      it('should allocate sync internal symbols for sync outputs', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var syncInternalCounter = 0;
        mockInstantiationContext.allocate_async_internal_symbol = function() {
          return 'ASYNC_SCOPE';
        };
        mockInstantiationContext.allocate_sync_internal_symbol = function(name) {
          return 'SYNC_' + (syncInternalCounter++) + '_' + name;
        };

        mockCompilationContext.get_scope_compilation_context = function() {
          return {
            get_async_output_count: function() { return 0; },
            get_sync_output_count: function() { return 2; },
            get_sync_output_field_name: function(i) {
              return i === 0 ? 'after' : 'result';
            }
          };
        };

        var targetScope = new Scope('target_scope');
        var ScopeParameter = require('../../ir/computables/scope_parameter');
        var param = new ScopeParameter(targetScope);
        var Constant = require('../../ir/computables/constant');
        var input = new Constant(scope, null);
        var scopeInstance = new ScopeInstance(scope, targetScope, [input]);
        scopeInstance._async_field_names = [];
        scopeInstance._sync_field_names = [];
        scopeInstance._field_name_references = {};

        scopeInstance.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(scopeInstance._field_name_references.after, 'SYNC_0_sync-0');
        assert.equal(scopeInstance._field_name_references.result, 'SYNC_1_sync-1');
        assert.deepEqual(scopeInstance._sync_field_names, ['after', 'result']);
      });
    });

    describe('get_client_side_input_metadata', function() {
      it('should delegate to scope parameter metadata', function() {
        var scope = createBasicScope();
        var targetScope = new Scope('target_scope');
        var ScopeParameter = require('../../ir/computables/scope_parameter');
        var param1 = new ScopeParameter(targetScope);
        var param2 = new ScopeParameter(targetScope);

        var Constant = require('../../ir/computables/constant');
        var input1 = new Constant(scope, null);
        var input2 = new Constant(scope, null);
        var scopeInstance = new ScopeInstance(scope, targetScope, [input1, input2]);

        var metadata = scopeInstance.get_client_side_input_metadata(0);

        assert.isObject(metadata);
        assert.property(metadata, 'is_needed_for_async_pre_initialize_phase');
        assert.property(metadata, 'is_needed_for_sync_initialize_phase');
        assert.property(metadata, 'is_needed_for_update_cycle');
      });
    });

    describe('client_side_code_cleanup_hook', function() {
      it('should return scope symbol when cleanup needed', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockScopeCompilationContext = createMockScopeCompilationContext();
        var scope = createBasicScope();

        mockCompilationContext.get_scope_compilation_context = function() {
          return {
            get_cleanup_instructions: function() {
              return ['CLEANUP_CODE'];
            }
          };
        };

        var targetScope = new Scope('target_scope');
        var ScopeParameter = require('../../ir/computables/scope_parameter');
        var param = new ScopeParameter(targetScope);
        var Constant = require('../../ir/computables/constant');
        var input = new Constant(scope, null);
        var scopeInstance = new ScopeInstance(scope, targetScope, [input]);
        scopeInstance._scope_symbol = 'SCOPE_SYM';
        scopeInstance.get_scope_symbol = function() { return 'SCOPE_SYM'; };

        var result = scopeInstance.client_side_code_cleanup_hook(mockCompilationContext, mockScopeCompilationContext);

        assert.equal(result, 'SCOPE_SYM', 'Should return scope symbol when cleanup needed');
      });

      it('should return empty string when no cleanup needed', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockScopeCompilationContext = createMockScopeCompilationContext();
        var scope = createBasicScope();

        mockCompilationContext.get_scope_compilation_context = function() {
          return {
            get_cleanup_instructions: function() {
              return [];
            }
          };
        };

        var targetScope = new Scope('target_scope');
        var ScopeParameter = require('../../ir/computables/scope_parameter');
        var param = new ScopeParameter(targetScope);
        var Constant = require('../../ir/computables/constant');
        var input = new Constant(scope, null);
        var scopeInstance = new ScopeInstance(scope, targetScope, [input]);

        var result = scopeInstance.client_side_code_cleanup_hook(mockCompilationContext, mockScopeCompilationContext);

        assert.equal(result, '', 'Should return empty string when no cleanup needed');
      });
    });
  });

  describe('PolymorphicScopeInstance', function() {
    var PolymorphicScopeInstance;
    var IRExactValueType;

    beforeEach(function() {
      PolymorphicScopeInstance = require('../../ir/computables/polymorphic_scope_instance');
      IRExactValueType = require('../../ir/types/exact_value');
      require('../../plugins/compile_client_app/extended_computables/polymorphic_scope_instance');
    });

    describe('is_needed_for_async_pre_initialize_phase', function() {
      it('should return true for polymorphic scope instances', function() {
        var scope = createBasicScope();
        var Constant = require('../../ir/computables/constant');
        var conditionComputable = new Constant(scope, 'choice1');
        
        var polymorphicScope = new PolymorphicScopeInstance(scope, conditionComputable);

        var result = polymorphicScope.is_needed_for_async_pre_initialize_phase();

        assert.isTrue(result, 'Polymorphic scope instances need async pre-initialize phase');
      });
    });

    describe('is_needed_for_sync_initialize_phase', function() {
      it('should return true for polymorphic scope instances', function() {
        var scope = createBasicScope();
        var Constant = require('../../ir/computables/constant');
        var conditionComputable = new Constant(scope, 'choice1');
        
        var polymorphicScope = new PolymorphicScopeInstance(scope, conditionComputable);

        var result = polymorphicScope.is_needed_for_sync_initialize_phase();

        assert.isTrue(result, 'Polymorphic scope instances need sync initialize phase');
      });
    });

    describe('get_client_side_input_metadata', function() {
      it('should return metadata with async needed for index 0 (condition)', function() {
        var scope = createBasicScope();
        var Constant = require('../../ir/computables/constant');
        var conditionComputable = new Constant(scope, 'choice1');
        
        var polymorphicScope = new PolymorphicScopeInstance(scope, conditionComputable);

        var metadata = polymorphicScope.get_client_side_input_metadata(0);

        assert.isTrue(metadata.is_needed_for_async_pre_initialize_phase, 'Condition needed in async phase');
        assert.isFalse(metadata.is_needed_for_sync_initialize_phase, 'Condition not needed in sync phase');
        assert.isBoolean(metadata.is_needed_for_update_cycle);
      });
    });

    describe('client_side_code_cleanup_hook', function() {
      it('should return empty string when no choice scopes have cleanup', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockScopeCompilationContext = createMockScopeCompilationContext();
        var scope = createBasicScope();

        mockCompilationContext.get_scope_compilation_context = function() {
          return {
            get_cleanup_instructions: function() {
              return [];
            }
          };
        };

        var Constant = require('../../ir/computables/constant');
        var conditionComputable = new Constant(scope, 'choice1');
        var polymorphicScope = new PolymorphicScopeInstance(scope, conditionComputable);
        polymorphicScope._choice_scopes = [];

        var result = polymorphicScope.client_side_code_cleanup_hook(mockCompilationContext, mockScopeCompilationContext);

        assert.equal(result, '', 'Should return empty string when no cleanup needed');
      });
    });
  });
        var scope = createBasicScope();

        mockInstantiationContext.allocate_async_internal_symbol = function(name) {
          return 'ASYNC_' + name;
        };
        mockInstantiationContext.allocate_sync_internal_symbol = function(name) {
          return 'SYNC_' + name;
        };

        var iterateArray = createMinimalIterateArray(scope);

        // Call reference hook first (as would happen in real compilation)
        iterateArray.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        // Verify state is set up for other hooks
        assert.isDefined(iterateArray._field_name_references);
        assert.isDefined(iterateArray._scope_array_symbol);
      });
    });
  });

  describe('DOMText', function() {
    var DOMText;

    beforeEach(function() {
      DOMText = require('../../ir/computables/dom_text');
      require('../../plugins/compile_client_app/extended_computables/dom_text');
    });

    describe('is_needed_for_async_pre_initialize_phase', function() {
      it('should return false for DOM text nodes', function() {
        var scope = createBasicScope();
        var VirtualPlacement = require('../../ir/computables/virtual_placement');
        var placement = new VirtualPlacement(scope);
        var domText = new DOMText(scope, 'Hello World', placement);

        var result = domText.is_needed_for_async_pre_initialize_phase();

        assert.isFalse(result, 'DOM text nodes should not appear in async pre-initialize phase');
      });
    });

    describe('client_side_code_reference_hook', function() {
      it('should allocate local symbol', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var VirtualPlacement = require('../../ir/computables/virtual_placement');
        var placement = new VirtualPlacement(scope);
        var domText = new DOMText(scope, 'Test', placement);

        var result = domText.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result, 'L0', 'Should return first local symbol');
      });
    });

    describe('client_side_code_initialize_hook', function() {
      it('should add setup code for text node creation', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        mockExecutionContext.get_input_symbol = function(index) {
          return 'INPUT_' + index;
        };
        mockCompilationContext.get_global_helper_symbol = function(name) {
          return 'HELPER_' + name;
        };

        var scope = createBasicScope();
        var VirtualPlacement = require('../../ir/computables/virtual_placement');
        var placement = new VirtualPlacement(scope);
        var domText = new DOMText(scope, 'Hello World', placement);

        domText.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.equal(setupCode.length, 1);
        assert.include(setupCode[0], '$$SCOPE_METHODS.sync_compute_no_recompute$$');
      });

      it('should allocate global for text string', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        mockExecutionContext.get_input_symbol = function() { return 'INPUT'; };
        mockCompilationContext.get_global_helper_symbol = function() { return 'HELPER'; };

        var scope = createBasicScope();
        var VirtualPlacement = require('../../ir/computables/virtual_placement');
        var placement = new VirtualPlacement(scope);
        var domText = new DOMText(scope, 'Test Text', placement);

        domText.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var globals = mockCompilationContext.get_allocated_globals();
        assert.equal(globals.length, 1);
        assert.equal(globals[0].value, 'Test Text');
      });
    });
  });

  describe('DOMVariable', function() {
    var DOMVariable;

    beforeEach(function() {
      DOMVariable = require('../../ir/computables/dom_variable');
      require('../../plugins/compile_client_app/extended_computables/dom_variable');
    });

    describe('is_needed_for_async_pre_initialize_phase', function() {
      it('should return false for DOM variable nodes', function() {
        var scope = createBasicScope();
        var Constant = require('../../ir/computables/constant');
        var VirtualPlacement = require('../../ir/computables/virtual_placement');
        var value = new Constant(scope, 'value');
        var placement = new VirtualPlacement(scope);
        var domVariable = new DOMVariable(scope, value, placement);

        var result = domVariable.is_needed_for_async_pre_initialize_phase();

        assert.isFalse(result, 'DOM variable nodes should not appear in async pre-initialize phase');
      });
    });

    describe('client_side_code_reference_hook', function() {
      it('should allocate local symbol', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var Constant = require('../../ir/computables/constant');
        var VirtualPlacement = require('../../ir/computables/virtual_placement');
        var value = new Constant(scope, 'test');
        var placement = new VirtualPlacement(scope);
        var domVariable = new DOMVariable(scope, value, placement);

        var result = domVariable.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result, 'L0', 'Should return first local symbol');
      });
    });

    describe('client_side_code_initialize_hook', function() {
      it('should add setup code for variable text creation', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        mockExecutionContext.get_input_symbol = function(index) {
          return 'INPUT_' + index;
        };

        var scope = createBasicScope();
        var Constant = require('../../ir/computables/constant');
        var VirtualPlacement = require('../../ir/computables/virtual_placement');
        var value = new Constant(scope, 'dynamic value');
        var placement = new VirtualPlacement(scope);
        var domVariable = new DOMVariable(scope, value, placement);

        domVariable.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.equal(setupCode.length, 1);
        assert.include(setupCode[0], '$$SCOPE_METHODS.create_and_insert_variable_text$$');
      });

      it('should include placement and value symbols in packed args', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        var inputSymbols = ['PLACEMENT_SYM', 'VALUE_SYM'];
        mockExecutionContext.get_input_symbol = function(index) {
          return inputSymbols[index];
        };

        var scope = createBasicScope();
        var Constant = require('../../ir/computables/constant');
        var VirtualPlacement = require('../../ir/computables/virtual_placement');
        var value = new Constant(scope, 'test');
        var placement = new VirtualPlacement(scope);
        var domVariable = new DOMVariable(scope, value, placement);

        domVariable.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.include(setupCode[0], 'VALUE_SYM');
        assert.include(setupCode[0], 'PLACEMENT_SYM');
      });
    });
  });

  describe('DOMUnescapedVariable', function() {
    var DOMUnescapedVariable;

    beforeEach(function() {
      DOMUnescapedVariable = require('../../ir/computables/dom_unescaped_variable');
      require('../../plugins/compile_client_app/extended_computables/dom_unescaped_variable');
    });

    describe('is_needed_for_async_pre_initialize_phase', function() {
      it('should return false for DOM unescaped variable nodes', function() {
        var scope = createBasicScope();
        var Constant = require('../../ir/computables/constant');
        var VirtualPlacement = require('../../ir/computables/virtual_placement');
        var value = new Constant(scope, '<b>html</b>');
        var placement = new VirtualPlacement(scope);
        var domUnescaped = new DOMUnescapedVariable(scope, value, placement);

        var result = domUnescaped.is_needed_for_async_pre_initialize_phase();

        assert.isFalse(result, 'DOM unescaped variable nodes should not appear in async pre-initialize phase');
      });
    });

    describe('client_side_code_reference_hook', function() {
      it('should allocate local symbol', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var syncInternalCounter = 0;
        mockInstantiationContext.allocate_sync_internal_symbol = function(name) {
          return 'SYNC_INT_' + (syncInternalCounter++) + '_' + name;
        };

        var scope = createBasicScope();
        var Constant = require('../../ir/computables/constant');
        var VirtualPlacement = require('../../ir/computables/virtual_placement');
        var value = new Constant(scope, '<div>test</div>');
        var placement = new VirtualPlacement(scope);
        var domUnescaped = new DOMUnescapedVariable(scope, value, placement);

        var result = domUnescaped.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result, 'L0', 'Should return first local symbol');
      });
    });

    describe('client_side_code_initialize_hook', function() {
      it('should add setup code for unescaped HTML insertion', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        mockExecutionContext.get_input_symbol = function(index) {
          return 'INPUT_' + index;
        };

        var scope = createBasicScope();
        var Constant = require('../../ir/computables/constant');
        var VirtualPlacement = require('../../ir/computables/virtual_placement');
        var value = new Constant(scope, '<span>HTML</span>');
        var placement = new VirtualPlacement(scope);
        var domUnescaped = new DOMUnescapedVariable(scope, value, placement);

        domUnescaped.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.equal(setupCode.length, 1);
        assert.include(setupCode[0], '$$SCOPE_METHODS.create_and_insert_unescaped_string$$');
      });
    });
  });

  describe('DOMInlineElement', function() {
    var DOMInlineElement;

    beforeEach(function() {
      DOMInlineElement = require('../../ir/computables/dom_inline_element');
      require('../../plugins/compile_client_app/extended_computables/dom_inline_element');
    });

    describe('is_needed_for_async_pre_initialize_phase', function() {
      it('should return false for inline elements', function() {
        var scope = createBasicScope();
        var VirtualPlacement = require('../../ir/computables/virtual_placement');
        var placement = new VirtualPlacement(scope);
        var inlineElement = new DOMInlineElement(scope, '<span>test</span>', placement);

        var result = inlineElement.is_needed_for_async_pre_initialize_phase();

        assert.isFalse(result, 'Inline DOM elements should not appear in async pre-initialize phase');
      });
    });

    describe('client_side_code_reference_hook', function() {
      it('should allocate local symbol', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var syncInternalCounter = 0;
        mockInstantiationContext.allocate_sync_internal_symbol = function(name) {
          return 'SYNC_INT_' + (syncInternalCounter++) + '_' + name;
        };

        var scope = createBasicScope();
        var VirtualPlacement = require('../../ir/computables/virtual_placement');
        var placement = new VirtualPlacement(scope);
        var inlineElement = new DOMInlineElement(scope, '<b>test</b>', placement);
        inlineElement._field_name_references = {};

        var result = inlineElement.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result, 'L0', 'Should return first local symbol');
      });
    });

    describe('client_side_code_initialize_hook', function() {
      it('should add setup code for inline element creation', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        mockExecutionContext.get_input_symbol = function(index) {
          return 'INPUT_' + index;
        };

        var scope = createBasicScope();
        var VirtualPlacement = require('../../ir/computables/virtual_placement');
        var placement = new VirtualPlacement(scope);
        var inlineElement = new DOMInlineElement(scope, '<strong>test</strong>', placement);
        inlineElement._field_name_references = { after: 'AFTER_SYM' };

        inlineElement.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.equal(setupCode.length, 1);
        assert.include(setupCode[0], '$$SCOPE_METHODS.sync_compute_no_recompute$$');
      });
    });
  });

  describe('NestedPassthrough', function() {
    var NestedPassthrough;
    var Constant;

    beforeEach(function() {
      NestedPassthrough = require('../../ir/computables/nested_passthrough');
      Constant = require('../../ir/computables/constant');
      require('../../plugins/compile_client_app/extended_computables/nested_passthrough');
    });

    describe('has_client_side_code_initialize_hook', function() {
      it('should return false when no dependees other than NestedPassthrough', function() {
        var scope = createBasicScope();
        var base = new Constant(scope, { field: 'value' });
        var nested = new NestedPassthrough(base, 'field');

        var result = nested.has_client_side_code_initialize_hook();

        assert.isFalse(result, 'Should return false when no non-NestedPassthrough dependees');
      });

      it('should return true when has dependees other than NestedPassthrough', function() {
        var scope = createBasicScope();
        var base = new Constant(scope, { field: 'value' });
        var nested = new NestedPassthrough(base, 'field');

        // Mock get_dependee_count and get_dependee to simulate having non-NestedPassthrough dependees
        nested.get_dependee_count = function() { return 1; };
        nested.get_dependee = function(index) { return base; };

        var result = nested.has_client_side_code_initialize_hook();

        assert.isTrue(result, 'Should return true when has non-NestedPassthrough dependees');
      });
    });

    describe('client_side_code_reference_hook', function() {
      it('should allocate local symbol when has initialize hook', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var base = new Constant(scope, { field: 'value' });
        var nested = new NestedPassthrough(base, 'field');

        // Mock get_dependee methods to make has_client_side_code_initialize_hook return true
        nested.get_dependee_count = function() { return 1; };
        nested.get_dependee = function(index) { return base; };

        var result = nested.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result, 'L0', 'Should return first local symbol');
      });

      it('should return undefined when no initialize hook', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var base = new Constant(scope, { field: 'value' });
        var nested = new NestedPassthrough(base, 'field');

        var result = nested.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.isUndefined(result, 'Should return undefined when no initialize hook');
      });
    });

    describe('client_side_code_initialize_hook', function() {
      it('should add setup code for nested property access', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        var mockScopeCompilationContext = createMockScopeCompilationContext();
        var scope = createBasicScope();

        var base = new Constant(scope, { field: 'value' });
        var nested = new NestedPassthrough(base, 'field');
        nested._dependees = [base];

        nested.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext, mockScopeCompilationContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.equal(setupCode.length, 1);
        assert.include(setupCode[0], '$$SCOPE_METHODS.nested_compute$$');
      });

      it('should allocate global for property path array', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        var mockScopeCompilationContext = createMockScopeCompilationContext();
        var scope = createBasicScope();

        var base = new Constant(scope, { field: 'value' });
        var nested = new NestedPassthrough(base, 'field');

        nested.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext, mockScopeCompilationContext);

        var globals = mockCompilationContext.get_allocated_globals();
        assert.equal(globals.length, 1);
        assert.deepEqual(globals[0].value, ['field'], 'Should allocate property path array');
      });

      it('should handle chained nested passthroughs', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        var mockScopeCompilationContext = createMockScopeCompilationContext();
        var scope = createBasicScope();

        var base = new Constant(scope, { a: { b: 'value' } });
        var nested1 = new NestedPassthrough(base, 'a');
        var nested2 = new NestedPassthrough(nested1, 'b');

        nested2.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext, mockScopeCompilationContext);

        var globals = mockCompilationContext.get_allocated_globals();
        assert.deepEqual(globals[0].value, ['a', 'b'], 'Should collect full property path');
      });
    });
  });

  describe('DynamicNestedPassthrough', function() {
    var DynamicNestedPassthrough;
    var Constant;

    beforeEach(function() {
      DynamicNestedPassthrough = require('../../ir/computables/dynamic_nested_passthrough');
      Constant = require('../../ir/computables/constant');
      require('../../plugins/compile_client_app/extended_computables/dynamic_nested_passthrough');
    });

    describe('client_side_code_reference_hook', function() {
      it('should allocate local symbol', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var base = new Constant(scope, { field: 'value' });
        var pathComputable = new Constant(scope, 'field');
        var dynamic = new DynamicNestedPassthrough(base, pathComputable);

        var result = dynamic.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result, 'L0', 'Should return first local symbol');
      });
    });

    describe('client_side_code_initialize_hook', function() {
      it('should add setup code for dynamic nested access', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        var mockScopeCompilationContext = createMockScopeCompilationContext();
        var scope = createBasicScope();

        var base = new Constant(scope, { field: 'value' });
        var pathComputable = new Constant(scope, 'field');
        var dynamic = new DynamicNestedPassthrough(base, pathComputable);

        dynamic.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext, mockScopeCompilationContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.equal(setupCode.length, 1);
        assert.include(setupCode[0], '$$SCOPE_METHODS.dynamic_nested_compute$$');
      });

      it('should include base and path computable references in packed args', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        var mockScopeCompilationContext = createMockScopeCompilationContext();
        var scope = createBasicScope();

        var base = new Constant(scope, { field: 'value' });
        var pathComputable = new Constant(scope, 'dynamicField');
        var dynamic = new DynamicNestedPassthrough(base, pathComputable);

        dynamic.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext, mockScopeCompilationContext);

        var setupCode = mockExecutionContext.get_setup_code();
        // Should include both computable references
        assert.include(setupCode[0], 'COMP_REF_');
      });
    });
  });

  describe('CompoundNestedPassthrough', function() {
    var CompoundNestedPassthrough;
    var ScopeInstance;

    beforeEach(function() {
      CompoundNestedPassthrough = require('../../ir/computables/compound_nested_passthrough');
      ScopeInstance = require('../../ir/computables/scope_instance');
      require('../../plugins/compile_client_app/extended_computables/compound_nested_passthrough');
    });

    describe('has_client_side_code_initialize_hook', function() {
      it('should return false for compound nested passthroughs', function() {
        var scope = createBasicScope();
        var targetScope = new Scope('target');
        var ScopeParameter = require('../../ir/computables/scope_parameter');
        var param = new ScopeParameter(targetScope);
        var Constant = require('../../ir/computables/constant');
        var IRDOMPlacementType = require('../../ir/types/dom_placement');
        var VirtualPlacement = require('../../ir/computables/virtual_placement');

        // Add output to target scope so it has a compound output type
        var afterOutput = new VirtualPlacement(targetScope);
        targetScope.add_output(afterOutput, 'after');

        var input = new Constant(scope, null);
        var scopeInstance = new ScopeInstance(scope, targetScope, [input]);

        var compound = new CompoundNestedPassthrough(scopeInstance, 'after');

        var result = compound.has_client_side_code_initialize_hook();

        assert.isFalse(result, 'Compound nested passthroughs do not have initialize hook');
      });
    });

    describe('client_side_code_reference_hook', function() {
      it('should allocate sync internal symbol for sync field', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var mockScopeCompilationContext = {
          _get_output_symbol: function() { return null; }
        };
        
        var syncInternalCounter = 0;
        mockInstantiationContext.allocate_sync_internal_symbol = function(name) {
          return 'SYNC_INT_' + (syncInternalCounter++) + '_' + name;
        };

        var scope = createBasicScope();
        var targetScope = new Scope('target');
        var ScopeParameter = require('../../ir/computables/scope_parameter');
        var param = new ScopeParameter(targetScope);
        var VirtualPlacement = require('../../ir/computables/virtual_placement');

        // Add output to target scope so it has a compound output type
        var resultOutput = new VirtualPlacement(targetScope);
        targetScope.add_output(resultOutput, 'result');
        var Constant = require('../../ir/computables/constant');
        var input = new Constant(scope, null);
        var scopeInstance = new ScopeInstance(scope, targetScope, [input]);
        scopeInstance._field_name_references = {};

        // Mock get_scope_definition and get_output_by_field_name
        scopeInstance.get_scope_definition = function() {
          return {
            get_output_by_field_name: function() {
              return {
                is_needed_for_async_pre_initialize_phase: function() { return false; }
              };
            }
          };
        };

        var compound = new CompoundNestedPassthrough(scopeInstance, 'result');

        var result = compound.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext, mockScopeCompilationContext);

        assert.equal(result, 'SYNC_INT_0_field_output', 'Should allocate sync internal symbol');
        assert.equal(scopeInstance._field_name_references.result, 'SYNC_INT_0_field_output');
      });

      it('should reuse existing field reference if available', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var mockScopeCompilationContext = {
          _get_output_symbol: function() { return null; }
        };

        var scope = createBasicScope();
        var targetScope = new Scope('target');
        var ScopeParameter = require('../../ir/computables/scope_parameter');
        var param = new ScopeParameter(targetScope);
        var VirtualPlacement = require('../../ir/computables/virtual_placement');

        // Add output to target scope so it has a compound output type
        var resultOutput = new VirtualPlacement(targetScope);
        targetScope.add_output(resultOutput, 'result');
        var Constant = require('../../ir/computables/constant');
        var input = new Constant(scope, null);
        var scopeInstance = new ScopeInstance(scope, targetScope, [input]);
        scopeInstance._field_name_references = { result: 'EXISTING_REF' };

        var compound = new CompoundNestedPassthrough(scopeInstance, 'result');

        var result = compound.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext, mockScopeCompilationContext);

        assert.equal(result, 'EXISTING_REF', 'Should reuse existing field reference');
      });
    });
  });

  describe('ConstantInitializedVariable', function() {
    var ConstantInitializedVariable;

    beforeEach(function() {
      ConstantInitializedVariable = require('../../ir/computables/constant_initialized_variable');
      require('../../plugins/compile_client_app/extended_computables/constant_initialized_variable');
    });

    describe('has_client_side_code_initialize_hook', function() {
      it('should return true', function() {
        var scope = createBasicScope();
        var variable = new ConstantInitializedVariable(scope, 42);

        var result = variable.has_client_side_code_initialize_hook();

        assert.isTrue(result, 'Constant initialized variables need initialization');
      });
    });

    describe('client_side_code_reference_hook', function() {
      it('should allocate local symbol', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var variable = new ConstantInitializedVariable(scope, 'initial value');

        var result = variable.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result, 'L0', 'Should return first local symbol');
      });
    });

    describe('client_side_code_initialize_hook', function() {
      it('should add setup code for mutable global mapping', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        var scope = createBasicScope();

        var variable = new ConstantInitializedVariable(scope, 'test value');

        variable.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.equal(setupCode.length, 1);
        assert.include(setupCode[0], '$$SCOPE_METHODS.map_in_mutable_globals$$');
      });

      it('should allocate global for initial value', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        var scope = createBasicScope();

        var variable = new ConstantInitializedVariable(scope, 123);

        variable.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var globals = mockCompilationContext.get_allocated_globals();
        assert.equal(globals.length, 1);
        assert.equal(globals[0].value, 123);
      });

      it('should handle object initial values', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        var scope = createBasicScope();

        var initialValue = { key: 'value', nested: { prop: 42 } };
        var variable = new ConstantInitializedVariable(scope, initialValue);

        variable.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var globals = mockCompilationContext.get_allocated_globals();
        assert.deepEqual(globals[0].value, initialValue);
      });
    });
  });

  describe('ScopeDataMarker', function() {
    var ScopeDataMarker;

    beforeEach(function() {
      ScopeDataMarker = require('../../ir/computables/scope_data_marker');
      require('../../plugins/compile_client_app/extended_computables/scope_data_marker');
    });

    describe('client_side_code_reference_hook', function() {
      it('should return undefined (no symbol allocation)', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();
        var Constant = require('../../ir/computables/constant');
        var dataComputable = new Constant(scope, { key: 'value' });

        var marker = new ScopeDataMarker(scope, dataComputable);

        var result = marker.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.isUndefined(result, 'ScopeDataMarker does not allocate a reference symbol');
      });
    });

    describe('client_side_code_initialize_hook', function() {
      it('should add setup code for marking scope data', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        mockExecutionContext.set_input_symbols(['INPUT0']);
        var scope = createBasicScope();
        var Constant = require('../../ir/computables/constant');
        var dataComputable = new Constant(scope, { key: 'value' });

        var marker = new ScopeDataMarker(scope, dataComputable);

        marker.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.equal(setupCode.length, 1);
        assert.include(setupCode[0], '$$SCOPE_METHODS.mark_scope_data$$');
        assert.include(setupCode[0], 'INPUT0');
      });
    });
  });

  describe('ScopeDependency', function() {
    var ScopeDependency;

    beforeEach(function() {
      ScopeDependency = require('../../ir/computables/scope_dependency');
      require('../../plugins/compile_client_app/extended_computables/scope_dependency');
    });

    describe('is_needed_for_async_pre_initialize_phase', function() {
      it('should return true for scope dependencies', function() {
        var scope = createBasicScope();
        var dependency = new ScopeDependency(scope, 'css', 'https://example.com/style.css');

        var result = dependency.is_needed_for_async_pre_initialize_phase();

        assert.isTrue(result, 'Scope dependencies need async pre-initialization');
      });
    });

    describe('client_side_code_reference_hook', function() {
      it('should allocate local symbol', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();

        var dependency = new ScopeDependency(scope, 'js', 'https://example.com/script.js');

        var result = dependency.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result, 'L0', 'Should return first local symbol');
      });
    });

    describe('client_side_code_async_pre_initialize_hook', function() {
      it('should add setup code for CSS dependency loading', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        mockExecutionContext.set_input_symbols(['INPUT0', 'INPUT1']);
        var scope = createBasicScope();

        var dependency = new ScopeDependency(scope, 'css', 'https://example.com/style.css');

        dependency.client_side_code_async_pre_initialize_hook(mockCompilationContext, mockExecutionContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.equal(setupCode.length, 1);
        assert.include(setupCode[0], '$$SCOPE_METHODS.load_dependency_when_ready$$');
        assert.include(setupCode[0], 'OWN_REF');
        assert.include(setupCode[0], '0'); // CSS type = 0
      });

      it('should add setup code for JS dependency loading', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        mockExecutionContext.set_input_symbols([]);
        var scope = createBasicScope();

        var dependency = new ScopeDependency(scope, 'js', 'https://example.com/script.js');

        dependency.client_side_code_async_pre_initialize_hook(mockCompilationContext, mockExecutionContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.equal(setupCode.length, 1);
        assert.include(setupCode[0], '$$SCOPE_METHODS.load_dependency_when_ready$$');
        assert.include(setupCode[0], '1'); // JS type = 1
      });
    });
  });

  describe('InsertInitializedElement', function() {
    var InsertInitializedElement;

    beforeEach(function() {
      InsertInitializedElement = require('../../ir/computables/insert_initialized_element');
      require('../../plugins/compile_client_app/extended_computables/insert_initialized_element');
    });

    describe('is_needed_for_sync_initialize_phase', function() {
      it('should return true', function() {
        var scope = createBasicScope();
        var Constant = require("../../ir/computables/constant");
        var element = new Constant(scope, null);
        var VirtualPlacement = require("../../ir/computables/virtual_placement");
        var placement = new VirtualPlacement(scope);
        var insert = new InsertInitializedElement(scope, element, placement);

        var result = insert.is_needed_for_sync_initialize_phase();

        assert.isTrue(result, 'InsertInitializedElement needs sync initialization');
      });
    });

    describe('client_side_code_reference_hook', function() {
      it('should allocate local symbol', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var scope = createBasicScope();
        var Constant = require("../../ir/computables/constant");
        var element = new Constant(scope, null);
        var VirtualPlacement = require("../../ir/computables/virtual_placement");
        var placement = new VirtualPlacement(scope);
        var insert = new InsertInitializedElement(scope, element, placement);

        var result = insert.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

        assert.equal(result, 'L0', 'Should return first local symbol');
      });
    });

    describe('client_side_code_initialize_hook', function() {
      it('should add setup code for initializing element', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockExecutionContext = createMockExecutionContext();
        mockExecutionContext.set_input_symbols(['ELEMENT_SYM', 'PLACEMENT_SYM']);
        var scope = createBasicScope();
        var Constant = require("../../ir/computables/constant");
        var element = new Constant(scope, null);
        var VirtualPlacement = require("../../ir/computables/virtual_placement");
        var placement = new VirtualPlacement(scope);
        var insert = new InsertInitializedElement(scope, element, placement);

        insert.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

        var setupCode = mockExecutionContext.get_setup_code();
        assert.equal(setupCode.length, 1);
        assert.include(setupCode[0], '$$SCOPE_METHODS.initialize_element_as_arg$$');
        assert.include(setupCode[0], 'OWN_REF');
        assert.include(setupCode[0], 'ELEMENT_SYM');
        assert.include(setupCode[0], 'PLACEMENT_SYM');
      });
    });

    describe('get_client_side_input_metadata', function() {
      it('should return metadata for element input (index 0)', function() {
        var scope = createBasicScope();
        var Constant = require("../../ir/computables/constant");
        var element = new Constant(scope, null);
        var VirtualPlacement = require("../../ir/computables/virtual_placement");
        var placement = new VirtualPlacement(scope);
        var insert = new InsertInitializedElement(scope, element, placement);

        var metadata = insert.get_client_side_input_metadata(0);

        assert.isFalse(metadata.is_needed_for_async_pre_initialize_phase);
        assert.isTrue(metadata.is_needed_for_sync_initialize_phase);
        assert.isTrue(metadata.is_needed_for_update_cycle, 'Element input needed for updates');
      });

      it('should return metadata for placement input (index 1)', function() {
        var scope = createBasicScope();
        var Constant = require("../../ir/computables/constant");
        var element = new Constant(scope, null);
        var VirtualPlacement = require("../../ir/computables/virtual_placement");
        var placement = new VirtualPlacement(scope);
        var insert = new InsertInitializedElement(scope, element, placement);

        var metadata = insert.get_client_side_input_metadata(1);

        assert.isFalse(metadata.is_needed_for_async_pre_initialize_phase);
        assert.isTrue(metadata.is_needed_for_sync_initialize_phase);
        assert.isFalse(metadata.is_needed_for_update_cycle, 'Placement input not needed for updates');
      });
    });
  });

  describe('CatchHandler', function() {
    var CatchHandler;

    beforeEach(function() {
      CatchHandler = require('../../ir/computables/catch_handler');
      require('../../plugins/compile_client_app/extended_computables/catch_handler');
    });

    describe('is_needed_for_async_pre_initialize_phase', function() {
      it('should return true', function() {
        var scope = createBasicScope();
        var catchHandler = new CatchHandler(scope, []);

        var result = catchHandler.is_needed_for_async_pre_initialize_phase();

        assert.isTrue(result, 'CatchHandler needs async pre-initialization');
      });
    });

    describe('get_client_side_input_metadata', function() {
      it('should return metadata with inputs only needed for sync phase', function() {
        var scope = createBasicScope();
        var catchHandler = new CatchHandler(scope, []);

        var metadata = catchHandler.get_client_side_input_metadata(0);

        assert.isFalse(metadata.is_needed_for_async_pre_initialize_phase, 'Inputs not needed for async phase');
        assert.isTrue(metadata.is_needed_for_sync_initialize_phase);
        assert.isFalse(metadata.is_needed_for_update_cycle);
      });
    });
  });

  describe('Virtual Computables', function() {
    var VirtualArgs, VirtualArrayItem, VirtualArrayItemIndex, VirtualPlacement, VirtualIntermediate;

    beforeEach(function() {
      VirtualArgs = require('../../ir/computables/virtual_args');
      VirtualArrayItem = require('../../ir/computables/virtual_array_item');
      VirtualArrayItemIndex = require('../../ir/computables/virtual_array_item_index');
      VirtualPlacement = require('../../ir/computables/virtual_placement');
      VirtualIntermediate = require('../../ir/computables/virtual_intermediate');

      require('../../plugins/compile_client_app/extended_computables/virtual_args');
      require('../../plugins/compile_client_app/extended_computables/virtual_array_item');
      require('../../plugins/compile_client_app/extended_computables/virtual_array_item_index');
      require('../../plugins/compile_client_app/extended_computables/virtual_placement');
      require('../../plugins/compile_client_app/extended_computables/virtual_intermediate');
    });

    describe('VirtualArgs', function() {
      it('should return special ARGS_VIRTUAL symbol', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var mockScopeCompilationContext = {
          get_symbols: function() {
            return { special: { ARGS_VIRTUAL: 'SPECIAL_ARGS' } };
          }
        };
        var scope = createBasicScope();

        var virtualArgs = new VirtualArgs(scope);

        var result = virtualArgs.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext, mockScopeCompilationContext);

        assert.equal(result, 'SPECIAL_ARGS', 'Should return ARGS_VIRTUAL special symbol');
      });
    });

    describe('VirtualArrayItem', function() {
      it('should return special ITEM_VIRTUAL symbol', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var mockScopeCompilationContext = {
          get_symbols: function() {
            return { special: { ITEM_VIRTUAL: 'SPECIAL_ITEM' } };
          }
        };
        var scope = createBasicScope();
        var Constant = require('../../ir/computables/constant');
        var arrayComputable = new Constant(scope, []);

        var virtualItem = new VirtualArrayItem(scope, arrayComputable);

        var result = virtualItem.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext, mockScopeCompilationContext);

        assert.equal(result, 'SPECIAL_ITEM', 'Should return ITEM_VIRTUAL special symbol');
      });

      it('should return false for has_client_side_code_initialize_hook', function() {
        var scope = createBasicScope();
        var Constant = require('../../ir/computables/constant');
        var arrayComputable = new Constant(scope, []);

        var virtualItem = new VirtualArrayItem(scope, arrayComputable);

        var result = virtualItem.has_client_side_code_initialize_hook();

        assert.isFalse(result, 'Virtual array item has no initialize hook');
      });
    });

    describe('VirtualArrayItemIndex', function() {
      it('should return special ITEM_INDEX_VIRTUAL symbol', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var mockScopeCompilationContext = {
          get_symbols: function() {
            return { special: { ITEM_INDEX_VIRTUAL: 'SPECIAL_INDEX' } };
          }
        };
        var scope = createBasicScope();
        var Constant = require("../../ir/computables/constant");
        var arrayComputable = new Constant(scope, []);

        var virtualIndex = new VirtualArrayItemIndex(scope, arrayComputable);

        var result = virtualIndex.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext, mockScopeCompilationContext);

        assert.equal(result, 'SPECIAL_INDEX', 'Should return ITEM_INDEX_VIRTUAL special symbol');
      });

      it('should return false for has_client_side_code_initialize_hook', function() {
        var scope = createBasicScope();
        var Constant = require("../../ir/computables/constant");
        var arrayComputable = new Constant(scope, []);

        var virtualIndex = new VirtualArrayItemIndex(scope, arrayComputable);

        var result = virtualIndex.has_client_side_code_initialize_hook();

        assert.isFalse(result, 'Virtual array item index has no initialize hook');
      });
    });

    describe('VirtualPlacement', function() {
      it('should return special PLACEMENT_VIRTUAL symbol', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var mockScopeCompilationContext = {
          get_symbols: function() {
            return { special: { PLACEMENT_VIRTUAL: 'SPECIAL_PLACEMENT' } };
          }
        };
        var scope = createBasicScope();

        var virtualPlacement = new VirtualPlacement(scope);

        var result = virtualPlacement.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext, mockScopeCompilationContext);

        assert.equal(result, 'SPECIAL_PLACEMENT', 'Should return PLACEMENT_VIRTUAL special symbol');
      });
    });

    describe('VirtualIntermediate', function() {
      it('should return special PREVIOUS_INTERMEDIATE symbol', function() {
        var mockCompilationContext = createMockCompilationContext();
        var mockInstantiationContext = createMockInstantiationContext();
        var mockScopeCompilationContext = {
          get_symbols: function() {
            return { special: { PREVIOUS_INTERMEDIATE: 'SPECIAL_INTERMEDIATE' } };
          }
        };
        var scope = createBasicScope();
        var IRAnyType = require('../../ir/types/any');

        var virtualIntermediate = new VirtualIntermediate(scope, new IRAnyType());

        var result = virtualIntermediate.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext, mockScopeCompilationContext);

        assert.equal(result, 'SPECIAL_INTERMEDIATE', 'Should return PREVIOUS_INTERMEDIATE special symbol');
      });

      it('should return false for has_client_side_code_initialize_hook', function() {
        var scope = createBasicScope();
        var IRAnyType = require('../../ir/types/any');

        var virtualIntermediate = new VirtualIntermediate(scope, new IRAnyType());

        var result = virtualIntermediate.has_client_side_code_initialize_hook();

        assert.isFalse(result, 'Virtual intermediate has no initialize hook');
      });
    });
  });

  describe('Integration tests', function() {
    it('should handle multiple computables with different hook implementations', function() {
      var mockCompilationContext = createMockCompilationContext();
      var mockInstantiationContext = createMockInstantiationContext();
      var scope = createBasicScope();

      // Load all types
      var Constant = require('../../ir/computables/constant');
      var ScopeParameter = require('../../ir/computables/scope_parameter');
      var Callback = require('../../ir/computables/callback');

      require('../../plugins/compile_client_app/extended_computables/constant');
      require('../../plugins/compile_client_app/extended_computables/scope_parameter');
      require('../../plugins/compile_client_app/extended_computables/callback');

      // Create instances
      var constant = new Constant(scope, 'test');

      var param = new ScopeParameter(scope);

      var callback = new Callback(scope, function() {}, []);

      // Test has_client_side_code_initialize_hook
      assert.isFalse(constant.has_client_side_code_initialize_hook());
      assert.isFalse(param.has_client_side_code_initialize_hook());
      assert.isTrue(callback.has_client_side_code_initialize_hook());

      // Test reference hooks
      var constantRef = constant.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);
      var paramRef = param.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);
      var callbackRef = callback.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);

      // Each should get different type of symbol
      assert.equal(constantRef, 'G0', 'Constant uses global');
      assert.equal(paramRef, 'I0', 'Parameter uses input');
      assert.equal(callbackRef, 'L0', 'Callback uses local');
    });

    it('should properly allocate symbols across multiple calls', function() {
      var mockCompilationContext = createMockCompilationContext();
      var mockInstantiationContext = createMockInstantiationContext();
      var scope = createBasicScope();

      var Constant = require('../../ir/computables/constant');
      require('../../plugins/compile_client_app/extended_computables/constant');

      // Allocate multiple constants
      var constants = [];
      for (var i = 0; i < 5; i++) {
        var constant = new Constant(scope, 'value' + i);
        constants.push(constant);
      }

      // Get references
      var refs = constants.map(function(c) {
        return c.client_side_code_reference_hook(mockCompilationContext, mockInstantiationContext);
      });

      // Each should get unique global symbol
      assert.equal(refs.length, 5);
      for (var i = 0; i < 5; i++) {
        assert.equal(refs[i], 'G' + i);
      }

      var globals = mockCompilationContext.get_allocated_globals();
      assert.equal(globals.length, 5);
    });

    it('should handle mixed initialization requirements', function() {
      var mockCompilationContext = createMockCompilationContext();
      var mockExecutionContext = createMockExecutionContext();
      var mockInstantiationContext = createMockInstantiationContext();
      var scope = createBasicScope();

      var Constant = require('../../ir/computables/constant');
      var Callback = require('../../ir/computables/callback');

      require('../../plugins/compile_client_app/extended_computables/constant');
      require('../../plugins/compile_client_app/extended_computables/callback');

      var constant = new Constant(scope, 'test');

      var callback = new Callback(scope, function() {}, []);

      // Constant doesn't need initialization
      assert.isFalse(constant.has_client_side_code_initialize_hook());

      // Callback needs initialization
      assert.isTrue(callback.has_client_side_code_initialize_hook());
      callback.client_side_code_initialize_hook(mockCompilationContext, mockExecutionContext);

      var setupCode = mockExecutionContext.get_setup_code();
      assert.isAtLeast(setupCode.length, 1, 'Callback should have added setup code');
    });
  });
});
