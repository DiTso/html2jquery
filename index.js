"use strict";

var htmlparser = require('htmlparser2');

var trim = (function () {
    var rgxltrim = /^\s+/g;
    var tgxrtrim = /\s+$/g;
    return function (str) {
        if (!str) return '';
        return str.replace(rgxltrim, '').replace(tgxrtrim, '');
    };
})();

var literal = (function () {
    var rgxnumber = /^\-?\d+(\.\d+)?$/;
    var rgxslash1 = /[\\"]/g;
    var rgxslash2 = /\u0000/g;
    return function (raw) {
        raw = trim(raw);
        var esc = raw.replace(rgxslash1, '\\$&').replace(rgxslash2, '\\0');
        if (esc.match(rgxnumber)) {
            return esc;
        } else if (~esc.indexOf("'") || ~esc.indexOf("\\")) {
            return '"' + esc + '"';
        } else {
            return "'" + raw + "'";
        }
    };
})();


function CodeBuilder(tree) {
    this.tabs = '';
    this.code = '';
    this.dig(tree);
}
CodeBuilder.prototype = {
    dig: function (tree) {
        this.code += this.tabs;
        this.code += "$('<" + tree.name + ">')";
        var pattr = this.parseAttr(tree.attr);
        this.printClass(pattr['class']);
        this.printAttr(pattr.attr);
        this.printStyle(pattr.style);
        this.printOn(pattr.on);
        this.printChildren(tree.children);
    },
    parseAttr: function (attr) {
        var result = {
            'style': attr.style,
            'class': attr['class'],
            'attr': {},
            'on': {}
        };
        delete attr.style;
        delete attr['class'];
        for (var name in attr) {
            if (name.substr(0, 2).toLowerCase() === 'on') {
                result.on[name.substr(2)] = attr[name];
            } else {
                result.attr[name] = attr[name];
            }
        }
        return result;
    },
    printClass: function(klass) {
        if (!klass) return;
        this.code += '.addClass(' + literal(klass) + ')';
    },
    printAttr: function (attr) {
        var lines = [];
        for (var name in attr) {
            lines.push(literal(name) + ': ' + literal(attr[name]));
        }

        if (lines.length === 0) return;
        this.code += ".attr({\n";
        this.code += this.tabs + "\t" + lines.join(",\n" + this.tabs + "\t") + "\n";
        this.code += this.tabs + '})';
    },
    printStyle: function (style) {
        if (!style) return;
        var defs = style.split(';');
        var lines = [];
        for (var i = 0, ii = defs.length; i < ii; i++) {
            var pair = defs[i].split(':');
            if (pair.length != 2) continue;
            lines.push(literal(pair[0]) + ': ' + literal(pair[1]));
        }

        if (lines.length === 0) return;
        this.code += ".css({\n";
        this.code += this.tabs + "\t" + lines.join(",\n" + this.tabs + "\t") + "\n";
        this.code += this.tabs + '})';
    },
    printOn: function (on) {
        for (var name in on) {
            this.code += ".on(" + literal(name) + ", function() {\n";
            this.code += this.tabs + "\t" + on[name] + "\n";
            this.code += this.tabs + '})';
        }
    },
    printChildren: function (children) {
        var ptabs = this.tabs;
        this.tabs += "\t";
        for (var i = 0, ii = children.length; i < ii; i++) {
            if (typeof children[i] === 'object') {
                this.code += ".append(\n";
                this.dig(children[i]);
                this.code += "\n" + ptabs + ")";
            } else if (ii == 1) {
                this.code += ".append(" + literal(children[i]) + ')';
            } else {
                this.code += ".append(\n" + this.tabs + literal(children[i]) + "\n" + ptabs + ")";
            }
        }
        this.tabs = ptabs;
    }
};


function ParserParser() {
    this.cursor = this.tree = [];
    this.history = [];
}
ParserParser.prototype = {
    onopentag: function (name, attr) {
        this.history.push(this.cursor);
        this.cursor.push({
            name: name,
            attr: attr,
            children: (this.cursor = [])
        });
    },
    ontext: function (text) {
        text = trim(text);
        text && this.cursor.push(text);
    },
    onclosetag: function () {
        this.cursor = this.history.pop();
    }
};


module.exports = function (html) {
    var pp = new ParserParser();
    var parser = new htmlparser.Parser(pp);
    parser.write(html);
    parser.end();

    var result = [];
    for (var i = 0, ii = pp.tree.length; i < ii; i++) {
        if (typeof pp.tree[i] === 'object') {
            result.push(new CodeBuilder(pp.tree[i]).code);
        } else {
            result.push(literal(pp.tree[i]));
        }
    }
    return result;
};