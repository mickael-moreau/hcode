var Parser = {};

// 100 100 3 50 500
// 100rows,1 00columns,3drones,50turns,maxpayloadis500u
Parser.loadBoard = function(input, output) {
    input.split(' ');
    output.nb_row = parseInt(input[0]);
    output.nb_column = parseInt(input[1]);
    output.nb_drones = parseInt(input[2]);
    output.nb_turns = parseInt(input[3]);
    output.max_payload = parseInt(input[4]);
};
