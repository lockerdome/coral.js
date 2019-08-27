"use strict";

var VIRTUAL_PLACEMENT_REF_NAME = '__virtual_placement';

// TODO: Blow up if an element as arg is requested that is used in the view, you can't have it both ways, you can't use the element more than once.

/**
 * Detects and restructures situations where we have elements or dynamic element lists getting passed as arguments to an element.
 *
 * Elements by default just output a placement that represents a spot after its contents.  Given that knowledge, it is clear that there is no opportunity without restructuring the element that wants to insert an element created in the context of another element into itself to do so.
 *
 * The restructuring will find these spots where it is clear that an element or dynamic element list is being passed as an arg, and rewrite from the target TripleVariable to remove the TripleVariable and have the input of the TripleVariable become an output and the output of the element or dynamic element list to become an input and have every step of the path handle that change.
 *
 * @param {Object} element_hash
 */
function rewrite_element_as_argument_passing (element_hash) {
  var coordinating_elements_metadata = determine_element_as_argument_coordinators(element_hash);

  var has_no_element_as_argument_usages = !coordinating_elements_metadata.length;
  if (has_no_element_as_argument_usages) {
    return;
  }

  var elements_with_element_as_arg_params = {};

  coordinating_elements_metadata.forEach(function (coordinating_element_metadata) {
    var coordination_cases = coordinating_element_metadata.cases;
    var coordinating_element = element_hash[coordinating_element_metadata.name];
    var coordinating_element_local_refs_hash = coordinating_element.localRefsHash;

    for (var i = 0; i !== coordination_cases.length; ++i) {
      var coordinating_case = coordination_cases[i];
      var element_as_arg_ref = coordinating_element_local_refs_hash[coordinating_case.arg];

      if (element_as_arg_ref.type === 'elements') {
        element_as_arg_ref.value.args.__placement = VIRTUAL_PLACEMENT_REF_NAME;
      } else if (element_as_arg_ref.type === 'dynamicElementLists') {
        var options = element_as_arg_ref.value.options;
        for (var option_key in options) {
          var option_args = options[option_key].args;
          option_args.__placement = VIRTUAL_PLACEMENT_REF_NAME;
        }
      }

      var element_params_seen = elements_with_element_as_arg_params[coordinating_case.element_passed_to_type] || {};

      element_params_seen[coordinating_case.arg_name] = true;

      elements_with_element_as_arg_params[coordinating_case.element_passed_to_type] = element_params_seen;
    }
  });

  mark_element_as_arg_parameters(elements_with_element_as_arg_params, element_hash);
}

function mark_element_as_arg_parameters (elements_with_element_as_arg_params, element_hash) {
  // element_name -> { param_name_uses_element_arg: true }
  var next_iteration_element_as_arg_params = {};

  for (var element_name in elements_with_element_as_arg_params) {
    var element_as_arg_params_hash = elements_with_element_as_arg_params[element_name];

    var element_refs_hash = element_hash[element_name].localRefsHash;
    var element_refs = element_hash[element_name].localRefs;
    var unprocessed_element_as_args_param_hash = {};
    var has_unprocessed_params = false;

    for (var element_param_name in element_as_arg_params_hash) {
      var param_ref = element_refs_hash[element_param_name];

      if (param_ref.value.type !== 'element') {
        has_unprocessed_params = true;
        unprocessed_element_as_args_param_hash[param_ref.name] = true;
        param_ref.value.type = 'element';
      }
    }

    if (!has_unprocessed_params) {
      continue;
    }

    for (var i = 0; i !== element_refs.length; ++i) {
      var element_ref = element_refs[i];
      if (element_ref.type === 'elements') {
        var element_ref_args = element_ref.value.args;
        for (var arg_key in element_ref_args) {
          var arg_value = element_ref_args[arg_key];

          var arg_value_first_part = first_part(arg_value);
          if (arg_value_first_part in unprocessed_element_as_args_param_hash) {
            var next_iteration_element_params = next_iteration_element_as_arg_params[element_ref.value.type] || {};
            next_iteration_element_params[arg_value_first_part] = true;
            next_iteration_element_as_arg_params[element_ref.value.type] = next_iteration_element_params;
          }
        }
      } else if (element_ref.type === 'dynamicElementLists') {
        var options = element_ref.value.options;
        for (var option_key in options) {
          var option = options[option_key];
          var option_args = option.args;

          for (var option_arg_key in option_args) {
            var option_arg_value = option_args[option_arg_key];
            var option_arg_value_first_part = first_part(option_arg_value);
            if (option_arg_value_first_part in unprocessed_element_as_args_param_hash) {
              var next_iteration_option_element_params = next_iteration_element_as_arg_params[option.type] || {};
              next_iteration_option_element_params[option_arg_value_first_part] = true;
              next_iteration_element_as_arg_params[option.type] = next_iteration_option_element_params;
            }
          }
        }
      }
    }
  }

  if (Object.keys(next_iteration_element_as_arg_params).length) {
    mark_element_as_arg_parameters(next_iteration_element_as_arg_params, element_hash);
  }
}

