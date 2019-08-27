"use strict";

var estraverse = require('estraverse');

function find_function_refs (ast, available_refs) {
  var required_available_refs = {}; 

  var cur_scope = Object.create({});
  var scopes = [cur_scope];
  estraverse.traverse(ast, { enter: scan_for_declared_refs,  leave: set_current_scope });
  estraverse.traverse(ast, { enter: evaluate_remaining_refs, leave: set_current_scope });

  // Attach 'var' and 'function' declaration names to their respective scopes.
  function scan_for_declared_refs (node, parent) {
    switch (node.type) {
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'CatchClause':
      if (node.type === 'FunctionDeclaration') cur_scope[node.id.name] = true;
      cur_scope = Object.create(cur_scope);
      cur_scope.__catchClause__ = node.type === 'CatchClause';
      scopes.push(cur_scope);
      node.scope = cur_scope;
      break;
    case 'VariableDeclarator':
      cur_scope[node.id.name] = true;
      if (cur_scope.__catchClause__) {
        scopes[scopes.indexOf(cur_scope) - 1][node.id.name] = true;
      }
    }
  }

  function evaluate_remaining_refs (node, parent) {
    switch (node.type) {
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'CatchClause':
      cur_scope = node.scope;
      scopes.push(cur_scope);
      if (node.type === 'FunctionExpression' && node.id) cur_scope[node.id.name] = true;
      var params = node.type === 'CatchClause' ? [node.param] : node.params;
      for (var i = 0; i < params.length; i++) {
        cur_scope[params[i].name] = true;
      }
      break;
    case 'Identifier':
      if (parent.type === 'MemberExpression' && parent.computed === false && parent.property === node) return;
      if (parent.type === 'Property' && parent.key === node) return;
      if (parent.operator === 'typeof' && parent.argument === node) return;
      if (!cur_scope[node.name]) {
        if (available_refs[node.name] && !required_available_refs[node.name]) {
          required_available_refs[node.name] = true;
        }
      }
    }
  }

  function set_current_scope (node, parent) {
    if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration' || node.type === 'CatchClause') {
      var scope = scopes.pop();
      cur_scope = scopes[scopes.length - 1];
    }
  }

  return Object.keys(required_available_refs);
}

module.exports = find_function_refs;
