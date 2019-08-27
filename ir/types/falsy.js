"use strict";

var inherits = require('util').inherits;
var IRType = require('../type');
var IRExactValueType = require('./exact_value');
var IRNullType = require('./null');

/**
 * @constructor
 * @extends IRType
 */
function IRFalsyType() {
}

inherits(IRFalsyType, IRType);

/**
 * @override
 */
IRFalsyType.prototype.toString = function () {
  return 'falsy';
};

/**
 * @override
 */
IRFalsyType.prototype.allows = function (type) {
  if (type instanceof IRExactValueType) {
    return !type.get_value();
  }

  if (type instanceof IRNullType) {
    return true;
  }

  return this.equals(type);
};

/**
 * @override
 */
IRFalsyType.prototype.equals = function (type) {
  return type instanceof IRFalsyType;
};

module.exports = IRFalsyType;
