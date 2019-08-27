"use strict";

var inherits = require('util').inherits;
var IRType = require('../type');
var IRExactValueType = require('./exact_value');
var IRAnyType = require('./any');
var IRVoidType = require('./void');

var is_type_contained = require('../is_type_contained');

// TODO: Usage for hashes where we don't know specific keys, just have requirements on number of keys.  We probably want a dedicated type for that.
//       * Do we want to limit max number of keys?
//       * Do we want to require minimum number of keys?
//       * Require all keys be a specific type

/**
 * @constructor
 * @extends IRType
 * @param {Object.<string, IRType>} fields_specification The fields and required type for that field, can contain nested IRCompoundTypes.
 * @param {boolean} [allow_unknown_keys=false]
 */
function IRCompoundType(fields_specification, allow_unknown_keys) {
  if (!fields_specification) {
    throw new Error("Specification for valid fields must be provided");
  }

  allow_unknown_keys = allow_unknown_keys || false;

  var stored_fields = {};
  for (var key in fields_specification) {
    var key_value = fields_specification[key];

    if (!(key_value instanceof IRType)) {
      throw new Error("All keys must be set to IRTypes");
    }

    if (allow_unknown_keys || (!allow_unknown_keys && !(key_value instanceof IRVoidType))) {
      stored_fields[key] = key_value;
    }
  }

  this._fields_specification = stored_fields;
  this._allow_unknown_keys = allow_unknown_keys;
}

inherits(IRCompoundType, IRType);

/**
 * @override
 */
IRCompoundType.prototype.toString = function () {
  var _this = this;

  return '{' +
    this.get_keys().map(function (ir_key) {
      return ir_key + ':' + _this._fields_specification[ir_key].toString();
    }).join(',') +
    (this._allow_unknown_keys ? ', ...' : '') +
  '}';
};

/**
 * @returns {Array.<string>} All the required keys in the compound.
 */
IRCompoundType.prototype.get_keys = function () {
  return Object.keys(this._fields_specification);
};

/**
 * @returns {boolean}
 */
IRCompoundType.prototype.is_unknown_key_allowed = function () {
  return this._allow_unknown_keys;
};

/**
 * @param {string} key The key to get the IRType requirement for.
 * @returns {IRType} The type required for that key.  For unknown keys, it returns {@link IRAnyType} if allowed or {@link IRVoidType} if disallowed.
 */
IRCompoundType.prototype.get_key_type = function (key) {
  return this._fields_specification[key] || (this._allow_unknown_keys ? new IRAnyType() : new IRVoidType());
};

/**
 * @override
 */
IRCompoundType.prototype.allows = function (type) {
  var i, key, my_keys, given_keys, my_key_type, given_key_type;

  if (type instanceof IRCompoundType) {
    my_keys = this.get_keys();
    given_keys = type.get_keys();

    if (!this.is_unknown_key_allowed() && my_keys.length !== given_keys.length) {
      return false;
    }

    for (i = 0; i < my_keys.length; i++) {
      key = my_keys[i];
      my_key_type = this.get_key_type(key);
      given_key_type = type.get_key_type(key);
      if (!is_type_contained(my_key_type, given_key_type)) {
        return false;
      }
    }

    return true;
  } else if (type instanceof IRExactValueType) {
    var given_value = type.get_value();

    if (!given_value || typeof given_value !== 'object') {
      return false;
    }

    my_keys = this.get_keys();
    for (i = 0; i < my_keys.length; i++) {
      key = my_keys[i];
      my_key_type = this.get_key_type(key);
      given_key_type = new IRExactValueType(given_value[key]);
      if (!is_type_contained(my_key_type, given_key_type)) {
        return false;
      }
    }

    return true;
  }

  return false;
};

/**
 * @override
 */
IRCompoundType.prototype.equals = function (type) {
  if (!(type instanceof IRCompoundType)) return false;

  var we_allow_arbitrary_keys = this.is_unknown_key_allowed();
  var other_type_allows_arbitrary_keys = type.is_unknown_key_allowed();
  if (we_allow_arbitrary_keys !== other_type_allows_arbitrary_keys) {
    return false;
  }

  return has_equal_keys(this, type) && has_equal_keys(type, this);
};

function has_equal_keys (type, other_type) {
  var our_type_keys = type.get_keys();
  var other_type_keys = other_type.get_keys();
  for (var i = 0; i < other_type_keys.length; i++) {
    var other_type_key = other_type_keys[i];

    var our_key_type = type.get_key_type(other_type_key);
    var other_key_type = other_type.get_key_type(other_type_key);
    if (!our_key_type.equals(other_key_type)) {
      return false;
    }
  }

  return true;
}

module.exports = IRCompoundType;
