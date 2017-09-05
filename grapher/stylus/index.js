var _             = require('lodash');
var fs            = require('fs');
var Stylus        = require('stylus');
var Path          = require('path');
var dirname       = Path.dirname;

require('./visitor');

module.exports.getDependencies = function(path){
  importedFiles = [];

  var basePath  = dirname(path);
  var contents  = fs.readFileSync(path, "utf8");
  evaluator = new Stylus.Evaluator('', {paths: [basePath]});
  parser    = new Stylus.Parser(contents, { cache: false });
  exp       = parser.parse();

  evaluator.visit(exp);
  return _.uniq(importedFiles);
}
