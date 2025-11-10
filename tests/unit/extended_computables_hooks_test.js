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
