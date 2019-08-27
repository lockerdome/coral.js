"use strict";

var inherits = require('util').inherits;
var Computable = require('../computable');

/**
 * @constructor
 * @extends Computable
 * @param {Scope} containing_scope
 * @param {Array.<Computable>} input_computables
 * @param {IRType} output_type
 */
function ScopeCreator (containing_scope, input_computables, output_type) {
  Computable.call(this, containing_scope, input_computables, output_type);
}

inherits(ScopeCreator, Computable);

/**
 * @override
 */
ScopeCreator.prototype.set_input = function (index, computable) {
  Computable.prototype.set_input.call(this, index, computable);

  var index_scope_parameters = this.get_index_scope_parameters(index);
  for (var i = 0; i < index_scope_parameters.length; ++i) {
    var index_scope_parameter = index_scope_parameters[i];
    index_scope_parameter.emit("input_changed");
  }
};

/**
 * @override
 */
ScopeCreator.prototype._reevaluate_input = function (index) {
  Computable.prototype._reevaluate_input.call(this, index);

  var index_scope_parameters = this.get_index_scope_parameters(index);
  for (var i = 0; i < index_scope_parameters.length; ++i) {
    var index_scope_parameter = index_scope_parameters[i];
    index_scope_parameter.emit("input_changed");
  }
};

/**
 * @virtual
 * @param {number} index
 * @returns {Array.<ScopeParameter>}
 */
ScopeCreator.prototype.get_index_scope_parameters = function (index) {
  throw new Error("Called function on computable that didn't implement it");
};

module.exports = ScopeCreator;
