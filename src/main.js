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
 };
  reader.readAsText(file);
};
