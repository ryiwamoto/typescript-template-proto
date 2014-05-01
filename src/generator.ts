module MustacheTS{
    export enum VarType{
        Number,
        String,
        Boolean,
        Array,
        Function,
        Other
    }

    export class TypeInfo{
        constructor(public type:VarType, public sub:TypeInfo){}
    }

    export class VarInfo{
        constructor(
            public symbol:string,
            public typeInfo:TypeInfo,
            public alias:string = ''
        ){}
    }

    export enum NodeType{
        If,
        Unless,
        Comment,
        ArrayLoop,
        EscapeVariable,
        UnEscapeVariable,//{{{variable}}} {{& variable}}
        String
    }

    export interface INode{
        symbol: string;
        alias?:string;
        nodeValue?: string;
        varType: VarType;
        nodeType: NodeType;
        childNodes: INode[];
    }

    export interface ITemplateContext{
        contextType: string;
        nodes: INode[];
    }

    export function generate(templateContext: ITemplateContext): string{
        return generateInit(templateContext.contextType, templateContext.nodes.map(function(node){
            return walk(node);
        }).filter(b => {return !!b}).join(';'));
    }

    function generateInit(contextType: string, code:string):string{
        return 'new MustacheTS.Template<'+contextType+'>(function(context){var _ = this;'+code+'});';
    }

    function walk(node: INode): string{
        switch(node.nodeType){
            case NodeType.If:
                return generateCondition(node, false);
            case NodeType.Unless:
                return generateCondition(node, true);
            case NodeType.EscapeVariable:
                return generateEscapeValue(node);
            case NodeType.UnEscapeVariable:
                return generateUnEscapeValue(node);
            case NodeType.ArrayLoop:
                return generateArrayLoop(node);
            case NodeType.String:
                return generateString(node);
            case NodeType.Comment:
                return '';
        }
    }

    function generateCondition(node: INode, isInverted: boolean): string{
        var buffer:string = '';
        buffer += 'if('+(isInverted ? '!' : '') + node.symbol + '){';
        buffer += node.childNodes.map(function(childNode){
            return walk(childNode);
        }).join(';');
        buffer += '}';
        return buffer;
    }

    //deny if symbol isnot string or number!
    function generateEscapeValue(node: INode): string{
        switch(node.varType){
            case VarType.String:
                return '_.b(_.esc('+node.symbol+'))';
            case VarType.Number:
                return '_.b(+'+node.symbol+')';
            default:
                throw new Error(node.symbol+'(type: '+MustacheTS.VarType[node.varType]+') cannot be variable. Only string or number was allowed as variable.');
        }
    }

    function generateUnEscapeValue(node: INode):string{
        return '_.b('+node.symbol+')';
    }


    function generateArrayLoop(node:INode):string{
        var buffer:string = '';
        buffer += node.symbol+'.forEach(function('+node.alias+'){';
        buffer += node.childNodes.map(function(childNode){
            return walk(childNode);
        }).join(';');
        buffer += '});';
        return buffer;
    }

    function generateString(node: INode):string{
        return '_.b("'+node.nodeValue+'")';
    }
}
