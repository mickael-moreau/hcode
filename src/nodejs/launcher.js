var Tools = require(__dirname + '/../Tools');
// initialise variables
var Threads= require('webworker-threads');

//var myWorker= new Threads.Worker(__dirname + '/../main.js');
var myWorker = require(__dirname + '/../main.js');
global.myWorker = myWorker;
var fs = require('fs');

// get commande line arguments
var args = process.argv.slice(2);
// Ensure some user inputs checking before going to next steps
if (1 === args.length) {
    if (0 === args[0].indexOf("input/")) {
        args[1] = args[0].replace(/^input/, 'output');
    } else {
        throw new Error('If you specify only one file name, it must start with "input/"');
    }
} else if (args.length != 2) {
    throw new Error('You must specify at least one or two filepaths');
}

// Handle the main logic
myWorker.onmessage = function(e) {
    switch (e.data.type) {
        case 'solution': {
            var solution = e.data.solution;
            // var txt_solution = solution.length + '\n' + solution.join('\n');
            // document.body.innerHTML += '<pre>' + txt_solution + '</pre>';
            // download('output.txt', txt_solution);

            // Write the output data
            var txt_solution = solution.length + '\n' + solution.join('\n');
            fs.writeFile(args[1], txt_solution, function(err) {
                if(err) {
                    return Tools.error(err);
                }
                Tools.info("The file " + args[1] + " was saved!");
            });
            Tools.info('Game solved');
            Tools.info(solution);
            break;
        }
        case 'print': {
            Tools.info(solution);
            break;
        }
        case 'log': console.log(e.data.log);
        break;
        default: {
            Tools.info('Unknow message from main web worker');
            Tools.info(e);
        }
    }
}

// Read the input data
// function readLines(input, func) {
//   var remaining = '';
//
//   input.on('data', function(data) {
//     remaining += data;
//     var index = remaining.indexOf('\n');
//     while (index > -1) {
//       var line = remaining.substring(0, index);
//       remaining = remaining.substring(index + 1);
//       func(line);
//       index = remaining.indexOf('\n');
//     }
//   });
//
//   input.on('end', function() {
//     if (remaining.length > 0) {
//       func(remaining);
//     }
//   });
// }
// function func(data) {
//     // console.log('Line: ' + data);
//     myWorker.postMessage({
//         file_content:data,
//     });
// }
// var input = fs.createReadStream(args[0]);
// readLines(input, func);

fs.readFile(args[0], "utf8", function (err, data) {
  if (err) {
    throw err;
  }
  //console.log(data.toString());
  myWorker.postMessage({ data : {
      file_content:data,
  }});
});
