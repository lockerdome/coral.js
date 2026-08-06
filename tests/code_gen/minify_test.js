"use strict";

var assert = require('chai').assert;
var minify_stringified_function = require('../../code_gen/functions/minify');

// Round-tripping guards against the compressor discarding or inlining the
// function instead of minifying it, which yields either the 'function(){}'
// fallback or a truncated fragment rather than a callable function.
function eval_minified (stringified_function) {
  return eval('(' + minify_stringified_function(stringified_function) + ')');
}

describe('minify_stringified_function', function () {
  it('preserves a function that returns a value', function () {
    var minified = eval_minified('function anonymous(a, b) { var s = a + b; return s; }');
    assert.strictEqual(minified(2, 3), 5);
  });

  it('preserves a function whose body only has side effects', function () {
    var calls = [];
    global.__minify_test_sink = function (v) { calls.push(v); };
    var minified = eval_minified('function anonymous(x) { __minify_test_sink(x); }');
    minified('called');
    delete global.__minify_test_sink;
    assert.deepEqual(calls, ['called']);
  });

  it('preserves a function that dereferences its argument', function () {
    var minified = eval_minified('function anonymous(state) { return state.value * 2; }');
    assert.strictEqual(minified({ value: 21 }), 42);
  });

  it('handles the newline-separated form produced by Function.prototype.toString', function () {
    var minified = eval_minified('function anonymous(a,b\n) {\nreturn a+b;\n}');
    assert.strictEqual(minified(1, 2), 3);
  });

  it('minifies post-ES5 syntax', function () {
    var minified = eval_minified('function anonymous(a) { let doubled = a * 2; const offset = doubled + 1; return () => offset; }');
    assert.strictEqual(minified(3)(), 7);
  });

  it('falls back to an empty function for an empty body', function () {
    assert.strictEqual(minify_stringified_function('function anonymous() {}'), 'function(){}');
  });
});
