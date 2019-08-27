"use strict";

var EventHandler = require('./event_handler');
var inherits = require('util').inherits;

/**
 * @param {Scope}
 * @param {function} func
 * @param {Array.<Computable>} input_computables
 * @param {string} event_type
 * @param {string} selector
 */
function SelectorEventHandler (scope, func, input_computables, event_type, selector) {
  EventHandler.call(this, scope, func, input_computables, event_type);

  this._selector = selector;
}

inherits(SelectorEventHandler, EventHandler);

/**
 * @returns {string}
 */
SelectorEventHandler.prototype.get_selector = function () {
  return this._selector;
};

/**
 * @override
 */
SelectorEventHandler.prototype._clone = function (scope, input_computables) {
  return new SelectorEventHandler(scope, this.get_function(), input_computables, this.get_event_type(), this.get_selector());
};

module.exports = SelectorEventHandler;
