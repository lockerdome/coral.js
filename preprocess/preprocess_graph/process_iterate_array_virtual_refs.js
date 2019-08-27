"use strict";

function process_iterate_array_virtual_refs (element_scope_hash) {
  // TODO: In an ideal world this would operate on our computable based IR, by creating scopes in here I feel like I'm incurring technical debt to some degree since I will have to keep the scope object's structure up to date.  I'm going to proceed forward with this code as is and will think deeply about a way to approach these sorts of transformations at a time when it would be possible to work with our new IR.
  //  - One potential way to mitigate this would be to run normalize on the object we create in here so we don't have to set it up all the way.

  // TODO: Support item dynamic nesteds like - blah: 'vals[item.id]'

  var all_dynamic_element_list_refs = (function () {
    // Step 1: Find dynamic element lists
    // { containing_element_name: String, ref: DynamicElementListRefObject }[]
    var dynamic_element_list_refs = [];
    for (var element_name in element_scope_hash) {
      var element = element_scope_hash[element_name];
      var local_refs = element.localRefs;
      for (var i = 0; i < local_refs.length; ++i) {
        var local_ref = local_refs[i];
        if (local_ref.type === 'dynamicElementLists') {
          dynamic_element_list_refs.push({ containing_element_name: element.name, ref: local_ref });
        }
      }
    }
    return dynamic_element_list_refs;
  })();

  /**
   * @returns { containing_element_name: String, option_name: String, option: OptionObject, dynamic_element_list_ref: DyamicElementListRefObject, affected_parameters: { parameter_name: String, source_array_ref_expression: String }[] }[]
   */
  var impacted_dynamic_element_list_options = (function (all_dynamic_element_list_refs) {
    // Step 2: Find dynamic element list options that use "item" and/or indexed other array
    var dynamic_element_list_options_to_process = [];
    for (var i = 0; i < all_dynamic_element_list_refs.length; ++i) {
      var dynamic_element_list_entry = all_dynamic_element_list_refs[i];
      var dynamic_element_list_ref = dynamic_element_list_entry.ref;
      var dynamic_element_list_ref_options =  dynamic_element_list_ref.value.options;
      for (var option_name in dynamic_element_list_ref_options) {
        var option = dynamic_element_list_ref_options[option_name];
        var option_args = option.args;
        var option_affected_parameters = [];
        for (var option_arg_param_name in option_args) {
          var expression = option_args[option_arg_param_name];
          var source_array_ref_expression = '';
          var option_ref_nested_expression = '';

          var nested_expression_match;
          var source_array_name = dynamic_element_list_ref.value.model;

          var parts = [];
          var part = '';
          var char;
          var j;

          // Checks if 'item' reference is being used and replaces it with SOURCE_ARRAY_NAME[item_index]
          for (j = 0; j < expression.length; ++j) {
            char = expression[j];
            if (char === ']' || char === '[') {
              if (part) parts.push(part);
              part = '';
              parts.push(char);
            } else {
              part += char;
            }
          }
          if (part) parts.push(part);

          var output = new Array(parts.length);
          for (j = 0; j < parts.length; ++j) {
            part = parts[j];
            var part_nested_parts = part.split('.');
            if (part_nested_parts[0] === 'item') {
              output[j] = source_array_name + '[item_index]' + (part_nested_parts.length > 1 ? '.' + part_nested_parts.slice(1).join('.') : '');
            } else {
              output[j] = part;
            }
          }
          var option_arg_expression = output.join('');

          if (!/\[item_index\]/.test(option_arg_expression)) {
            continue;
          }

          var parameter_value;
          var wrapper_scope_parameters = {};

          parts = [];
          part = '';
          for (j = 0; j < option_arg_expression.length; ++j) {
            char = option_arg_expression[j];
            if (char === ']' || char === '[') {
              if (part) parts.push(part);
              part = '';
              parts.push(char);
            } else {
              part += char;
            }
          }
          if (part) parts.push(part);

          for (j = 0; j < parts.length; ++j) {
            part = parts[j];
            if (/^[0-9]+$/.test(part)) {
              continue;
            }
            if (part[0] !== '.' && part !== '[' && part !== ']') {
              var processed_part = '$$' + part;
              wrapper_scope_parameters[processed_part.split('.')[0]] = part.split('.')[0];
              parts[j] = processed_part;
            }
          }

          parameter_value = parts.join('');

          option_affected_parameters.push({
            parameter_name: option_arg_param_name,
            parameter_value: parameter_value,
            wrapper_scope_parameters: wrapper_scope_parameters
          });
        }

        if (option_affected_parameters.length) {
          dynamic_element_list_options_to_process.push({
            containing_element_name: dynamic_element_list_entry.containing_element_name,
            option_name: option_name,
            option: option,
            dynamic_element_list_ref: dynamic_element_list_ref,
            affected_parameters: option_affected_parameters
          });
        }
      }
    }
    return dynamic_element_list_options_to_process;
  })(all_dynamic_element_list_refs);

  (function (impacted_dynamic_element_list_options, element_scope_hash) {
    // Step 3: Generate wrapper scope

    for (var i = 0; i < impacted_dynamic_element_list_options.length; ++i) {
      var impacted_dynamic_element_list_option = impacted_dynamic_element_list_options[i];
      var wrapper_scope_name = 'ITEM_WRAPPER_' + impacted_dynamic_element_list_option.option.type + '__' + impacted_dynamic_element_list_option.containing_element_name + '__' + impacted_dynamic_element_list_option.dynamic_element_list_ref.name + '__' + impacted_dynamic_element_list_option.option_name;

      // Analyze the data

      var params_to_add_hash = {};
      var params_to_remove_hash = {};
      var element_args = {};
      var events_to_add_array = [];

      var j;
      var option_scope = element_scope_hash[impacted_dynamic_element_list_option.option.type];
      for (j = 0; j < option_scope.events.length; ++j) {
        var event = option_scope.events[j];
        var message_event_match = event.event.match(/^message (\w+)/);
        if (message_event_match) {
          events_to_add_array.push({
            event: event.event,
            type: '!inline',
            params: ['elem', 'args'],
            output: new Function('elem', 'args', 'elem.send.apply(elem, ['+JSON.stringify(message_event_match[1])+'].concat(args))'),
            args: { elem: 'elem', args: 'args' },
            parsed_params: [{ name: 'elem' }, { name: 'args' }]
          });
        }
      }

      for (j = 0; j < impacted_dynamic_element_list_option.affected_parameters.length; j++) {
        var affected_parameter = impacted_dynamic_element_list_option.affected_parameters[j];
        params_to_remove_hash[affected_parameter.parameter_name] = true;
        for (var wrapper_scope_parameter_name in affected_parameter.wrapper_scope_parameters) {
          params_to_add_hash[wrapper_scope_parameter_name] = affected_parameter.wrapper_scope_parameters[wrapper_scope_parameter_name];
        }

        element_args[affected_parameter.parameter_name] = affected_parameter.parameter_value;
      }

      var option_element = element_scope_hash[impacted_dynamic_element_list_option.option.type];

      // Determine work to be done based on previous analysis

      var jobs = [];

      for (var params_to_add_hash_name in params_to_add_hash) {
        jobs.push({ type: 'add_param', name: params_to_add_hash_name });
        jobs.push({ type: 'add_dynamic_element_list_option_arg', arg_name: params_to_add_hash_name, arg_expression: params_to_add_hash[params_to_add_hash_name] });
      }

      for (var param_to_remove_name in params_to_remove_hash) {
        jobs.push({ type: 'remove_dynamic_element_list_option_arg', arg_name: param_to_remove_name });
      }

      for (j = 0; j < option_element.params.length; ++j) {
        var option_element_param = option_element.params[j];
        if (option_element_param.name in params_to_remove_hash) {
          continue;
        }
        jobs.push({ type: 'add_param', name: option_element_param.name });
      }

      for (var element_arg_name in element_args) {
        jobs.push({ type: 'add_element_argument', argument_name: element_arg_name, argument_expression: element_args[element_arg_name] });
      }

      // Perform the work on a template wrapper scope

      var params = [];
      var elements = {
        elem: {
          type: impacted_dynamic_element_list_option.option.type,
          args: {}
        }
      };
      var local_refs = [];
      var local_refs_hash = {};
      var wrapper_scope = {
        name: wrapper_scope_name,
        parents: [{ type: 'element', name: impacted_dynamic_element_list_option.containing_element_name }],
        params: params,
        constants: {},
        models: {},
        events: events_to_add_array,
        shard: false,
        deps: [],
        variables: {},
        callbacks: {},
        elements: elements,
        dynamicElementLists: {},
        localRefs: local_refs,
        localRefsHash: local_refs_hash,
        view: '{{{elem}}}'
      };

      var element_local_ref = { type: 'elements', value: elements.elem, name: 'elem' };
      local_refs.push(element_local_ref);
      local_refs_hash.elem = element_local_ref;

      for (j = 0; j < jobs.length; ++j) {
        var job = jobs[j];
        if (job.type === 'add_param') {
          var param_value = { name: job.name };
          params.push(param_value);
          var param_local_ref = { type: 'params', name: job.name, value: param_value };
          local_refs.push(param_local_ref);
          local_refs_hash[job.name] = param_local_ref;
        } else if (job.type === 'add_element_argument') {
          elements.elem.args[job.argument_name] = job.argument_expression;
        } else if (job.type === 'remove_dynamic_element_list_option_arg') {
          delete impacted_dynamic_element_list_option.option.args[job.arg_name];
        } else if (job.type === 'add_dynamic_element_list_option_arg') {
          impacted_dynamic_element_list_option.option.args[job.arg_name] = job.arg_expression;
        }
      }

      element_scope_hash[impacted_dynamic_element_list_option.option.type].parents.push({ type: 'element', name: wrapper_scope_name });
      impacted_dynamic_element_list_option.option.type = wrapper_scope_name;
      element_scope_hash[wrapper_scope_name] = wrapper_scope;
    }
  })(impacted_dynamic_element_list_options, element_scope_hash);

  // Note that the wrapper scope methodology described above will naturally get cleaned up as part of scope inlining if the element is only used as a dynamic element list option
  // I don't care about duplicate wrapper scopes either at the moment

  return element_scope_hash;
}

module.exports = process_iterate_array_virtual_refs;
