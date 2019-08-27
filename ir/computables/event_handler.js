"use strict";

var Computable = require('../computable');
var VirtualEvent = require('./virtual_event');
var VirtualEvElement = require('./virtual_evelement');
var AbstractHandlerFunction = require('./abstract_handler_function');
var inherits = require('util').inherits;

// TODO: Make this computable require fewer custom hooks, possibly have one computable that represents all of the event handlers and adds the code that scope compilation context custom adds itself now.

/**
 * @constructor
 * @extends AbstractHandlerFunction
 * @param {Scope} scope The scope that will contain this handler.
 * @param {function} func The function to be used for the handler.
 * @param {Array.<Computable>} input_computables The Computables that this handler will use.  Special parameters will use virtual computables.
 * @param {string} event_type
 */
function EventHandler (scope, func, input_computables, event_type) {
  this._event_type = event_type;

  // TODO: The output type for EventHandler should not be IRAnyType, it should be IRVoidType.  The awkward thing about that is that the reference we use for EventHandler is the global helper function, soo hmmm, but still it should be IRVoidType.
  AbstractHandlerFunction.call(this, scope, func, input_computables, this.override_function_parameter_start_index);
}

inherits(EventHandler, AbstractHandlerFunction);

EventHandler.prototype.override_function_parameter_start_index = 0;

/**
 * @returns {string}
 */
EventHandler.prototype.get_event_type = function () {
  return this._event_type;
};

/**
 * @override
 */
EventHandler.prototype.is_side_effect_causing = function () {
  return true;
};

/**
 * @override
 */
EventHandler.prototype._clone = function (scope, input_computables) {
  return new EventHandler(scope, this.get_function(), input_computables, this.get_event_type());
};

/**
 * @override
 */
EventHandler.prototype.is_immovable = function () {
  return true;
};

/**
 * @override
 */
EventHandler.prototype._validate_input = function (index, computable) {
  Computable.prototype._validate_input.call(this, index, computable);
  var containing_scope = this.get_containing_scope();
  var scope_identifier = containing_scope._name || containing_scope._identity;

  if (this.get_event_type() === 'initialize') {
    if (computable instanceof VirtualEvent || computable instanceof VirtualEvElement) {
      throw new Error(computable.constructor.name + " cannot be used as an input to initialize");
    }
  }
};

module.exports = EventHandler;
