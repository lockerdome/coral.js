"use strict";

var inherits = require('util').inherits;
var AbstractPassthrough = require('./abstract_passthrough');

var type_at_path = require('../type_at_path');
var IRAnyType = require('../types/any');
var IRVoidType = require('../types/void');

/**
 * @constructor
 * @extends AbstractPassthrough
 * @param {Computable} computable
 * @param {string} field_name
 * @param {IRType} override_output_type
 */
function NestedPassthrough (computable, field_name, override_output_type) {
  this._field_name = field_name;
  this._safe_property_access = false;
  this._override_output_type = override_output_type;

  var output_type = override_output_type ? override_output_type : type_at_path(computable.get_output_type(), field_name);

  // TODO: flesh out, cannot be any of the below
  // * any
  // * void
  // * null
  // * undefined
  // * union that has any of the above in it
  if (!(output_type instanceof IRVoidType || output_type instanceof IRAnyType)) {
    this._safe_property_access = true;
  }

  AbstractPassthrough.call(this, [computable], output_type);
}

inherits(NestedPassthrough, AbstractPassthrough);

// TODO: may want to do this at AbstractPassthrough level
/**
 * @override
 */
NestedPassthrough.prototype._validate_input = function (index, computable) {
  AbstractPassthrough.prototype._validate_input.call(this, index, computable);

  if (index === 0) {
    // TODO: think about this case, technically allowable, but definitely needs validation
  } else {
    throw new Error("No parameters exist for NestedPassthrough beyond index 0, cannot set index "+index);
  }
};

/**
 * @returns {boolean} Whether the nested represents a field that can be relied on to be there.
 */
NestedPassthrough.prototype.is_safe_property_access = function () {
  return this._safe_property_access;
};

/**
 * @override
 */
NestedPassthrough.prototype.get_property = function (field_name) {
  return new NestedPassthrough(this, field_name);
};

/**
 * @returns {string} The field name this nested represents on the parent Computable.
 */
NestedPassthrough.prototype.get_field_name = function () {
  return this._field_name;
};

/**
 * @override
 */
NestedPassthrough.prototype._clone = function (scope, input_computables) {
  if (input_computables.length > 1 || input_computables.length === 0) {
    throw new Error("NestedPassthrough expects one input Computable, the Computable to generate a nested computable for");
  }

  return new NestedPassthrough(input_computables[0], this._field_name, this._override_output_type);
};

module.exports = NestedPassthrough;
