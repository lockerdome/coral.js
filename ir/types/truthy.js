"use strict";

var inherits = require('util').inherits;
var IRType = require('../type');
var IRExactValueType = require('./exact_value');

/**
 * @constructor
 * @extends IRType
 */
function IRTruthyType() {
}

inherits(IRTruthyType, IRType);

/**
 * @override
 */
IRTruthyType.prototype.toString = function () {
  return 'truthy';
};

/**
 * @override
 */
IRTruthyType.prototype.allows = function (type) {
  if (type instanceof IRExactValueType) {
    return !!type.get_value();
  }

  return this.equals(type);
};

/**
 * @override
 */
IRTruthyType.prototype.equals = function (type) {
  return type instanceof IRTruthyType;
};

module.exports = IRTruthyType;
