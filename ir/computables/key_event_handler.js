"use strict";

var EventHandler = require('./event_handler');
var inherits = require('util').inherits;

/**
 * @constructor
 * @extends EventHandler
 * @param {Scope} scope The scope that will contain this handler.
 * @param {function} func The function to be used for the handler.
 * @param {Array.<Computable>} input_computables The Computables that this handler will use.  Special parameters will use virtual computables.
 * @param {Array.<Object>} event_sequence
 */
function KeyEventHandler (scope, func, input_computables, event_sequence) {
  EventHandler.call(this, scope, func, input_computables, 'keydown', this.override_function_parameter_start_index);
  this._event_sequence = event_sequence;
}

inherits(KeyEventHandler, EventHandler);

/**
 * @override
 */
KeyEventHandler.prototype._clone = function (scope, input_computables) {
  return new KeyEventHandler(scope, this.get_function(), input_computables, this._event_sequence);
};

module.exports = KeyEventHandler;
