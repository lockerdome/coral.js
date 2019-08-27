"use strict";

var traverse = require('../../domeplates/traverse').traverse;
var parse_view = require('../../domeplates/parser');

var INNER_VIEW_SCOPE_BASE_NAME = '_inner_view_scope$';
var SCOPE_CONDITIONAL_ELEMENT_BASE_NAME = 'view_conditional_inner$';

// Traverse through the view and rewrite view conditionals to a special version of dynamic element lists.  There should be no view conditionals after this pass.
// * {{#if foo}}<div>foo</div>{{#endif}}
// To
// * {{{if$0}}}

// <div>{{#if foo}}<div>foo</div>{{#else}}<div>bar</div>{{#endif}}</div>
// * <div>
// * {{#if foo}} Enter Scope A
// * <div>foo</div>
// * {{#else}} Exit Scope A, Enter Scope B
// * <div>bar</div>
// * {{#endif}} Exit Scope B
// * </div>
//
// output
// Main Scope
// <div>{{if$0}}</div>
//
// Scope A
// <div>foo</div>
//
// Scope B
// <div>bar</div>
//
// {{#if foo}}<div>{{#if baz}}<div>foo</div>{{#endif}}</div>{{#endif}}
// * {{#if foo}} Enter Scope A
// * <div>
// * {{#if baz}} Enter Scope B
// * <div>foo</div>
// * {{#endif}} Exit Scope B
// * </div>
// * {{#endif}} Exit Scope A
//
// output
// <div>{{if$0}}</div>
//
// Scope A
// <div>{{if$0}}</div>
//
// Scope B
// <div>foo</div>

// TODO: break out this code, there is a pretty clearly reusable chunk of code here for handling view generation from the template ast.
/**
 * @param {Object} view_generation_context
 * @param {Object} node A view AST node
 * @returns {string} A string representation of the beginning of that node.
 */
function enter_template_ast_node_to_view (view_generation_context, node) {
  var output = '';

  switch (node.type) {
    case 'Tag':
      output += '<' + node.name;
      if (node.attributes.length) {
        output += ' ';
        view_generation_context.end_attribute = node.attributes[node.attributes.length - 1];
      } else {
        output += '>';
      }
      break;
    case 'Text':
      output += node.value;

      if (view_generation_context.is_tag_arg) {
        view_generation_context.is_tag_arg = false;
      }
      break;
    case 'Variable':
      // TODO: clean this up, easily done via context passed in
      var isLikelyConditionToken = !view_generation_context.is_tag_arg && (!node.token || !node.token.context);

      if (isLikelyConditionToken) {
        break;
      }

      output += '{{' + node.name + '}}';
      break;
    case 'TripleVariable':
      output += '{{{' + node.name + '}}}';
      break;
    case 'InlineTag':
      output += node.value;
      break;
    case 'ClassAttributeStatic':
    case 'ClassAttribute1':
    case 'ClassAttribute':
      output += 'class';
      if (node.value) {
        output += '="';
      }

      // TODO: Alter domeplates traverse to visit the text node in here.
      if (node.type === 'ClassAttributeStatic') {
        output += node.value.value;
      }

      break;
    case 'StyleAttribute':
      output += 'style';
      if (node.value && node.value.length) {
        output += '="';
      }
      break;
    case 'DataAttribute':
      output += 'data-'+node.name;
      if (node.value && node.value.length) {
        output += '="';
      }
      break;
    case 'Attribute':
      output += node.name;
      if (node.value && node.value.length) {
        output += '="';
      }
      break;
    case 'InnerText':
    case 'InnerTextStatic':
    case 'Template':
      break;
    default:
      throw new Error("Unhandled view node type "+node.type);
  }

  return output;
}

/**
 * @param {Object} view_generation_context
 * @param {Object} node A view AST node
 * @returns {string} A string representation of the end of that node.
 */
function exit_template_ast_node_to_view (view_generation_context, node) {
  var output = '';

  switch (node.type) {
    case 'Tag':
      if (node.subtype !== 'void') {
        output += '</' + node.name + '>';
      }
      break;
    case 'ClassAttributeStatic':
    case 'ClassAttribute1':
    case 'ClassAttribute':
    case 'StyleAttribute':
    case 'DataAttribute':
    case 'Attribute':
      if (node.value) {
        output += '"';
      }
      if (node === view_generation_context.end_attribute) {
        view_generation_context.end_attribute = null;
        output += '>';
      } else {
        output += ' ';
      }
      break;
    case 'Text':
    case 'Variable':
    case 'TripleVariable':
    case 'Template':
    case 'InlineTag':
    case 'InnerText':
    case 'InnerTextStatic':
      break;
    default:
      throw new Error("Unhandled view node type "+node.type);
  }

  if (view_generation_context.append_after) {
    output += view_generation_context.append_after;
    view_generation_context.append_after = undefined;
  }

  return output;
}

