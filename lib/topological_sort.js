"use strict";

module.exports = function (arr, getParents) {
  var result = [];
  var visited_nodes = {};
  function addNode(name) {
    if (visited_nodes[name] === 1) throw new Error('Cycle detected with '+name);
    if (visited_nodes[name] === 2) return;
    visited_nodes[name] = 1;
    var parents = getParents(name);
    for (var i = 0; i !== parents.length; ++i) {
      addNode(parents[i]);
    }
    visited_nodes[name] = 2;
    result.push(name);
  }
  for (var i = 0; i !== arr.length; ++i) {
    addNode(arr[i]);
  }
  return result;
};
