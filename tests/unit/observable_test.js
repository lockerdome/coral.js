"use strict";
/* global it, describe, beforeEach, afterEach */

var assert = require("chai").assert;

describe('Observable', function() {
  var Observable;

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

    // Clear module cache and reload Observable with mocked globals
    var observablePath = require.resolve('../../plugins/compile_client_app/front_end/lib/observables/observable');
    delete require.cache[observablePath];
    Observable = require('../../plugins/compile_client_app/front_end/lib/observables/observable');
  });

  afterEach(function() {
    // Clean up globals
    delete global.$$HELPERS;
    delete global.$$SYMBOLS;

    // Clear module cache
    var observablePath = require.resolve('../../plugins/compile_client_app/front_end/lib/observables/observable');
    delete require.cache[observablePath];
  });

  describe('Module structure', function() {
    it('should export Observable as a constructor', function() {
      assert.isFunction(Observable);
      assert.equal(Observable.name, 'Observable');
    });

    it('should have constructor with optional initial value', function() {
      assert.equal(Observable.length, 1);
    });
  });

  describe('Constructor', function() {
    it('should create a new Observable instance', function() {
      var obs = new Observable();
      assert.instanceOf(obs, Observable);
    });

    it('should create Observable with initial value', function() {
      var obs = new Observable(42);
      assert.equal(obs.value, 42);
      assert.isFalse(obs.pending);
    });

    it('should create Observable without initial value as pending', function() {
      var obs = new Observable();
      assert.isTrue(obs.pending);
      assert.isUndefined(obs.value);
    });

    it('should accept null as initial value', function() {
      var obs = new Observable(null);
      assert.equal(obs.value, null);
      assert.isFalse(obs.pending);
    });

    it('should accept undefined as initial value', function() {
      var obs = new Observable(undefined);
      assert.equal(obs.value, undefined);
      assert.isFalse(obs.pending);
    });

    it('should accept false as initial value', function() {
      var obs = new Observable(false);
      assert.equal(obs.value, false);
      assert.isFalse(obs.pending);
    });

    it('should accept 0 as initial value', function() {
      var obs = new Observable(0);
      assert.equal(obs.value, 0);
      assert.isFalse(obs.pending);
    });

    it('should accept empty string as initial value', function() {
      var obs = new Observable('');
      assert.equal(obs.value, '');
      assert.isFalse(obs.pending);
    });

    it('should inherit from EventEmitter', function() {
      var EventEmitter = require('events').EventEmitter;
      var obs = new Observable();
      assert.instanceOf(obs, EventEmitter);
    });

    it('should set max listeners to 0', function() {
      var obs = new Observable();
      assert.equal(obs.getMaxListeners(), 0);
    });
  });

  describe('Static method: is', function() {
    it('should return true for Observable instances', function() {
      var obs = new Observable(42);
      assert.isTrue(Observable.is(obs));
    });

    it('should return false for non-Observable values', function() {
      assert.isFalse(Observable.is(42));
      assert.isFalse(Observable.is('string'));
      assert.isFalse(Observable.is({}));
      assert.isFalse(Observable.is([]));
      assert.isFalse(Observable.is(null));
      assert.isFalse(Observable.is(undefined));
    });
  });

  describe('Static method: unpack', function() {
    it('should return value from Observable', function() {
      var obs = new Observable(42);
      assert.equal(Observable.unpack(obs), 42);
    });

    it('should return non-Observable values as-is', function() {
      assert.equal(Observable.unpack(42), 42);
      assert.equal(Observable.unpack('string'), 'string');
      var obj = { key: 'value' };
      assert.equal(Observable.unpack(obj), obj);
    });

    it('should return undefined for pending Observable', function() {
      var obs = new Observable();
      assert.isUndefined(Observable.unpack(obs));
    });
  });

  describe('Static method: getByPath', function() {
    it('should get value by path from Observable', function() {
      var obs = new Observable({ a: { b: { c: 42 } } });
      var result = Observable.getByPath(obs, 'a.b.c');
      assert.instanceOf(result, Observable);
    });

    it('should get value by path from plain object', function() {
      var obj = { a: { b: { c: 42 } } };
      var result = Observable.getByPath(obj, 'a.b.c');
      assert.equal(result, 42);
    });
  });

  describe('Instance method: get', function() {
    it('should return current value', function() {
      var obs = new Observable(42);
      assert.equal(obs.get(), 42);
    });

    it('should return undefined for pending Observable', function() {
      var obs = new Observable();
      assert.isUndefined(obs.get());
    });

    it('should return updated value after set', function() {
      var obs = new Observable(42);
      obs.set(100);
      assert.equal(obs.get(), 100);
    });
  });

  describe('Instance method: set', function() {
    it('should set new value', function() {
      var obs = new Observable(42);
      obs.set(100);
      assert.equal(obs.value, 100);
    });

    it('should clear pending flag', function() {
      var obs = new Observable();
      assert.isTrue(obs.pending);
      obs.set(42);
      assert.isFalse(obs.pending);
    });

    it('should emit _set event', function(done) {
      var obs = new Observable(42);
      obs.on('_set', function(val) {
        assert.equal(val, 100);
        done();
      });
      obs.set(100);
    });

    it('should emit _afterSet event', function(done) {
      var obs = new Observable(42);
      obs.on('_afterSet', function(val) {
        assert.equal(val, 100);
        done();
      });
      obs.set(100);
    });

    it('should not emit events if value unchanged and not forced', function() {
      var obs = new Observable(42);
      var setCount = 0;
      obs.on('_set', function() { setCount++; });

      obs.set(42); // Should not emit
      assert.equal(setCount, 0);
    });

    it('should emit events if value unchanged but forced', function() {
      var obs = new Observable(42);
      var setCount = 0;
      obs.on('_set', function() { setCount++; });

      obs.set(42, true); // Should emit because forced
      assert.equal(setCount, 1);
    });

    it('should unpack Observable values', function() {
      var obs1 = new Observable(42);
      var obs2 = new Observable(100);
      obs1.set(obs2);
      assert.equal(obs1.value, 100);
    });

    it('should handle null value', function() {
      var obs = new Observable(42);
      obs.set(null);
      assert.equal(obs.value, null);
    });

    it('should handle undefined value', function() {
      var obs = new Observable(42);
      obs.set(undefined);
      assert.equal(obs.value, undefined);
    });

    it('should handle setting same value to pending Observable', function() {
      var obs = new Observable();
      obs.set(42);
      obs.set(42); // Should not emit
      assert.equal(obs.value, 42);
    });
  });

  describe('Instance method: toString', function() {
    it('should return string representation of value', function() {
      var obs = new Observable(42);
      assert.equal(obs.toString(), '42');
    });

    it('should return empty string for null', function() {
      var obs = new Observable(null);
      assert.equal(obs.toString(), '');
    });

    it('should return empty string for undefined', function() {
      var obs = new Observable(undefined);
      assert.equal(obs.toString(), '');
    });

    it('should call toString on object values', function() {
      var obj = { toString: function() { return 'custom'; } };
      var obs = new Observable(obj);
      assert.equal(obs.toString(), 'custom');
    });

    it('should return string as-is', function() {
      var obs = new Observable('test string');
      assert.equal(obs.toString(), 'test string');
    });
  });

  describe('Instance method: before', function() {
    it('should emit beforeChange event', function(done) {
      var obs = new Observable(42);
      obs.on('beforeChange', function(val) {
        assert.equal(val, 42);
        done();
      });
      obs.before();
    });
  });

  describe('Instance method: update', function() {
    it('should emit change event', function(done) {
      var obs = new Observable(42);
      obs.on('change', function(val) {
        assert.equal(val, 42);
        done();
      });
      obs.update();
    });
  });

  describe('Instance method: after', function() {
    it('should emit afterChange event', function(done) {
      var obs = new Observable(42);
      obs.on('afterChange', function(val) {
        assert.equal(val, 42);
        done();
      });
      obs.after();
    });
  });

  describe('Instance method: destroy', function() {
    it('should remove all listeners', function() {
      var obs = new Observable(42);
      obs.on('change', function() {});
      obs.on('_set', function() {});

      assert.isAbove(obs.listenerCount('change'), 0);
      obs.destroy();
      assert.equal(obs.listenerCount('change'), 0);
      assert.equal(obs.listenerCount('_set'), 0);
    });
  });

  describe('Instance method: byPath', function() {
    it('should create child Observable for path', function() {
      var parent = new Observable({ a: { b: 42 } });
      var child = parent.byPath(['a', 'b']);
      assert.instanceOf(child, Observable);
      assert.equal(child.get(), 42);
    });

    it('should create pending child for pending parent', function() {
      var parent = new Observable();
      var child = parent.byPath(['a', 'b']);
      assert.isTrue(child.pending);
    });

    it('should update child when parent changes', function() {
      var parent = new Observable({ a: { b: 42 } });
      var child = parent.byPath(['a', 'b']);

      parent.set({ a: { b: 100 } });
      parent.emit('change');
      assert.equal(child.get(), 100);
    });

    it('should update parent when child changes', function() {
      var parent = new Observable({ a: { b: 42 } });
      var child = parent.byPath(['a', 'b']);

      child.set(100, true);
      assert.equal(parent.get().a.b, 100);
    });

    it('should handle nested paths', function() {
      var parent = new Observable({ x: { y: { z: 'value' } } });
      var child = parent.byPath(['x', 'y', 'z']);
      assert.equal(child.get(), 'value');
    });

    it('should not update child if value unchanged', function() {
      var parent = new Observable({ a: { b: 42 } });
      var child = parent.byPath(['a', 'b']);

      var changeCount = 0;
      child.on('_set', function() { changeCount++; });

      child.set(42); // Same value, should not trigger
      assert.equal(changeCount, 0);
    });
  });

  describe('Static method: bind', function() {
    it('should bi-directionally bind two Observables', function() {
      var obs1 = new Observable(10);
      var obs2 = new Observable(20);

      Observable.bind(obs1, obs2);

      // Initial sync should set obs2 to obs1's value
      assert.equal(obs2.get(), 10);
    });

    it('should propagate changes from first to second', function() {
      var obs1 = new Observable(10);
      var obs2 = new Observable(20);

      Observable.bind(obs1, obs2);

      obs1.before();
      assert.equal(obs2.get(), 10);
    });

    it('should propagate changes from second to first', function() {
      var obs1 = new Observable(10);
      var obs2 = new Observable(20);

      Observable.bind(obs1, obs2);

      obs2.set(30);
      obs2.before();
      assert.equal(obs1.get(), 30);
    });

    it('should do nothing if first argument is not Observable', function() {
      var obs = new Observable(10);
      Observable.bind(42, obs); // Should not throw
      assert.equal(obs.get(), 10);
    });

    it('should do nothing if second argument is not Observable', function() {
      var obs = new Observable(10);
      Observable.bind(obs, 42); // Should not throw
      assert.equal(obs.get(), 10);
    });
  });

  describe('Static method: uniBind', function() {
    it('should uni-directionally bind two Observables', function() {
      var obs1 = new Observable(10);
      var obs2 = new Observable(20);

      Observable.uniBind(obs1, obs2);

      // Initial sync should set obs2 to obs1's value
      assert.equal(obs2.get(), 10);
    });

    it('should propagate changes from first to second', function() {
      var obs1 = new Observable(10);
      var obs2 = new Observable(20);

      Observable.uniBind(obs1, obs2);

      obs1.set(30);
      obs1.before();
      assert.equal(obs2.get(), 30);
    });

    it('should not propagate changes from second to first', function() {
      var obs1 = new Observable(10);
      var obs2 = new Observable(20);

      Observable.uniBind(obs1, obs2);

      obs2.set(30);
      obs2.before();
      assert.equal(obs1.get(), 10); // obs1 should not change
    });

    it('should do nothing if arguments are not Observables', function() {
      var obs = new Observable(10);
      Observable.uniBind(42, obs); // Should not throw
      Observable.uniBind(obs, 42); // Should not throw
    });
  });

  describe('Scheduler', function() {
    it('should have scheduler object', function() {
      assert.isObject(Observable.scheduler);
    });

    it('should have run method', function() {
      assert.isFunction(Observable.scheduler.run);
    });

    it('should have freeze method', function() {
      assert.isFunction(Observable.scheduler.freeze);
    });

    it('should have in_transaction method', function() {
      assert.isFunction(Observable.scheduler.in_transaction);
    });

    it('should have register_update method', function() {
      assert.isFunction(Observable.scheduler.register_update);
    });

    it('should start unfrozen', function() {
      assert.isFalse(Observable.scheduler._frozen);
    });

    it('should freeze when freeze is called', function() {
      Observable.scheduler.freeze();
      assert.isTrue(Observable.scheduler._frozen);
    });

    it('should execute callback in transaction', function() {
      var executed = false;
      Observable.scheduler.in_transaction(function() {
        executed = true;
      });
      assert.isTrue(executed);
    });

    it('should freeze during transaction', function() {
      var wasFrozen = false;
      Observable.scheduler._frozen = false;
      Observable.scheduler.in_transaction(function() {
        wasFrozen = Observable.scheduler._frozen;
      });
      assert.isTrue(wasFrozen);
    });

    it('should unfreeze after transaction', function() {
      Observable.scheduler._frozen = false;
      Observable.scheduler.in_transaction(function() {});
      assert.isFalse(Observable.scheduler._frozen);
    });

    it('should not freeze/unfreeze if already frozen', function() {
      Observable.scheduler._frozen = true;
      Observable.scheduler.in_transaction(function() {});
      assert.isTrue(Observable.scheduler._frozen);
    });
  });

  describe('Static method: inTransaction', function() {
    it('should call scheduler.in_transaction', function() {
      var executed = false;
      Observable.inTransaction(function() {
        executed = true;
      });
      assert.isTrue(executed);
    });
  });

  describe('Integration scenarios', function() {
    it('should handle multiple set operations', function() {
      var obs = new Observable(0);
      obs.set(1);
      obs.set(2);
      obs.set(3);
      assert.equal(obs.get(), 3);
    });

    it('should handle chained byPath calls', function() {
      var root = new Observable({ a: { b: { c: 42 } } });
      var childA = root.byPath(['a']);
      var childB = childA.byPath(['b']);

      assert.equal(childB.get().c, 42);
    });

    it('should handle multiple observers on same Observable', function() {
      var obs = new Observable(42);
      var count1 = 0;
      var count2 = 0;

      obs.on('change', function() { count1++; });
      obs.on('change', function() { count2++; });

      obs.update();
      assert.equal(count1, 1);
      assert.equal(count2, 1);
    });

    it('should handle bind and uniBind together', function() {
      var obs1 = new Observable(10);
      var obs2 = new Observable(20);
      var obs3 = new Observable(30);

      Observable.bind(obs1, obs2);
      Observable.uniBind(obs1, obs3);

      assert.equal(obs2.get(), 10);
      assert.equal(obs3.get(), 10);
    });

    it('should handle complete lifecycle', function() {
      var obs = new Observable(42);
      var events = [];

      obs.on('beforeChange', function() { events.push('before'); });
      obs.on('change', function() { events.push('change'); });
      obs.on('afterChange', function() { events.push('after'); });

      obs.before();
      obs.update();
      obs.after();

      assert.deepEqual(events, ['before', 'change', 'after']);
    });
  });

  describe('Edge cases', function() {
    it('should handle rapid successive sets', function() {
      var obs = new Observable(0);
      for (var i = 0; i < 100; i++) {
        obs.set(i);
      }
      assert.equal(obs.get(), 99);
    });

    it('should handle setting Observable to itself', function() {
      var obs = new Observable(42);
      obs.set(obs); // Should unpack to 42
      assert.equal(obs.get(), 42);
    });

    it('should handle circular references in byPath', function() {
      var obj = { a: {} };
      obj.a.b = obj;
      var obs = new Observable(obj);
      var child = obs.byPath(['a']);
      assert.equal(child.get().b.a, obj.a);
    });

    it('should handle toString on complex objects', function() {
      var obs = new Observable({ key: 'value' });
      var str = obs.toString();
      assert.isString(str);
    });

    it('should handle many listeners without memory issues', function() {
      var obs = new Observable(42);
      for (var i = 0; i < 100; i++) {
        obs.on('change', function() {});
      }
      assert.equal(obs.listenerCount('change'), 100);
      obs.destroy();
      assert.equal(obs.listenerCount('change'), 0);
    });
  });
});
