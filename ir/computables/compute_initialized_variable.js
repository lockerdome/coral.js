"use strict";

var inherits = require('util').inherits;
var PureFunction = require('./pure_function');

/**
 * @constructor
 * @extends PureFunction
 * @param {Scope} scope The scope that is using this variable.
 * @param {function} func The function to use for computing the initial value.
 * @param {Array.<Computable>} input_computables The Computables to use for computing the initial value.
 */
function ComputeInitializedVariable (scope, func, input_computables) {
  PureFunction.call(this, scope, func, input_computables);
}

inherits(ComputeInitializedVariable, PureFunction);

/**
 * @override
 */
ComputeInitializedVariable.prototype._clone = function (scope, input_computables) {
  return new ComputeInitializedVariable(scope, this.get_function(), input_computables);
};

/**
 * @override
 */
ComputeInitializedVariable.prototype.is_output_updated_on_input_change = function () {
  return false;
};

/**
 * @override
 */
ComputeInitializedVariable.prototype.is_mutable = function () {
  return true;
};


/**
 * @override
 */
ComputeInitializedVariable.prototype.is_output_updated_on_mutate = function () {
  return true;
};

module.exports = ComputeInitializedVariable;
