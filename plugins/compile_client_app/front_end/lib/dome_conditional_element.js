"use strict";

/* globals $$HELPERS */

var Observable = require('./observables/observable.js');
var inherits = require('inherits');
var DomeElement = require('./dome_element');

function DomeConditionalElement (scope_context, scope_symbol) {
  Object.defineProperty(this, 'value', {
    set: function (v) {
      if (v) {
        this._value = new DomeElement(v);
      } else {
        this._value = null;
      }
    },
    get: function () {
      return this._value;
    }
  });

  Observable.call(this, scope_context.state[scope_symbol]);

  this._scope_context = scope_context;
  this._scope_symbol = scope_symbol;
}

inherits(DomeConditionalElement, Observable);

DomeConditionalElement.prototype.send = function (message_type) {
  var scope_instance = this._scope_context.state[this._scope_symbol];

  if (!scope_instance) return;

  var args = [];
  for (var i = 1; i < arguments.length; ++i) {
    args.push(arguments[i]);
  }

  var message_symbol = scope_instance.state['$$SYMBOLS.scope_special.MESSAGE_HANDLER$$'][message_type];
  scope_instance.state[message_symbol].apply(null, args);
};

DomeConditionalElement.prototype.toNodes = function () {
  var scope_instance = this._scope_context.state[this._scope_symbol];

  if (!scope_instance) {
    return [];
  }

  var begin_placement = scope_instance.state[scope_instance.state.begin_placement_symbol];
  var end_placement = scope_instance.state[scope_instance.state.end_placement_symbol];

  return $$HELPERS.filter_out_text_nodes$$($$HELPERS.gather_placement_range$$(begin_placement, end_placement));
};

module.exports = DomeConditionalElement;
