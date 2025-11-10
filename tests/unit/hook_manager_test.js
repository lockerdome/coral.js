"use strict";
/* global it, describe, beforeEach */

var assert = require("chai").assert;
var HookManager = require('../../hook_manager');

describe('HookManager', function() {
  var hookManager;

  beforeEach(function() {
    hookManager = new HookManager();
  });

  describe('constructor', function() {
    it('should create a new HookManager instance', function() {
      assert.instanceOf(hookManager, HookManager);
    });

    it('should initialize with empty hooks', function() {
      assert.deepEqual(hookManager._pipelineHooks, {});
    });
  });

  describe('onHook', function() {
    it('should register a listener for a hook', function(done) {
      var testData = { value: 42 };

      hookManager.onHook('test_hook', function(callback, data) {
        assert.deepEqual(data, testData);
        callback();
      });

      hookManager.runHook('test_hook', [testData], function() {
        done();
      });
    });

    it('should allow multiple listeners for the same hook', function(done) {
      var callCount = 0;

      hookManager.onHook('multi_hook', function(callback) {
        callCount++;
        callback();
      });

      hookManager.onHook('multi_hook', function(callback) {
        callCount++;
        callback();
      });

      hookManager.runHook('multi_hook', [], function() {
        assert.equal(callCount, 2);
        done();
      });
    });

    it('should execute listeners in order', function(done) {
      var order = [];

      hookManager.onHook('order_hook', function(callback) {
        order.push(1);
        callback();
      });

      hookManager.onHook('order_hook', function(callback) {
        order.push(2);
        callback();
      });

      hookManager.runHook('order_hook', [], function() {
        assert.deepEqual(order, [1, 2]);
        done();
      });
    });
  });

  describe('runHook', function() {
    it('should throw error if argsArray is not an array', function() {
      assert.throws(function() {
        hookManager.runHook('test', 'not an array', function() {});
      }, /Must use an Array for 2nd argument/);
    });

    it('should execute callback with provided arguments', function(done) {
      var arg1 = 'test';
      var arg2 = 123;

      hookManager.onHook('args_hook', function(callback, a, b) {
        assert.equal(a, arg1);
        assert.equal(b, arg2);
        callback();
      });

      hookManager.runHook('args_hook', [arg1, arg2], function() {
        done();
      });
    });

    it('should work with no listeners registered', function(done) {
      hookManager.runHook('empty_hook', [], function() {
        done();
      });
    });
  });

  describe('onPipelineHook', function() {
    it('should register a pipeline listener', function(done) {
      hookManager.onPipelineHook('pipeline_test', function(next, data) {
        next(data + 1);
      });

      hookManager.runPipelineHook('pipeline_test', 5, function(result) {
        assert.equal(result, 6);
        done();
      });
    });

    it('should chain multiple pipeline listeners', function(done) {
      hookManager.onPipelineHook('chain_test', function(next, data) {
        next(data * 2);
      });

      hookManager.onPipelineHook('chain_test', function(next, data) {
        next(data + 10);
      });

      hookManager.onPipelineHook('chain_test', function(next, data) {
        next(data * 3);
      });

      // (5 * 2) = 10, (10 + 10) = 20, (20 * 3) = 60
      hookManager.runPipelineHook('chain_test', 5, function(result) {
        assert.equal(result, 60);
        done();
      });
    });

    it('should transform objects through pipeline', function(done) {
      hookManager.onPipelineHook('object_pipeline', function(next, obj) {
        obj.step1 = true;
        next(obj);
      });

      hookManager.onPipelineHook('object_pipeline', function(next, obj) {
        obj.step2 = true;
        next(obj);
      });

      var input = { initial: true };
      hookManager.runPipelineHook('object_pipeline', input, function(result) {
        assert.deepEqual(result, {
          initial: true,
          step1: true,
          step2: true
        });
        done();
      });
    });
  });

  describe('runPipelineHook', function() {
    it('should throw error if listener does not return correct number of args', function(done) {
      hookManager.onPipelineHook('bad_listener', function(next, data) {
        // Bad: calling next with wrong number of arguments
        next(data, 'extra arg');
      });

      try {
        hookManager.runPipelineHook('bad_listener', 5, function() {
          done(new Error('Should have thrown'));
        });
      } catch(e) {
        assert.match(e.message, /No return value specified in listener for Hook/);
        done();
      }
    });

    it('should work with no listeners', function(done) {
      hookManager.runPipelineHook('empty_pipeline', 42, function(result) {
        assert.equal(result, 42);
        done();
      });
    });
  });

  describe('_getPipelineHook', function() {
    it('should create a new hook if it does not exist', function() {
      var hook = hookManager._getPipelineHook('new_hook');
      assert.equal(hook.getHookName(), 'new_hook');
    });

    it('should return existing hook if it already exists', function() {
      var hook1 = hookManager._getPipelineHook('existing_hook');
      var hook2 = hookManager._getPipelineHook('existing_hook');
      assert.strictEqual(hook1, hook2);
    });

    it('should maintain separate hooks for different names', function() {
      var hook1 = hookManager._getPipelineHook('hook1');
      var hook2 = hookManager._getPipelineHook('hook2');
      assert.notStrictEqual(hook1, hook2);
      assert.equal(hook1.getHookName(), 'hook1');
      assert.equal(hook2.getHookName(), 'hook2');
    });
  });

  describe('async behavior', function() {
    it('should handle async listeners', function(done) {
      hookManager.onHook('async_hook', function(callback, data) {
        setTimeout(function() {
          data.async = true;
          callback();
        }, 10);
      });

      var testData = { value: 1 };
      hookManager.runHook('async_hook', [testData], function() {
        assert.equal(testData.async, true);
        done();
      });
    });

    it('should handle async pipeline listeners', function(done) {
      hookManager.onPipelineHook('async_pipeline', function(next, data) {
        setTimeout(function() {
          next(data + 1);
        }, 10);
      });

      hookManager.onPipelineHook('async_pipeline', function(next, data) {
        setTimeout(function() {
          next(data * 2);
        }, 10);
      });

      hookManager.runPipelineHook('async_pipeline', 5, function(result) {
        assert.equal(result, 12); // (5 + 1) * 2 = 12
        done();
      });
    });
  });
});
