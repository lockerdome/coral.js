"use strict";

var extract_event_callback_input_computables = require('./extract_event_callback_input_computables');

var ScopeRefComputables = require('./scope_refs');

var Scope = require('../ir/scope');
var ZoneEntryScope = require('../ir/zone_entry_scope');

var generate_identity_comparison_function = require('./generate_identity_comparison_function');
var funcParams = require('../lib/function_helpers').parameters;
var error_message_gen = require('../lib/error_helper').message_gen;

var construct_event_handler = require('./construct_event_handler');

var DynamicNestedPassthrough = require('../ir/computables/dynamic_nested_passthrough');
var Constant = require('../ir/computables/constant');
var ConstantInitializedVariable = require('../ir/computables/constant_initialized_variable');
var ComputeInitializedVariable = require('../ir/computables/compute_initialized_variable');
var DOMElement = require('../ir/computables/dom_element');
var DOMInlineElement = require('../ir/computables/dom_inline_element');
var DOMText = require('../ir/computables/dom_text');
var DOMVariable = require('../ir/computables/dom_variable');
var DOMUnescapedVariable = require('../ir/computables/dom_unescaped_variable');

var Callback = require('../ir/computables/callback');
var CatchHandler = require('../ir/computables/catch_handler');
var MessageHandler = require('../ir/computables/message_handler');

var PolymorphicScopeInstance = require('../ir/computables/polymorphic_scope_instance');
var IterateArray = require('../ir/computables/iterate_array');
var VirtualArrayItem = require('../ir/computables/virtual_array_item');
var VirtualArrayItemIndex = require('../ir/computables/virtual_array_item_index');
var VirtualIntermediate = require('../ir/computables/virtual_intermediate');
var VirtualPlacement = require('../ir/computables/virtual_placement');

var InsertInitializedElement = require('../ir/computables/insert_initialized_element');

var PureFunction = require('../ir/computables/pure_function');
var ScopeDependency = require('../ir/computables/scope_dependency');
var ScopeInstance = require('../ir/computables/scope_instance');
var ScopeParameter = require('../ir/computables/scope_parameter');
var ScopeDataMarker = require('../ir/computables/scope_data_marker');

var is_type_contained = require('../ir/is_type_contained');
var type_parser = require('../ir/type_parser');

var IRAnyType = require('../ir/types/any');
var IRExactValueType = require('../ir/types/exact_value');
var IRTruthyType = require('../ir/types/truthy');
var IRFalsyType = require('../ir/types/falsy');
var IRDOMPlacementType = require('../ir/types/dom_placement');

function ScopeRef (name, computable, base_name_implies_path) {
  this.name = name;
  this.computable = computable;
  this.base_name_implies_path = base_name_implies_path;
}

/**
 * @param {Array.<Object>} ordered_sources
 * @param HookManager hook_manager
 * @param function callback
 *   - First param is {{ root_element_scopes: Object.<string, Scope>, element_scopes: Object.<string, Scope>, model_scopes: Object.<string, Scope>, scopes: Array.<Scope> }}
 */
