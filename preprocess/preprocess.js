"use strict";

var esprima = require('esprima');
var eval_macros = require('./preprocess_graph/eval_macros');
var add_view_refs = require('./preprocess_graph/add_view_refs');
var rewrite_view_conditionals = require('./preprocess_graph/rewrite_view_conditionals');
var rewrite_element_triple_references = require('./preprocess_graph/rewrite_element_triple_references');
var rewrite_element_as_argument_passing = require('./preprocess_graph/rewrite_element_as_argument_passing');
var rewrite_view_expressions = require('./preprocess_graph/rewrite_view_expressions');

var process_iterate_array_virtual_refs  = require('./preprocess_graph/process_iterate_array_virtual_refs');
var process_environment_refs = require('./preprocess_graph/process_environment_refs');
var expand_implied_arguments = require('./preprocess_graph/expand_implied_arguments');

var topologically_sort_legacy_scope_hash = require('./preprocess_graph/topologically_sort_legacy_scope_hash');
var error_message_gen = require('../lib/error_helper').message_gen;

function preprocess_source(cData, source, app_directory_path, root_element, hook_manager, callback) {
  var normalize = require('./preprocess_graph/normalize')();
  // Part 1: Critical preprocess code that normalizes and applies macros
  var expanded_macros = eval_macros(source, app_directory_path);
  source.models = expanded_macros.models;
  source.elements = expanded_macros.elements;

  process_inline_scopes('element', source.elements);
  process_inline_scopes('model', source.models);

  // We have to process inline scopes before we apply constants since constants must be applied to the scope they reside in, respecting any inline element usages.
  function process_inline_scopes(scope_type, scope_hash) {
    var scope_names = Object.keys(scope_hash);
    scope_names.forEach(function (scope_name) {
      var scope = scope_hash[scope_name];
      process_inline_scopes_in_scope(scope_type, scope_name, scope);
    });

    function process_inline_scopes_in_scope (scope_type, scope_name, scope) {
      // Support top level object being the result of an element/model template function.
      if (scope.$$coral_macro_type === 'generated_inline_scope') {
        scope = scope.args.scope;
        scope_hash[scope_name] = scope;
      }
      var allowed_top_level_keys = ['models', 'dynamicElementLists', 'elements'];
      find_and_process_inline_scopes(scope, []);

      function find_and_process_inline_scopes (object, key_path) {
        for (var key in object) {
          if (!key_path.length && allowed_top_level_keys.indexOf(key) === -1) {
            continue;
          }

          var key_value = object[key];

          if (key === 'args') {
            continue;
          }

          if (key_value && typeof key_value === 'object') {
            var is_macro_result = key_value.$$coral_macro_type === 'generated_inline_scope';
            var inline_scope_type = 'inline';
            if (is_macro_result) {
              inline_scope_type = key_value.args.source;
              key_value = key_value.args.scope;
            }
            var is_inline_scope = false;
            var has_view = typeof key_value.view === 'string';
            var is_in_models_section = key_path[0] === 'models';
            var is_likely_inline_model = is_in_models_section && (is_macro_result || !(('args' in key_value) || ('type' in key_value)));
            var is_likely_inline_element = !is_in_models_section && (is_macro_result || has_view);
            var updated_key_path = key_path.concat(key);
            if (is_likely_inline_element) {
              is_inline_scope = true;
              if (!is_macro_result) {
                inline_scope_type += ' element';
              }
              object[key] = inline_scope('element', updated_key_path, key_value, inline_scope_type);
            } else if (is_likely_inline_model) {
              is_inline_scope = true;
              if (!is_macro_result) {
                inline_scope_type += ' model';
              }
              object[key] = inline_scope('model', updated_key_path, key_value, inline_scope_type);
            }

            if (!is_inline_scope) {
              find_and_process_inline_scopes(key_value, updated_key_path);
            }
          }
        }
      }

      function inline_scope (scope_type, key_path, scope_object, inline_scope_type) {
        var originating_is_inline_scope = /\n/.test(scope_name);
        var inline_scope_name = scope_name + (originating_is_inline_scope ? '' : '.js') + '\n    - ' + inline_scope_type +  ' at ' + key_path.join('.');

        source[scope_type + 's'][inline_scope_name] = scope_object;

        process_inline_scopes_in_scope(scope_type, inline_scope_name, scope_object);

        return inline_scope_name;
      }
    }
  }

  process_constant_macros(source.elements);
  process_constant_macros(source.models);

  function process_constant_macros (scope_hash) {
    var scope_names = Object.keys(scope_hash);
    scope_names.forEach(function(scope_name) {
      var scope = scope_hash[scope_name];
      var constants_counter = 0;
      var constants = {};

      apply_macros(scope);

      if (constants_counter) {
        if (!scope.constants) {
          scope.constants = {};
        }
        for (var key in constants) {
          scope.constants[key] = constants[key];
        }
      }

      function apply_macros (obj) {
        for (var key in obj) {
          var obj_key_value = obj[key];
          if (obj_key_value && typeof obj_key_value === 'object') {
            if (obj_key_value.$$coral_macro_type) {
              if (obj_key_value.$$coral_macro_type === 'constant') {
                var ref = '__constant_' + constants_counter++;
                constants[ref] = obj_key_value.args.value;
                obj[key] = ref;
              }
            } else {
              apply_macros(obj_key_value);
            }
          }
        }
      }
    });
  }

  // TODO: This should get introduced by the showWhen plugin, not in here all the time
  // A simple element that just passes through the placement as its output.  Used for tricks like ensuring a showWhen when the model is falsy has a passthrough when we want nothing to display.
  source.elements.__passthrough = {
    view: ""
  };

  hook_manager.runPipelineHook('pipeline_preprocess:default_values', normalize.default_values(source), function (source) {
    var normalize_settings = {
      checkElements: {
        customChecks: [],
        only: ['params', 'deps', 'shard', 'constants', 'variables', 'events', 'models', 'elements', 'dynamicElementLists', 'name', 'view', 'callbacks', 'preload', 'environmentVars'],
        check_unique_names: ['params', 'constants', 'variables', 'models', 'elements', 'dynamicElementLists', 'callbacks']
      },
      checkModels: {
        customChecks: [],
        only: ['params', 'constants', 'models', 'output', 'name', 'environmentVars'],
        check_unique_names: ['params', 'constants', 'models']
      }
    };
    hook_manager.runPipelineHook('pipeline_preprocess:normalize', normalize_settings, function (normalize_settings) {
      source = normalize.normalize(source, normalize_settings);
      var fields = ['params', 'deps', 'constants', 'variables', 'models', 'elements', 'dynamicElementLists', 'callbacks'];
      hook_manager.runPipelineHook('pipeline_preprocess:generate_refs', fields, function (fields) {
        normalize.index_refs(source, fields);
        source.elements[root_element].is_root = true;

        // Part 2: Applies some sort of transformation to get functionality working
        // TODO: In the future we should seek minimize code that lives at this part and push it over to computable based transformations.
        hook_manager.runPipelineHook('pipeline_preprocess', source, function (source) {
          source = base_preprocess(cData, hook_manager, source, root_element, callback);

        });
      });
    });
  });
}

