"use strict";

function deepClone (a) {
  if (typeof(a) !== 'object' || a == null) return a;
  if (Array.isArray(a)) return a.slice(0).map(deepClone);
  if (a.constructor === Date) return new Date(a);
  var r = a.constructor();
  for (var i in a) r[i] = deepClone(a[i]);
  return r;
}

module.exports = deepClone;
