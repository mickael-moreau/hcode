var is_node_js_env = typeof global !== "undefined";
var GameBoard = {
    global_score: 0,
    is_paused:false,
};

if (is_node_js_env) {
    module.exports = GameBoard;
}
