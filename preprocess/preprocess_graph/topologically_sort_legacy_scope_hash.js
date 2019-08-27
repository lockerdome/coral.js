"use strict";

var topological_sort = require('../../lib/topological_sort');

function topologically_sort_legacy_scope_hash (scope_hash, type) {
  return topological_sort(Object.keys(scope_hash), function (name) {
    var scope = scope_hash[name];
    return scope.parents.filter(function (parent) {
      return parent.type === type;
    }).map(function (parent) {
      return parent.name;
    });
  });
}

module.exports = topologically_sort_legacy_scope_hash;
