document.getElementById('board_input').onchange = function(){

  var file = this.files[0];

  var reader = new FileReader();
  reader.onload = function(progressEvent){
    // Entire file
    console.log(this.result);

    // By lines
    var lines = this.result.split('\n');
    for(var line = 0; line < lines.length; line++){
        console.log(lines[line]);
        Parser.loadBoard(line, lines[line], GameBoard);
    }

    console.log('Jeu chargé');
    console.log(GameBoard);
 };
  reader.readAsText(file);
};
