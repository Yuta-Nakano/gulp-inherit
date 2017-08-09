var _             = require('lodash');
var fs            = require('fs');
var Stylus        = require('stylus');
var Path          = require('path');
var dirname       = Path.dirname;

require('./visitor');

module.exports.getDependencies = function(path){
  importedFiles = [];

  /**
   * `file` and return Block node.
   *
   * @api private
   */
  function importFile(node, file, literal) {
    var importStack = this.importStack
      // , Parser = require('../parser')
      , Parser = Stylus.Parser
      , stat;

    // Handling the `require`
    if (node.once) {
      if (this.requireHistory[file]) return nodes.null;
      this.requireHistory[file] = true;

      if (literal && !this.includeCSS) {
        return node;
      }
    }

    // Avoid overflows from importing the same file over again
    if (~importStack.indexOf(file))
      throw new Error('import loop has been found');

    var str = fs.readFileSync(file, 'utf8');

    // shortcut for empty files
    if (!str.trim()) return Stylus.nodes.null;

    // Expose imports
    node.path = file;
    node.dirname = dirname(file);
    // Store the modified time
    stat = fs.statSync(file);
    node.mtime = stat.mtime;
    this.paths.push(node.dirname);

    if (this.options._imports) this.options._imports.push(node.clone());

    // Parse the file
    importStack.push(file);
    Stylus.nodes.filename = file;

    if (literal) {
      literal = new Stylus.nodes.Literal(str.replace(/\r\n?/g, '\n'));
      literal.lineno = literal.column = 1;
      if (!this.resolveURL) return literal;
    }

    // parse
    var block = new Stylus.nodes.Block
      , parser = new Stylus.Parser(str, Stylus.utils.merge({ root: block }, this.options));

    try {
      block = parser.parse();
    } catch (err) {
      var line = parser.lexer.lineno
        , column = parser.lexer.column;

      if (literal && this.includeCSS && this.resolveURL) {
        this.warn('ParseError: ' + file + ':' + line + ':' + column + '. This file included as-is');
        return literal;
      } else {
        err.filename = file;
        err.lineno = line;
        err.column = column;
        err.input = str;
        throw err;
      }
    }

    // Evaluate imported "root"
    block = block.clone(this.currentBlock);
    block.parent = this.currentBlock;
    block.scope = false;
    var ret = this.visit(block);
    importStack.pop();
    if (!this.resolveURL || this.resolveURL.nocheck) this.paths.pop();

    return ret;
  }

  /**
   * Visit Import.
   */
  Stylus.Evaluator.prototype.visitImport = function(imported){
    this.return++;

    var path = this.visit(imported.path).first
      , nodeName = imported.once ? 'require' : 'import'
      , found
      , literal;

    this.return--;
    debug('import %s', path);

    // url() passed
    if ('url' == path.name) {
      if (imported.once) throw new Error('You cannot @require a url');

      return imported;
    }

    // Ensure string
    if (!path.string) throw new Error('@' + nodeName + ' string expected');

    var name = path = path.string;

    // Absolute URL or hash
    if (/(?:url\s*\(\s*)?['"]?(?:#|(?:https?:)?\/\/)/i.test(path)) {
      if (imported.once) throw new Error('You cannot @require a url');
      return imported;
    }

    // Literal
    if (/\.css(?:"|$)/.test(path)) {
      literal = true;
      if (!imported.once && !this.includeCSS) {
        return imported;
      }
    }

    // support optional .styl
    if (!literal && !/\.styl$/i.test(path)) path += '.styl';

    // Lookup
    found = Stylus.utils.find(path, this.paths, this.filename);
    if (!found) {
      found = Stylus.utils.lookupIndex(name, this.paths, this.filename);
    }

    // Throw if import failed
    if (!found) throw new Error('failed to locate @' + nodeName + ' file ' + path);

    // Add dependencies
    importedFiles.push(found);

    var block = new Stylus.nodes.Block;

    for (var i = 0, len = found.length; i < len; ++i) {
      block.push(importFile.call(this, imported, found[i], literal));
    }

    return block;
  };


  var basePath  = dirname(path);
  var contents  = fs.readFileSync(path, "utf8");
  var evaluator = new Stylus.Evaluator('', {paths: [basePath]});
  var parser    = new Stylus.Parser(contents);
  var exp       = parser.parse();

  evaluator.visit(exp)
  return _.uniq(importedFiles);
}
