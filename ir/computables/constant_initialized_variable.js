"use strict";

var inherits = require('util').inherits;
var Constant = require('./constant');
var NestedPassthrough = require('./nested_passthrough');
var IRAnyType = require('../types/any');

/**
 * @constructor
 * @extends Constant
 * @param {Scope} scope The scope that is using this variable.
 * @param {*} initial_value The value this variable will be initialized to.
 */
function ConstantInitializedVariable (scope, initial_value) {
  Constant.call(this, scope, initial_value);
}

inherits(ConstantInitializedVariable, Constant);

/**
 * @override
 */
ConstantInitializedVariable.prototype._clone = function (scope) {
  return new ConstantInitializedVariable(scope, this.get_value());
};

/**
 * @override
 */
ConstantInitializedVariable.prototype.get_property = function (field_name) {
  // We don't know what it could change to, but we can't assume it will stay the same time as it is initialized to.
  return new NestedPassthrough(this, field_name, new IRAnyType());
};

/**
 * @override
 * @returns {boolean} Returns true confirming that the variable is constant at compile time.
 */
ConstantInitializedVariable.prototype.is_compile_time_constant = function () {
  return true;
};

/**
 * @override
 * @returns {boolean}
 */
ConstantInitializedVariable.prototype.is_invariant = function () {
  return false;
};

/**
 * @override
 * @returns {boolean} Returns true confirming that it is possible to be mutated.
 */
ConstantInitializedVariable.prototype.is_mutable = function () {
  return true;
};

/**
 * @override
 * @returns {boolean} Returns true confirming that the variable updates when mutated.
 */
ConstantInitializedVariable.prototype.is_output_updated_on_mutate = function () {
  return true;
};

module.exports = ConstantInitializedVariable;
