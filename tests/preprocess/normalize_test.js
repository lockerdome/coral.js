"use strict";
/* global it, describe, beforeEach */

var assert = require("chai").assert;

describe('Normalize', function() {
  var normalize_factory;
  var normalize, default_values, index_refs, helpers;

  beforeEach(function() {
    normalize_factory = require('../../preprocess/preprocess_graph/normalize');
    var exports = normalize_factory();
    normalize = exports.normalize;
    default_values = exports.default_values;
    index_refs = exports.index_refs;
    helpers = exports.helpers;
  });

  describe('Module Structure', function() {
    it('should export factory function', function() {
      assert.isFunction(normalize_factory);
    });

    it('should export normalize function', function() {
      assert.isFunction(normalize);
    });

    it('should export default_values function', function() {
      assert.isFunction(default_values);
    });

    it('should export index_refs function', function() {
      assert.isFunction(index_refs);
    });

    it('should export helpers object', function() {
      assert.isObject(helpers);
    });
  });

  describe('Exported Helpers', function() {
    describe('not()', function() {
      it('should negate function result', function() {
        var isTrue = function() { return true; };
        var isFalse = helpers.not(isTrue);
        assert.isFalse(isFalse());
      });

      it('should preserve arguments', function() {
        var greaterThan5 = function(x) { return x > 5; };
        var notGreaterThan5 = helpers.not(greaterThan5);
        assert.isTrue(notGreaterThan5(3));
        assert.isFalse(notGreaterThan5(7));
      });
    });

    describe('defaultToObj()', function() {
      it('should return empty object', function() {
        var result = helpers.defaultToObj();
        assert.deepEqual(result, {});
      });
    });

    describe('defaultToArray()', function() {
      it('should return empty array', function() {
        var result = helpers.defaultToArray();
        assert.deepEqual(result, []);
      });
    });

    describe('defaultToFalse()', function() {
      it('should return false', function() {
        var result = helpers.defaultToFalse();
        assert.strictEqual(result, false);
      });
    });

    describe('defaultToString()', function() {
      it('should return function that returns string', function() {
        var fn = helpers.defaultToString('hello');
        assert.isFunction(fn);
        assert.equal(fn(), 'hello');
      });
    });

    describe('strToInputArgs()', function() {
      it('should convert string to input args object', function() {
        var result = helpers.strToInputArgs('MyType');
        assert.deepEqual(result, { type: 'MyType', args: {} });
      });
    });

    describe('isModelParam()', function() {
      it('should return true for item_index', function() {
        assert.isTrue(helpers.isModelParam('item_index'));
      });

      it('should return true for item.foo', function() {
        assert.isTrue(helpers.isModelParam('item.foo'));
      });

      it('should return true for item', function() {
        assert.isTrue(helpers.isModelParam('item'));
      });

      it('should return false for other params', function() {
        assert.isFalse(helpers.isModelParam('foo'));
        assert.isFalse(helpers.isModelParam('model'));
      });
    });

    describe('unexpected()', function() {
      it('should return function that throws error', function() {
        var thrower = helpers.unexpected('test message');
        assert.throws(function() {
          thrower({}, 'object', ['root', 'key']);
        }, /Unexpected object. test message/);
      });

      it('should include message in error', function() {
        var thrower = helpers.unexpected('bad value');
        assert.throws(function() {
          thrower({}, 'string', ['elements', 'myElement']);
        }, /bad value/);
      });
    });

    describe('toInlineFunctionObject()', function() {
      it('should convert simple function to object', function() {
        var func = function(a, b) { return a + b; };
        var result = helpers.toInlineFunctionObject(func);

        assert.equal(result.type, '!inline');
        assert.deepEqual(result.params, ['a', 'b']);
        assert.equal(result.output, func);
        assert.deepEqual(result.args, { a: 'a', b: 'b' });
        assert.isArray(result.parsed_params);
      });

      it('should handle function with no params', function() {
        var func = function() { return 42; };
        var result = helpers.toInlineFunctionObject(func);

        assert.deepEqual(result.params, []);
        assert.deepEqual(result.args, {});
      });
    });
  });

  describe('default_values()', function() {
    it('should process element params', function() {
      var info = {
        elements: {
          myElem: {
            params: ['foo', 'bar']
          }
        }
      };

      var result = default_values(info);
      assert.isArray(result.elements.myElem.params);
      assert.equal(result.elements.myElem.params.length, 2);
      assert.equal(result.elements.myElem.params[0].name, 'foo');
      assert.equal(result.elements.myElem.params[1].name, 'bar');
    });

    it('should detect duplicate params', function() {
      var info = {
        elements: {
          myElem: {
            params: ['foo', 'bar', 'foo']
          }
        }
      };

      assert.throws(function() {
        default_values(info);
      }, /duplicated param.*foo/);
    });
  });
});
