var TestModule;
(function (TestModule) {
    var Hoge = (function () {
        function Hoge(s, n) {
            this.hugaStr = s;
            this.hugaNum = n;
        }
        Hoge.prototype.hello = function (a, b) {
            return 1;
        };
        return Hoge;
    })();
})(TestModule || (TestModule = {}));

var test = new Hoge();
