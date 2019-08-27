"use strict";

var topological_sort = require('../../lib/topological_sort');

var suggest_it = require('suggest-it');

var funcParams = require('../../lib/function_helpers').parameters;

var helpers = {
  no_parents: no_parents,
  get_element_parents: get_element_parents,
  get_parents_from_values: get_parents_from_values,
  get_parents_from_params: get_parents_from_params,
  get_dynamic_element_list_parents: get_dynamic_element_list_parents,
  first_part: first_part,
  get_parents_from_args: get_parents_from_args,
  get_parents_from_args_if_available: get_parents_from_args_if_available,
  create_get_callback_or_event_parents: create_get_callback_or_event_parents
};

function no_parents () {
  return [];
}

function get_element_parents (ref_value) {
  return get_parents_from_args(ref_value).filter(function (param_name) {
    return param_name !== '__virtual_placement';
  });
}

function get_parents_from_values (ref_value) {
  var parents = [];
  for (var key in ref_value.args) {
    parents.push(first_part(ref_value.args[key]));
  }
  return parents;
}

function create_get_callback_or_event_parents (callback_or_event_virtual_params_hash) {
  return function get_callback_or_event_parents (ref_value, scope_definition) {
    var parents_from_args = get_parents_from_args(ref_value);
    var parents = [];
    for (var i = 0; i < parents_from_args.length; ++i) {
      var parent_reference = parents_from_args[i];
      var virtual_param_entry = callback_or_event_virtual_params_hash[parent_reference];
      if (!virtual_param_entry) {
        parents.push(parent_reference);
        continue;
      }

       // Skip virtual references, they don't represent anything concrete.  Only include concrete references they ask for.
      if (virtual_param_entry.input_references) {
        var refs = virtual_param_entry.input_references(scope_definition);
        for (var j = 0; j < refs.length; ++j) {
          parents.push(first_part(refs[j]));
        }
      } else {
        continue;
      }
    }
    return parents;
  };
}

function get_parents_from_params (ref_value) {
  var params = ref_value.params;
  var result = [];
  for (var i = 0; i !== params.length; ++i) {
    result.push(params[i]);
  }
  return result;
}

function get_dynamic_element_list_parents (ref_value) {
  var refs = {};

  refs[first_part(ref_value.model)] = true;

  var map_params = funcParams(ref_value.map);
  for (var i = 0; i < map_params.length; i++) {
    var map_param = first_part(map_params[i]);
    refs[map_param] = true;
  }

  var options = ref_value.options;
  for (var option_name in options) {
    var option = options[option_name];
    var option_args = option.args;
    for (var arg_name in option_args) {
      var arg_value = first_part(option_args[arg_name]);
      refs[arg_value] = true;
    }
  }

  return Object.keys(refs).filter(function (arg_name) {
    return arg_name !== 'item_index' && arg_name !== 'item' && arg_name !== '__virtual_placement';
  });
}

function first_part (field_string) {
  var part = field_string.split('.')[0].split('[')[0];
  return part;
}


function get_parents_from_args (ref_value) {
  var args = ref_value.args;
  var output = [];
  for (var param_name in args) {
    output.push(first_part(args[param_name]));
  }
  return output;
}

function get_parents_from_args_if_available (ref_value) {
  if (ref_value && ref_value.type === '!inline' && typeof ref_value.args === 'object') {
    return get_parents_from_args(ref_value);
  }

  return [];
}

/**
 * @param {Object} refs_hash
 * @returns {Array.<Object>} A topologically ordered array of refs.
 */
function sort_refs (ref_parents_by_type, scope_definition) {
  var refs_hash = scope_definition.localRefsHash;
  return topological_sort(Object.keys(refs_hash), function (name) {
    var ref = refs_hash[name];
    if (!ref) {
      var error_source = '.';
      for (var ref_key in refs_hash) {
        var ref_val = refs_hash[ref_key];
        var is_error_source = false;
        var error_source_args_key;
        if (ref_val.value && ref_val.value.args) {
          for (var args_key in ref_val.value.args) {
            var args_value = ref_val.value.args[args_key];
            if (args_value === name) {
              error_source_args_key = args_key;
              is_error_source = true;
              break;
            }
          }
        }
        if (!is_error_source && ref_val.value && ref_val.value.params && ref_val.value.params.indexOf(name) !== -1) {
          is_error_source = true;
        }

        if (is_error_source) {
          error_source = ' for ' + (error_source_args_key ? 'arg "' + error_source_args_key + '" with ' : '') + ref_val.type.replace(/s$/, '') + ' "' + ref_key + '".';
        }
      }

      if (!name) {
        throw new ReferenceError('Empty string is not a valid ref in scope' + error_source);
      }

      var suggestor = suggest_it(Object.keys(refs_hash));
      var suggestion = suggestor(name);
      var message = suggestion ? ' Did you mean "' + suggestion + '"?' : '';
      throw new ReferenceError('No ref named "' + name + '" in scope' + error_source + message);
    }
    return ref_parents_by_type[ref.type](ref.value, scope_definition);

  }).map(function (name) {
    return refs_hash[name];
  });
}

var ref_parents_by_type = {
  params: no_parents,
  deps: no_parents,
  constants: no_parents,
  scope_data_marker: get_parents_from_args,
  models: get_parents_from_args,
  variables: get_parents_from_args_if_available,
  elements: get_element_parents,
  dynamic_nesteds: get_parents_from_args,
  viewNodes: get_parents_from_args,
  callbacks: null,
  events: null,
  catchHandler: get_parents_from_args,
  messageHandler: get_parents_from_args,
  dynamicElementLists: get_dynamic_element_list_parents,
  environmentVars: get_parents_from_values
};

module.exports = {
  helpers: helpers,
  ref_parents_by_type: ref_parents_by_type,
  execute: sort_refs
};
