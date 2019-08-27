"use strict";

var inherits = require('util').inherits;
var IRType = require('../type');

/**
 * @constructor
 * @extends IRType
 */
function IRDOMPlacementType() {}

inherits(IRDOMPlacementType, IRType);

/**
 * @override
 */
IRDOMPlacementType.prototype.toString = function () {
  return "placement";
};

/**
 * @override
 */
IRDOMPlacementType.prototype.allows = function (type) {
  return this.equals(type);
};

/**
 * @override
 */
IRDOMPlacementType.prototype.equals = function (type) {
  return type instanceof IRDOMPlacementType;
};

module.exports = IRDOMPlacementType;
