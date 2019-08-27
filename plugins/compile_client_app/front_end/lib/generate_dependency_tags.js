"use strict";

module.exports = function (deps, registry) {
  var tags = '';

  for (var name in deps) {
    var deps_loaded = [name];
    var dep = deps[name];
    if (registry[name]) {
      continue;
    }

    registry[name] = true;
    if (dep.implied_shards) {
      for (var i = 0; i < dep.implied_shards.length; ++i) {
        registry[dep.implied_shards[i]] = true;
      }
    }

    if (dep.type === "javascript") {
      tags += "<script src='"+name+"'></script>";
    } else {
      tags += "<link rel='stylesheet' type='text/css' href='"+name+"'></link>";
    }
  }

  return tags;
};
