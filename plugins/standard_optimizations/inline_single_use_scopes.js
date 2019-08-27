"use strict";
/**
 * Creates the inline scope optimization with a validator that
 * checks if the scope is only use once
 */
var generate_inline_optimization = require('./lib/generate_inline_optimization');

/**
 * Check if a scope is valid for inlining if it is used onece
 * @param {Scope} scope
 * @returns {boolean}
 */
function validator (scope) {
  return scope.get_instance_count() === 1;
}

module.exports = generate_inline_optimization(validator, 'Single Instance Inlined');
