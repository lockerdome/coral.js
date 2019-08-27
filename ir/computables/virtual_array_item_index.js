"use strict";

var inherits = require('util').inherits;
var Computable = require('../computable');
var IRUIntType = require('../types/uint');

// TODO: Think about preventing people from using this with computables that shouldn't be using this.  Only IterateArray should use this.

/**
 * @constructor
 * @extends Computable
 * @param {Scope} scope
 * @param {Computable} array_computable
 */
function VirtualArrayItemIndex (scope, array_computable) {
  var output_type = new IRUIntType();
  var input_computables = [array_computable];
  Computable.call(this, scope, input_computables, output_type);
}

inherits(VirtualArrayItemIndex, Computable);

/**
 * @override
 */
VirtualArrayItemIndex.prototype.is_mutable = function () {
  return false;
};

/**
 * @override
 */
VirtualArrayItemIndex.prototype.is_output_updated_on_input_change = function (index) {
  return index === 0;
};

/**
 * @override
 */
VirtualArrayItemIndex.prototype.get_property = function (field_name) {
  throw new Error("Not currently supported with map function 'item' usage");
};

/**
 * @override
 */
VirtualArrayItemIndex.prototype._clone = function (scope, input_computables) {
  return new VirtualArrayItemIndex(scope, input_computables[0]);
};

module.exports = VirtualArrayItemIndex;
