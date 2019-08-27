"use strict";

var inherits = require('util').inherits;
var IRType = require('../type');
var IRVoidType = require('./void');
var IRExactValueType = require('./exact_value');

var is_type_contained = require('../is_type_contained');

/**
 * @constructor
 * @extends IRType
 * @param {Array.<IRType>} tuple_entries The type requirements for each entry the tuple must have.
 */
function IRTupleType(tuple_entries) {
  if (!tuple_entries.length) {
    throw new Error("Must provide at least one type for the tuple");
  }

  for (var i = 0; i < tuple_entries.length; i++) {
    var tuple_entry = tuple_entries[i];
    if (!(tuple_entry instanceof IRType)) {
      throw new Error("All parameters given to the tuple must be IRTypes");
    }
    if (tuple_entry instanceof IRVoidType) {
      throw new Error("Cannot use void to represent a required tuple parameter");
    }
  }

  this._tuple_entries = tuple_entries;
}

inherits(IRTupleType, IRType);

/**
 * @override
 * @returns {boolean} Whether the given type instance can be used with the requirements on this tuple.
 */
IRTupleType.prototype.allows = function (type) {
  var my_entry_count = this.get_entry_count();
  var i;
  if (type instanceof IRTupleType) {
    var given_entry_count = type.get_entry_count();
    if (my_entry_count !== given_entry_count) return false;

    for (i = 0; i < my_entry_count; i++) {
      if (!is_type_contained(this.get_entry_type(i), type.get_entry_type(i))) return false;
    }

    return true;
  } else if (type instanceof IRExactValueType) {
    var given_value = type.get_value();
    if (!(given_value instanceof Array) || given_value.length !== my_entry_count) {
      return false;
    }

    for (i = 0; i < my_entry_count.length; i++) {
      var required_type = this.get_entry_type(i);
      if (!is_type_contained(required_type, new IRExactValueType(given_value[i]))) {
        return false;
      }
    }

    return true;
  }

  return false;
};

/**
 * @override
 * @returns {boolean} Whether the given type instance can be considered equal to this tuple.
 */
IRTupleType.prototype.equals = function (type) {
  if (!(type instanceof IRTupleType)) return false;

  var my_entry_count = this.get_entry_count();
  var given_entry_count = type.get_entry_count();
  if (my_entry_count !== given_entry_count) return false;

  for (var i = 0; i < my_entry_count; i++) {
    if (!this.get_entry_type(i).equals(type.get_entry_type(i))) return false;
  }

  return true;
};

/**
 * @param {number} index The index of the tuple to get the required type for.
 * @returns {IRType} The required type of the index or IRVoidType if there should not be a value at the given index.
 */
IRTupleType.prototype.get_entry_type = function (index) {
  return this._tuple_entries[index] || new IRVoidType();
};

/**
 * @returns {number} The number of entries the tuple must have.
 */
IRTupleType.prototype.get_entry_count = function () {
  return this._tuple_entries.length;
};

module.exports = IRTupleType;
