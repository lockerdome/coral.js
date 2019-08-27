"use strict";

var inherits = require('util').inherits;
var IRType = require('../type');
var IRExactValueType = require('./exact_value');

/**
 * @constructor
 * @extends IRType
 */
function IRStringType() {
}

inherits(IRStringType, IRType);

/**
 * @override
 * @returns {boolean} Whether the given type can be considered a string.
 */
IRStringType.prototype.allows = function (type) {
  return this.equals(type) || (type instanceof IRExactValueType && typeof type.get_value() === 'string');
};

IRStringType.prototype.toString = function () {
  return 'string';
};

/**
 * @override
 * @returns {boolean} Whether the given type instance is an {@link IRStringType}.
 */
IRStringType.prototype.equals = function (type) {
  return type instanceof IRStringType;
};

module.exports = IRStringType;
