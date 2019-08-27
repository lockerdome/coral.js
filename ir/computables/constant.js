"use strict";

var Computable = require('../computable');
var inherits = require('util').inherits;
var IRExactValue = require('../types/exact_value');

/**
 * @constructor
 * @extends Computable
 * @param {Scope} scope The scope that is using this Constant.
 * @param {*} value The value the Constant is set to.
 */
function Constant (scope, value) {
  var input_computables = [];
  var output_type = new IRExactValue(value);
  Computable.call(this, scope, input_computables, output_type);
  this._value = value;
}

inherits(Constant, Computable);

/**
 * @override
 */
Constant.prototype.get_property = function (field_name) {
  return new Constant(this.get_containing_scope(), this._value && this._value[field_name]);
};

/**
 * @override
 */
Constant.prototype._clone = function (scope) {
  return new Constant(scope, this.get_value());
};

/**
 * @returns {*} The value this Constant was initialized to.
 */
Constant.prototype.get_value = function () {
  return this._value;
};

/**
 * @override
 * @returns {boolean} Returns true confirming that the Constant is constant at compile time.
 */
Constant.prototype.is_compile_time_constant = function () {
  return true;
};

/**
 * @override
 * @returns {boolean} Returns true confirming that the Constant will never update beyond its initial value.
 */
Constant.prototype.is_invariant = function () {
  return true;
};

module.exports = Constant;
