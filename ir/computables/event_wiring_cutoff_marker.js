"use strict";

var inherits = require('util').inherits;
var Computable = require('../computable');
var IRVoidType = require('../types/void');

/**
 * TODO: Think about a better way to wire this functionality in.  Works for now.
 * @constructor
 * @extends Computable
 * @param {Scope} scope
 */
function EventWiringCutoffMarker (scope) {
  var output_type = new IRVoidType();
  var input_computables = [];

  Computable.call(this, scope, input_computables, output_type);
}

inherits(EventWiringCutoffMarker, Computable);

/**
 * @override
 */
EventWiringCutoffMarker.prototype.is_side_effect_causing = function () {
  return true;
};

/**
 * @override
 */
EventWiringCutoffMarker.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  // TODO: This has no real representation
};

/**
 * @override
 */
EventWiringCutoffMarker.prototype.has_client_side_code_initialize_hook = function (compilation_context, execution_context) {
  return false;
};

module.exports = EventWiringCutoffMarker;