function generate_scopes (cData, ordered_sources, hook_manager, callback) {
  var scopes_by_type = {};
  var generated_scopes = [];

  var element_source_definition_by_name = {};
  var model_source_definition_by_name = {};
  ordered_sources.forEach(function (normalized_source) {
    if (normalized_source.type === 'element') {
      element_source_definition_by_name[normalized_source.name] = normalized_source;
    } else if (normalized_source.type === 'model') {
      model_source_definition_by_name[normalized_source.name] = normalized_source;
    }
  });

  var params_by_scope_type = {
    element: function (scope_name) {
      return element_source_definition_by_name[scope_name].params;
    },
    model: function (scope_name) {
      return model_source_definition_by_name[scope_name].params;
    }
  };

  hook_manager.runPipelineHook('pipeline_ir_gen:modify_params_by_scope_type', params_by_scope_type, function (params_by_scope_type) {
    var info_by_scope_type = {
      get_params: function (scope_type, scope_name) {
        if (!params_by_scope_type[scope_type]) return null;
        return params_by_scope_type[scope_type](scope_name);
      },
      get_scope: function (scope_type, scope_name) {
        return scopes_by_type[scope_type][scope_name];
      },
      add_scope: function (scope_type, scope_name, scope) {
        scopes_by_type[scope_type] = scopes_by_type[scope_type] || {};
        scopes_by_type[scope_type][scope_name] = scope;
        generated_scopes.push(scope);
      }
    };

    var computable_creators_by_event_type = {};
    hook_manager.runPipelineHook('pipeline_ir_gen:computable_creators_by_event_type', computable_creators_by_event_type, function (computable_creators_by_event_type) {
      // TODO: Start chipping away at this, we'll probably want a more concrete abstraction for this
      // * We should probably also allow custom scope object creation
      var computable_creators_by_source_type = {
        model: {
          params: create_params_computable,
          constants: create_constants_computable,
          models: create_models_computable
        },
        element: {
          params: create_params_computable,
          scope_data_marker: create_scope_data_marker_computable,
          deps: create_deps_computable,
          constants: create_constants_computable,
          variables: create_variables_computable,
          models: create_models_computable,
          elements: create_elements_computable,
          events: create_events_computable(cData.event_handler_virtual_params_hash, computable_creators_by_event_type),
          callbacks: create_callbacks_computable(cData.callback_handler_virtual_params_hash),
          catchHandler: create_catchHandler_computable,
          messageHandler: create_catchHandler_computable,
          viewNodes: create_viewNodes_computable,
          dynamicElementLists: create_dynamicElementLists_computable,
          dynamic_nesteds: create_dynamic_nesteds_computable
        }
      };

      var computable_creators;
      hook_manager.runHook('ir_gen:register_computable_creators_by_source_type', [computable_creators_by_source_type], function () {
        var root_elements_hash = {};

        var initialization_handling = {
          BEGIN: [
            function is_shard (normalized_source, scope, scope_ref_computables) {
              if (normalized_source.shard) scope.set_shard_metadata(normalized_source.shard);
            }
          ],
          END: [
            function computables_for_scope_local_refs (normalized_source, scope, scope_ref_computables) {
              var local_refs = normalized_source.refs;

              for (var i = 0; i < local_refs.length; i++) {
                var local_ref = local_refs[i];
                var scope_ref = new ScopeRef(local_ref.name, null, null);

                try {
                  var computable_creator = computable_creators[local_ref.type];
                  if (!computable_creator) throw new Error("No handling available for local ref in scope " + local_ref.type);
                  scope_ref.computable = computable_creator(normalized_source, local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type);
                } catch(e) {
                  e.message = error_message_gen(e.message, scope_ref.name, normalized_source.name, normalized_source.type + 's');
                  throw e;
                }

                if (scope_ref.computable) {
                  scope_ref_computables.add_ref(scope_ref.name, scope_ref.computable, scope_ref.base_name_implies_path);
                }
              }
            },
            function add_output_to_scope (normalized_source, scope, scope_ref_computables) {
              for (var normalized_source_output_name in normalized_source.outputs) {
                var normalized_source_output_ref = normalized_source.outputs[normalized_source_output_name];
                var output_computable = scope_ref_computables.get_ref(normalized_source_output_ref);
                scope.add_output(output_computable, normalized_source_output_name);
              }
            }
          ]
        };
        hook_manager.runHook('ir_gen:register_initialization_handling', [initialization_handling], function () {
          var finalization_handling = {
            BEGIN: [
              function is_root (normalized_source, scope, scope_ref_computables) {
                if (normalized_source.is_root) {
                  root_elements_hash[normalized_source.name] = scope;
                }
              },
            ],
            END: []
          };
          hook_manager.runHook('ir_gen:register_finalization_handling', [finalization_handling], function () {

            ordered_sources.forEach(function (normalized_source) {

              computable_creators = computable_creators_by_source_type[normalized_source.type];
              if (!computable_creators) throw new Error("Unknown source type encountered " + normalized_source.type);

              var scope = normalized_source.is_zone_entry_scope ? new ZoneEntryScope(normalized_source.type + ': ' + normalized_source.name, normalized_source.preload)
                : new Scope(normalized_source.type + ': ' + normalized_source.name);

              var scope_ref_computables = new ScopeRefComputables(normalized_source.name);

              process_handling(initialization_handling.BEGIN, normalized_source, scope, scope_ref_computables);
              process_handling(initialization_handling.END, normalized_source, scope, scope_ref_computables);
              info_by_scope_type.add_scope(normalized_source.type, normalized_source.name, scope);
              process_handling(finalization_handling.BEGIN, normalized_source, scope, scope_ref_computables);
              process_handling(finalization_handling.END, normalized_source, scope, scope_ref_computables);

              function process_handling (handlers_array, normalized_source, scope, scope_ref_computables) {
                for (var i = 0; i !== handlers_array.length; i++) {
                  var func = handlers_array[i];
                  func(normalized_source, scope, scope_ref_computables);
                }
              }

            });

            callback({
              root_element_scopes: root_elements_hash,
              element_scopes: scopes_by_type.element,
              model_scopes: scopes_by_type.model,
              scopes: generated_scopes
            });
          });
        });
      });
    });
  });
}

