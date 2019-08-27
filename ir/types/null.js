"use strict";

var inherits = require('util').inherits;
var IRType = require('../type');
var IRExactValueType = require('./exact_value');

/**
 * @constructor
 * @extends IRType
 */
function IRNullType() {
}

inherits(IRNullType, IRType);

/**
 * @override
 * @returns {boolean} Whether the type instance can be considered an {@link IRNullType}.
 */
IRNullType.prototype.allows = function (type) {
  if (this.equals(type)) return true;

  if (!(type instanceof IRExactValueType)) return false;

  var given_value = type.get_value();
  return given_value === null || given_value === undefined;
};

IRNullType.prototype.toString = function () {
  return 'null';
};

/**
 * @override
 * @returns {boolean} Whether the type instance is also an {@link IRNullType}.
 */
IRNullType.prototype.equals = function (type) {
  return type instanceof IRNullType;
};

module.exports = IRNullType;
