"use strict";

function contains_trait_computable (scope, trait_name) {
  var computable_count = scope.get_computable_count();
  var has_trait_computable = false;

  for (var i = 0; i < computable_count; ++i) {
    var scope_computable = scope.get_computable(i);
    if (scope_computable[trait_name]()) {
      has_trait_computable = true;
      break;
    }
  }

  return has_trait_computable;
}

module.exports = contains_trait_computable;
