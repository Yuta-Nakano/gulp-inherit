debug = typeof debug != "undefined" ? debug : function(){};

var Path          = require('path');
var Stylus        = require('stylus');
var fs            = require('fs');
var dirname       = Path.dirname;

importedFiles       = module.exports.importedFiles = [];
