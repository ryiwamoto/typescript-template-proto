///<reference path='./test_file_b.ts'/>

module TestModule{
    class Hoge{
        public hugaStr: string;
        public hugaNum: number;

        constructor(s: string, n: number){
            this.hugaStr = s;
            this.hugaNum = n;
        }

        /**
         * document
         * @param a hey
         * @param b fooo
         * @returns {number} returnvalue
         */
        hello(a:string, b:string): number{
            return 1;
        }
    }

    export interface TemplateInterfaceTest {
        str: string;
        bool: boolean;
        num: number;
        arr: Array;
        numArr: number[];
        hoge: string;
        obj: NestedTemplateTest;
        func: Function;
    }

    export interface NestedTemplateTest{
        hoge: number[][];
    }
}
