"use strict";

var drop_unused_computables = require('./drop_unused_computables');
var drop_unused_scopes = require('./drop_unused_scopes');
var inline_single_use_scopes = require('./inline_single_use_scopes');
var inline_trivial_scopes = require('./inline_trivial_scopes');
var push_deps_to_shard_roots = require('./push_deps_to_shard_roots');
var pushdown_computables = require('./pushdown_computables');
var clean_up_elements_as_arg = require('./clean_up_elements_as_arg');

var ordered_optimizations = [
  drop_unused_computables,
  drop_unused_scopes,
  inline_single_use_scopes,
  inline_trivial_scopes,
  push_deps_to_shard_roots,
  pushdown_computables,
  clean_up_elements_as_arg
];

function StandardOptimizations (hookManager, settings) {
  var m = hookManager;

  m.onPipelineHook('pipeline_pre_code_gen', function (callback, scopeData) {
    for (var i = 0; i !== ordered_optimizations.length; ++i) {
      scopeData = ordered_optimizations[i](scopeData);
    }
    return callback(scopeData);
  });
}


module.exports = StandardOptimizations;
