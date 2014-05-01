///<reference path='tss.ts'/>
///<reference path='generator.ts'/>

module MustacheTS {
    var arrayPattern = /\[\]/;
    export class TemplateVarInfoMap implements IVarInfoMap{
        private tss : MustacheTS.TSS;

        public constructor(defaultLibs:string, private reference: string){
            this.tss = new MustacheTS.TSS(defaultLibs, this.reference);
        }

        public getVariableByScopeChain(name: string, scopeChain:MustacheTS.Scope[]):MustacheTS.VarInfo{
            for(var i = scopeChain.length - 1; i >= 0 ; i--){
                var currentScope = scopeChain[i];
                if(name == '.'){//array item
                    return this.resolveArrayItem(scopeChain);
                }else{
                    var variable = this.getVariableByFullSymbol(currentScope.symbol+'.'+name);
                    if(variable){
                        return variable;
                    }
                }
            }
            return null;
        }

        public resolveArrayItem(scopeChain: MustacheTS.Scope[]): MustacheTS.VarInfo{
            for(var i = scopeChain.length - 1; i >= 0 ; i--){
                var currentScope = scopeChain[i];
                if(currentScope.alias){
                    var variable = this.getVariableByFullSymbol(currentScope.symbol);
                    if(variable){
                        return new MustacheTS.VarInfo(
                            currentScope.alias,
                            variable.typeInfo.sub
                        );
                    }
                }
            }
            return null;
        }

        public getVariableByFullSymbol(fullSymbol: string): MustacheTS.VarInfo{
            var query = fullSymbol.split('.').pop();
            var navigateToItems = this.tss.getNavigateToItems(query).filter(nav => {
                return nav.containerName + '.'+ nav.name === fullSymbol;
            });
            if(navigateToItems.length < 1){
                return null;
            }else if(navigateToItems.length > 1){
                throw new Error('definition of "'+fullSymbol+'" is duplicated.')
            }
            var typeInfo = this.tss.getTypeAtPosition(this.tss.resolveRelativePath(this.reference), navigateToItems[0].minChar);
            return new MustacheTS.VarInfo(fullSymbol, this.prefixToTypeInfo(TypeScript.MemberName.memberNameToString(typeInfo.memberName)));
        }

        private prefixToTypeInfo(type: string): MustacheTS.TypeInfo{
            //number -> array
            if(type == "number"){
                return new MustacheTS.TypeInfo(MustacheTS.VarType.Number, null);
            }else if(type == "string"){
                return new MustacheTS.TypeInfo(MustacheTS.VarType.String, null);
            }else if(type == "boolean"){
                return new MustacheTS.TypeInfo(MustacheTS.VarType.Boolean, null);
            }else if(type.slice(-2) === "[]"){
                return new MustacheTS.TypeInfo(MustacheTS.VarType.Array, this.prefixToTypeInfo(type.slice(0, -2)));
            }else if(type == "function") {
                return new MustacheTS.TypeInfo(MustacheTS.VarType.Function, null);
            }else{
                return new MustacheTS.TypeInfo(MustacheTS.VarType.Other, null);
            }
        }
    }
}
