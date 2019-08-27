"use strict";

var util = require('util');
var inherits = util.inherits;
var IRVoidType = require('../types/void');
var Computable = require('../computable');

/**
 * @constructor
 * @extends Computable
 * @param {Scope} scope The scope that will contain this handler.
 * @param {Array.<Callback>} input_computables Callbacks that need to be setup as catch handlers
 * @param {Array.<String>} handler_names Channel handler names
 */
function AbstractChannelHandler (scope, input_computables, handler_names) {
  var output_type = new IRVoidType();
  this._handler_names = handler_names;
  Computable.call(this, scope, input_computables, output_type);
}

inherits(AbstractChannelHandler, Computable);

/**
 * @override
 */
AbstractChannelHandler.prototype.is_side_effect_causing = function () {
  return true;
};

/**
 * @override
 */
AbstractChannelHandler.prototype.is_immovable = function () {
  return true;
};

AbstractChannelHandler.prototype.client_side_code_constants = null;

/**
 * @returns {object} Set of necessary constants for client_side_code_initialize_hook
 */
AbstractChannelHandler.prototype.get_client_side_code_constants = function () {
  if (!this.client_side_code_constants) throw new Error('Do not use this class directly. Inherit and override client_side_code_constants.');
  return this.client_side_code_constants;
};



module.exports = AbstractChannelHandler;
