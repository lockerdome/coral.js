"use strict";

var Computable = require('../computable');
var VirtualEvent = require('./virtual_event');
var VirtualEvElement = require('./virtual_evelement');
var AbstractHandlerFunction = require('./abstract_handler_function');
var util = require('util');
var inherits = util.inherits;
var format = util.format;
var IRCallbackType = require('../types/callback');

/**
 * @constructor
 * @extends AbstractHandlerFunction
 * @param {Scope} scope The scope that will contain this handler.
 * @param {function} func The function to be used for the handler.
 * @param {Array.<Computable>} input_computables The Computables that this handler will use.
 */
function Callback (scope, func, input_computables) {
  AbstractHandlerFunction.call(this, scope, func, input_computables);
  this._output_type = new IRCallbackType();
}

inherits(Callback, AbstractHandlerFunction);

/**
 * @override
 */
Callback.prototype._clone = function (scope, input_computables) {
  return new Callback(scope, this.get_function(), input_computables);
};

/**
 * @override
 */
Callback.prototype._validate_input = function (index, computable) {
  Computable.prototype._validate_input.call(this, index, computable);

  if (computable instanceof VirtualEvElement || computable instanceof VirtualEvent) {
    throw new Error(computable.constructor.name + " cannot be used as an input to a callback");
  }
};

/**
 * @override
 */
 Callback.prototype.is_immovable = function () {
   for (var i = 0; i !== this.get_input_count(); i++) {
     var input = this.get_input(i);
     if (input.is_immovable()) {
       return false;
     }
   }
 };

module.exports = Callback;
