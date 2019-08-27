"use strict";

var ScopeDependency = require('../../ir/computables/scope_dependency');
var IRAnyType = require('../../ir/types/any');

/**
 * Move all scope dependencies upwards to their shard_root
 */
function process_ir(scope_data) {
  var name, scope;

  // This loop is only needed if root_elements are not marked as shard_roots.
  for (name in scope_data.root_element_scopes) {
    scope = scope_data.root_element_scopes[name];
    if (!scope.is_shard_root()) {
      gather_dependencies(scope);
    }
  }
  for (name in scope_data.element_scopes) {
    scope = scope_data.element_scopes[name];
    if (scope.is_shard_root()) {
      gather_dependencies(scope);
    }
  }

  var pushed_deps = 0;
  for (name in scope_data.element_scopes) {
    scope = scope_data.element_scopes[name];
    if (!scope.is_shard_root() && !scope_data.root_element_scopes[name]) {
      var deps = get_scope_dependencies(scope_data.element_scopes[name]);
      for (var i = 0; i < deps.length; i++) {
        deps[i].destroy();
        pushed_deps++;
      }
    }
  }

  if (pushed_deps) {
    var pluralized = pushed_deps > 1 ? 'dependencies.' : 'dependency.';
    console.log('Moved', pushed_deps, 'scope', pluralized);
  }

  return scope_data;
}

/**
 * @param {Scope} scope The shard root to assign all dependencies to
 */
function gather_dependencies (scope) {
  var children_deps = get_children_deps(scope);
  var scope_dep_urls = get_scope_dependencies(scope).map(function (dep) {
    return dep.get_url();
  });

  for (var url in children_deps) {
    if (scope_dep_urls.indexOf(url) === -1) {
      var dep = children_deps[url];
      dep.clone([], scope);
    }
  }
}

/**
 * @param {Scope} shard_root The scope whose references must be followed
 * @return {object} Children dependencies hashed by url
 */
function get_children_deps (shard_root) {
  var deps = {};
  var seen = {};
  var left = [shard_root];

  var curr, i;
  /* jshint -W084 */
  while (curr = left.pop()) {
    var id = curr.get_identity();
    if (seen[id]) continue;
    else seen[id] = true;

    var dependencies = get_scope_dependencies(curr);
    for (i = 0; i < dependencies.length; i++) {
      var dependency = dependencies[i];
      var url = dependency.get_url();
      if (!deps[url]) {
        deps[url] = dependency;
      }
    }
    for (i = 0; i < curr.get_referenced_scope_count(); i++) {
      var referenced = curr.get_referenced_scope(i);
      if (!referenced.is_shard_root()) {
        left.push(referenced);
      }
    }
  }
  return deps;
}

/**
 * @param {Scope} scope
 * @returns {Array.<ScopeDependency>}
 */
function get_scope_dependencies (scope) {
  var dependencies = [];
  for (var i = 0; i < scope.get_computable_count(); i++) {
    var computable = scope.get_computable(i);
    if (computable instanceof ScopeDependency) {
      dependencies.push(computable);
    }
  }
  return dependencies;
}

module.exports = process_ir;
