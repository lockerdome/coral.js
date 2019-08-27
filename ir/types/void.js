"use strict";

var inherits = require('util').inherits;
var IRType = require('../type');

/**
 * @constructor
 * @extends IRType
 */
function IRVoidType() {
}

inherits(IRVoidType, IRType);

/**
 * @override
 * @param {IRType} type The type instance to check whether this type instance allows.
 * @returns {boolean} Always returns false as void does not allow any type to be used with it.
 */
IRVoidType.prototype.allows = function (type) {
  return false;
};

IRVoidType.prototype.toString = function () {
  return 'void';
};

/**
 * @override
 * @param {IRType} type The type instance to check for equality with.
 * @returns {boolean} Returns whether the given type instance is also an {@link IRVoidType}.
 */
IRVoidType.prototype.equals = function (type) {
  return type instanceof IRVoidType;
};

module.exports = IRVoidType;
