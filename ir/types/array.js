"use strict";

var inherits = require('util').inherits;
var IRType = require('../type');
var IRVoidType = require('./void');
var IRExactValueType = require('./exact_value');
var IRTupleType = require('./tuple');

var is_type_contained = require('../is_type_contained');

/**
 * @constructor
 * @extends IRType
 * @param {IRType} type The type that all entries must satisify.
 * @param {number} [minimum=0] The minimum number of values in the array.
 * @param {?number} [maximum=null] The maximum number of values in the array.
 */
function IRArrayType(type, minimum, maximum) {
  if (!type) {
    throw new Error("A type for the entries is required");
  }
  if (type instanceof IRVoidType) {
    throw new Error("Void represents no value and thus cannot be used for an array of values");
  }

  if (minimum === undefined || minimum === null) minimum = 0;

  if (minimum < 0) {
    throw new Error("Minimum cannot be less than zero");
  }
  if (maximum < 0) {
    throw new Error("Maximum cannot be less than zero");
  }
  if (maximum < minimum) {
    throw new Error("Maximum cannot be less than the minimum");
  }

  this._type = type;
  this._minimum = minimum;
  this._maximum = typeof maximum === "number" ? maximum : Infinity;
}

inherits(IRArrayType, IRType);

/**
 * @override
 */
IRArrayType.prototype.toString = function () {
  // TODO: factor in min and max
  return '['+this._type.toString()+']';
};

/**
 * @override
 */
IRArrayType.prototype.allows = function (type) {
  var my_minimum_count = this.get_minimum_count();
  var my_maximum_count = this.get_maximum_count();
  var my_required_type = this.get_entries_type();
  var i;

  if (type instanceof IRArrayType) {
    if (!is_type_contained(my_required_type, type.get_entries_type())) return false;

    var given_minimum_count = type.get_minimum_count();
    var given_maximum_count = type.get_maximum_count();

    if (given_minimum_count < my_minimum_count || given_maximum_count > my_maximum_count) return false;

    return true;
  } else if (type instanceof IRExactValueType) {
    var given_value = type.get_value();

    if (!(given_value instanceof Array)) return false;

    if (given_value.length < my_minimum_count || given_value.length > my_maximum_count) return false;

    for (i = 0; i < given_value.length; i++) {
      var array_value = given_value[i];
      if (!is_type_contained(my_required_type, new IRExactValueType(array_value))) return false;
    }

    return true;
  } else if (type instanceof IRTupleType) {
    var tuple_entry_count = type.get_entry_count();

    if (my_minimum_count > tuple_entry_count || my_maximum_count < tuple_entry_count) return false;

    for (i = 0; i < tuple_entry_count; i++) {
      var tuple_entry_type = type.get_entry_type(i);
      if (!is_type_contained(my_required_type, tuple_entry_type)) return false;
    }

    return true;
  }

  return false;
};

/**
 * @override
 */
IRArrayType.prototype.equals = function (type) {
  return type instanceof IRArrayType &&
    this.get_minimum_count() === type.get_minimum_count() &&
    this.get_maximum_count() === type.get_maximum_count() &&
    this.get_entries_type() === type.get_entries_type();
};

/**
 * @param {number} index The index of the array item to get the required type for.
 * @returns {IRType} The required type of the index or {@link IRVoidType} if there should not be a value at the given index.
 */
IRArrayType.prototype.get_entry_required_type = function (index) {
  var minimum = this.get_minimum_count();
  var maximum = this.get_maximum_count();
  if (index < 0) {
    return new IRVoidType();
  }
  if (maximum !== null && index > maximum) {
    return IRVoidType();
  }

  return this._type;
};

/**
 * @returns {IRType} The type that all entries must match.
 */
IRArrayType.prototype.get_entries_type = function () {
  return this._type;
};

/**
 * @returns {number} The minimum number of items required.
 */
IRArrayType.prototype.get_minimum_count = function () {
  return this._minimum;
};

/**
 * @returns {?number} The maximum number of items required, or null if no maximum.
 */
IRArrayType.prototype.get_maximum_count = function () {
  return this._maximum;
};

module.exports = IRArrayType;