function generate_inline_function_ir (local_ref_type, scope, value, scope_ref_computables) {
  var is_computed_variable = local_ref_type === 'variables';
  var input_computables = scope_ref_computables.args_to_param_inputs(value.args, value.params);
  return is_computed_variable ? new ComputeInitializedVariable(scope, value.output, input_computables) :
                                new PureFunction(scope, value.output, input_computables);
}

function create_params_computable (source, source_local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type) {
  var type_spec = source_local_ref.value.type;
  var input_ir_type = type_spec ? type_parser(type_spec) : new IRAnyType();
  return new ScopeParameter(scope, input_ir_type, source_local_ref.value.name, source_local_ref.value.invariant);
}

function create_scope_data_marker_computable (source, source_local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type) {
  new ScopeDataMarker(scope, scope_ref_computables.args_to_param_inputs(source_local_ref.value.args, source_local_ref.value.params)[0]);
  return null;
}

function create_deps_computable (source, source_local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type) {
  var source_value = source_local_ref.value;
  return new ScopeDependency(scope, source_value.url, source_value.type);
}

function create_constants_computable (source, source_local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type) {
  return new Constant(scope, source_local_ref.value);
}

function create_variables_computable (source, source_local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type) {
  if (source_local_ref.value && source_local_ref.value.type === '!inline') {
    var computed_variable_value = source_local_ref.value;
    return generate_inline_function_ir(source_local_ref.type, scope, computed_variable_value, scope_ref_computables);
  } else {
    return new ConstantInitializedVariable(scope, source_local_ref.value);
  }
}

function create_models_computable (source, source_local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type) {
  var source_value = source_local_ref.value;
  if (source_value.type === "!inline") {
    return generate_inline_function_ir(source_local_ref.type, scope, source_value, scope_ref_computables);
  } else {
    var creating_scope = info_by_scope_type.get_scope('model', source_value.type);
    var scope_instance_parameters = scope_ref_computables.scope_args_to_param_inputs(source.name, 'model', source_value.type, source_value.args, info_by_scope_type);
    scope_ref.base_name_implies_path = 'output';
    return new ScopeInstance(scope, creating_scope, scope_instance_parameters);
  }
}

function create_elements_computable (source, source_local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type) {
  var element_reference = source_local_ref.value;
  var element_creating_scope = info_by_scope_type.get_scope('element', element_reference.type);
  // TODO: Think if I want to handle this better, means that the element is unused.
  if (!element_reference.args.__placement) {
    return undefined;
  }

  var element_scope_ref_computables = ScopeRefComputables.create_closure(scope_ref_computables);
  element_scope_ref_computables.add_ref('__virtual_placement', function () {
    return new VirtualPlacement(scope);
  });

  var scope_instance_parameters = element_scope_ref_computables.scope_args_to_param_inputs(source.name, 'element', element_reference.type, element_reference.args, info_by_scope_type);

  return new ScopeInstance(scope, element_creating_scope, scope_instance_parameters);
}

