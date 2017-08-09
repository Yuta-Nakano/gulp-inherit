var _             = require('lodash');
var fs            = require('fs');
var pug           = require('pug');
var Path          = require('path');
var relative      = Path.relative;
var resolve       = Path.resolve;

require('./visitor');

module.exports.getDependencies = function(path){
  importedFiles = [];
  var relPath  = relative(process.cwd(), path);
  var contents  = fs.readFileSync(path, "utf8");
  var exp = new pug.compileClientWithDependenciesTracked(contents, {filename: relPath}).dependencies;

  this.visit(exp);
  return _.uniq(importedFiles);
}

module.exports.visit = function(files) {
  for (var i = 0; i < files.length; i++) {
    files[i] = resolve(files[i]);
    importedFiles.push(files[i]);
  }
}
