"use strict";

var uglify = require('uglify-js');

/**
 * @param {string} stringifed_function
 * @returns {string}
 */
function minify_stringified_function (stringified_function) {
  var result = uglify.minify('!' + stringified_function.replace(/^function anonymous/, 'function') + '();');
  if (result.error) throw result.error;
  return result.code.slice(1, -3) || 'function(){}';
}

module.exports = minify_stringified_function;