function create_events_computable (event_handler_virtual_params_hash, computable_creators_by_event_type) {
  return function (source, source_local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type) {
    var event_value = source_local_ref.value;
    var event_specification = event_value.event;

    return construct_event_handler(event_handler_virtual_params_hash, computable_creators_by_event_type, event_specification, event_value.output, event_value.params.map(function (name) {
      return event_value.args[name];
    }), scope, scope_ref_computables, source, info_by_scope_type);
  };
}

function create_callbacks_computable (callback_handler_virtual_params_hash) {
  return function (source, source_local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type) {
    var callback_value = source_local_ref.value;
    var callback_scope_ref_computables = ScopeRefComputables.create_closure(scope_ref_computables);
    Object.keys(callback_handler_virtual_params_hash).forEach(function (callback_handler_virtual_param) {
      callback_scope_ref_computables.add_ref(callback_handler_virtual_param, function () {
        var required_refs = [];
        if (callback_handler_virtual_params_hash[callback_handler_virtual_param].input_references) {
          required_refs = callback_handler_virtual_params_hash[callback_handler_virtual_param].input_references(source);
        }

        var input_computables = [];
        for (var i = 0; i < required_refs.length; ++i) {
          input_computables.push(scope_ref_computables.get_ref(required_refs[i]));
        }

        var virtual_computable = callback_handler_virtual_params_hash[callback_handler_virtual_param].create(scope, input_computables, source, info_by_scope_type, callback_handler_virtual_param);
        return virtual_computable;
      });
    });

    var callback_input_computables = extract_event_callback_input_computables(callback_value.params.map(function (name) {
      return callback_value.args[name];
    }), callback_scope_ref_computables);

    return new Callback(scope, callback_value.output, callback_input_computables);
  };
}

function create_catchHandler_computable (source, source_local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type) {
  var input_computables = [];
  var input_computables_names = [];
  var element_local_ref_args = source_local_ref.value.args;

  for (var i = 0; i < element_local_ref_args.length; ++i) {
    var param_name = element_local_ref_args[i];
    input_computables_names.push(param_name);
    input_computables.push(scope_ref_computables.get_ref(param_name));
  }

  if (source_local_ref.type === 'catchHandler') {
    return new CatchHandler(scope, input_computables, input_computables_names);
  } else {
    return new MessageHandler(scope, input_computables, input_computables_names);
  }
}

function create_viewNodes_computable (source, source_local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type) {
  var view_node = source_local_ref.value;
  var placement_ref = source_local_ref.value.args.placement;
  var placement = scope_ref_computables.get_ref(placement_ref);

  if (view_node.type === 'InlineTag') {
    return new DOMInlineElement(scope, view_node.value, placement);
  } else if (view_node.type === 'Tag') {
    var attributes = {};

    view_node.attributes.forEach(function (attribute) {
      var attribute_parts = Array.isArray(attribute.value) ? attribute.value : [attribute.value];
      var attribute_computables = attribute_parts.map(function (attr_part) {
        if (attr_part.type === 'Variable') {
          return scope_ref_computables.get_ref(attr_part.name);
        } else if (attr_part.type === 'Text') {
          return new Constant(scope, attr_part.value);
        }

        throw new Error("Unrecognized attribute part type " + attr_part.type);
      });
      var attribute_name;
      if (attribute.type === 'Attribute') {
        attribute_name = attribute.name;
      } else if (attribute.type === 'ClassAttribute' || attribute.type === 'ClassAttributeStatic' || attribute.type === 'ClassAttribute1') {
        attribute_name = 'class';
      } else if (attribute.type === 'DataAttribute') {
        attribute_name = 'data-'+attribute.name;
      } else if (attribute.type === 'StyleAttribute') {
        attribute_name = 'style';
      } else {
        throw new Error("Unable to determine attribute name for "+attribute.type);
      }
      attributes[attribute_name] = attribute_computables;
    });

    return new DOMElement(scope, view_node.name, attributes, placement);
  } else if (view_node.type === 'Variable') {
    return new DOMVariable(scope, scope_ref_computables.get_ref(view_node.args.value), placement);
  } else if (view_node.type === 'Text') {
    return new DOMText(scope, view_node.value, placement);
  } else if (view_node.type === 'InnerTextStatic') {
    return new DOMText(scope, view_node.value.value, placement);
  } else if (view_node.type === 'TripleVariable') {
    var source_computable = scope_ref_computables.get_ref(view_node.args.value);
    if (is_type_contained(new IRDOMPlacementType(), source_computable.get_output_type())) {
      throw new Error(source.name + ": Triple refs get replaced with the element or dynamic element list reference, why is there something outputting a placement into this that didn't get replaced earlier? "+source_computable+" "+source_computable.get_output_type());
    } else if (source_computable instanceof ScopeParameter && is_type_contained(type_parser('element'), source_computable.get_output_type())) {
      return new InsertInitializedElement(scope, source_computable, placement);
    } else {
      return new DOMUnescapedVariable(scope, source_computable, placement);
    }
  } else {
    throw new Error('Hit an unsupported view node type, ' + view_node.type + ' ' + JSON.stringify(view_node));
  }
}