/**
 * @param {Object}
 * @returns {Array.<Object>}
 */
function determine_element_as_argument_coordinators (element_hash) {
  var element_passing_coordinator_data = [];
  var i;
  var j;

  for (var element_name in element_hash) {
    var element = element_hash[element_name];
    var element_as_arg_cases = [];

    var element_local_refs = element.localRefs;
    var element_local_refs_hash = element.localRefsHash;

    for (i = 0; i !== element_local_refs.length; ++i) {
      var element_local_ref = element_local_refs[i];
      if (element_local_ref.type !== 'elements' && element_local_ref.type !== 'dynamicElementLists') {
        continue;
      }

      var element_local_ref_value = element_local_ref.value;
      if (element_local_ref.type === 'elements') {
        var instance_element_definition = element_hash[element_local_ref_value.type];
        var instance_element_params = instance_element_definition.params;
        var element_args = element_local_ref_value.args;

        for (j = 0; j !== instance_element_params.length; ++j) {
          var element_arg_name = instance_element_params[j].name;

          if (element_arg_name === '__placement') {
            // It is perfectly normal for an element to use the placement output of another element.
            continue;
          }

          var element_arg = element_args[element_arg_name] || element_arg_name;

          if (is_arg_placement_provider(element_arg, element_local_refs_hash)) {
            element_as_arg_cases.push({
              coordinator_ref_name: element_local_ref.name,
              element_passed_to_type: element_local_ref_value.type,
              arg_name: element_arg_name,
              arg: element_arg
            });
          }
        }
      } else if (element_local_ref.type === 'dynamicElementLists') {
        var dynamic_element_list_options = element_local_ref_value.options;
        for (var dynamic_element_list_option_name in dynamic_element_list_options) {
          var dynamic_element_list_option = dynamic_element_list_options[dynamic_element_list_option_name];
          var option_element_definition = element_hash[dynamic_element_list_option.type];
          var option_element_params = option_element_definition.params;
          var dynamic_element_list_option_args = dynamic_element_list_option.args;

          for (j = 0; j !== option_element_params.length; ++j) {
            var dynamic_element_list_arg_name = option_element_params[j].name;
            if (dynamic_element_list_arg_name === '__placement') {
              // It is perfectly normal for an element to use the placement output of another element.
              continue;
            }

            var dynamic_element_list_arg = dynamic_element_list_option_args[dynamic_element_list_arg_name] || dynamic_element_list_arg_name;
            if (is_arg_placement_provider(dynamic_element_list_arg, element_local_refs_hash)) {
              element_as_arg_cases.push({
                coordinator_ref_name: element_local_ref.name,
                element_passed_to_type: dynamic_element_list_option.type,
                option_name: dynamic_element_list_option_name,
                arg_name: dynamic_element_list_arg_name,
                arg: dynamic_element_list_arg 
              });
            }
          }
        }
      }
    }

    if (element_as_arg_cases.length) {
      element_passing_coordinator_data.push({ name: element_name, cases: element_as_arg_cases });
    }
  }

  return element_passing_coordinator_data;
}

/**
 * @param {string} arg_path
 * @param {Object} element_local_refs_hash
 * @returns {boolean}
 */
function is_arg_placement_provider (arg_path, element_local_refs_hash) {
  var arg_path_first_part = arg_path.split(/\.|\[/)[0];
  var local_ref = element_local_refs_hash[arg_path_first_part];
  if (!local_ref) return false;

  return local_ref.type === 'elements' || local_ref.type === 'dynamicElementLists';
}

function first_part(field_string) {
  var part = field_string.split('.')[0].split('[')[0];
  return part;
}

module.exports = rewrite_element_as_argument_passing;
