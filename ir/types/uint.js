"use strict";

var inherits = require('util').inherits;
var IRType = require('../type');
var IRExactValueType = require('./exact_value');

/**
 * @constructor
 * @extends IRType
 */
function IRUnsignedIntegerType() {
}

inherits(IRUnsignedIntegerType, IRType);

/**
 * @override
 * @returns {boolean} Whether the type instance can be considered an unsigned integer.
 */
IRUnsignedIntegerType.prototype.allows = function (type) {
  if (this.equals(type)) return true;

  if (type instanceof IRExactValueType) {
    var value = type.get_value();
    if (typeof value !== 'number') return false;
    if (Math.floor(value) !== value) return false;
    return (value >= 0) && (value < 4294967296) && ((value >>> 24) !== 0xFF);
  } else {
    return false;
  }
};

IRUnsignedIntegerType.prototype.toString = function () {
  return 'uint';
};

/**
 * @override
 * @returns {boolean} Whether the given type instance is an {@link IRUnsignedIntegerType}.
 */
IRUnsignedIntegerType.prototype.equals = function (type) {
  return type instanceof IRUnsignedIntegerType;
};

module.exports = IRUnsignedIntegerType;