/**
 * @param {Object} template_ast
 * @returns {Array.<string>}
 */
function extract_template_reference_names (template_ast) {
  var variable_types = {
    Variable: true,
    TripleVariable: true
  };
  var used_template_variables = {};
  traverse(template_ast, function enter (node) {
    if (variable_types[node.type]) {
      var ref_name_first_part = node.name.split(/\.|\[/)[0];
        used_template_variables[ref_name_first_part] = node.type;
    }
  });

  var param_names_to_add = [];
  for (var var_name in used_template_variables) {
    param_names_to_add.push(var_name);
  }
  return param_names_to_add;
}

/**
 * @param {string} ref_path
 * @returns {?string}
 */
function extract_field_name(ref_path) {
  return ref_path && ref_path.split(/\[|\./)[0];
}

function has_view_conditionals (element) {
  var has_view_conditionals = false;
  traverse(element.template_ast, function enter (node) {
    if (node.type === 'IfStatement') {
      has_view_conditionals = true;
    }
  });
  return has_view_conditionals;
}

/**
 * @param {Object} element_hash
 * @returns {Object}
 */
function rewrite_view_conditionals (element_hash) {
  var updated_element_hash = {
    // TODO: make this less hacky
    __passthrough: element_hash.__passthrough
  };

  var inner_view_scope_counter = 0;
  var scope_conditional_element_count;

  for (var element_name in element_hash) {
    var element = element_hash[element_name];
    updated_element_hash[element.name] = element;

    var element_has_view_conditionals = has_view_conditionals(element);

    if (!element_has_view_conditionals) {
      continue;
    }

    /**
     * When we encounter nested view conditionals, create nested scopes.
     *
     * ENTER IfStatement (unshift top of scope stack, [element])
     * Scope A, parent element
     * ENTER Else
     * Scope B, parent element
     * ENTER IfStatement (unshift top of scope stack, [B, element])
     * Scope C, parent B
     * EXIT IfStatement (shift stack, [element])
     * Scope B, parent element
     * EXIT Else
     * Scope A, parent element
     * EXIT IfStatement
     */

    var scope_stack = [element];
    var condition_stack = [];
    var parent_scope_stack = [];

    var view_generation_context = {};
    var created_view_conditional_scopes = [];

    /**
     * The job queue exists to collect
     * declarative instructions as to what we want to do.
     * It is meant to keep ugly source
     * manipulation code separate from code
     * analyzing scopes.
     *
     * Note that a job can add jobs.
     *
     * The job queue processor will keep
     * processing jobs until the job queue is
     * empty.
     */
    var job_queue = [];

    scope_conditional_element_count = 0;

    element.view = '';
    // First pass: Build nested scopes from view conditionals.
    traverse(element.template_ast, enter, exit);

    var top_limit_element_name = element_name;

    while (job_queue.length) {
      var job = job_queue.shift();
      var i;
      switch (job.type) {
        case 'create_scope':
          var create_scope_name = job.args.name;
          var create_scope_parent = job.args.parent;

          var created_scope = {
            name: create_scope_name,
            parents: [{ name: create_scope_parent, type: 'element' }],
            params: [],
            constants: {},
            models: {},
            elements: {},
            view: '',
            events: [],
            variables: {},
            callbacks: {},
            dynamicElementLists: {},
            localRefs: [],
            localRefsHash: {}
          };

          updated_element_hash[create_scope_name] = created_scope;

          break;
        case 'finalize_view':
          var target_scope_name = job.args.target_scope_name;
          var target_scope = updated_element_hash[target_scope_name];

          target_scope.template_ast = parse_view(target_scope.view);
          var template_reference_names = extract_template_reference_names(target_scope.template_ast);
          for (i = 0; i < template_reference_names.length; ++i) {
            var template_reference_name = template_reference_names[i];
            if (SCOPE_CONDITIONAL_ELEMENT_BASE_NAME.match(template_reference_name)) {
              continue;
            }

            job_queue.unshift({
              type: 'add_param',
              args: {
                param_name: template_reference_name,
                target_scope_name: target_scope_name
              }
            });
          }
          break;
        case 'append_to_view':
          var view_chunk = job.args.view_chunk;

          if (!view_chunk) break;

          var target_element_scope = updated_element_hash[job.args.target_scope_name];
          target_element_scope.view += view_chunk;
          break;
        case 'expand_condition_chain':
          var containing_scope_name = job.args.containing_scope_name;
          var condition_chain = job.args.condition_chain;
          var view_conditional_element_name = job.args.view_conditional_element_name;
          var added_refs_in_parent = wire_in_scope(updated_element_hash[containing_scope_name], view_conditional_element_name, condition_chain, updated_element_hash.__passthrough, updated_element_hash);

          // Don't add parameters beyond the added inner scopes created by this process, let missing parameters in existing elements cause the compiler to blow up at a later stage.
          var is_added_view_conditional_scope = containing_scope_name !== top_limit_element_name;
          if (is_added_view_conditional_scope) {
            for (var j = 0; j < added_refs_in_parent.length; ++j) {
              var added_ref_name = added_refs_in_parent[j];
              job_queue.unshift({
                type: 'add_param',
                args: {
                  param_name: added_ref_name,
                  target_scope_name: containing_scope_name
                }
              });
            }
          }
          break;
        case 'add_param':
          var add_param_param_name = job.args.param_name.split(/\[|\./)[0];
          var add_param_target_scope_name = job.args.target_scope_name;
          var add_param_target_scope = updated_element_hash[add_param_target_scope_name];
          var has_param_ref = add_param_target_scope.localRefsHash[add_param_param_name];
          if (!has_param_ref) {
            add_param_target_scope.params.push({ name: add_param_param_name });
            var add_param_local_ref = {
              type: 'params',
              value: { name: add_param_param_name },
              name: add_param_param_name
            };
            add_param_target_scope.localRefs.push(add_param_local_ref);
            add_param_target_scope.localRefsHash[add_param_param_name] = add_param_local_ref;

            if (add_param_target_scope_name !== top_limit_element_name) {
              job_queue.unshift({
                type: 'add_param',
                args: {
                  param_name: add_param_param_name,
                  target_scope_name: add_param_target_scope.parents[0].name
                }
              });
            }
          }
          break;
      }
    }

    element.template_ast = parse_view(element.view);
  }

  return updated_element_hash;

  function enter (node) {
    if (node.type === 'IfStatement' ||
      node.type === 'ElseIfStatement' ||
      node.type === 'Else') {
      var scope_name = INNER_VIEW_SCOPE_BASE_NAME + inner_view_scope_counter;
      inner_view_scope_counter++;

      var parent_scope;
      if (node.type === 'IfStatement') {
        parent_scope = scope_stack[0];
        parent_scope_stack.unshift(parent_scope);
      } else {
        parent_scope = parent_scope_stack[0];
      }

      var scope = {
        name: scope_name,
        parent: parent_scope.name
      };

      job_queue.push({
        type: 'create_scope',
        args: {
          name: scope.name,
          parent: scope.parent
        }
      });

      scope_stack.unshift(scope);

      var condition_data = {
        type: node.type,
        condition: node.condition && node.condition.name,
        create_scope_name: scope_name
      };
      if (node.type === 'IfStatement') {
        condition_stack.unshift({
          conditions: [condition_data]
        });
      } else {
        condition_stack[0].conditions.push(condition_data);
      }
    } else {
      var current_scope = scope_stack[0];
      job_queue.push({
        type: 'append_to_view',
        args: {
          target_scope_name: current_scope.name,
          view_chunk: enter_template_ast_node_to_view(view_generation_context, node)
        }
      });
    }
  }

  function exit (node) {
    if (node.type === 'IfStatement' ||
      node.type === 'ElseIfStatement' ||
      node.type === 'Else') {
      var top_scope = scope_stack.shift();

      job_queue.push({
        type: 'finalize_view',
        args: {
          target_scope_name: top_scope.name
        }
      });

      if (node.type !== 'IfStatement') {
        return;
      }

      // Exiting an IfStatement means we are moving back up a level of nesting.
      parent_scope_stack.shift();

      var view_conditional_element_name = SCOPE_CONDITIONAL_ELEMENT_BASE_NAME+scope_conditional_element_count;
      scope_conditional_element_count++;

      job_queue.push({
        type: 'append_to_view',
        args: {
          target_scope_name: top_scope.parent,
          view_chunk: '{{{'+view_conditional_element_name+'}}}'
        }
      });

      var condition_chain = condition_stack.shift();
      job_queue.push({
        type: 'expand_condition_chain',
        args: {
          view_conditional_element_name: view_conditional_element_name,
          condition_chain: condition_chain,
          containing_scope_name: top_scope.parent
        }
      });

    } else if (scope_stack.length) {
      var current_scope = scope_stack[0];
      job_queue.push({
        type: 'append_to_view',
        args: {
          target_scope_name: current_scope.name,
          view_chunk: exit_template_ast_node_to_view(view_generation_context, node)
        }
      });
    } else {
      throw new Error("Ran into empty scope stack somehow");
    }
  }
}

// TODO: Not particularly happy with this taking in element_hash, also this could use some cleaning.
/**
 * @param {Object} parent_element
 * @param {string} view_conditional_element_name
 * @param {Array.<Object>} condition_chain
 * @param {Object} passthrough_scope
 * @param {Object} element_hash
 * @returns {Array.<string>} The references used here that will need to be added to the parent if not there presently.
 */
function wire_in_scope (parent_element, view_conditional_element_name, condition_chain, passthrough_scope, element_hash) {
  var ref_names_needed = [];

  var is_simple_if = condition_chain.conditions.length === 1;
  if (is_simple_if) {
    var single_if_condition = condition_chain.conditions[0];

    var option_args = {};
    var single_if_condition_scope = element_hash[single_if_condition.create_scope_name];
    single_if_condition_scope.params.forEach(function (param) {
      option_args[param.name] = param.name;
    });

    ref_names_needed = ref_names_needed.concat((single_if_condition_scope.params).map(function (param) { return param.name; })).concat([single_if_condition.condition]);

    parent_element.dynamicElementLists[view_conditional_element_name] = {
      showWhen: true,
      model: single_if_condition.condition,
      options: {
        onlyOption: {
          type: single_if_condition_scope.name,
          args: option_args
        }
      },
      identity: '',
      map: function (item) { return 'onlyOption'; }
    };

    var local_ref = {
      type: 'dynamicElementLists',
      name: view_conditional_element_name,
      value: parent_element.dynamicElementLists[view_conditional_element_name]
    };

    parent_element.localRefs.push(local_ref);
    parent_element.localRefsHash[view_conditional_element_name] = local_ref;
  } else {
    var conditions = condition_chain.conditions;
    var i;
    var options = {};

    // Add a passthrough Else if there is no Else condition currently.  This is to make sure that there is always a placement passed through.
    conditions = (function add_passthrough_else (conditions) {
      for (i = 0; i < conditions.length; i++) {
        var condition = conditions[i];
        if (condition.type === 'Else') {
          return conditions;
        }
      }

      return conditions.concat({
        type: 'Else',
        create_scope_name: passthrough_scope.name
      });
    })(conditions);

    // TODO: Rework to properly handle nested expressions and expressions in general
    var intermediate_function_params = [];
    var intermediate_function_body = 'return ';
    for (i = 0; i < conditions.length; i++) {
      var condition = conditions[i];
      var condition_option_name = i+'';
      var has_condition_to_check = condition.condition;
      var condition_name = condition.condition;
      if (has_condition_to_check) {
        var intermediate_variable = '$$condition_' + i;
        intermediate_function_params.push({ name: intermediate_variable, from: condition.condition, expression: intermediate_variable + ' /* from ' + condition.condition + ' */' });
        condition_name = intermediate_variable;
      }
      if ((i !== conditions.length - 1) && has_condition_to_check) {
        intermediate_function_body += condition_name+'?'+condition_option_name+':';
      } else {
        intermediate_function_body += condition_option_name;
      }

      var condition_option_args = {};
      var condition_scope = element_hash[condition.create_scope_name];
      for (var j = 0; j < condition_scope.params.length; ++j) {
        var param = condition_scope.params[j];
        condition_option_args[param.name] = param.name;
      }
      options[condition_option_name] = {
        type: condition_scope.name,
        args: condition_option_args
      };
    }

    var intermediate_function = Function.apply(null, intermediate_function_params.map(function (param) { return param.expression; }).concat([intermediate_function_body]));

    var intermediate_model_name = view_conditional_element_name + '_intermediate';
    var intermediate_function_args = {};
    intermediate_function_params.forEach(function (param) {
      intermediate_function_args[param.name] = param.from;
    });

    var intermediate_model = {
      type: '!inline',
      params: intermediate_function_params.map(function (param) { return param.name; }),
      args: intermediate_function_args,
      output: intermediate_function
    };
    parent_element.models[intermediate_model_name] = intermediate_model;
    var intermediate_model_local_ref = {
      type: 'models',
      value: intermediate_model,
      name: intermediate_model_name
    };

    parent_element.localRefsHash[intermediate_model_name] = intermediate_model_local_ref;
    parent_element.localRefs.push(intermediate_model_local_ref);

    parent_element.dynamicElementLists[view_conditional_element_name] = {
      polymorphic: true,
      model: intermediate_model_name,
      options: options,
      // TODO: Make it so you don't need to provide these (identity and map) for polymorphic scopes or come up with a better way to represent this, these make no sense as is and won't be used.
      identity: '',
      map: function (item) { return 'onlyOption'; }
    };

    var dynamic_element_list_local_ref = {
      type: 'dynamicElementLists',
      name: view_conditional_element_name,
      value: parent_element.dynamicElementLists[view_conditional_element_name]
    };

    parent_element.localRefs.push(dynamic_element_list_local_ref);
    parent_element.localRefsHash[view_conditional_element_name] = dynamic_element_list_local_ref;

    ref_names_needed = ref_names_needed.concat(intermediate_function_params.map(function (param) { return param.from; }));
  }

  return ref_names_needed;
}

module.exports = rewrite_view_conditionals;
