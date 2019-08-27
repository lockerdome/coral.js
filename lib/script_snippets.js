"use strict";

function ScriptSnippets () {
  this.entryPointFuncParameters = [];
  this.entryPointFuncContextKeys = [];
  this.entryPointFuncContextCacheKeys = [];
  this.appGlobalVars = [];
  this.entryPointFuncBodyLines = [];
}

ScriptSnippets.prototype.addEntryPointFuncParameters = function (arrayOfStringsToAdd) {
  this.addTo('entryPointFuncParameters', arrayOfStringsToAdd);
};

ScriptSnippets.prototype.addEntryPointFuncContextKeys = function (arrayOfStringsToAdd) {
  this.addTo('entryPointFuncContextKeys', arrayOfStringsToAdd);
};

ScriptSnippets.prototype.addEntryPointFuncContextCacheKeys = function (arrayOfStringsToAdd) {
  this.addTo('entryPointFuncContextCacheKeys', arrayOfStringsToAdd);
};

ScriptSnippets.prototype.addGlobalVarLines = function(arrayOfStringsToAdd) {
  this.addTo('appGlobalVars', arrayOfStringsToAdd);
};

ScriptSnippets.prototype.addentryPointFuncBodyLines = function (arrayOfStringsToAdd) {
  this.addTo('entryPointFuncBodyLines', arrayOfStringsToAdd);
};

ScriptSnippets.prototype.addTo = function (snippetName, arrayOfStringsToAdd) {
  if (!Array.isArray(arrayOfStringsToAdd)) throw new Error('Must pass an Array to addTo function for ' + snippetName + '.');
  this[snippetName] = this[snippetName].concat(arrayOfStringsToAdd);
};

module.exports = ScriptSnippets;
