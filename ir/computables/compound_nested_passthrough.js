"use strict";

var inherits = require('util').inherits;
var AbstractPassthrough = require('./abstract_passthrough');
var NestedPassthrough = require('./nested_passthrough');

var type_at_path = require('../type_at_path');
var CoralTypeError = require('../coral_type_error');

var IRCompoundType = require('../types/compound');
var IRVoidType = require('../types/void');

// TODO: The whole field name reference handling for compound nested passthroughs is out of control and convoluted, figure out a new abstraction for dealing with these references.


// TODO: This is missing the validate input override.  The logic in the constructor for validating the input should really live in the input validator.

/**
 * CompoundNestedPassthrough is a special type of Computable that represents a
 * field on a compound that has been placed on to the scope context.
 *
 * For example, with DOM elements that output after and inner placements,
 * instead of placing an object at a symbol in the scope and then using
 * symbol.inner and symbol.after to access the field every time it is needed,
 * we can instead place the after and inner placements directly on to the
 * scope context and avoid the overhead of creating a new object to hold them.
 *
 * @constructor
 * @extends AbstractPassthrough
 * @param {Computable} parent_computable
 * @param {string} field_name
 */
function CompoundNestedPassthrough (parent_computable, field_name) {
  this._field_name = field_name;
  this._safe_property_access = false;

  var parent_computable_output_type = parent_computable.get_output_type();

  if (!(parent_computable_output_type instanceof IRCompoundType)) {
    throw new CoralTypeError("Compound nested passthrough is only for extracting fields from a compound output", parent_computable_output_type, new IRCompoundType());
  }

  var output_type = type_at_path(parent_computable_output_type, field_name);

  if (output_type instanceof IRVoidType) {
    throw new CoralTypeError("Field, '"+field_name+"' is not present in given compound", new IRVoidType());
  }

  AbstractPassthrough.call(this, [parent_computable], output_type);
}

inherits(CompoundNestedPassthrough, AbstractPassthrough);

/**
 * @override
 */
CompoundNestedPassthrough.prototype.get_property = function (field_name) {
  return new NestedPassthrough(this, field_name);
};

/**
 * @returns {string} The field name this nested represents on the parent Computable.
 */
CompoundNestedPassthrough.prototype.get_field_name = function () {
  return this._field_name;
};

// TODO: While this may never be true currently, it doesn't mean it will always be false.
/**
 * @override
 */
CompoundNestedPassthrough.prototype.is_mutable = function () {
  return false;
};

/**
 * @override
 */
CompoundNestedPassthrough.prototype._clone = function (scope, input_computables) {
  if (input_computables.length > 1 || input_computables.length === 0) {
    throw new Error("CompoundNestedPassthrough expects one input Computable, the Computable to generate a nested computable for");
  }

  return new CompoundNestedPassthrough(input_computables[0], this.get_field_name());
};

module.exports = CompoundNestedPassthrough;
