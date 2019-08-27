"use strict";

var inherits = require('util').inherits;
var Computable = require('../computable');
var IRAnyType = require('../types/any');
var IRArrayType = require('../types/array');
var IRExactValueType = require('../types/exact_value');

// TODO: Think about preventing people from using this with computables that shouldn't be using this.  Only IterateArray should use this.

/**
 * Represents a single entry in an array, but is responsible for every single entry of the array.
 *
 * @constructor
 * @extends Computable
 * @param {Scope} scope
 * @param {Computable} array_computable
 */
function VirtualArrayItem (scope, array_computable) {
  var array_output_type = array_computable.get_output_type();

  var output_type;
  if (array_output_type instanceof IRArrayType) {
    output_type = array_output_type.get_entry_required_type();
  } else if (array_output_type instanceof IRExactValueType) {
    // TODO
  }

  if (!output_type) {
    output_type = new IRAnyType();
  }

  var input_computables = [array_computable];
  Computable.call(this, scope, input_computables, output_type);
}

inherits(VirtualArrayItem, Computable);

/**
 * @override
 */
VirtualArrayItem.prototype.is_output_updated_on_input_change = function (index) {
  return index === 0;
};

/**
 * @override
 */
VirtualArrayItem.prototype.get_property = function (field_name) {
  throw new Error("Not currently supported with map function 'item' usage");
};

/**
 * @override
 */
VirtualArrayItem.prototype._clone = function (scope, input_computables) {
  return new VirtualArrayItem(scope, input_computables[0]);
};

module.exports = VirtualArrayItem;
