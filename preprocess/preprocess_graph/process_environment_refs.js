"use strict";

var topologically_sort_legacy_scope_hash = require('./topologically_sort_legacy_scope_hash');

function process_environment_refs(element_scope_hash, model_scope_hash) {
  var ordered_element_scopes;
  var ordered_model_scopes;

  ordered_element_scopes = topologically_sort_legacy_scope_hash(element_scope_hash, 'element').map(function (name) {
    return element_scope_hash[name];
  }).reverse();

  ordered_model_scopes = topologically_sort_legacy_scope_hash(model_scope_hash, 'model').map(function (name) {
    return model_scope_hash[name];
  }).reverse();

  var ordered_scopes = ordered_model_scopes.concat(ordered_element_scopes);

  // Scan from leaf nodes up to root nodes.
  for (var i = 0; i !== ordered_scopes.length; ++i) {
    var scope = ordered_scopes[i];
    ban_references_named_environment(scope);
    wireup_environment_nesteds_as_parameters(scope, element_scope_hash, model_scope_hash);
    add_environment_var_references(scope, element_scope_hash, model_scope_hash);
  }
}

function add_environment_var_references (scope_definition, element_scope_hash, model_scope_hash) {
  if (!scope_definition.environmentVars) {
    return;
  }

  for (var i = 0; i < scope_definition.environmentVars.length; ++i) {
    var environmentVar = scope_definition.environmentVars[i];

    if (!scope_definition.localRefsHash[environmentVar]) {
      throw new Error(scope_definition.name+' specifies environmentVar "' + environmentVar + '" but there is no reference named that in the scope.');
    }

    if (environmentVar === 'scope_data') {
      add_ref(scope_definition, {
        type: 'scope_data_marker',
        value: {
          params: ['scope_data'],
          args: { scope_data: 'scope_data' }
        },
        name: 'scope_data_marker'
      });
    }

    var j;
    var scope_name;
    var args;
    for (j = 0; j < scope_definition.localRefs.length; ++j) {
      var localRef = scope_definition.localRefs[j];
      var localRefValue = localRef.value;
      if (localRef.type === 'dynamicElementLists') {
        var options = localRef.value.options;
        for (var option_name in options) {
          var option_value = options[option_name];
          scope_name = option_value.type;
          args = option_value.args;
          wireup_environment_variable_arg(scope_name, args, environmentVar);
        }
      } else if (localRef.type === 'elements' || localRef.type === 'models') {
        scope_name = localRef.value.type;
        if (scope_name === '!inline') continue;
        args = localRef.value.args;
        wireup_environment_variable_arg(scope_name, args, environmentVar);
      }
    }

  }

  function wireup_environment_variable_arg (scope_name, args, environment_variable) {
    var intermediateEnvironmentVarRefName = 'environment$$' + environment_variable;
    var scope = element_scope_hash[scope_name] || model_scope_hash[scope_name];
    var intermediateEnvironmentVarRef = scope.localRefsHash[intermediateEnvironmentVarRefName];
    if (!intermediateEnvironmentVarRef || intermediateEnvironmentVarRef.type !== 'params') return;
    args[intermediateEnvironmentVarRefName] = environment_variable;
  }
}

function ban_references_named_environment (scope_definition) {
  var environment_ref = scope_definition.localRefsHash.environment;
  if (environment_ref) {
    throw new Error(scope_definition.name+" contains a reference named 'environment' which is a banned reference name as it represents the environment virtual compound.");
  }
}

