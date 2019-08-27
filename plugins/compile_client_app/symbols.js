"use strict";

var SymbolAllocator = require('./symbol_allocator');

function Symbols (range) {
  this._symbols = {};
  this._symbol_allocator = new SymbolAllocator(range);
}

Symbols.prototype.allocateSymbol = function (path) {
  var path_parts = path.split('.');
  var current_object = this._symbols;
  for (var i = 0; i < path_parts.length; ++i) {
    var path_part = path_parts[i];
    if (i === path_parts.length - 1) {
      var symbol = this._symbol_allocator.allocate();
      if (current_object[path_part]) {
        throw new Error("Already a symbol allocated at " +path);
      }
      current_object[path_part] = symbol;
    } else {
      var nested_object = current_object[path_part];
      if (!nested_object) {
        nested_object = {};
        current_object[path_part] = nested_object;
      }
      current_object = nested_object;
    }
  }
};

Symbols.prototype.getSymbol = function (path) {
  var path_parts = path.split('.');
  var current_object = this._symbols;
  for (var i = 0; i < path_parts.length; ++i) {
    var path_part = path_parts[i];
    if (i === path_parts.length - 1) {
      if (!current_object[path_part]) {
        throw new Error("There is no symbol allocated at " + path);
      }
      return current_object[path_part];
    } else {
      var nested_object = current_object[path_part];
      if (!nested_object) {
        nested_object = {};
        current_object[path_part] = nested_object;
      }
      current_object = nested_object;
    }
  }

};

module.exports = Symbols;
