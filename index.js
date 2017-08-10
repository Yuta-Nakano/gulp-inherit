/*!
 * gulp-inherit
 * Copyright (c) Yuta Nakano
 * MIT Licensed
 */

'use strict'
var through     = require('through2')
var fs          = require('fs')
var _           = require('lodash');
var extname     = require('path').extname;
var normalize   = require('normalize-path');
var pugGraph    = require('./grapher/pug');
var stylusGraph = require('./grapher/stylus');

// TODO: 17/06/27 To sort out later.
// @lib
var _lib = {};
_lib.isFileExist = function (file) {
  try {
    fs.statSync(file);
    return true;
  } catch(err) {
    if(err.code === 'ENOENT') {
      new PluginError('gulp-inherit', err.code);
      return false;
    }
  }
};

_lib.isset = function (string) {
  if (typeof string === 'string') {
    return string.replace(/ /g, '').length > 0;
  } else {
    return !(typeof string === 'undefined' || string === null);
  }
};

// TODO: 17/06/27 To sort out later.
// @local
var _Error = function (err) {
  return new PluginError('gulp-inherit', err);
}

var _regex = function(o) {
  var a = '.*';
  var r = [];
  o = o||{};

  if (!o || !o.extension || !o.exclude) {
    return false;
  }

  if (!_.isString(o.exclude) && !_.isArray(o.exclude)) {
    throw new Error('Type of exclude options that are not available has been specified.');
  }
  else if (!_.isString(o.extension) && !_.isArray(o.extension)) {
    throw new Error('Type of extension options that are not available has been specified.');
  }

  r = [
    _.isArray(o.exclude)? o.exclude.join('|') : o.exclude,
    _.isArray(o.extension)? o.extension.join('|') : o.extension
  ];

  return new RegExp(`(${r[0]})` + a + `(${r[1]})`, 'g');
};

exports = module.exports = init;

function init(file, options) {
  // options = {
  //   extension: @Array||@String,
  //   exclude:   @Array||@String,
  // }
  file = file||null;
  var opts = _.assign({}, options);
  var grapher;
  var _exp = function(p) {
    return normalize(p).match(_regex(opts));
  }

  if (_lib.isset(file) && _lib.isFileExist(file)) {

    switch (true) {
      case extname(file) == '.styl':
        grapher = stylusGraph;
        break;
      case extname(file) == '.pug':
        grapher = pugGraph;
        break;
    }

    if ( _regex(opts) && _exp(file) ) {
      // console.log('#dependencies file return;');
      return through.obj(function(_file, enc, cb) {
        var _dependencies = [];

        if (_file.isStream()) {
          return cb(_Error('Streaming not supported'));
        }

        if (_file.path === file) {
          if (!opts.extension.includes(extname(_file.path)) && _regex(opts) && !_exp(_file.path)) {
            return cb(null, _file);
          }
          else {
            return cb(null);
          }
        }

        if (_lib.isset(_file)) {
          _dependencies = grapher.getDependencies(_file.path);
          _dependencies = _.flattenDeep(_dependencies);
          _dependencies.forEach(function(value, index) {
            _dependencies[index] = normalize(value);
          });
          if (_dependencies.includes(normalize(file)) && _regex(opts) && !_exp(_file.path)) {
            return cb(null, _file);
          }
        }

        return cb(null);
      });
    }

    else {
      // console.log('#sigle file return;');
      return through.obj(function(_file, enc, cb) {

        if (_file.isStream()) {
          return cb(_Error('Streaming not supported'));
        }

        if (_file.path !== file) {
          return cb(null);
        }

        return cb(null, _file);
      });

    }

  }
  else {
    // console.log('#build return;');
    return through.obj(function(_file, enc, cb) {

      if (_file.isStream()) {
        return cb(_Error('Streaming not supported'));
      }

      if (_regex(opts) && _exp(_file.path)) {
        return cb(null);
      }

      return cb(null, _file);
    })
  }
}

