"use strict";

module.exports = function print_computable_count(scope_data) {
  var count = scope_data.scopes.reduce(function (agg, scope) {
    return agg + scope.get_computable_count();
  }, 0);
  console.log("Total computables:", count);
  return scope_data;
};
