"use strict";

function load_helpers (hook_manager, process_template, global_helper_manager, scope_method_manager, callback) {

  var global_helpers = [
    'dom_utils',
    'symbol_utils',
    'registry',
    'scope',
    'post_update_handlers',
  ].reduce(base_helpers_to_hash, {});

  // Preserve array order; we want our 1-byte symbols used for code-gen.
  var scope_methods = [
    'scope_methods',
    'scope_method_helpers'
  ].reduce(base_helpers_to_hash, {});

  var custom_global_helpers = {};
  var custom_scope_methods = {};

  function register_method (hash) {
    return function (name, func) {
      if (hash[name]) throw new Error('Duplicate helper: ' + name);
      hash[name] = func;
    };
  }

  hook_manager.runHook('code_gen:compile_client_app:register_front_end_helpers_global', [register_method(global_helpers)], function () {

    hook_manager.runHook('code_gen:compile_client_app:register_front_end_helpers_scope', [register_method(scope_methods)], function () {
      // Assign all helpers a symbol before templating.
      var name;
      for (name in global_helpers) global_helper_manager.pre_allocate(name);
      for (name in scope_methods) scope_method_manager.pre_allocate(name);

      // Process each helper function now that templates are available.
      resolve_helpers(global_helpers, global_helper_manager);
      resolve_helpers(scope_methods, scope_method_manager);

      callback();

    });

  });

  // TODO: Restructure helper scripts so this conversion isn't needed.
  function base_helpers_to_hash (hash, path) {
    var module = require('./front_end/helpers/' + path);
    module(register_method(hash));
    return hash;
  }

  function resolve_helpers (helpers, symbol_manager) {
    for (var name in helpers) {
      var func_string = helpers[name].toString();
      var processed = process_template(func_string);
      var symbol = symbol_manager.get_by_name(name);
      symbol_manager.allocate(processed, symbol);
    }
  }

}

module.exports = load_helpers;
