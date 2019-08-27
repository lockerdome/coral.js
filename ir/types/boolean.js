"use strict";

var inherits = require('util').inherits;
var IRType = require('../type');
var IRExactValueType = require('./exact_value');

/**
 * @constructor
 * @extends IRType
 */
function IRBooleanType() {
}

inherits(IRBooleanType, IRType);

/**
 * @override
 * @param {IRType} type The type instance to check to see if we allow.
 * @returns {boolean} Whether the type instance is usable as a boolean.
 */
IRBooleanType.prototype.allows = function (type) {
  if (this.equals(type)) return true;

  if (type instanceof IRExactValueType) {
    var value = type.get_value();
    return value === true || value === false;
  }

  return false;
};

IRBooleanType.prototype.toString = function () {
  return 'boolean';
};

/**
 * @override
 * @param {IRType} type The type instance to check for equality with.
 * @returns {boolean} Whether the type instance is also an instance of {@link IRBooleanType}.
 */
IRBooleanType.prototype.equals = function (type) {
  return type instanceof IRBooleanType;
};

module.exports = IRBooleanType;
