"use strict";

var fs = require('fs');
var path = require('path');

function walkDirectory(rootPath, filterExtension, callback) {
  if ( isRelativePath(rootPath) ) {
    rootPath = path.join(process.cwd(), rootPath);
  }

  rootPath = path.normalize(rootPath);
  recursivelyWalkDirectory(rootPath);

  function recursivelyWalkDirectory(fullPath) {
    var stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      var filesInDirectory = fs.readdirSync(fullPath).sort();

      filesInDirectory.forEach( function(fileName) {
        recursivelyWalkDirectory( path.join(fullPath, fileName) );
      });
    }
    else if (matchesFilenameFilter(fullPath)) {
      callback( fileLocationObject(fullPath) );
    }
  }

  function matchesFilenameFilter(fullPath) {
    return (path.extname(fullPath) === filterExtension);
  }

  function fileLocationObject(fullPath) {
    var relativePath = fullPath.slice(rootPath.length+1); // +1 to remove lead slash to make it relative
    return {
      fullPath: fullPath,
      relativePath: relativePath,
      name: relativePath.slice(0, -1*filterExtension.length)
    };
  }

  function isRelativePath(thePath) {
    return (thePath[0] !== '/');
  }
}

module.exports = walkDirectory;
