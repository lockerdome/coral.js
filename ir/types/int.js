"use strict";

var inherits = require('util').inherits;
var IRType = require('../type');
var IRExactValueType = require('./exact_value');

/**
 * @constructor
 * @extends IRType
 */
function IRIntegerType() {
}

inherits(IRIntegerType, IRType);

/**
 * @override
 * @returns {boolean} Whether the type instance can be considered an integer.
 */
IRIntegerType.prototype.allows = function (type) {
  if (this.equals(type)) return true;

  if (type instanceof IRExactValueType) {
    var value = type.get_value();
    if (typeof value !== 'number') return false;
    if (Math.floor(value) !== value) return false;
    return ((value|0) === value) && ((value >>> 24) !== 0x80);
  } else {
    return false;
  }
};

IRIntegerType.prototype.toString = function () {
  return 'int';
};

/**
 * @override
 * @returns {boolean} Whether the given type instance is an {@link IRIntegerType}.
 */
IRIntegerType.prototype.equals = function (type) {
  return type instanceof IRIntegerType;
};

module.exports = IRIntegerType;
