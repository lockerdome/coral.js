"use strict";

var IRAnyType = require('./types/any');
var IRCompoundType = require('./types/compound');
var IRVoidType = require('./types/void');
var IRTupleType = require('./types/tuple');
var IRExactValueType = require('./types/exact_value');
var IRDOMPlacementType = require('./types/dom_placement');
var CoralTypeError = require('./coral_type_error');

/**
 * @param {IRType} type The type to apply the path to in order to obtain the nested IRType for.
 * @param {string} path The path to the nested property to obtain the IRType of.
 * @returns {IRType} The IRType of the nested property defined by the path on the type.
 */
function type_at_path (type, path) {
  if (!path) {
    return type;
  }

  var path_parts = path.split('.');
  var nested_type;
  for (var i = 0; i < path_parts.length; i++) {
    var field_name = path_parts[i];
    nested_type = field_type(type, field_name);
    if (nested_type instanceof IRVoidType || nested_type instanceof IRAnyType) {
      break;
    }
  }

  return nested_type;
}

/**
 * @param {IRType} type The type to determine the field value type of
 * @param {string} field_name The field name to determine the type of on the given type
 * @returns {IRType} The IRType determined for the given field name on the given type
 */
function field_type (type, field_name) {
  // TODO: union handling
  var output_type;
  if (type instanceof IRCompoundType) {
    output_type = type.get_key_type(field_name);
    if (output_type instanceof IRVoidType) {
      throw new CoralTypeError(field_name + " is not an available field, available fields are: " + type.get_keys());
    }
  } else if (type instanceof IRExactValueType) {
    var value = type.get_value();
    if (typeof value !== 'object' || value === null) {
      return new IRVoidType();
    }

    output_type = new IRExactValueType(value[field_name]);
  } else if (type instanceof IRTupleType) {
    if (typeof parseInt(field_name, 10) !== 'number') {
      output_type = new IRVoidType();
    } else {
      output_type = type.get_entry_type(parseInt(field_name, 10));
    }
  } else if (type instanceof IRDOMPlacementType) {
    output_type = new IRVoidType();
  }

  // TODO: this should not be necessary
  if (!output_type) {
    return new IRAnyType();
  }

  return output_type;
}

module.exports = type_at_path;
