if (typeof window === "undefined" || window === null) {
    module.exports = Parser;
}
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
importScripts(
    "Tools.js",
    "GameBoard.js",
    "Parser.js",
    "SolverBrutforce.js",
    "SolverBrutforceV2.js",
    "SolverBrutforceV3.js",
    "SolverBrutforceV4.js",
    "SolverAStar.js"
);

onmessage = function(e) {
    ////////// ENTRY POINT
    // By lines
    var lines = e.data.file_content.split('\n');

    for(var line = 0; line < lines.length; line++){
        Parser.loadBoard(line, lines[line], GameBoard);
    }
    Tools.info('Game loaded');
    Tools.info(GameBoard);

    GameBoardLogic.print();
    setInterval(function(){
        GameBoardLogic.print();
    }, 2000);

    Tools.enable_debug_deep = true;
    Tools.enable_debug = true;
    //var solution = SolverBrutforce.solveBoard(GameBoard);
    //var solution = SolverBrutforceV2.solveBoard(GameBoard);
    //var solution = SolverBrutforceV3.solveBoard(GameBoard);
    var solution = SolverBrutforceV4.solveBoard(GameBoard);
    //var solution = SolverAStar.solveBoard(GameBoard);
    postMessage({
        type:'solution',
        solution:solution,
    });
}

if (is_node_js_env) {
    module.exports = this;
}
