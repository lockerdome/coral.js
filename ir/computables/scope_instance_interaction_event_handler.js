"use strict";

var EventHandler = require('./event_handler');
var inherits = require('util').inherits;

/**
 * @constructor
 * @extends EventHandler
 * @param {Scope} scope
 * @param {function} func
 * @param {Array.<Computable>} input_computables
 * @param {string} event_type
 * @param {Computable} scope_instance
 */
function ScopeInstanceInteractionEventHandler (scope, func, input_computables, event_type, scope_instance) {
  EventHandler.call(this, scope, func, [scope_instance].concat(input_computables), event_type);
}

inherits(ScopeInstanceInteractionEventHandler, EventHandler);

ScopeInstanceInteractionEventHandler.prototype.override_function_parameter_start_index = 1;

/**
 * @returns {string}
 */
ScopeInstanceInteractionEventHandler.prototype.get_scope_instance = function () {
  return this.get_input(0);
};

/**
 * @override
 */
ScopeInstanceInteractionEventHandler.prototype._clone = function (scope, input_computables) {
  return new ScopeInstanceInteractionEventHandler(scope, this.get_function(), input_computables.slice(1), this.get_event_type(), input_computables[0]);
};

module.exports = ScopeInstanceInteractionEventHandler;
