"use strict";

var inherits = require('util').inherits;
var Computable = require('../computable');

/**
 * A virtual computable that represents the intermediate value for an IterateArray.
 *
 * @constructor
 * @extends Computable
 * @param {Scope} scope
 * @param {IRType} output_type
 */
function VirtualIntermediate(scope, output_type) {
  var input_computables = [];
  Computable.call(this, scope, input_computables, output_type);
}

inherits(VirtualIntermediate, Computable);


/**
 * @override
 */
VirtualIntermediate.prototype._clone = function (scope) {
  return new VirtualIntermediate(scope, this.get_output_type());
};

module.exports = VirtualIntermediate;
