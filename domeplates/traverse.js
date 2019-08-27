"use strict";

var notify = require('./notify');
var inline_element = require('./inline_element');

var variable_types = {
  Variable: true,
  TripleVariable: true
};

function traverse(ast, enter, leave) {
  enter(ast);
  switch (ast.type) {
    case 'Template':
      traverse_list(ast.children, enter, leave);
      break;
    case 'Tag':
      traverse_list(ast.attributes, enter, leave);
      traverse_list(ast.children, enter, leave);
      break;
    case 'ClassAttribute1':
    case 'InnerTextStatic':
      traverse(ast.value, enter, leave);
      break;
    case 'ClassAttribute':
    case 'InnerText':
    case 'StyleAttribute':
    case 'Attribute':
    case 'DataAttribute':
      traverse_list(ast.value, enter, leave);
      break;
    case 'IfStatement':
    case 'ElseIfStatement':
      traverse(ast.condition, enter, leave);
      traverse_list(ast.consequent, enter, leave);
      if (ast.alternate) traverse(ast.alternate, enter, leave);
      break;
    case 'Else':
      traverse_list(ast.children, enter, leave);
      break;
  }
  if (leave) leave(ast);
}

function traverse_list(nodes, enter, leave) {
  for (var i = 0; i !== nodes.length; ++i) {
    traverse(nodes[i], enter, leave);
  }
}

function collapse_template(ast) {
  var element_stack = [];
  var cur_element = null;
  var dirties_scope = {
    IfStatement: true,
    Variable: true,
    TripleVariable: true
  };
  var element_types = {
    Tag: true
  };
  traverse(ast, function (node) {
    if (element_types[node.type]) {
      element_stack.push({ dirty: false, node: node });
    } else if (dirties_scope[node.type]) {
      for (var i = 0; i !== element_stack.length; ++i) {
        element_stack[i].dirty = true;
      }
    }
  }, function (node) {
    if (element_types[node.type]) {
      var elem = element_stack.pop();
      if (!elem.dirty) {
        node.value = inline_element(node);
        node.type = 'InlineTag';
      }
      module.exports.count++;
    }
  });
}

module.exports = {
  collapse_template: collapse_template,
  traverse: traverse
};
