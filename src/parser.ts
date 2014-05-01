///<reference path='generator.ts'/>

var Hogan = require('../node_modules/hogan.js/lib/compiler.js');

interface HoganToken{
    tag?: string;
    otag?:string;
    ctag?: string;
    i?: number;
    n?: string
    nodes: HoganToken[]
}

module MustacheTS{
    var referencePattern = /reference="([^"]+)"/;
    var contextTypePattern = /context:([\w.]+)/;


    export interface IVarInfoMap{
        getVariableByFullSymbol(fullSymbol: string): VarInfo;
        getVariableByScopeChain(name: string, scopeChain:MustacheTS.Scope[]):MustacheTS.VarInfo;
    }

    export class Scope{
        constructor(public symbol: string, public alias: string = null){}
    }

    export class Parser{
        private templateVarInfoMap: MustacheTS.TemplateVarInfoMap;
        private contextType: string;
        constructor(private defaultLibs: string){}

        //TODO: prepare hogan & hogan node typing
        public parse(template:string, baseDir:string): ITemplateContext{
            var tokens:HoganToken[] = Hogan.parse(Hogan.scan(template));

            var reference = this.getReference(tokens[0]);
            this.templateVarInfoMap = new MustacheTS.TemplateVarInfoMap(this.defaultLibs, baseDir + '/' + reference);

            //parse context type
            var contextType = this.getContextType(tokens[1]);
            this.contextType = contextType;

            //parse node
            return {
                contextType: contextType,
                nodes: this.toINode(tokens, [new MustacheTS.Scope(contextType)])
            };
        }


        static arrayCounter:number = 0;
        private getArrayItemName():string{
            return '__item_'+ (Parser.arrayCounter++);
        }

        private getReference(referenceToken):string{
            var referencedMatch: RegExpExecArray;
            if(referenceToken.tag !== '!' || !(referencedMatch = referencePattern.exec(referenceToken.n))){
                throw new Error('reference tag is not found.');
            }
            return referencedMatch[1];
        }

        private getContextType(contextTypeToken):string{
            var contextTypeMatch:RegExpExecArray;
            if(contextTypeToken.tag !== '!' || !(contextTypeMatch = contextTypePattern.exec(contextTypeToken.n))){
                throw new Error('context type tag is not found.');
            }
            return contextTypeMatch[1];
        }

        private toINode(tokens: HoganToken[], scopeChain:Scope[]): MustacheTS.INode[]{
            return tokens.map(t => {return this.parseNode(t, scopeChain)});
        }

        private parseNode(token:HoganToken, scopeChain: Scope[]):MustacheTS.INode{
            switch(token.tag){
                case '#':
                    return this.createArrayOrIfNode(token, scopeChain)
                case '^':
                    return this.createIFNode(token, scopeChain, true);
                case '_v':
                    return this.createEscapeVariableNode(token, scopeChain);
                case '{':
                case '&':
                    return this.createUnEscapeVariableNode(token, scopeChain);
                case undefined:
                    return this.createStringNode(token);
                case '\n':
                    return this.createStringNode('\\n');
                case '!' :
                    return this.createCommentNode(token);
                default:
                    throw Error('tag: ' + token.tag + ' is not supported.');
            }
        }

        private resolveName(symbol:string, scopeChain:Scope[]): MustacheTS.VarInfo{
            var variable = this.templateVarInfoMap.getVariableByScopeChain(symbol, scopeChain);
            if(!variable){
                throw new Error(symbol + ' is not found.');
            }
            //interface to context
            return new MustacheTS.VarInfo(
                variable.symbol,
                variable.typeInfo,
                variable.symbol.replace(this.contextType, 'context')
            );
        }

        private createArrayOrIfNode(token: HoganToken, scopeChain: Scope[]): MustacheTS.INode{
            var varInfo = this.resolveName(token.n, scopeChain);
            if(varInfo.typeInfo.type === MustacheTS.VarType.Boolean){
                return this.createIFNode(token, scopeChain, false);
            }else if(varInfo.typeInfo.type === MustacheTS.VarType.Array){
                return this.createArrayNode(token, scopeChain, varInfo);
            }else{
                throw new Error(varInfo.symbol + ' is not boolean or Array but '+ varInfo.typeInfo.type + '(# tag)');
            }
        }

        private createArrayNode(token: HoganToken, scopeChain: Scope[], varInfo: MustacheTS.VarInfo): MustacheTS.INode{
            var itemName = this.getArrayItemName();
            return {
                symbol: varInfo.alias,
                alias:itemName,
                nodeType: MustacheTS.NodeType.ArrayLoop,
                varType: MustacheTS.VarType.Array,
                childNodes: this.toINode(token.nodes, scopeChain.concat(new Scope(varInfo.symbol, itemName)))
            };
        }

        private createIFNode(token: HoganToken, scopeChain: Scope[], isInverted: boolean): MustacheTS.INode{
            var varInfo = this.resolveName(token.n, scopeChain);
            if(varInfo.typeInfo.type !== MustacheTS.VarType.Boolean){
                throw new Error(varInfo.symbol + ' is not boolean but '+ varInfo.typeInfo.type);
            }
            return {
                symbol: varInfo.alias,
                nodeType: isInverted ? MustacheTS.NodeType.Unless : MustacheTS.NodeType.If,
                varType: MustacheTS.VarType.Boolean,
                childNodes: this.toINode(token.nodes, scopeChain)
            };
        }

        private createEscapeVariableNode(token: HoganToken, scopeChain: Scope[]): MustacheTS.INode{
            var varInfo = this.resolveName(token.n, scopeChain);
            if(varInfo.typeInfo.type !== MustacheTS.VarType.String && varInfo.typeInfo.type !== MustacheTS.VarType.Number){
                throw new Error(varInfo.symbol + ' is not string or number but '+ MustacheTS.VarType[varInfo.typeInfo.type]);
            }
            return {
                symbol: varInfo.alias,
                nodeType: MustacheTS.NodeType.EscapeVariable,
                varType: varInfo.typeInfo.type,
                childNodes: []
            };
        }

        private createUnEscapeVariableNode(token: HoganToken, scopeChain: Scope[]): MustacheTS.INode{
            var varInfo = this.resolveName(token.n, scopeChain);
            return {
                symbol: varInfo.alias,
                nodeType: MustacheTS.NodeType.UnEscapeVariable,
                varType: varInfo.typeInfo.type,
                childNodes: []
            };
        }

        private createStringNode(value: any): MustacheTS.INode{
            return {
                symbol: null,
                nodeValue: value,
                nodeType: MustacheTS.NodeType.String,
                varType: MustacheTS.VarType.String,
                childNodes: []
            };
        }

        private createCommentNode(token:HoganToken): MustacheTS.INode{
            return {
                symbol: null,
                nodeValue: token.n,
                nodeType: MustacheTS.NodeType.Comment,
                varType: MustacheTS.VarType.String,
                childNodes: []
            };
        }
    }
}