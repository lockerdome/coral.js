"use strict";

var inherits = require('util').inherits;
var AbstractPassthrough = require('./abstract_passthrough');
var NestedPassthrough = require('./nested_passthrough');

var IRAnyType = require('../types/any');

/**
 * @constructor
 * @extends AbstractPassthrough
 * @param {Computable} computable
 * @param {Computable} dynamic_path_computable
 */
function DynamicNestedPassthrough (computable, dynamic_path_computable) {
  // TODO: Think about making the output type for this better, possible in some cases.
  AbstractPassthrough.call(this, [computable, dynamic_path_computable], new IRAnyType());
}

inherits(DynamicNestedPassthrough, AbstractPassthrough);

// TODO: may want to do this at AbstractPassthrough level
/**
 * @override
 */
DynamicNestedPassthrough.prototype._validate_input = function (index, computable) {
  AbstractPassthrough.prototype._validate_input.call(this, index, computable);

  if (index === 0) {
    // TODO: think about this case, technically allowable, but definitely needs validation
  } else if (index === 1) {
    // TODO
  } else {
    throw new Error("No parameters exist for DynamicNestedPassthrough beyond index 1, cannot set index "+index);
  }
};

/**
 * @override
 */
DynamicNestedPassthrough.prototype.get_property = function (field_name) {
  return new NestedPassthrough(this, field_name);
};

/**
 * @override
 */
DynamicNestedPassthrough.prototype._clone = function (scope, input_computables) {
  return new DynamicNestedPassthrough(input_computables[0], input_computables[1]);
};

module.exports = DynamicNestedPassthrough;
