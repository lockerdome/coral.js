"use strict";

var inherits = require('util').inherits;
var IRType = require('../type');

// TODO: add function parameter and output type information
/**
 * @constructor
 * @extends IRType
 */
function IRCallbackType() {
}

inherits(IRCallbackType, IRType);

/**
 * @override
 * @returns {boolean} Whether the type instance can be considered a callback.
 */
IRCallbackType.prototype.allows = function (type) {
  return this.equals(type);
};

IRCallbackType.prototype.toString = function () {
  return 'callback';
};

/**
 * @override
 * @returns {boolean} Whether the type instance can be considered equal to this callback type.
 */
IRCallbackType.prototype.equals = function (type) {
  return type instanceof IRCallbackType;
};

module.exports = IRCallbackType;
