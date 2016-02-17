var is_node_js_env = typeof global !== "undefined";
if (is_node_js_env) {
    var GameBoard = require(__dirname + '/GameBoard.js');
    var YAML = require(__dirname + '/libs/ymljs/yaml.min.js');
} else {
    var window = {};
    importScripts(
        "GameBoard.js",
        'libs/ymljs/yaml.min.js'
    );
}

// YAML stringify bug on functions (str-replace error... user other object for
// GameBoard logics)
var GameBoardLogic = {
};

GameBoardLogic.print = function () {
    if (is_node_js_env) {
        //return console.log('[' + timeDiff + 's] ');
        myWorker.postMessageToCaller({
            type:'print',
            log: 'TODO : TypeError: YAML.stringify is not a function',//YAML.stringify(GameBoard),
        });
    } else {
        postMessage({
            type:'print',
            board:GameBoard,
            print:window.YAML.stringify(GameBoard),
        });
    }
}

if (is_node_js_env) {
    module.exports = GameBoardLogic;
}
