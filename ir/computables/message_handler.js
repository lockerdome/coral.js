"use strict";

var util = require('util');
var inherits = util.inherits;
var AbstractChannelHandler = require('./abstract_channel_handler');

/**
 * @constructor
 * @extends Computable
 * @param {Scope} scope The scope that will contain this handler.
 * @param {Array.<Callback>} input_computables Callbacks that need to be setup as catch handlers
 * @param {Array.<String>} message_handler_names Message handler names
 */
function MessageHandler (scope, input_computables, message_handler_names) {
  AbstractChannelHandler.call(this, scope, input_computables, message_handler_names);
}

inherits(MessageHandler, AbstractChannelHandler);

/**
 * @override
 */
MessageHandler.prototype.client_side_code_constants = {
  channel_type_symbol: '$$SYMBOLS.scope_special.MESSAGE_HANDLER$$',
  match_name: '__message'
};

/**
 * @override
 */
MessageHandler.prototype._clone = function (scope, input_computables) {
  return new MessageHandler(scope, input_computables, this._handler_names);
};

module.exports = MessageHandler;
