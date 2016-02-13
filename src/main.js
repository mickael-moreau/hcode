////////// ENTRY POINT
document.getElementById('board_input').onchange = function(){

  var file = this.files[0];

  var reader = new FileReader();
  reader.onload = function(progressEvent){
    // Entire file
    //console.log(this.result);

    // By lines
    var lines = this.result.split('\n');
    for(var line = 0; line < lines.length; line++){
        Parser.loadBoard(line, lines[line], GameBoard);
    }

    Tools.info('Game loaded');
    Tools.info(GameBoard);

    //Tools.enable_debug_deep = true;
    Tools.enable_debug = true;
    //var solution = SolverBrutforce.solveBoard(GameBoard);
    var solution = SolverBrutforceV2.solveBoard(GameBoard);
    //var solution = SolverAStar.solveBoard(GameBoard);

    var txt_solution = solution.length + '\n' + solution.join('\n');
    document.body.innerHTML += '<pre>' + txt_solution + '</pre>';

    download('output.txt', txt_solution);

    Tools.info('Game solved');
    Tools.info(solution);
 };
  reader.readAsText(file);
};
