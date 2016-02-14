var window = {};
importScripts(
    //'libs/ymljs/yaml.min.js'
    'libs/ymljs/yaml.js'
);

var GameBoard = {
  'r': 0,
  'c': 0,
  'drone':[],
  'turn':0,
  'max':0,
};

var products = [];
var warehouse = {
  'located': [],
  'nb': 0,
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
