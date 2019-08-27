"use strict";

var inherits = require('util').inherits;
var IRType = require('../type');
var IRVoidType = require('./void');

/**
 * @constructor
 * @extends IRType
 */
function IRAnyType() {
}

inherits(IRAnyType, IRType);

/**
 * @param {IRType} type The type instance to check to see if we allow.
 * @returns {boolean} Whether the given {@link IRType} is not {@link IRVoid}.
 */
IRAnyType.prototype.allows = function (type) {
  return type instanceof IRType && !(type instanceof IRVoidType);
};

/**
 * @param {IRType} type The type instance to check for equality with.
 * @returns {boolean} Whether the given type instance is an {@link IRAny}.
 */
IRAnyType.prototype.equals = function (type) {
  return type instanceof IRAnyType;
};

/**
 * @override
 */
IRAnyType.prototype.toString = function () {
  return "any";
};

module.exports = IRAnyType;
