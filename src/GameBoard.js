var window = {};
importScripts(
    'libs/ymljs/yaml.min.js'
);

var GameBoard = {
    global_score: 0,
};

// YAML stringify bug on functions (str-replace error... user other object for
// GameBoard logics)
var GameBoardLogic = {

};

GameBoardLogic.print = function () {
    postMessage({
        type:'print',
        print:window.YAML.stringify(GameBoard),
    });
}
