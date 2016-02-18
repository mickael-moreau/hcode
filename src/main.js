if (typeof(global) !== 'undefined' && global.v8debug ) {
	global.v8debug.Debug.setBreakOnException(); // speaks for itself
}

var is_node_js_env = typeof global !== "undefined";
if (is_node_js_env) {
    var Tools = require(__dirname + '/Tools.js');
    var GameBoard = require(__dirname + '/GameBoard.js');
    var GameBoardLogic = require(__dirname + '/GameBoardLogic.js');
    var Parser = require(__dirname + '/Parser.js');
    var SolverBrutforce = require(__dirname + '/SolverBrutforce.js');
    var SolverBrutforceV2 = require(__dirname + '/SolverBrutforceV2.js');
    var SolverBrutforceV3 = require(__dirname + '/SolverBrutforceV3.js');
	var SolverBrutforceV4 = require(__dirname + '/SolverBrutforceV4.js');
	var SolverBrutforceV5 = require(__dirname + '/SolverBrutforceV5.js');
    var SolverAStar = require(__dirname + '/SolverAStar.js');
} else {
    // https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
    importScripts(
        "Tools.js",
        "GameBoard.js",
		"GameBoardLogic.js",
        "Parser.js",
        "SolverBrutforce.js",
        "SolverBrutforceV2.js",
        "SolverBrutforceV3.js",
		"SolverBrutforceV4.js",
		"SolverBrutforceV5.js",
        "SolverAStar.js"
    );
}

onmessage = function(e) {
	if ('toggle_pause' === e.data.type) {
		GameBoard.is_paused = !GameBoard.is_paused;
		return;
	}

    ////////// ENTRY POINT
	Tools.assert('file_input' === e.data.type, 'Type note handled : '
	+ e.data.type);
    Tools.assert(e.data && 'string' === typeof(e.data.file_content),
    "You must provide a string as data argument send to onmessage");
    // By lines
    var lines = e.data.file_content.split('\n');

    for(var line = 0; line < lines.length; line++){
        Parser.loadBoard(line, lines[line], GameBoard);
    }
    Tools.info('Game loaded');
    Tools.info(GameBoard);

    GameBoardLogic.print();
	// TODO : replace setInterval by an event system callback ?
	// => ex on_command_added ? => GameBoardLogic handle set of all cmd ?
    // setInterval(function(){
	// 	if (!GameBoard.is_paused) {
	// 		GameBoardLogic.print();
	// 	}
    // }, 5000); // TODO : step by step ??
	SolverBrutforceV5.onOrderFullfilled = function() {
		GameBoardLogic.print();
	};

    Tools.enable_debug_deep = true;
    Tools.enable_debug = true;
    //var solution = SolverBrutforce.solveBoard(GameBoard);
    //var solution = SolverBrutforceV2.solveBoard(GameBoard);
    //var solution = SolverBrutforceV3.solveBoard(GameBoard);
    //var solution = SolverBrutforceV4.solveBoard(GameBoard);
	var solution = SolverBrutforceV5.solveBoard(GameBoard);
    //var solution = SolverAStar.solveBoard(GameBoard);
    if (is_node_js_env) {
        //return console.log('[' + timeDiff + 's] ');
        global.myWorker.postMessageToCaller({
            type:'solution',
            solution:solution,
        });
    } else {
        postMessage({
            type:'solution',
            solution:solution,
        });
    }
}

if (is_node_js_env) {
    this.onmessage = onmessage;
    module.exports = this;
}
