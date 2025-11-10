"use strict";
/* global it, describe, beforeEach */

var assert = require("chai").assert;
var CodeBuffer = require('../../lib/code_buffer');

describe('CodeBuffer', function() {
  var buffer;

  beforeEach(function() {
    buffer = new CodeBuffer();
  });

  describe('constructor', function() {
    it('should create a new CodeBuffer instance', function() {
      assert.instanceOf(buffer, CodeBuffer);
    });

    it('should initialize with empty buffer', function() {
      assert.deepEqual(buffer.buffer, []);
    });

    it('should initialize with empty params', function() {
      assert.deepEqual(buffer.params, []);
    });

    it('should initialize with empty prelude', function() {
      assert.deepEqual(buffer.prelude, []);
    });

    it('should initialize with indent level of 1', function() {
      assert.equal(buffer.indent, 1);
    });
  });

  describe('push', function() {
    it('should add line to buffer with indentation', function() {
      buffer.push('test line');
      assert.equal(buffer.buffer.length, 1);
      assert.equal(buffer.buffer[0], '  test line');
    });

    it('should concatenate multiple arguments', function() {
      buffer.push('var ', 'x', ' = ', '5');
      assert.equal(buffer.buffer[0], '  var x = 5');
    });

    it('should handle no arguments', function() {
      buffer.push();
      assert.equal(buffer.buffer[0], '  ');
    });

    it('should apply current indent level', function() {
      buffer.indent = 3;
      buffer.push('code');
      assert.equal(buffer.buffer[0], '      code');
    });

    it('should add multiple lines', function() {
      buffer.push('line 1');
      buffer.push('line 2');
      buffer.push('line 3');
      assert.equal(buffer.buffer.length, 3);
      assert.equal(buffer.buffer[0], '  line 1');
      assert.equal(buffer.buffer[1], '  line 2');
      assert.equal(buffer.buffer[2], '  line 3');
    });
  });

  describe('unshift', function() {
    it('should add line to beginning of buffer', function() {
      buffer.push('second');
      buffer.unshift('first');
      assert.equal(buffer.buffer[0], '  first');
      assert.equal(buffer.buffer[1], '  second');
    });

    it('should always use 2-space indentation', function() {
      buffer.indent = 5;
      buffer.unshift('code');
      assert.equal(buffer.buffer[0], '  code');
    });

    it('should work with empty buffer', function() {
      buffer.unshift('first');
      assert.equal(buffer.buffer.length, 1);
      assert.equal(buffer.buffer[0], '  first');
    });
  });

  describe('indent method', function() {
    it('should increase indent level during callback', function() {
      var indentBefore = buffer.indent;
      var indentDuring;
      var indentMethod = CodeBuffer.prototype.indent;
      indentMethod.call(buffer, function() {
        indentDuring = buffer.indent;
      });
      assert.equal(indentBefore, 1);
      assert.equal(indentDuring, 2);
    });

    it('should restore indent level after callback', function() {
      var indentMethod = CodeBuffer.prototype.indent;
      indentMethod.call(buffer, function() {
        assert.equal(buffer.indent, 2);
      });
      assert.equal(buffer.indent, 1);
    });

    it('should support nested indentation', function() {
      var levels = [];
      var indentMethod = CodeBuffer.prototype.indent;
      levels.push(buffer.indent);
      indentMethod.call(buffer, function() {
        levels.push(buffer.indent);
        indentMethod.call(buffer, function() {
          levels.push(buffer.indent);
        });
        levels.push(buffer.indent);
      });
      levels.push(buffer.indent);
      assert.deepEqual(levels, [1, 2, 3, 2, 1]);
    });

    it('should apply correct indentation to pushed lines', function() {
      var indentMethod = CodeBuffer.prototype.indent;
      buffer.push('level 1');
      indentMethod.call(buffer, function() {
        buffer.push('level 2');
        indentMethod.call(buffer, function() {
          buffer.push('level 3');
        });
        buffer.push('level 2 again');
      });
      buffer.push('level 1 again');

      assert.equal(buffer.buffer[0], '  level 1');
      assert.equal(buffer.buffer[1], '    level 2');
      assert.equal(buffer.buffer[2], '      level 3');
      assert.equal(buffer.buffer[3], '    level 2 again');
      assert.equal(buffer.buffer[4], '  level 1 again');
    });
  });

  describe('toFunction', function() {
    it('should create a function from buffer', function() {
      buffer.params = ['x'];
      buffer.push('return x * 2;');
      var fn = buffer.toFunction();
      assert.isFunction(fn);
      assert.equal(fn(5), 10);
    });

    it('should use params array for function parameters', function() {
      buffer.params = ['a', 'b'];
      buffer.push('return a + b;');
      var fn = buffer.toFunction();
      assert.equal(fn(3, 7), 10);
    });

    it('should include prelude before buffer', function() {
      buffer.prelude = ['var multiplier = 2;'];
      buffer.push('return x * multiplier;');
      buffer.params = ['x'];
      var fn = buffer.toFunction();
      assert.equal(fn(5), 10);
    });

    it('should handle empty buffer', function() {
      buffer.params = [];
      var fn = buffer.toFunction();
      assert.isFunction(fn);
      assert.isUndefined(fn());
    });

    it('should create function with multiple prelude lines', function() {
      buffer.prelude = [
        'var a = 10;',
        'var b = 20;'
      ];
      buffer.push('return a + b + x;');
      buffer.params = ['x'];
      var fn = buffer.toFunction();
      assert.equal(fn(5), 35);
    });

    it('should throw error for invalid JavaScript', function() {
      buffer.push('this is not valid javascript }{][');
      assert.throws(function() {
        buffer.toFunction();
      });
    });

    it('should preserve line breaks in generated function', function() {
      buffer.params = ['x'];
      buffer.push('var y = x + 1;');
      buffer.push('var z = y * 2;');
      buffer.push('return z;');
      var fn = buffer.toFunction();
      assert.equal(fn(5), 12);
    });
  });

  describe('integration', function() {
    it('should build complex function with all features', function() {
      var indentMethod = CodeBuffer.prototype.indent;
      buffer.params = ['data'];
      buffer.prelude.push('var result = [];');

      buffer.push('if (data && data.length) {');
      indentMethod.call(buffer, function() {
        buffer.push('for (var i = 0; i < data.length; i++) {');
        indentMethod.call(buffer, function() {
          buffer.push('result.push(data[i] * 2);');
        });
        buffer.push('}');
      });
      buffer.push('}');
      buffer.push('return result;');

      var fn = buffer.toFunction();
      assert.deepEqual(fn([1, 2, 3]), [2, 4, 6]);
    });

    it('should handle empty arrays gracefully', function() {
      buffer.params = ['arr'];
      buffer.push('return arr || [];');
      var fn = buffer.toFunction();
      assert.deepEqual(fn(), []);
      assert.deepEqual(fn([1, 2]), [1, 2]);
    });
  });
});
