"use strict";

var util = require('util');
var inherits = util.inherits;
var AbstractChannelHandler = require('./abstract_channel_handler');

/**
 * @constructor
 * @extends AbstractChannelHandler
 * @param {Scope} scope The scope that will contain this handler.
 * @param {Array.<Callback>} input_computables Callbacks that need to be setup as catch handlers
 * @param {Array.<String>} catch_handler_names Catch handler names
 */
function CatchHandler (scope, input_computables, catch_handler_names) {
  AbstractChannelHandler.call(this, scope, input_computables, catch_handler_names);
}

inherits(CatchHandler, AbstractChannelHandler);

/**
 * @override
 */
CatchHandler.prototype.client_side_code_constants = {
  channel_type_symbol: '$$SYMBOLS.scope_special.CATCH_HANDLER$$',
  match_name: '__catch'
};

/**
 * @override
 */
CatchHandler.prototype._clone = function (scope, input_computables) {
  return new CatchHandler(scope, input_computables, this._handler_names);
};

module.exports = CatchHandler;