function base_preprocess (cData, hook_manager, source, root_element, callback) {

  var error_helper = require('../lib/error_helper');
  var replace = require('./preprocess_graph/type_system/convert_type');
  source = (function outputProcess(prefix) {
    return replace(prefix, 'object', function (model, type, path) {
      if (model.output == null) {
        if (model.models && model.models.output) {
          model.output = 'output';
        } else {
          var message = 'Model is missing an output function.';
          throw new Error(error_helper.message_gen(message, null, path[path.length - 1], path[path.length - 2]));
        }
      }
      return model;
    });
  })('models.*')(source);

  (function rewrite_inline_functions_used_as_dynamic_elment_list_models (element_hash) {
    var i;
    for (var element_name in element_hash) {
      var element = element_hash[element_name];
      var element_local_refs = element.localRefs;
      for (i = 0; i !== element_local_refs.length; ++i) {
        var element_local_ref = element_local_refs[i];
        if (!element_local_ref.value) continue;
        if (element_local_ref.type === 'dynamicElementLists') {
          var dynamic_element_list_model = element_local_ref.value.model;
          if (dynamic_element_list_model.type && dynamic_element_list_model.type === '!inline') {
            var intermediate_model_name = '$$' + element_local_ref.name + '_intermediate';
            element.models[intermediate_model_name] = dynamic_element_list_model;
            var intermediate_model_local_ref = {
              type: 'models',
              value: dynamic_element_list_model,
              name: intermediate_model_name
            };
            element.localRefsHash[intermediate_model_name] = intermediate_model_local_ref;
            element.localRefs.push(intermediate_model_local_ref);
            element_local_ref.value.model = intermediate_model_name;
          }
        }
      }
    }
  })(source.elements);

  source.elements = process_iterate_array_virtual_refs(source.elements);

  (function generate_element_view_template_ast (element_hash) {
    var parseTemplate = require('../domeplates/parser');
    var traverse = require('../domeplates/traverse');

    for (var element_name in element_hash) {
      var elem = element_hash[element_name];
      elem.template_ast = parseTemplate(elem.view, elem.name);
      traverse.collapse_template(elem.template_ast);
    }
  })(source.elements);

  // TODO: Standardize all of these source modifiers to use the same interface, so that they may be chained and plugged together in a nice fashion.

  (function (element_hash) {
    for (var element_name in element_hash) {
      rewrite_view_expressions(element_hash[element_name]);
    }
  })(source.elements);

  source.elements = rewrite_view_conditionals(source.elements);

  (function add_after_output (element_hash) {
    for (var element_name in element_hash) {
      var element = element_hash[element_name];
      var after_placement = add_view_refs(element);
      // TODO: we ought to set outputs earlier in the process than here
      element.outputs = { after: after_placement };
    }
  })(source.elements);

  (function check_from_comment_annotation_format (element_hash) {
    for (var element_name in element_hash) {
      var element = element_hash[element_name];

      var i;
      var element_local_refs = element.localRefs;
      for (i = 0; i !== element_local_refs.length; ++i) {
        var element_local_ref = element_local_refs[i];
        if (!element_local_ref.value || element_local_ref.value.type !== '!inline') continue;
        if (!element_local_ref.value.parsed_params) continue;
        process_parsed_params(element, element_local_ref.value.parsed_params, element_name, element_local_ref.name);
      }

      var element_events = element.events;
      for (i = 0; i !== element_events.length; ++i) {
        var element_event = element_events[i];
        if (!element_event.parsed_params) continue;
        process_parsed_params(element, element_event.parsed_params, element_name, element_event.event);
      }
    }

    function process_parsed_params(element, parsed_params, element_name, reference_name) {
      for (var i = 0; i < parsed_params.length; ++i) {
        var param = parsed_params[i];
        if (!param.from) continue;

        if (element.localRefsHash[param.name]) {
          throw new Error('In ' + element_name + ' - ' + reference_name + ': Please rename the parameter <' + param.name + '> to avoid confusion with other references in this scope.');
        }
      }
    }
  })(source.elements);

  (function check_for_zone_entry_scope (element_hash, root_element) {
    for (var element_name in element_hash) {
      var element = element_hash[element_name];

      // TODO: This is purely if it is the root_element element for now, I'll think about handling for this more later.
      // * I don't want to make every element that is really unused into a zone entry scope at the moment, I'll look at it later when I wire up routes.

      var is_route_element = root_element === element_name;
      var has_preload = typeof element.preload === 'string';

      var is_zone_entry_scope = has_preload || is_route_element;

      if (is_zone_entry_scope) {
        element.is_zone_entry_scope = true;
      }
    }
  })(source.elements, root_element);

  (function force_passthrough_order (element_hash) {
    for (var element_name in element_hash) {
      // TODO: find less hacky way to handle the sort order of __passthrough.
      if (element_name !== '__passthrough') {
        element_hash.__passthrough.parents.push({ name: element_name, type: 'element' });
      }
    }
  })(source.elements);

  (function add_event_refs (element_hash) {
    var event_ref_index = 0;

    for (var element_name in element_hash) {
      var element = element_hash[element_name];
      var events = element.events;

      for (var i = 0; i !== events.length; ++i) {
        var event_value = events[i];

        var special_event_match = event_value.event.match(/^(catch) +(\w+|\*)$/) || event_value.event.match(/^(message) +(\w+)$/);
        if (special_event_match) {

          var event_type = special_event_match[1];
          var handler_type = special_event_match[2];
          var special_callback_name = '__' + event_type + '_' + handler_type;
          var callback_ref = {
            type: 'callbacks',
            name: special_callback_name,
            value: {
              output: event_value.output,
              args: event_value.args,
              params: event_value.params
            }
          };

          element.localRefs.push(callback_ref);
          element.localRefsHash[special_callback_name] = callback_ref;
          if (event_type === 'catch') {
            if (!element.catchArgs) element.catchArgs = [];
            element.catchArgs.push(special_callback_name);
          } else if (event_type === 'message') {
            if (!element.messageArgs) element.messageArgs = [];
            element.messageArgs.push(special_callback_name);
          }
        } else {
          // TODO: Yes, I realize event handlers aren't really 'refs', but this allows me to easily plug into my existing IR generation, and it is really awkward that they aren't in there with everything else when you go to process the element, you can see an example of this in the old ref sorting code.
          var event_ref_name = '_events_'+event_ref_index;
          event_ref_index++;

          var event_ref = {
            type: 'events',
            name: event_ref_name,
            value: event_value
          };

          element.localRefsHash[event_ref_name] = event_ref;
          element.localRefs.push(event_ref);
        }
      }
    }
  })(source.elements);

  (function add_handlers (elements_hash, source) {
    for (var element_name in elements_hash) {
      var element = elements_hash[element_name];
      add_handler(element, element.catchArgs, 'catchHandler', '__catchHandler');
      add_handler(element, element.messageArgs, 'messageHandler', '__messageHandler');
    }

    function add_handler (scope_definition, array_names, type_name, ref_name) {
      if (array_names && array_names.length) {
        add_ref(scope_definition, {
          type: type_name,
          value: {
            args: array_names
          },
          name: ref_name
        });
      }
    }

    function add_ref (scope_definition, ref) {
      var ref_name = ref.name;

      if (ref.type === 'params') {
        scope_definition.params.push(ref.value);
      }

      scope_definition.localRefs.push(ref);
      scope_definition.localRefsHash[ref_name] = ref;
    }
  })(source.elements, source);

  (function inject_dynamic_nested_references (element_hash, models_hash) {
    var constant_count = 0;
    var i;
    for (var element_name in element_hash) {
      var element = element_hash[element_name];
      var element_local_refs = element.localRefs;
      for (i = 0; i !== element_local_refs.length; ++i) {
        var element_local_ref = element_local_refs[i];
        if (!element_local_ref.value) continue;
        if (element_local_ref.type === 'dynamicElementLists') {
          var options = element_local_ref.value.options;
          for (var option_name in options) {
            var option = options[option_name];
            var option_args = option.args;
            for (var option_arg_name in option_args) {
              add_dynamic_nested_refs(element.localRefsHash, element.localRefs, element_local_ref.type, option_args, option_arg_name);
            }
          }
        } else if (element_local_ref.value.args) {
          var element_ref_args = element_local_ref.value.args;
          for (var element_ref_arg_name in element_ref_args) {
            add_dynamic_nested_refs(element.localRefsHash, element.localRefs, element_local_ref.type, element_ref_args, element_ref_arg_name);
          }
        }
      }
    }

    for (var model_name in models_hash) {
      var model = models_hash[model_name];
      var model_local_refs = model.localRefs;
      for (i = 0; i !== model_local_refs.length; ++i) {
        var model_local_ref = model_local_refs[i];
        if (model_local_ref.value && model_local_ref.value.args) {
          var model_ref_args = model_local_ref.value.args;
          for (var model_ref_arg_name in model_ref_args) {
            add_dynamic_nested_refs(model.localRefsHash, model.localRefs, model_local_ref.type, model_ref_args, model_ref_arg_name);
          }
        }
      }
    }

    // Note that this injects into the localRefs array and the algorithm relies on the for loop that calls this eventually running into the refs added here.  The reason we do this is to support insane expressions like "foo[bar.a[blah.d]].c[id]" by breaking it into parts and letting each part get pulled out
    function add_dynamic_nested_refs (localRefsHash, localRefs, ref_type, args_object, arg_name) {
      var arg_expression = args_object[arg_name];
      var bracket_count = 0;
      var outer_string = '';
      var object_lookup_string = '';

      for (var j = arg_expression.length - 1; j >= 0; j--) {
        var arg_expression_char = arg_expression[j];
        if (bracket_count === 0) {
          if (arg_expression_char === ']') {
            bracket_count++;
          } else {
            outer_string = arg_expression_char + outer_string;
          }
        } else {
          if (arg_expression_char === ']') {
            bracket_count++;
          } else if (arg_expression_char === '[') {
            bracket_count--;
            if (bracket_count === 0) {
              var parsed_index = esprima.parse(object_lookup_string);
              if (parsed_index.body[0].expression.type === "Literal") {
                var constant_ref_name = '$$dynamic_nested_constant_'+constant_count++;
                var parsed_literal = parsed_index.body[0].expression.value;

                var constant_ref = {
                  type: 'constants',
                  value: parsed_literal,
                  name: constant_ref_name
                };
                localRefs.push(constant_ref);
                localRefsHash[constant_ref_name] = constant_ref;
                object_lookup_string = constant_ref_name;
                break;
              } else {
                break;
              }
            }
          }

          object_lookup_string = arg_expression_char + object_lookup_string;
        }
      }

      if (!object_lookup_string) {
        return;
      }

      var dynamic_nested_source = arg_expression.slice(0, j);
      var dynamic_nested_field = object_lookup_string;
      var nested_off_of_dynamic_nested = outer_string;

      var dynamic_nested_name = 'dynamic_nested_' + sanitize_ref_name(dynamic_nested_source) + '_' + sanitize_ref_name(dynamic_nested_field);
      if (!localRefsHash[dynamic_nested_name]) {
        var dynamic_nested_ref = { name: dynamic_nested_name, type: 'dynamic_nesteds', value: { args: { source: dynamic_nested_source, field: dynamic_nested_field } } };

        localRefsHash[dynamic_nested_name] = dynamic_nested_ref;
        localRefs.push(dynamic_nested_ref);
      }

      args_object[arg_name] = dynamic_nested_name + nested_off_of_dynamic_nested;
    }

    function sanitize_ref_name (ref_name) {
      return ref_name.replace(/[\[\]]/g, '$_$').replace(/\./g, '__$');
    }
  })(source.elements, source.models);

  (function element_check (element_hash) {
    // Check that if element is used, element only has one root DOM node.

    for (var element_name in element_hash) {
      var element = element_hash[element_name];
      var ref_using_element = null;
      var ref;
      for (var i = 0; i < element.localRefs.length; ++i) {
        ref = element.localRefs[i];
        if (ref.type === 'events' || ref.type === 'callbacks') {
          if (ref.value.args.element) {
            ref_using_element = ref;
            break;
          }
        }
      }

      if (!ref_using_element) continue;

      var after_ref = element.localRefsHash[get_base_ref_name(element.outputs.after)];

      var error_prefix = element_name;
      if (ref_using_element.type === 'callbacks') {
        error_prefix += ' callback "' + ref_using_element.name + '":';
      } else if (ref_using_element.type === 'events') {
        error_prefix += ' event "' + ref_using_element.value.event + '":';
      }

      if (after_ref.name === '__safety_belt_passthrough' || after_ref.type !== 'viewNodes' || after_ref.value.args.placement !== '__placement') {
        throw new Error(error_prefix + ' in order to use element you must have one root DOM node');
      }
    }

    function get_base_ref_name (name) {
      return name.split(/\.|\[/)[0];
    }
  })(source.elements);

  hook_manager.runPipelineHook('pipeline_preprocess:normalized_preprocess_source', source, function (source) {

    process_environment_refs(source.elements, source.models);

    rewrite_element_triple_references(source.elements);
    rewrite_element_as_argument_passing(source.elements);

    (function validate_dom_variable_templating (element_hash) {
      for (var element_name in element_hash) {
        var element = element_hash[element_name];

        var element_local_refs = element.localRefs;
        for (var i = 0; i !== element_local_refs.length; ++i) {
          var element_local_ref = element_local_refs[i];

          if (element_local_ref.type !== 'viewNodes') continue;
          if (!element_local_ref.value || element_local_ref.value.type !== 'Variable') continue;

          var view_ref_name_used = element_local_ref.value.args.value.split(/\.|\[/)[0];
          var local_refs_hash_result = element.localRefsHash[view_ref_name_used];
          if (!local_refs_hash_result) {
            throw new ReferenceError(element_name + ': Invalid template specified in view, {{' + element_local_ref.value.args.value + '}}, ' + view_ref_name_used + ' is not a reference in the element\n');
          }

          if (local_refs_hash_result.type === 'elements' || local_refs_hash_result.type === 'dynamicElementLists') {
            throw new Error('In ' + element_name + ': Element "' + element_local_ref.value.name + '" was used in the view as {{' + element_local_ref.value.name + '}} instead of {{{' + element_local_ref.value.name + '}}}.');
          }
        }
      }
    })(source.elements);

    var fields = [
      { fieldName: 'models', sourcePath: 'models', skip: function (val) { return val.type === '!inline'; }},
      { fieldName: 'elements', sourcePath: 'elements' },
      { fieldName: 'dynamicElementLists?.*.options', skip_param: { item: true }, sourcePath: 'elements' },
    ];
    hook_manager.runPipelineHook('pipeline_preprocess:expand_implied_arguments', fields, function (fields) {
      (function expand_implied_arguments_of_elements (elements_hash, source, fields) {
        for (var element_name in elements_hash) {
          try {
            elements_hash[element_name] = expand_implied_arguments(elements_hash[element_name], source, fields);
          } catch(e) {
            e.message = error_message_gen(e.message, null, element_name, 'elements');
            throw e;
          }
        }
      })(source.elements, source, fields);

      (function expand_implied_arguments_of_models(models_hash, source, fields) {
        for (var model_name in models_hash) {
          try {
            models_hash[model_name] = expand_implied_arguments(models_hash[model_name], source, fields);
          } catch(e) {
            e.message = error_message_gen(e.message, null, model_name, 'models');
            throw e;
          }
        }
      })(source.models, source, fields);

      // Part 3: Generate finalized preprocess output
      // Order element and model scopes including their local refs, and normalize them into a single form that doesn't expose the original definition.
      hook_manager.runPipelineHook('pipeline_preprocess:modify_sort_refs', cData.sort_refs, function (sort_refs) {
        cData.sort_refs = sort_refs;

        cData.sort_refs.ref_parents_by_type.events = cData.sort_refs.helpers.create_get_callback_or_event_parents(cData.event_handler_virtual_params_hash);
        cData.sort_refs.ref_parents_by_type.callbacks = cData.sort_refs.helpers.create_get_callback_or_event_parents(cData.callback_handler_virtual_params_hash);

        var ref_parents_by_type = cData.sort_refs.ref_parents_by_type;

        var ordered_sources = (function get_ordered_sources (source) {
          var refs;
          var normalized_scope;

          var ordered_models = (function order_models (model_hash) {
            var ordered_model_names = topologically_sort_legacy_scope_hash(model_hash, 'model').reverse();
            return ordered_model_names.map(function (model_name) {
              try {
                var model = model_hash[model_name];
                refs = cData.sort_refs.execute(ref_parents_by_type, model);
                normalized_scope = {
                  type: 'model',
                  name: model_name,
                  outputs: { output: model.output },
                  params: refs.filter(function (ref) { return ref.type === 'params'; }).map(function (param) { return param.name; }),
                  refs: refs
                };
              } catch (model_error) {
                model_error.message = error_message_gen(model_error.message, null, model_name, 'models');
                throw model_error;
              }
              return normalized_scope;
            });
          })(source.models);

          var ordered_elements = (function order_elements (element_hash) {
            var ordered_element_names = topologically_sort_legacy_scope_hash(element_hash, 'element').reverse();
            return ordered_element_names.map(function (element_name) {
              try {
                var element = element_hash[element_name];
                refs = cData.sort_refs.execute(ref_parents_by_type, element);
                normalized_scope = {
                  type: 'element',
                  is_root: element_name === root_element,
                  shard: element.shard,
                  is_zone_entry_scope: element.is_zone_entry_scope,
                  name: element_name,
                  preload: element.preload, // TODO: Not a huge fan of putting this here, but it works for now and a reference doesn't quite feel right either
                  outputs: element.outputs,
                  params: refs.filter(function (ref) { return ref.type === 'params'; }).map(function (param) { return param.name; }),
                  refs: refs
                };
              } catch (elem_error) {
                elem_error.message = error_message_gen(elem_error.message, null, element_name, 'elements');
                throw elem_error;
              }
              return normalized_scope;
            });
          })(source.elements);

          callback(ordered_models.concat(ordered_elements));

        })(source);

      });

    });

  });


}

module.exports = preprocess_source;
