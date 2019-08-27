"use strict";

var inherits = require('util').inherits;
var IRType = require('../type');

var isEqual = require('../../lib/object_helpers').is_equal;

/**
 * @constructor
 * @extends IRType
 * @param {*} value The only value this type considers valid.
 */
function IRExactValueType(value) {
  if (value instanceof IRType) {
    throw new Error("Don't pass IRTypes as the value for this, this is only meant for raw values.");
  }

  this._value = value;
}

inherits(IRExactValueType, IRType);

/**
 * @override
 */
IRExactValueType.prototype.allows = function (type) {
  return this.equals(type);
};

/**
 * @override
 * @param {IRType} type The type instance to check for equality with.
 * @returns {boolean} Whether the given type is an {@link IRExactValue} that has a value that is equal to this instance's value.
 */
IRExactValueType.prototype.equals = function (type) {
  if (!(type instanceof IRExactValueType)) return false;

  var value = this.get_value();
  var given_value = type.get_value();

  if (value === given_value) return true;

  if (typeof value === 'object' && typeof given_value === 'object') {
    return isEqual(value, given_value);
  }

  return false;
};

/**
 * @returns {*} The only value this type considers valid.
 */
IRExactValueType.prototype.get_value = function () {
  return this._value;
};

/**
 * @override
 */
IRExactValueType.prototype.toString = function () {
  return JSON.stringify(this._value) || this._value && this._value.toString() || '' + this._value;
};

module.exports = IRExactValueType;
