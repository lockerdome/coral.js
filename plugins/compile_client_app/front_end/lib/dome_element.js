"use strict";

/* globals $$HELPERS */

// NOTE: This is not an observable because normal scope instance elements don't ever change.  It would be useless to do all the wrapping to support them having change events.
// * TODO: Not true, for example with a dynamic element list it is possible to do a .get() on it while children of it are async initializing.

function DomeElement (scope_instance) {
  this._scope_instance = scope_instance;
}

DomeElement.prototype.send = function (message_type) {
  var scope_instance = this._scope_instance;

  var args = [];
  for (var i = 1; i < arguments.length; ++i) {
    args.push(arguments[i]);
  }

  var message_symbol = scope_instance.state['$$SYMBOLS.scope_special.MESSAGE_HANDLER$$'][message_type];
  scope_instance.state[message_symbol].apply(null, args);
};

DomeElement.prototype.toNodes = function () {
  var scope_instance = this._scope_instance;

  var begin_placement = scope_instance.state[scope_instance.state.begin_placement_symbol];
  var end_placement = scope_instance.state[scope_instance.state.end_placement_symbol];

  return $$HELPERS.filter_out_text_nodes$$($$HELPERS.gather_placement_range$$(begin_placement, end_placement));
};

module.exports = DomeElement;
