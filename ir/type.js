"use strict";

/**
 * @constructor
 * The common base for all types we support in the system that can be used as inputs or outputs for Computables.
 */
function IRType () {
}

/**
 * @deprecated
 * @virtual
 * @param {IRType} type The type instance to check to see if this type instance allows.
 * @returns {boolean} Whether the type instance can be considered to another type instance.
 */
IRType.prototype.allows = function (type) {
  throw new Error("IRType subclass has not overrided allows");
};

/**
 * @virtual
 * @param {IRType} type The instance of the type to check for equality.
 * @returns {boolean} Whether this instance of the type can be considered equal to another instance of the type.
 */
IRType.prototype.equals = function (type) {
  throw new Error("IRType subclass has not overrided equals");
};

/**
 * @virtual
 * @returns {string} A string representation of the type, which can then be parsed back to the type using the type_parser module.
 */
IRType.prototype.toString = function () {
  throw new Error("This type has not implemented toString");
};

module.exports = IRType;
