if (typeof window === "undefined" || window === null) {
var window = {};
importScripts(
    'libs/ymljs/yaml.min.js'
);
}

////////// TOOLS
function assert(condition, message) {
    if (!condition) {
        message = message || "Assertion failed";
        if (typeof Error !== "undefined") {
            // TODO : need the caller stack trace, not the current line stack
            // trace, to trace error to real breaking point
            throw new Error(message);
        }
        throw message; // Fallback
    }
}

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('target', '_blank');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
            ? args[number]
            : match
            ;
        });
    };
}

var Tools = {
    enable_debug:false,
    enable_debug_deep:false,
    enable_info:true,
    enable_important:true,
    startTime:new Date(),
};

// var callback = function (key, value, initial) {...}
Tools.reduce = function(callback, obj, initial) {
    if (typeof callback === 'string') {
        callback = function (key, value, initial) {
            //return value[callback]
            assert(false, 'TODO : accept string callback, on value ? or on initial ?');
        };
    }

    assert(typeof(callback) === 'function',
    'You must define a callback Ex : var callback = function (key, value, initial) {...}');

    for (var variable in obj) {
        if (obj.hasOwnProperty(variable)) {
            initial = callback(variable, obj[variable], initial);
        }
    }
    return initial;
};

// var callback = function (key, value) {...}
Tools.map = function(callback, obj) {
    assert(typeof(callback) === 'function',
    'You must define a callback Ex : var callback = function (key, value) {...}');

    for (var variable in obj) {
        if (obj.hasOwnProperty(variable)) {
            var res = callback(variable, obj[variable]);
            if (false === res) { // false return means filter this value
                delete obj[variable];
                continue;
            }
            assert(res && res.length > 0,
            'You must return an array with [key,value] or [value] from the map callback');
            // assert(obj instanceof Array,
            // 'You returned an array with one value, your target object should be an array');
            if (2 === res.length && res[0] !== variable) {
                delete obj[variable];
                variable = res[0];
            }
            if (2 === res.length){
                obj[variable] = res[1];
            } else {
                obj[variable] = res[0];
            }
        }
    }
    return obj;
};


Tools.reduce_printer = function (key, value, initial) {
    initial.push(key + ' -> ' + value);
    return initial;
}
Tools.log  = function (msg) {
    var endTime = new Date();
    // time difference in ms
    var timeDiff = endTime - Tools.startTime;
    // strip the ms
    timeDiff /= 1000;

    console.log(msg);
    if ('string' === typeof msg) {
        postMessage({
            type:'log',
            log: '[' + timeDiff + 's] ' + msg,//window.YAML.stringify(msg),
        });
    }
}
Tools.debug = function (msg) {
    // TODO : get caller class and check enable_info by class, to be able to
    // debug specific classes on the fly
    if (this.enable_debug) {
        Tools.log(msg);
    }
}
Tools.debug_deep = function (msg) {
    // TODO : get caller class and check enable_info by class, to be able to
    // debug specific classes on the fly
    if (this.enable_debug_deep) {
        Tools.log(msg);
    }
}
Tools.info = function (msg) {
    if (this.enable_info) {
        Tools.log(msg);
    }
}
Tools.important = function (msg) {
    if (this.enable_important) {
        Tools.log(msg);
    }
}
