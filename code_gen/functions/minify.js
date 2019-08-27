"use strict";

var uglify = require('uglify-js');

/**
 * @param {string} stringifed_function
 * @returns {string}
 */
function minify_stringified_function (stringified_function) {
  return uglify.minify('!' + stringified_function.replace(/^function anonymous/, 'function') + '();', {
    fromString: true
  }).code.slice(1, -3) || 'function(){}';
}

module.exports = minify_stringified_function;
