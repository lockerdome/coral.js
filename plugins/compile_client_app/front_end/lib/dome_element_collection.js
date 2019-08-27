"use strict";

/* globals $HELPERS */

var Observable = require('./observables/observable.js');
var inherits = require('inherits');
var Unresolved = require('./unresolved');

var DomeElement = require('./dome_element');

function DomeElementCollection (scope_context, scope_array_symbol) {
  Object.defineProperty(this, 'value', {
    set: function (scope_array) {
      var elements = [];
      for (var i = 0; i !== scope_array.length; ++i) {
        elements.push(new DomeElement(scope_array[i]));
      }

      this._value = elements;
    },
    get: function () {
      return this._value;
    }
  });

  var scope_instance = scope_context.state[scope_array_symbol];
  // TODO: ScopeInstance should not be Unresolved at this point, but it has
  //       happened. Look into the root cause, so we can omit this check. This
  //       check may also be necessary for DomeElement as well.
  if (scope_instance instanceof Unresolved) scope_instance = scope_instance.value;

  Observable.call(this, scope_instance);

  this._scope_context = scope_context;
  this._scope_array_symbol = scope_array_symbol;
}

inherits(DomeElementCollection, Observable);

DomeElementCollection.prototype.getElements = function () {
  return this.get();
};

module.exports = DomeElementCollection;
