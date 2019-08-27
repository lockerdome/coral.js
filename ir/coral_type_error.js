"use strict";

var inherits = require('util').inherits;

function CoralTypeError (message, actualType, expectedType) {
  this.expectedType = expectedType;
  this.actualType = actualType;
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.message = message;
}

inherits(CoralTypeError, Error);

CoralTypeError.prototype.toString = function () {
  var output = 'Type Error: ' + this.message;
  var given_spacing = this.expectedType ? '   ' : '';
  if (this.actualType) {
    output += '\n    Given: ' + given_spacing + this.actualType.toString();
  }
  if (this.expectedType) {
    output += '\n    Expected: ' + this.expectedType.toString();
  }
  return output;
};

module.exports = CoralTypeError;
