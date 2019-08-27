"use strict";

// Returns a function that is the composition of a list of functions, each
// consuming the return value of the function that preceeds.
function sequence () {
  var funcs = arguments;
  var funcCount = funcs.length;
  return function() {
    var args = arguments;
    for (var i = 0; i < funcCount; i++) {
      args[0] = funcs[i].apply(this, args);
    }
    return args[0];
  };
}

function objectFilter (obj, fn) {
  var ret = {};
  for (var key in obj) {
    if (fn(obj[key], key)) ret[key] = obj[key];
  }
  return ret;
}

function sortFields (a) {
  if (typeof(a) !== 'object' || a == null) return a;
  if (Array.isArray(a)) return a.slice(0).map(sortFields);
  if ((Object.getPrototypeOf(a) !== Object.prototype) && (Object.getPrototypeOf(a) !== undefined)) throw new Error('Only object literals are allowed');
  var keys = Object.keys(a).sort();
  var r = {};
  for (var i = 0; i !== keys.length; ++i) {
    var key = keys[i];
    r[key] = sortFields(a[key]);
  }
  return r;
}

module.exports = {
  sequence: sequence,
  objectFilter: objectFilter,
  sortFields: sortFields
};