function create_dynamicElementLists_computable (source, source_local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type) {
  var element_local_ref_value = source_local_ref.value;
  if (element_local_ref_value.showWhen) {
    // TODO: Make showWhen syntax first class, there is no point in converting it to a dynamic element list anymore.
    return create_showWhenDynamicElementLists_computable(source, source_local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type);
  } else if (element_local_ref_value.polymorphic) {
    return create_polymorphicDynamicElementLists_computable(source, source_local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type);
  } else {
    return create_singleElementDynamicElementLists_computable(source, source_local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type);
  }
}

function create_dynamic_nesteds_computable (source, source_local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type) {
  return new DynamicNestedPassthrough(scope_ref_computables.get_ref(source_local_ref.value.args.source), scope_ref_computables.get_ref(source_local_ref.value.args.field));
}

function create_showWhenDynamicElementLists_computable (source, source_local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type) {
  var element_local_ref_value = source_local_ref.value;
  var element_scope_ref_computables = ScopeRefComputables.create_closure(scope_ref_computables);
  element_scope_ref_computables.add_ref('__virtual_placement', function () {
    return new VirtualPlacement(scope);
  });

  var computable = new PolymorphicScopeInstance(scope, scope_ref_computables.get_ref(element_local_ref_value.model));
  var truthy_type = new IRTruthyType();
  var falsy_type = new IRFalsyType();
  var show_when_element_value = element_local_ref_value.options.onlyOption;
  var show_when_element_scope = info_by_scope_type.get_scope('element', show_when_element_value.type);
  if (!show_when_element_scope) {
    throw new Error(show_when_element_value.type+' is not an element');
  }

  var element_scope_parameters = element_scope_ref_computables.scope_args_to_param_inputs(source.name, 'element', show_when_element_value.type, show_when_element_value.args, info_by_scope_type);
  computable.add_choice(truthy_type, show_when_element_scope, element_scope_parameters);

  // TODO: This code assumes that the __passthrough only has one parameter, this may get me in trouble, again...
  var passthrough_scope = info_by_scope_type.get_scope('element', '__passthrough');
  if (passthrough_scope.get_input_count() > 1) {
    // TODO: Nicer error message
    throw new Error("Why does the __passthrough scope have more than one parameter, there is code here that assumes it only has one");
  }

  var placement_parameter = element_scope_parameters[0];
  computable.add_choice(falsy_type, passthrough_scope, [placement_parameter]);

  return computable;
}

function create_polymorphicDynamicElementLists_computable (source, source_local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type) {
  var element_local_ref_value = source_local_ref.value;
  var element_scope_ref_computables = ScopeRefComputables.create_closure(scope_ref_computables);
  element_scope_ref_computables.add_ref('__virtual_placement', function () {
    return new VirtualPlacement(scope);
  });

  var computable = new PolymorphicScopeInstance(scope, scope_ref_computables.get_ref(element_local_ref_value.model));

  for (var option_name in element_local_ref_value.options) {
    var option = element_local_ref_value.options[option_name];
    var choice_parameters = element_scope_ref_computables.scope_args_to_param_inputs(source.name, 'element', option.type, option.args, info_by_scope_type);
    var choice_type = type_parser(option_name);

    var choice_scope = info_by_scope_type.get_scope('element', option.type);
    if (!choice_scope) {
      throw new Error(option.type+' is not an element');
    }
    computable.add_choice(choice_type, choice_scope, choice_parameters);
  }

  return computable;
}

