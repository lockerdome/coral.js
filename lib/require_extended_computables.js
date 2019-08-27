"use strict";

var path = require('path');
var fs = require('fs');

function require_extended_computables (current_dirname, path_to_extended_computables) {
  return function () {
    var files = fs.readdirSync(path.join(current_dirname, path_to_extended_computables));
    for (var i = 0; i < files.length; i++) {
      var file_name = files[i];
      var file_path = path.join(current_dirname, path_to_extended_computables, file_name);
      var file_stat = fs.statSync(file_path);
      if (file_stat.isDirectory() || (file_stat.isFile() && /\.js$/.test(file_name))) {
        require(file_path);
      }
    }
  };
}

module.exports = require_extended_computables;
