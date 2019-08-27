"use strict";

var Buffer = require('buffer').Buffer;

function clone (obj) {
  if (typeof(obj) !== 'object' || obj == null) return obj;
  if (Array.isArray(obj)) return obj.slice(0).map(clone);
  if (obj.clone && typeof obj.clone === 'function') return obj.clone();
  if (obj.constructor === Date) return new Date(obj);
  if (obj.constructor === Buffer) return obj;
  if (obj.constructor.clone && obj.constructor.clone !== clone) return obj.constructor.clone(obj);
  var r = obj.constructor();
  for (var i in obj) r[i] = clone(obj[i]);
  return r;
}

function is_equal (obj, equal_obj) {
  if (obj === equal_obj) return true;

  var check = true;
  (function check_object(a, b) {
    if (!check) return;
    if ((a !== null && b === null) || (a === null && b !== null)) {
      check = false;
      return;
    }
    for (var i in a) {
      if (typeof a[i] !== 'object' || typeof b[i] !== 'object') {
        if (a[i] !== b[i]) check = false;
      }
      else check_object(a[i], b[i]);
    }
  })(obj, equal_obj);
  return check;
}

function extend (obj) {
  for(var i = 1; i !== arguments.length; ++i){
    var e = arguments[i];
    for(var j in e){
      obj[j] = e[j];
    }
  }
  return obj;
}

module.exports = {
  clone: clone,
  extend: extend,
  is_equal: is_equal
};