function create_singleElementDynamicElementLists_computable (source, source_local_ref, scope_ref_computables, scope_ref, scope, info_by_scope_type) {
  var element_local_ref_value = source_local_ref.value;
  var has_no_options = !Object.keys(element_local_ref_value.options).length;
  if (has_no_options) {
    throw new Error("Dynamic element list, "+source_local_ref.name+" has no options");
  }

  var element_scope_ref_computables = ScopeRefComputables.create_closure(scope_ref_computables);
  element_scope_ref_computables.add_ref('__virtual_placement', function () {
    return new VirtualPlacement(scope);
  });

  // TODO: cleaner way to determine the initial placement and handle placement passing in general
  var initial_intermediate_computable_path = element_local_ref_value.options[Object.keys(element_local_ref_value.options)[0]].args.__placement;
  var initial_intermediate_computable = element_scope_ref_computables.get_ref(initial_intermediate_computable_path);

  var array_computable = scope_ref_computables.get_ref(element_local_ref_value.model);

  var identity = element_local_ref_value.identity;
  var usesToStringIdentity = identity === '';
  var noIdentity = !identity && !usesToStringIdentity;
  if (noIdentity) throw new Error('An identity key for the Dynamic Element List "' + source_local_ref.name + '" must be specified');

  var intermediate_virtual = new VirtualIntermediate(scope, initial_intermediate_computable.get_output_type());
  var item_virtual = new VirtualArrayItem(scope, array_computable);
  var item_index_virtual = new VirtualArrayItemIndex(scope, array_computable);

  var map_function_scope_ref_computables = ScopeRefComputables.create_closure(scope_ref_computables);
  map_function_scope_ref_computables.add_ref('item', item_virtual);

  var items_type = array_computable.get_output_type();
  var identity_comparison_function = generate_identity_comparison_function(items_type, identity);
  var computable;

  if (element_local_ref_value.item) {
    computable = new IterateArray(scope, initial_intermediate_computable, array_computable, item_virtual, intermediate_virtual, identity_comparison_function);
  } else {
    var array_map_function = element_local_ref_value.map;
    var map_function_input_computables = funcParams(array_map_function).map(function (name) {
      return map_function_scope_ref_computables.get_ref(name);
    });
    computable = new IterateArray(scope, initial_intermediate_computable, array_computable, item_virtual, intermediate_virtual, identity_comparison_function, array_map_function, map_function_input_computables);
  }


  var dynamic_element_list_options = element_local_ref_value.options;


  var dynamic_element_list_scope_refs = ScopeRefComputables.create_closure(scope_ref_computables);
  dynamic_element_list_scope_refs.add_ref('__intermediate', intermediate_virtual);
  dynamic_element_list_scope_refs.add_ref('item_index', item_index_virtual);

  for (var dynamic_element_list_option_name in dynamic_element_list_options) {
    var dynamic_element_list_option = dynamic_element_list_options[dynamic_element_list_option_name];
    var dynamic_element_list_option_args = dynamic_element_list_option.args;
    // TODO: Less magic around placement passing, this simply forces the placement to be sourced from the intermediate instead of the placement from the thing in the DOM before the dynamic element list which it automatically gets set to.
    dynamic_element_list_option_args.__placement = "__intermediate";

    var dynamic_element_list_option_input_computables = dynamic_element_list_scope_refs.scope_args_to_param_inputs(source.name, 'element', dynamic_element_list_option.type, dynamic_element_list_option_args, info_by_scope_type);
    computable.add_choice(new IRExactValueType(dynamic_element_list_option_name), info_by_scope_type.get_scope('element', dynamic_element_list_option.type), dynamic_element_list_option_input_computables, 'after');
  }


  return computable;
}

module.exports = generate_scopes;
