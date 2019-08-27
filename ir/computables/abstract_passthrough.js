"use strict";

var inherits = require('util').inherits;
var Computable = require('../computable');

/**
 * An abstract base for intermediate Computables that use the given Computable's traits as its own.
 *
 * @constructor
 * @extends Computable
 * @param {Array.<Computable>} computables
 * @param {IRType} type
 */
function AbstractPassthrough (computables, type) {
  Computable.call(this, computables[0].get_containing_scope(), computables, type);
}

inherits(AbstractPassthrough, Computable);

/**
 * @returns {Computable}  The Computable that serves as the source for this passthrough computable.
 */
AbstractPassthrough.prototype.get_parent = function () {
  return this.get_input(0);
};

/**
 * @override
 */
AbstractPassthrough.prototype.is_output_updated_externally = function () {
  return this.get_parent().is_output_updated_externally();
};

/**
 * @override
 */
AbstractPassthrough.prototype.is_output_updated_on_mutate = function () {
  return this.get_parent().is_output_updated_on_mutate();
};

/**
 * @override
 */
AbstractPassthrough.prototype.is_mutable = function () {
  return this.get_parent().is_mutable();
};

/**
 * @override
 */
AbstractPassthrough.prototype.is_invariant = function () {
  return this.get_parent().is_invariant();
};

/**
 * @override
 */
AbstractPassthrough.prototype.is_compile_time_constant = function () {
  return this.get_parent().is_compile_time_constant();
};

/**
 * @override
 */
AbstractPassthrough.prototype.is_side_effect_causing = function () {
  return this.get_parent().is_side_effect_causing();
};

module.exports = AbstractPassthrough;
