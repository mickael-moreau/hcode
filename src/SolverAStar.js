var SolverAStar = {
};

// 100 100 3 50 500
// 100rows,1 00columns,3drones,50turns,maxpayloadis500u
SolverAStar.solveBoard = function(input) {
    // Tools.debug_deep('' + index + ':' + input);
    // assert(!isNaN(output.nb_row), 'nb_row should be a defined number');
    var drone_cmds = [];
    var drone_busy_liste = {};

    // Tools
    var warehouses_by_type = {};
    for (var it = 0; it < input.warehouses.length; it++) {
        var warehouse = input.warehouses[it];
        Tools.map(function(type, nb_item) {
            if (warehouses_by_type[type]) {
                warehouses_by_type[type].push(warehouse);
            } else {
                warehouses_by_type[type] = [warehouse];
            }
            return [type, nb_item];
        }, warehouse.nb_item_by_type);
    }

    // Do everthing to make it work until time limites
    // Brut force V1
    // Take 1 commande
    var order_id = 0;
    var order = input.orders[order_id];
    Tools.map(function(type, nb_items) {
        var weight = input.weights_by_type[type];
        while (nb_items > 0) {
            var traject_payload = nb_items * weight;
            Tools.debug_deep('Traject payload : ' + traject_payload);
            if (traject_payload > input.max_payload) { // OPTIMM : >= ?
                traject_payload = input.max_payload;
                Tools.debug_deep('Adjusted payload : ' + traject_payload);
            }
            var tarject_max_item = traject_payload / weight;
            Tools.debug_deep('Items handled : ' + tarject_max_item + ' / ' + nb_items);
            var available_warehouses = warehouses_by_type[type];
            var target_warehouses = null;
            for (var it = 0; it < available_warehouses.length; it++) {
                var warehouse = available_warehouses[it];
                var nb_items_available = warehouse.nb_item_by_type[type];
                if (nb_items_available === 0) {
                    continue;
                }
                assert(nb_items_available > 0,
                'Algo bug, can not have negative item available');
                if (tarject_max_item > nb_items_available) {// OPTIM : >= ?
                    tarject_max_item = nb_items_available;
                }
                warehouse.nb_item_by_type[type] -= tarject_max_item;
                Tools.debug_deep('Stock for warehouse[' + it + '] is '
                + warehouse.nb_item_by_type[type] + ' for type ' + type);
                target_warehouses = warehouse;
                break;
            }
            // Il n'y a plus de stock de ce type de produit dans le plateau
            if (null === target_warehouses) {
                Tools.debug('Stock for type : ' + type + ' do not exist anymore ');
                return [type, nb_items]; // TODO : not used return code => should be .walk
            }

            cmd = {
                type:SolverBrutforce.CMD_LOAD,
                drone_id: 0,
                warehouse_id: target_warehouses.id,
                product_type: type,
                nb_items:tarject_max_item,
            };
            drone_cmds.push(cmd);
            cmd = {
                type:SolverBrutforce.CMD_DELIVER,
                drone_id: 0,
                order_id: order_id,
                product_type: type,
                nb_items:tarject_max_item,
            };
            drone_cmds.push(cmd);
            nb_items -= tarject_max_item;
        }
        assert(nb_items === 0,
        'Algo bug, should have check all orders');
        return [type, nb_items]; // TODO : not used return code => should be .walk function
    }, order.nb_item_by_type);
    Tools.debug(drone_cmds);

    return SolverBrutforce.translate_cmd(drone_cmds);
};

if (typeof window === "undefined" || window === null) {
    module.exports = SolverAStar;
}
