"use strict";

var uglify = require('uglify-js');

// The function is minified as the right hand side of an assignment to an
// undeclared global so that the compressor keeps it. Wrapping it in a
// discarded IIFE instead lets v3 drop or inline it as dead code.
var ASSIGNMENT_PREFIX = 'sliceThisAndEqualOff=';

/**
 * @param {string} stringifed_function
 * @returns {string}
 */
function minify_stringified_function (stringified_function) {
  var result = uglify.minify(ASSIGNMENT_PREFIX + stringified_function.replace(/^function anonymous/, 'function') + ';');
  if (result.error) throw result.error;
  return result.code.slice(ASSIGNMENT_PREFIX.length, -1) || 'function(){}';
}

module.exports = minify_stringified_function;
