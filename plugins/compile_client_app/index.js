"use strict";

var path = require('path');
var fs = require('fs');
var format = require('util').format;
var toSource = require('tosource');

var cloneObject = require('../../lib/object_helpers.js').clone;

var AssignableSymbolManager = require('./assignable_symbol_manager');
var CharacterRange = require('./character_range');
var symbol_range_to_character_range = require('./symbol_range_to_character_range');

var CompilationContext = require('../../code_gen/compilation_context');
var ScopeCompilationContext = require('./scope_compilation_context');
var Browserify = require('browserify');
var ScriptSnippets = require('../../lib/script_snippets');
var generate_sponge_assignments = require('./generate_sponge_assignments');

require('../../lib/require_extended_computables')(__dirname, 'extended_computables')();

var shard_included_in_hash;

// Generate code for the client app and shards
function CompileAndBuildClientApp (hookManager, settings, argv, cData) {
  var m = hookManager;
  m.onHook('code_gen', function (callback, compiler, scope_data) {

    var Symbols = require('./symbols');
    var symbols = new Symbols(new CharacterRange(0x80, 0x12F));

    symbols.allocateSymbol('scope_special.IS_ZONE_ENTRY_POINT');
    symbols.allocateSymbol('scope_special.ZONE');
    symbols.allocateSymbol('scope_special.PARENT_SCOPE');
    symbols.allocateSymbol('scope_special.IS_INITIALIZED');
    symbols.allocateSymbol('scope_special.ASYNC_PRE_INIT');
    symbols.allocateSymbol('scope_special.SYNC_INIT');
    symbols.allocateSymbol('scope_special.ASYNC_INIT_RESOLVED');
    symbols.allocateSymbol('scope_special.IS_DESTROYED');
    symbols.allocateSymbol('scope_special.EVENT_INSTRUCTIONS');
    symbols.allocateSymbol('scope_special.CLEANUP_INSTRUCTIONS');

    // A spot for the parent scope to store any relevant metadata about the scope.  Not meant to be used directly by the scope itself.  Avoid usage of this if at all possible.
    symbols.allocateSymbol('scope_special.SCRATCH');
    symbols.allocateSymbol('scope_special.SUBSCRIBED_OBSERVABLES');
    symbols.allocateSymbol('scope_special.UPDATE_METADATA_BY_SYMBOL');
    symbols.allocateSymbol('scope_special.UNIQUE_ID');
    symbols.allocateSymbol('scope_special.INSTANCE_UPDATE_METADATA_BY_SYMBOL');
    symbols.allocateSymbol('scope_special.CATCH_HANDLER');
    symbols.allocateSymbol('scope_special.MESSAGE_HANDLER');
    symbols.allocateSymbol('scope_special.IS_ASYNC_INIT_RESOLVED');
    symbols.allocateSymbol('scope_special.TOPOLOGICALLY_ORDERED_UPDATE_CYCLE_SYMBOLS');
    symbols.allocateSymbol('scope_special.EVENT_LISTENERS');

    symbols.allocateSymbol('cleanup.REMOVE_DOM');
    symbols.allocateSymbol('cleanup.SUBSCRIBED_OBSERVABLES');
    symbols.allocateSymbol('cleanup.EVENT_LISTENERS');

    symbols.allocateSymbol('globals.CALLBACK_VIRTUALS');
    symbols.allocateSymbol('globals.EVENT_VIRTUALS');

    symbols.allocateSymbol('special.CURRENT_VALUE_VIRTUAL');

    symbols.allocateSymbol('special.SEPARATOR');
    symbols.allocateSymbol('special.SEPARATOR_2');
    symbols.allocateSymbol('special.SEPARATOR_3');
    symbols.allocateSymbol('special.IGNORE');
    symbols.allocateSymbol('special.FLAG');
    // IterateArray specific symbols
    symbols.allocateSymbol('special.ITEM_VIRTUAL');
    symbols.allocateSymbol('special.ITEM_INDEX_VIRTUAL');
    symbols.allocateSymbol('special.PREVIOUS_INTERMEDIATE');
    symbols.allocateSymbol('special.NEXT_INTERMEDIATE');
    // Event handler specific symbols
    symbols.allocateSymbol('special.EVENT_VIRTUAL');
    symbols.allocateSymbol('special.ELEMENT_VIRTUAL');
    symbols.allocateSymbol('special.EVELEMENT_VIRTUAL');
    symbols.allocateSymbol('special.EMITEVENT_VIRTUAL');
    symbols.allocateSymbol('special.ELEMENTS_VIRTUAL');
    symbols.allocateSymbol('special.USE_UNPACKED');
    // Callback specific symbols
    symbols.allocateSymbol('special.ARGS_VIRTUAL');
    // Element specific symbols
    symbols.allocateSymbol('special.PLACEMENT_VIRTUAL');
    // Dependency specific symbols
    symbols.allocateSymbol('special.CODE_CDN_URL');
    symbols.allocateSymbol('special.BUILDTIME');

    // NOTE: These ranges exclude the end value
    symbols._symbols.ranges = {
      // Intentionally skip 0x22 which represents "
      ASYNC_BORDER_RANGES: [0x23, 0x43],
      SYNC_BORDER_RANGES: [0x43, 0x63],

      ASYNC_DYNAMIC_INTERNAL_RANGES: [0x63, 0x72, 0x130, 0x330],
      SYNC_DYNAMIC_INTERNAL_RANGES: [0x72, 0x7F, 0x330, 0x530],

      // TODO: Remove this when the time is right to refactor the code gen code
      ALLOCATION_TEST_RANGE: [0xFDFF, Infinity],

      GLOBAL_RANGES: [0x530, 0x620, 0x9FF, 0xc3d, 0x4E00, Infinity],

      // A-Z (1-byte), a-z (1-byte), [?]-[?] (2-byte)
      SCOPE_PROTOTYPE_HELPERS: [0x41, 0x5b, 0x61, 0x7b, 0x130, 0x530]
    };

    cData.symbols = symbols;
    m.runPipelineHook('pipeline_code_gen:compile_client_app:modify_symbols', cData.symbols, function (symbols) {
      var global_range = symbol_range_to_character_range(symbols._symbols.ranges.GLOBAL_RANGES);
      var scope_method_range = symbol_range_to_character_range(symbols._symbols.ranges.SCOPE_PROTOTYPE_HELPERS);

      var shard_output_directory = settings.shard_output_directory;
      var minify = settings.minify;

      var scopes = scope_data.scopes;
      for (var i = 0; i < scopes.length; i++) {
        var scope = scopes[i];
        scope._async_pre_init_identity = CompilationContext.define_weak_symbol();
        scope._sync_init_identity = CompilationContext.define_weak_symbol();
      }

      compile_and_build_client_app_code(compiler, function (err, scripts) {
        if (err) throw err;

        var client_app_buffer = scripts.client_app;

        var shard_hash = scripts.shards;
        var shard_names = Object.keys(shard_hash);
        var shard_count = shard_names.length;

        var script_count = shard_count + 1;

        fs.writeFile(path.join(path.resolve(shard_output_directory), 'coral.js'), client_app_buffer, function (err) {
          if (err) throw err;
          client_side_script_written();
        });

        var total_shard_size = 0;
        shard_names.forEach(function (shard_name) {
          var shard_buffer = shard_hash[shard_name];
          total_shard_size += shard_buffer.length;

          fs.writeFile(path.join(path.resolve(shard_output_directory), shard_name + '.js'), shard_buffer, function (err) {
            if (err) throw err;
            client_side_script_written();
          });
        });

        function client_side_script_written () {
          if (--script_count) return;
          print_sizes();
          callback();
        }

        function print_sizes () {
          console.log('Client App:', (client_app_buffer.length/1024).toFixed(2), 'KB');
          console.log('All Shard Files:', (total_shard_size/1024).toFixed(2), 'KB');
        }
      }, scope_data, minify);


      /**
       * @param {Compiler} compiler The Compiler
       * @param {function} callback The function responsible for piecing together the client side script
       * @param {Object} scope_data The scope data
       * @param {boolean} minify Whether or not to minify the script
      */
      function compile_and_build_client_app_code (compiler, callback, scope_data, minify) {
        // CompilationContext represents the global compilation context when compiling an application and manages all globals for the compiler.
        var client_side_compilation_context = new CompilationContext(compiler, scope_data.scopes, minify);

        shard_included_in_hash = determine_shards_included_in_aggregate_shards(client_side_compilation_context);

        var global_helper_manager = new AssignableSymbolManager(global_range);
        var scope_method_manager = new AssignableSymbolManager(scope_method_range);

        /*
        * This is so that we can reference global helpers and scope methods using human-readable names rather than symbols, e.g. $$SCOPE_METHODS.dynamic_nested_compute$$('+packed_args+'). These references are templated using $$'s and are replaced with symbols in the final client app code.
        * @param {string} str The string to inject helper and constant symbols into.
        * @returns {string}
        */
        var process_template = require('./template')({
          SYMBOLS: symbols._symbols,
          HELPERS: global_helper_manager._symbols_by_name,
          SCOPE_METHODS: scope_method_manager._symbols_by_name
        });

        /**
         * @param {Array.<string>} body
         * @param {string} title
         * @returns {function}
         */
         function generate_function_chain (body, title) {
          var comment = title ? '// ' + title + '\n' : '';
          var func_body = body.length ? 'this.' + body.join('.') : '';
          var processed = process_template(func_body);
          try {
            return new Function(comment + processed);
          } catch (e) {
            e.message += "\n" + func_body;
            throw e;
          }
        }

        var load_helpers = require('./load_helpers');
        load_helpers(hookManager, process_template, global_helper_manager, scope_method_manager, function () {
           // TODO: better segment out this code
           compile_client_side_symbol_groups(client_side_compilation_context, process_template, global_helper_manager, scope_method_manager, function (symbol_groups) {
             var root_symbols = symbol_groups.root;

             // Browserify is used to bundle in essential dependencies in as globals. The hook allows including additional dependencies.
             var browserify_instance = new Browserify({ paths: __dirname+'/../../..' });
             browserify_instance.add(__dirname+'/front_end/lib/framework_globals.js');
             compiler._hook_manager.runHook('code_gen:compile_client_app:browserify_client_app_script', [browserify_instance], function () {
               browserify_instance.bundle(function (err, script_buffer) {
                 if (err) {
                   return callback(err);
                 }

                 // TODO: Make it so that this is not necessary, this is going over quite a bit of text, at least it's not going over all of the global varstring text.
                 var template_applied_script = process_template(script_buffer.toString());
                 var globals_varstring = generate_sponge_assignments(root_symbols);

                 var rendered_root_script = ['"use strict"', globals_varstring, generate_scope_prototype()].join('\n');

                 var shard_buffers = {};
                 for (var shard_name in symbol_groups.shards) {
                   var shard_string = generate_sponge_assignments(symbol_groups.shards[shard_name]);
                   var shard_buffer;
                   if (Buffer.from) {
                     shard_buffer = Buffer.from(shard_string, 'utf8');
                   } else {
                      shard_buffer = new Buffer(shard_string, 'utf8');
                   }
                   shard_buffers[shard_name] = shard_buffer;
                 }

                 var client_app_string = template_applied_script + rendered_root_script;
                 var client_app_buffer;
                 if (Buffer.from) {
                   client_app_buffer = Buffer.from(client_app_string, 'utf8');
                 } else {
                   client_app_buffer = new Buffer(client_app_string, 'utf8');
                 }
                 callback(null, { client_app: client_app_buffer, shards: shard_buffers });
               });
             });

             function generate_scope_prototype () {
               var methods = [];
               for (var symbol in scope_method_manager._hash) {
                 var stringified_method = scope_method_manager._hash[symbol];
                 methods.push('Coral.Scope.prototype.' + symbol + ' = ' + stringified_method);
               }
               return methods.join(';\n');
             }
           });
         });


        /**
         * Sets all 'implied_shards' on relevant scopes. Implied shards are the shards included in an aggregate shard.
         * @returns {object}
         */
        function determine_shards_included_in_aggregate_shards (client_side_compilation_context) {
          var shard_included_in_hash = {};
          var scope_count = client_side_compilation_context.get_scope_count();

          for (var i = 0; i < scope_count; i++) {
            var current_scope = client_side_compilation_context.get_scope(i);
            if (!current_scope.is_shard_root()) continue;

            var current_shard_root_id = current_scope.get_identity();
            shard_included_in_hash[current_shard_root_id] = {};

            var metadata = current_scope.get_shard_metadata();
            if (!metadata.include_traits) continue;

            traverse_included_shards(current_scope, metadata.include_traits, current_scope);
          }
          return shard_included_in_hash;

          function element_in_array (arr) {
            return function (el) { return arr.indexOf(el) !== -1; };
          }
          function traverse_included_shards (shard, includes, aggregate_shard) {
            var ref_count = shard.get_referenced_scope_count();
            for (var i = 0; i < ref_count; i++) {
              var new_includes = includes;
              var scope = shard.get_referenced_scope(i);
              if (scope.is_shard_root()) {
                var scope_shard_data = scope.get_shard_metadata();
                var traits = scope_shard_data.traits;
                if (traits && !traits.some(element_in_array(includes))) {
                  continue;
                } else {
                  aggregate_shard.add_implied_shard(scope.get_identity());
                  shard_included_in_hash[scope.get_identity()][aggregate_shard.get_identity()] = true;
                }
                var include_traits = scope_shard_data.include_traits;
                if (include_traits) new_includes = new_includes.concat(include_traits);
              }
              traverse_included_shards(scope, new_includes, aggregate_shard);
            }
          }
        }


        // TODO: Have this just generate the globals varstring, it does not need to be aware of browserify
        /**
         * A root script which serves as the controller for all of the client side scripts.
         * @param {CompilationContext} client_side_compilation_context The CompilationContext for the client side script
         */
        function compile_client_side_symbol_groups (client_side_compilation_context, process_template, global_helper_manager, scope_method_manager, callback) {
          var i, scope, current_scope_identity, current_scope_name;

          client_side_compilation_context._global_symbols = global_helper_manager;

          var root_symbols_hash = cloneObject(client_side_compilation_context._global_symbols._hash);

          // scope identity -> { shard_name: true }
          var scope_shard_hash = {};

          // shard identity -> { symbol: * }
          var shard_symbols_hash = {};

          // shard_identity -> { parent_name: true }
          var shard_parents = {};

          function assign_shards (scope) {
            var scope_identity = scope.get_identity();

            if (scope_shard_hash[scope_identity]) {
              return scope_shard_hash[scope_identity];
            }

            var current_scope_shards = {};

            var scope_dependee_count = scope.get_dependee_scope_count();
            for (var j = 0; j !== scope_dependee_count; ++j) {
              var scope_dependee = scope.get_dependee_scope(j);
              var ancestor_shards = assign_shards(scope_dependee);

              for (var ancestor_shard_name in ancestor_shards) {
                current_scope_shards[ancestor_shard_name] = true;
              }
            }
            if (!Object.keys(current_scope_shards).length) {
              current_scope_shards.root = true;
            }
            if (scope.is_shard_root()) {
              // Store immediate parents for placement of async pre-init function
              shard_parents[scope_identity] = current_scope_shards;

              current_scope_shards = {};
              shard_symbols_hash[scope_identity] = {};
              current_scope_shards[scope_identity] = true;
              for (var include in shard_included_in_hash[scope_identity]) {
                current_scope_shards[include] = true;
              }
            }
            scope_shard_hash[scope_identity] = current_scope_shards;
          }

          var associated_shard_override;

          function global_symbol_requested (symbol, stringified_val) {
            if (!current_scope_identity) {
              root_symbols_hash[symbol] = stringified_val;
              return;
            }

            var associated_shards = associated_shard_override || scope_shard_hash[current_scope_identity];
            var associated_shard_identities = Object.keys(associated_shards);
            for (var j = 0; j !== associated_shard_identities.length; ++j) {
              var associated_shard_identity = associated_shard_identities[j];
              if (associated_shard_identity === 'root') {
                root_symbols_hash[symbol] = stringified_val;
              } else {
                shard_symbols_hash[associated_shard_identity][symbol] = stringified_val;
              }
            }
          }
          client_side_compilation_context.on('global_symbol_requested', global_symbol_requested);

          for (i = client_side_compilation_context._scopes.length - 1; i !== -1; --i) {
            scope = client_side_compilation_context._scopes[i];
            assign_shards(scope);
          }



          var wait_count = client_side_compilation_context._scopes.length;
          client_side_compilation_context._scopes.forEach(function (scope, i) {
            current_scope_identity = scope.get_identity();
            current_scope_name = scope.get_name();
            if (current_scope_name) {
              current_scope_name = current_scope_name.replace(/\n/g, '->');
            }

            var is_root_scope = false;
            var name, id;
            for (name in scope_data.root_element_scopes) {
              if (scope.get_identity() === scope_data.root_element_scopes[name].get_identity()) {
                is_root_scope = true;
                break;
              }
            }

            // ScopeCompilationContext takes scope data and uses it to make individual scope functions.
            var scope_compilation_context = new ScopeCompilationContext(symbols._symbols, scope, client_side_compilation_context, is_root_scope);
            client_side_compilation_context._scope_compilation_context_by_identity[scope.get_identity()] = scope_compilation_context;

            // Generate the sync init function and async pre init function for the scope.
            // Each function is composed of chained method calls that are generated by a computable's client side code gen hook. These methods are on the Scope prototype.

            var sync_init_code_parts = scope_compilation_context.generate_sync_init_parts();
            m.runPipelineHook('pipeline_code_gen:compile_client_app:scope_sync_init_function_parts', {scope: scope, scope_compilation_context: scope_compilation_context, sync_init_code_parts: sync_init_code_parts, scope_shard_hash: scope_shard_hash}, function (o) {
              var sync_init_function_body = o.sync_init_code_parts.pre_compute.concat(o.sync_init_code_parts.compute, o.sync_init_code_parts.post_compute);
              var sync_init_function = generate_function_chain(sync_init_function_body, 'Sync init ' + (current_scope_name || current_scope_identity));
              client_side_compilation_context.resolve_weak_symbol(scope.get_sync_init_identity(), sync_init_function);


              var async_pre_init_code_parts = scope_compilation_context.generate_async_pre_init_parts();

              m.runPipelineHook('pipeline_code_gen:compile_client_app:scope_async_init_function_parts', {scope: scope, scope_compilation_context: scope_compilation_context, async_pre_init_code_parts: async_pre_init_code_parts, scope_shard_hash: scope_shard_hash}, function (o) {

                var async_pre_init_code_parts = o.async_pre_init_code_parts;

                // TODO: If shard root, don't insert compute code into async init function, put into another global that will be in shard.
                var async_compute_code;
                if (scope.is_shard_root()) {
                  var async_init_body_func_symbol = client_side_compilation_context.allocate_global(generate_function_chain(async_pre_init_code_parts.compute, 'Async body ' + current_scope_identity));
                  var packed_args = JSON.stringify(async_init_body_func_symbol + client_side_compilation_context.reference_weak_symbol(scope.get_sync_init_identity()));

                  var implied_shards = scope.get_shard_metadata().implied_shards;
                  var implied_string = implied_shards ? ',' + JSON.stringify(Object.keys(implied_shards)) : '';

                  async_compute_code = '$$SCOPE_METHODS.load_async_pre_init_compute_function$$("' + current_scope_identity + '",' + packed_args + implied_string + ')';
                } else {
                  async_compute_code = async_pre_init_code_parts.compute;
                }

                var async_pre_init_function_body = async_pre_init_code_parts.pre_compute.concat(async_compute_code, async_pre_init_code_parts.post_compute);
                var async_pre_init_function = generate_function_chain(async_pre_init_function_body, 'Async pre-init ' + (current_scope_name || current_scope_identity));


                // Make it so the async pre-init function is available in immediate parent shards. The "guts" of it will be in the compute function that will be in the specific shard.
                if (scope.is_shard_root()) {
                  associated_shard_override = Object.keys(scope_shard_hash[current_scope_identity]).reduce(function (obj, id) {
                    for (var parent_id in shard_parents[id]) obj[parent_id] = true;
                    return obj;
                  }, {});
                  if (associated_shard_override.root) associated_shard_override = { root: true };
                }
                client_side_compilation_context.resolve_weak_symbol(scope.get_async_pre_init_identity(), async_pre_init_function);
                if (scope.is_shard_root()) associated_shard_override = null;

                finish();
              });
            });
          });



          function finish () {
            if (--wait_count) return;

            m.runPipelineHook('pipeline_code_gen:compile_client_app:scope_metadata', { scope_data: scope_data, client_side_compilation_context: client_side_compilation_context }, function (o) {

              allocate_root_scope_instantiaton();

              m.runPipelineHook('pipeline_code_gen:compile_client_app:event_and_callback_virtuals', { symbols: cData.symbols, event_virtuals: {}, callback_virtuals: {} }, function (v) {
                // The eval() and wrapped self executing function is to ensure that the process_template string output gets turned back into an object, so that it gets turned into a global correctly.
                client_side_compilation_context.allocate_named_global(process_template('$$SYMBOLS.globals.EVENT_VIRTUALS$$'), eval('(function () { return ' + process_template(toSource(v.event_virtuals, null, '')) + '})();'));
                client_side_compilation_context.allocate_named_global(process_template('$$SYMBOLS.globals.CALLBACK_VIRTUALS$$'), eval('(function () { return ' + process_template(toSource(v.callback_virtuals, null, '')) + '})();'));
                client_side_compilation_context.removeListener('global_symbol_requested', global_symbol_requested);
                callback({ root: root_symbols_hash, shards: shard_symbols_hash });
              });


              function allocate_root_scope_instantiaton () {
                var root_scope = scope_data.root_element_scopes[Object.keys(scope_data.root_element_scopes)[0]];
                var scope_async_pre_init_symbol = client_side_compilation_context.reference_weak_symbol(root_scope.get_async_pre_init_identity());
                var scope_sync_init_symbol = client_side_compilation_context.reference_weak_symbol(root_scope.get_sync_init_identity());

                var instantiate_scope_helper = client_side_compilation_context.get_global_helper_symbol('instantiate_root_scope');

                var root_scope_scope_compilation_context = client_side_compilation_context.get_scope_compilation_context(root_scope.get_identity());
                var parameter_name_to_symbol = {};

                var scope_parameter_count = root_scope.get_input_count();
                for (var i = 0; i < scope_parameter_count; ++i) {
                  var scope_parameter = root_scope.get_input(i);
                  var symbol = root_scope_scope_compilation_context.get_computable_reference(scope_parameter);
                  parameter_name_to_symbol[scope_parameter.get_name()] = symbol;
                }

                // NOTE: Relying on placement parameter being named __placement
                var coral_start_body = '' +
                    'var inner_placement = document.createTextNode("");' +
                    'placement.appendChild(inner_placement);' +
                    'parameter_values.__placement = inner_placement;' +
                    format('return Coral.sponges[%j](Coral.sponges[%j],Coral.sponges[%j],%s,%j,%s)', instantiate_scope_helper, scope_async_pre_init_symbol, scope_sync_init_symbol, 'parameter_values', parameter_name_to_symbol, 'coral');
                client_side_compilation_context.allocate_named_global('coral_start', new Function ('placement', 'parameter_values', 'settings', 'coral', coral_start_body));
              }

            });
          }

        }
      }
    });

  });

}


module.exports = CompileAndBuildClientApp;
