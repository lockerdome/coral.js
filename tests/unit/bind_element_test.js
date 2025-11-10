"use strict";
/* global it, describe, beforeEach, afterEach */

var assert = require("chai").assert;

describe('bindElement', function() {
  var Observable, bindElement;
  var mockElement, mockSelectElement;

  beforeEach(function() {
    // Mock global helpers
    global.$$HELPERS = {
      get_at_path$$: function(obj, path) {
        var result = obj;
        for (var i = 0; i < path.length; i++) {
          if (result == null) return undefined;
          result = result[path[i]];
        }
        return result;
      },
      set_at_path$$: function(obj, path, value) {
        if (path.length === 0) return value;
        var result = JSON.parse(JSON.stringify(obj || {}));
        var current = result;
        for (var i = 0; i < path.length - 1; i++) {
          if (!current[path[i]]) current[path[i]] = {};
          current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
        return result;
      }
    };

    global.$$SYMBOLS = {
      scope_special: {
        ZONE$$: '$$SYMBOLS.scope_special.ZONE$$'
      }
    };

    // Clear module cache and reload modules
    var observablePath = require.resolve('../../plugins/compile_client_app/front_end/lib/observables/observable');
    delete require.cache[observablePath];
    Observable = require('../../plugins/compile_client_app/front_end/lib/observables/observable');

    var bindElementPath = require.resolve('../../plugins/compile_client_app/front_end/lib/bind_element');
    delete require.cache[bindElementPath];
    require('../../plugins/compile_client_app/front_end/lib/bind_element');

    bindElement = Observable._bindElement;

    // Create mock input element
    mockElement = createMockElement('INPUT');

    // Create mock select element
    mockSelectElement = createMockSelectElement();
  });

  afterEach(function() {
    // Clean up globals
    delete global.$$HELPERS;
    delete global.$$SYMBOLS;

    // Clear module cache
    var observablePath = require.resolve('../../plugins/compile_client_app/front_end/lib/observables/observable');
    delete require.cache[observablePath];

    var bindElementPath = require.resolve('../../plugins/compile_client_app/front_end/lib/bind_element');
    delete require.cache[bindElementPath];
  });

  function createMockElement(nodeName) {
    var listeners = {};
    var internalValue = '';
    var elem = {
      nodeName: nodeName,
      get value() {
        return internalValue;
      },
      set value(val) {
        // Mimic DOM behavior: convert to string
        internalValue = (val === null || val === undefined) ? '' : String(val);
      },
      addEventListener: function(event, handler) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(handler);
      },
      _trigger: function(event) {
        if (listeners[event]) {
          listeners[event].forEach(function(handler) {
            handler();
          });
        }
      },
      _getListeners: function(event) {
        return listeners[event] || [];
      }
    };
    return elem;
  }

  function createMockSelectElement() {
    var listeners = {};
    var options = [];
    var internalValue = '';
    var element = {
      nodeName: 'SELECT',
      get value() {
        return internalValue;
      },
      set value(val) {
        internalValue = (val === null || val === undefined) ? '' : String(val);
      },
      selectedIndex: 0,
      addEventListener: function(event, handler) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(handler);
      },
      querySelectorAll: function(selector) {
        if (selector === 'option[value]') {
          return options.filter(function(opt) { return opt.value !== undefined; });
        }
        return options;
      },
      querySelector: function(selector) {
        if (selector === 'option[disabled]') {
          return options.find(function(opt) { return opt.disabled; });
        }
        return null;
      },
      _trigger: function(event) {
        if (listeners[event]) {
          listeners[event].forEach(function(handler) {
            handler();
          });
        }
      },
      _setOptions: function(optionsList) {
        options = optionsList.map(function(opt, index) {
          return {
            value: opt.value,
            disabled: opt.disabled || false,
            index: index
          };
        });
      },
      _getListeners: function(event) {
        return listeners[event] || [];
      }
    };
    return element;
  }

  describe('Module structure', function() {
    it('should export _bindElement on Observable', function() {
      assert.isFunction(Observable._bindElement);
    });

    it('should have bindElement function', function() {
      assert.isFunction(bindElement);
    });
  });

  describe('bindElement with non-Observable', function() {
    it('should return early if not passed an Observable', function() {
      var result = bindElement(mockElement, 'not an observable');
      assert.isUndefined(result);
      assert.equal(mockElement._getListeners('change').length, 0, 'Should not add event listeners');
    });

    it('should return early if not passed anything', function() {
      var result = bindElement(mockElement, null);
      assert.isUndefined(result);
    });
  });

  describe('bindElement with input element', function() {
    it('should set initial value from observable', function() {
      var obs = new Observable('initial value');

      bindElement(mockElement, obs);

      assert.equal(mockElement.value, 'initial value');
    });

    it('should not set value if observable is null', function() {
      var obs = new Observable(null);
      mockElement.value = 'existing';

      bindElement(mockElement, obs);

      assert.equal(mockElement.value, 'existing', 'Should not overwrite with null');
    });

    it('should add change event listener by default', function() {
      var obs = new Observable('test');

      bindElement(mockElement, obs);

      assert.equal(mockElement._getListeners('change').length, 1);
    });

    it('should add custom event listeners', function() {
      var obs = new Observable('test');

      bindElement(mockElement, obs, 'input');

      assert.equal(mockElement._getListeners('input').length, 1);
      assert.equal(mockElement._getListeners('change').length, 0);
    });

    it('should add multiple event listeners', function() {
      var obs = new Observable('test');

      bindElement(mockElement, obs, ['input', 'blur']);

      assert.equal(mockElement._getListeners('input').length, 1);
      assert.equal(mockElement._getListeners('blur').length, 1);
    });

    it('should update observable when element triggers event', function() {
      var obs = new Observable('initial');
      bindElement(mockElement, obs);

      mockElement.value = 'changed';
      mockElement._trigger('change');

      assert.equal(obs.get(), 'changed');
    });

    it('should update element when observable changes', function(done) {
      var obs = new Observable('initial');
      bindElement(mockElement, obs);

      obs.set('new value'); obs.after();

      // afterChange is asynchronous
      setTimeout(function() {
        assert.equal(mockElement.value, 'new value');
        done();
      }, 10);
    });

    it('should handle null values from observable', function(done) {
      var obs = new Observable('initial');
      bindElement(mockElement, obs);

      obs.set(null); obs.after();

      setTimeout(function() {
        assert.equal(mockElement.value, '');
        done();
      }, 10);
    });

    it('should handle undefined values from observable', function(done) {
      var obs = new Observable('initial');
      bindElement(mockElement, obs);

      obs.set(undefined); obs.after();

      setTimeout(function() {
        assert.equal(mockElement.value, '');
        done();
      }, 10);
    });

    it('should convert numbers to strings', function(done) {
      var obs = new Observable(42);
      bindElement(mockElement, obs);

      assert.equal(mockElement.value, '42');

      obs.set(100); obs.after();
      setTimeout(function() {
        assert.equal(mockElement.value, '100');
        done();
      }, 10);
    });

    it('should not update element if value matches', function(done) {
      var obs = new Observable('test');
      bindElement(mockElement, obs);

      var callCount = 0;
      var originalValueSetter = Object.getOwnPropertyDescriptor(mockElement, 'value') || {};
      Object.defineProperty(mockElement, 'value', {
        get: function() { return this._value || ''; },
        set: function(val) {
          callCount++;
          this._value = val;
        },
        configurable: true
      });

      mockElement.value = 'test';
      obs.set('test'); obs.after();

      var initialCallCount = callCount;
      setTimeout(function() {
        assert.equal(callCount, initialCallCount, 'Value setter should not be called when values match');
        done();
      }, 10);
    });

    it('should handle bidirectional updates', function(done) {
      var obs = new Observable('initial');
      bindElement(mockElement, obs);

      // User changes element
      mockElement.value = 'user input';
      mockElement._trigger('change');

      assert.equal(obs.get(), 'user input');

      // Program changes observable, but user input takes precedence
      obs.set('programmatic'); obs.after();

      setTimeout(function() {
        // User input is preserved when it differs from previous observable value
        assert.equal(obs.get(), 'user input', 'Should preserve user input');
        done();
      }, 10);
    });

    it('should allow programmatic updates when element unchanged', function(done) {
      var obs = new Observable('initial');
      bindElement(mockElement, obs);

      // Element value stays at initial
      assert.equal(mockElement.value, 'initial');

      // Observable updates programmatically
      obs.set('programmatic'); obs.after();

      setTimeout(function() {
        // Element should update since it still matches previous value
        assert.equal(mockElement.value, 'programmatic');
        done();
      }, 10);
    });
  });

  describe('bindElement with SELECT element', function() {
    it('should set initial value from observable', function() {
      var obs = new Observable('option1');
      mockSelectElement._setOptions([
        { value: 'option1' },
        { value: 'option2' }
      ]);

      bindElement(mockSelectElement, obs);

      assert.equal(mockSelectElement.value, 'option1');
    });

    it('should update select when observable changes', function(done) {
      var obs = new Observable('option1');
      mockSelectElement._setOptions([
        { value: 'option1' },
        { value: 'option2' }
      ]);

      bindElement(mockSelectElement, obs);

      obs.set('option2'); obs.after();

      setTimeout(function() {
        assert.equal(mockSelectElement.value, 'option2');
        done();
      }, 10);
    });

    it('should update observable when select changes', function() {
      var obs = new Observable('option1');
      mockSelectElement._setOptions([
        { value: 'option1' },
        { value: 'option2' }
      ]);

      bindElement(mockSelectElement, obs);

      mockSelectElement.value = 'option2';
      mockSelectElement._trigger('change');

      assert.equal(obs.get(), 'option2');
    });

    it('should handle null observable value', function(done) {
      var obs = new Observable(null);
      mockSelectElement._setOptions([
        { value: '', disabled: true },
        { value: 'option1' }
      ]);

      bindElement(mockSelectElement, obs);

      obs.set(null); obs.after();

      setTimeout(function() {
        // Should select disabled option
        assert.equal(mockSelectElement.selectedIndex, 0);
        done();
      }, 10);
    });

    it('should unselect when value is not in options', function(done) {
      var obs = new Observable('option1');
      mockSelectElement._setOptions([
        { value: '', disabled: true },
        { value: 'option2' }
      ]);

      bindElement(mockSelectElement, obs);

      // Try to set a value that doesn't exist
      obs.set('nonexistent'); obs.after();

      setTimeout(function() {
        assert.equal(mockSelectElement.selectedIndex, 0, 'Should select disabled option');
        done();
      }, 10);
    });

    it('should handle empty string value in select', function() {
      var obs = new Observable('option1');
      mockSelectElement._setOptions([
        { value: '' },
        { value: 'option1' }
      ]);

      bindElement(mockSelectElement, obs);

      mockSelectElement.value = '';
      mockSelectElement._trigger('change');

      // Element change sets observable to element's value directly
      assert.equal(obs.get(), '');
    });

    it('should handle disabled options being ignored', function(done) {
      var obs = new Observable('option1');
      mockSelectElement._setOptions([
        { value: 'disabled', disabled: true },
        { value: 'option1' },
        { value: 'option2' }
      ]);

      bindElement(mockSelectElement, obs);
      mockSelectElement.value = 'option1';

      // Disabled options should not be considered valid
      obs.set('disabled'); obs.after();

      setTimeout(function() {
        // Should unselect since 'disabled' is not a valid option
        assert.equal(mockSelectElement.selectedIndex, 0);
        done();
      }, 10);
    });

    it('should unselect when programmatic value not in options', function(done) {
      var obs = new Observable('option1');
      mockSelectElement._setOptions([
        { value: '', disabled: true },
        { value: 'option2' }
      ]);

      bindElement(mockSelectElement, obs);

      // Try to set to value not in options
      obs.set('nonexistent'); obs.after();

      setTimeout(function() {
        // Should unselect (select disabled option)
        assert.equal(mockSelectElement.selectedIndex, 0);
        done();
      }, 10);
    });

    it('should unselect to first option when no disabled option exists', function(done) {
      var obs = new Observable('option1');
      mockSelectElement._setOptions([
        { value: 'first' },
        { value: 'second' }
      ]);

      bindElement(mockSelectElement, obs);

      obs.set(null); obs.after();

      setTimeout(function() {
        assert.equal(mockSelectElement.selectedIndex, 0, 'Should select first option when no disabled option');
        done();
      }, 10);
    });
  });

  describe('Edge cases', function() {
    it('should handle rapid successive changes', function() {
      var obs = new Observable('initial');
      bindElement(mockElement, obs);

      mockElement.value = 'change1';
      mockElement._trigger('change');

      mockElement.value = 'change2';
      mockElement._trigger('change');

      mockElement.value = 'change3';
      mockElement._trigger('change');

      assert.equal(obs.get(), 'change3');
    });

    it('should handle boolean values', function(done) {
      var obs = new Observable(true);
      bindElement(mockElement, obs);

      assert.equal(mockElement.value, 'true');

      obs.set(false); obs.after();

      setTimeout(function() {
        assert.equal(mockElement.value, 'false');
        done();
      }, 10);
    });

    it('should handle object values by converting to string', function() {
      var obs = new Observable({ key: 'value' });
      bindElement(mockElement, obs);

      assert.equal(mockElement.value, '[object Object]');
    });

    it('should call scheduler.run after element change', function() {
      var obs = new Observable('initial');
      var runCalled = false;
      var originalRun = Observable.scheduler.run;
      Observable.scheduler.run = function() {
        runCalled = true;
        originalRun.call(this);
      };

      bindElement(mockElement, obs);

      mockElement.value = 'changed';
      mockElement._trigger('change');

      assert.isTrue(runCalled, 'scheduler.run should be called');

      Observable.scheduler.run = originalRun;
    });

    it('should handle zero as a valid value', function() {
      var obs = new Observable(0);
      bindElement(mockElement, obs);

      assert.equal(mockElement.value, '0');

      // Programmatic update to non-zero
      obs.set(5); obs.after();
      assert.equal(mockElement.value, '5');

      // Programmatic update back to zero
      obs.set(0); obs.after();
      assert.equal(mockElement.value, '0');
    });
  });
});
