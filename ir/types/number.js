"use strict";

var inherits = require('util').inherits;
var IRType = require('../type');
var IRUnsignedIntegerType = require('./uint');
var IRExactValueType = require('./exact_value');
var IRIntegerType = require('./int');

/**
 * @constructor
 * @extends IRType
 */
function IRNumberType() {
}

inherits(IRNumberType, IRType);

/**
 * @override
 * @param {IRType} type The type instance to check to see if this allows.
 * @returns {boolean} Whether the given type instance can be considered usable as a floating point number.
 */
IRNumberType.prototype.allows = function (type) {
  return this.equals(type) ||
    type instanceof IRUnsignedIntegerType ||
    type instanceof IRIntegerType ||
    (type instanceof IRExactValueType && typeof type.get_value() === 'number' && !isNaN(type.get_value()));
};

IRNumberType.prototype.toString = function () {
  return 'number';
};

/**
 * @override
 * @param {IRType} type The type instance to check equality with.
 * @returns {boolean} Whether the type instance is also an {@link IRNumberType}.
 */
IRNumberType.prototype.equals = function (type) {
  return type instanceof IRNumberType;
};

module.exports = IRNumberType;
