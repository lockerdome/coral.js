"use strict";

/* globals $$HELPERS */

var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;
var Unresolved = require('./unresolved');

function DomeRichElement (element_name, scope_instance) {
  EventEmitter.call(this);

  this._scope_instance = scope_instance;
  this._element_name = element_name;

  this._scope_instance['$$SYMBOLS.scope_special.ASYNC_PRE_INIT$$']();

  var async_init_unresolved = this._scope_instance['$$SYMBOLS.scope_special.ASYNC_INIT_RESOLVED$$'];

  this.on('newListener', function (name, handler) {
    if (name === 'async_initialized') {
      if (async_init_unresolved === true) {
        handler();
      } else {
        var u = new Unresolved(1, [], $$HELPERS.immediately_resolving_compute_callback$$, function () {
          handler();
        });
        async_init_unresolved.add_dependee(u);
      }
    }
  });
}

inherits(DomeRichElement, EventEmitter);

DomeRichElement.prototype.getElementName = function () {
  return this._element_name;
};

DomeRichElement.prototype.toNodes = function () {
  var scope_instance = this._scope_instance;

  var begin_placement = scope_instance.state[scope_instance.state.begin_placement_symbol];
  var end_placement = scope_instance.state[scope_instance.state.end_placement_symbol];

  return $$HELPERS.filter_out_text_nodes$$($$HELPERS.gather_placement_range$$(begin_placement, end_placement));
};

DomeRichElement.prototype.appendTo = function (element) {
  var text_node = document.createTextNode('');
  element.appendChild(text_node);

  this._scope_instance.state[this._scope_instance.state.begin_placement_symbol] = text_node;

  this._scope_instance['$$SYMBOLS.scope_special.SYNC_INIT$$']();
};

DomeRichElement.prototype.destroy = function () {
  this._scope_instance['$$SCOPE_METHODS.destroy_scope$$']();
};

module.exports = DomeRichElement;