function wireup_environment_nesteds_as_parameters (scope, element_scope_hash, model_scope_hash) {
  var localRefsUsingEnvironmentNested = [];

  var i;
  var arg_name;
  var arg_value;
  for (i = 0; i < scope.localRefs.length; ++i) {
    var localRef = scope.localRefs[i];
    var localRefValue = localRef.value;
    if (localRef.type === 'dynamicElementLists') {
      analyzeForEnvironmentUsage(localRef, 'model', localRef.value.model, localRef.value);

      var options = localRef.value.options;
      for (var option_name in options) {
        var option_value = options[option_name];
        for (arg_name in option_value.args) {
          arg_value = option_value.args[arg_name];
          analyzeForEnvironmentUsage(localRef, arg_name, arg_value, option_value.args);
        }
      }
    } else if (localRefValue && localRefValue.args) {
      for (arg_name in localRefValue.args) {
        arg_value = localRefValue.args[arg_name];
        analyzeForEnvironmentUsage(localRef,arg_name, arg_value, localRefValue.args);
      }
    }
  }

  for (i = 0; i < localRefsUsingEnvironmentNested.length; ++i) {
    var localRefUsingEnvironmentNested = localRefsUsingEnvironmentNested[i];

    var paramName = 'environment$$' + localRefUsingEnvironmentNested.first_nested;
    try {
      crawlUpwardForEnvironmentVar(scope, localRefUsingEnvironmentNested.first_nested, paramName, null, []);
    } catch (e) {
      var scopeType = scope.output ? 'model' : 'element';
      var environmentVarName = '"environment.' + localRefUsingEnvironmentNested.first_nested + (localRefUsingEnvironmentNested.remaining_nested ? '.' + localRefUsingEnvironmentNested.remaining_nested : '') + '"';
      e.message = 'Unable to find ' + environmentVarName + ' referenced in ' + localRefUsingEnvironmentNested.ref.type + ' "' + localRefUsingEnvironmentNested.ref.name + '" of ' + scopeType + ' named "' + scope.name + '".\n' + e.message;
      throw e;
    }

    var directly_contains_environment_var = scope.environmentVars && scope.environmentVars.indexOf(localRefUsingEnvironmentNested.first_nested) !== -1;
    localRefUsingEnvironmentNested.args_object[localRefUsingEnvironmentNested.arg_name] = (directly_contains_environment_var ? localRefUsingEnvironmentNested.first_nested : paramName) + (localRefUsingEnvironmentNested.remaining_nested ? '.' + localRefUsingEnvironmentNested.remaining_nested : '');
  }

  function analyzeForEnvironmentUsage (ref, argName, refNameUsed, argsObject) {
    if (refNameUsed === 'environment') {
      throw new Error(scope.name+" "+ref.type+" "+ref.name+" uses 'environment' directly which is not allowed.  Use an environment nested off of it instead.");
    }
    var environment_nested_match = refNameUsed.match(/^environment\.([^.]+)\.?(.+)?$/);
    if (environment_nested_match) {
      localRefsUsingEnvironmentNested.push({
        first_nested: environment_nested_match[1],
        remaining_nested: environment_nested_match[2],
        arg_name: argName,
        args_object: argsObject,
        ref: ref
      });
    }
  }

  function crawlUpwardForEnvironmentVar (crawlingScope, environmentVarName, paramName, lastScope, crawlPath) {
    var j;
    for (j = 0; j < crawlingScope.params.length; ++j) {
      var scopeParam = crawlingScope.params[j];
      var alreadyHasEnvironmentVarParam = scopeParam.name === paramName;
      if (alreadyHasEnvironmentVarParam) {
        return;
      }
    }

    if (crawlingScope.environmentVars && crawlingScope.environmentVars.indexOf(environmentVarName) !== -1) {
      return;
    }

    if (!crawlingScope.parents.length && crawlingScope.is_root) {
      var pathMessage = crawlPath.map(function (scopeName, index) {
        return (index + 1) + ": " + scopeName;
      }).join("\n");

      var crawlingScopeType = crawlingScope.output ? 'model' : 'element';
      throw new Error('       Make sure that "' + environmentVarName + '" is specified as an environmentVar for all paths from "' + crawlingScope.name + '" to "' + scope.name + '".\n');
    }

    for (j = 0; j < crawlingScope.parents.length; ++j) {
      var scopeParent = crawlingScope.parents[j];
      if (scopeParent.type === 'element') {
        crawlUpwardForEnvironmentVar(element_scope_hash[scopeParent.name], environmentVarName, paramName, crawlingScope, crawlPath.concat(crawlingScope.name));
      } else if (scopeParent.type === 'model') {
        crawlUpwardForEnvironmentVar(model_scope_hash[scopeParent.name], environmentVarName, paramName, crawlingScope, crawlPath.concat(crawlingScope.name));
      }
    }

    add_ref(crawlingScope, {
      type: 'params',
      value: {
        name: paramName
      },
      name: paramName
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

module.exports = process_environment_refs;
