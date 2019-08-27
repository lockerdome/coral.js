"use strict";
/**
 * Creates the inline scope optimization with a validator that
 * checks if the scope has fewer than three internal computables
 */
var generate_inline_optimization = require('./lib/generate_inline_optimization');

/**
 * Check if a scope is valid for inlining if it has less than
 * three internal computables
 * @param {Scope} scope
 * @returns {boolean}
 */
function validator (scope) {
  return (scope.get_computable_count() - scope.get_input_count()) < 3;
}

module.exports = generate_inline_optimization(validator, 'Trivial Instance Inlined');
