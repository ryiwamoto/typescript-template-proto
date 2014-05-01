module MustacheTS{
    var rAmp = /&/g,
        rLt = /</g,
        rGt = />/g,
        rApos =/\'/g,
        rQuot = /\"/g,
        hChars =/[&<>\"\']/;


    export class Template <T>{
        private compiled: (T)=> void;
        private buffer: string = '';

        constructor(compiled:(T)=> void){
            this.compiled = compiled;
        }

        public render(context: T):string{
            this.buffer = '';
            this.compiled.call(this, context);
            return this.buffer;
        }

        private b(v: string){
            this.buffer += v;
        }

        private coerceToString(val: any) {
            return String((val === null || val === undefined) ? '' : val);
        }

        private esc(str: any): string{
            str = this.coerceToString(str);
            return hChars.test(str) ?
                str
                    .replace(rAmp,'&amp;')
                    .replace(rLt,'&lt;')
                    .replace(rGt,'&gt;')
                    .replace(rApos,'&#39;')
                    .replace(rQuot, '&quot;') :
                str;
        }
    }
}
