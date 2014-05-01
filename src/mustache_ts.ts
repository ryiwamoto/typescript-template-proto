/// <reference path="./generator.ts" />
/// <reference path="./template_type_map.ts" />
/// <reference path="./parser.ts" />

var fs = require('fs');

module MustacheTS{
    var defaultLibs  = __dirname + "/../bin/lib.d.ts";
    var parser = new MustacheTS.Parser(defaultLibs);
    export function compile(templateName:string):string{
        var template = fs.readFileSync(templateName, {encoding: 'utf8'});
        var templateDir = templateName.split('/').slice(0, -1).join('/');
        return MustacheTS.generate(parser.parse(template, templateDir));
    }
}
module.exports = MustacheTS;
