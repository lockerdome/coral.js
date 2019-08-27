"use strict";

var inherits = require('util').inherits;
var IRType = require('../type');
var IRVoidType = require('./void');
var IRAnyType = require('./any');
var IRExactValueType = require('./exact_value');

/**
 * @constructor
 * @extends IRType
 * @param {Array.<IRType>} types The types this union allows.
 */
function IRUnionType(types) {
  if (!types || !types.length) {
    throw new Error("Must pass in at least one type to have in the union");
  }

  var filtered_types = [];
  var filtered_types_generic = {};
  var filtered_types_exact = {};
  var i, j;

  for (i = 0; i < types.length; i++) {
    var type = types[i];

    if (!(type instanceof IRType)) {
      throw new Error("All parameters given to the union must be IRTypes");
    }

    if (type instanceof IRVoidType) {
      throw new Error("Void can not be used as an input type");
    }

    if (type instanceof IRUnionType) {
      // Flatten nested unions.
      var nested_count = type.get_type_count();
      for (j = 0; j < nested_count; j++) {
        var nested_type = type.get_type(j);
        deduplicate_filtered_types(nested_type);
      }
    } else {
      deduplicate_filtered_types(type);
    }
  }

  function deduplicate_filtered_types (type) {
    var to_string_value = type.toString();
    if (type instanceof IRExactValueType) {
      if (!filtered_types_exact[to_string_value]) {
        filtered_types_exact[to_string_value] = type;
        filtered_types.push(type);
      }
    } else {
      if (!filtered_types_generic[to_string_value]) {
        filtered_types_generic[to_string_value] = type;
        filtered_types.push(type);
      }
    }
  }

  // TODO: Sort filtered types based on sort order
  // TODO: Deduplicate (things with duplicate sort order)
  // TODO: Possible to remove more specific requirements if we have less specific requirements that allow the more specific ones.

  this._types = filtered_types;
}

inherits(IRUnionType, IRType);

/**
 * @override
 * @returns {boolean} Whether the union allows the given type to be used.
 */
IRUnionType.prototype.allows = function (type) {
  throw new Error('IRUnionType handles all slot input allow logic in ir/is_type_contained.js');
};

/**
 * @override
 * @returns {boolean} Whether the given type instance can be considered equal to this union.
 */
IRUnionType.prototype.equals = function (type) {
  if (!(type instanceof IRUnionType)) return false;

  var our_type_count = this.get_type_count();
  var given_type_count = type.get_type_count();
  if (our_type_count !== given_type_count) {
    return false;
  }

  for (var i = 0; i < our_type_count; i++) {
    var indexed_type = this.get_type(i);
    // TODO: This assumes we have a certain sort order in place.
    if (!indexed_type.equals(type.get_type(i))) {
      return false;
    }
  }

  return true;
};

/**
 * @override
 */
IRUnionType.prototype.toString = function () {
  return this._types.map(function (type) {
    return type.toString();
  }).join('|');
};

/**
 * @returns {number} The number of types in the union.
 */
IRUnionType.prototype.get_type_count = function () {
  return this._types.length;
};

/**
 * @param {number} index The index of the type to get.
 * @returns {IRType} The type at the given index, or {@link IRVoidType} if there is none at that index.
 */
IRUnionType.prototype.get_type = function (index) {
  return this._types[index] || new IRVoidType();
};

module.exports = IRUnionType;
