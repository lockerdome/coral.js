"use strict";

var inherits = require('util').inherits;
var Computable = require('../computable');
var IRVoidType = require('../types/void');

/**
 * @constructor
 * @extends Computable
 * @param {Scope} scope
 * @param {Computable} scope_data_computable
 */
function ScopeDataMarker (scope, scope_data_computable) {
  var output_type = new IRVoidType();
  var input_computables = [scope_data_computable];

  Computable.call(this, scope, input_computables, output_type);
}

inherits(ScopeDataMarker, Computable);

/**
 * @override
 */
ScopeDataMarker.prototype.is_side_effect_causing = function () {
  return true;
};

/**
 * @override
 */
ScopeDataMarker.prototype.is_immovable = function () {
  return true;
};

ScopeDataMarker.prototype._clone = function (scope, input_computables) {
  return new ScopeDataMarker(scope, input_computables[0]);
};

module.exports = ScopeDataMarker;
