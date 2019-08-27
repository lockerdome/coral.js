"use strict";

var inherits = require('util').inherits;
var Computable = require('../computable');
var IRAnyType = require('../types/any');

// TODO: Think about preventing people from using this with computables that shouldn't be using this.  It may make sense to have a list of allowable computables and blow up if added to a non-allowable one.

/**
 * @constructor
 * @extends Computable
 * @param {Scope} scope
 * @param {IRType} [output_type] Defaults to IRAnyType if not provided.
 * @param {Array.<Computable>} [input_computables]
 */
function AbstractVirtual (scope, output_type, input_computables) {
  output_type = output_type || new IRAnyType();
  Computable.call(this, scope, input_computables || [], output_type);
}

inherits(AbstractVirtual, Computable);

/**
 * @override
 */
AbstractVirtual.prototype._clone = function (scope, input_computables) {
  return new this.constructor(scope, this.get_output_type(), input_computables);
};

module.exports = AbstractVirtual;
