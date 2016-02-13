var SolverBrutforceV2 = {
    CMD_LOAD : 'Load',
    CMD_UNLOAD : 'Unload',
    CMD_DELIVER : 'Deliver',
    CMD_WAIT : 'Wait',
};

// 100 100 3 50 500
// 100rows,1 00columns,3drones,50turns,maxpayloadis500u
SolverBrutforceV2.solveBoard = function(input) {
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

    var cost_by_drone_worker_id = {};
    var position_by_drone_worker_id = {};
    var available_drones = {}; // when drone have reach it's ending time, the go out of the available status
    for (var i = 0; i < input.nb_drones; i++) {
        cost_by_drone_worker_id[i] = 0;
        position_by_drone_worker_id[i] = input.warehouses[0].loc;
        available_drones[i] = true;
    }

    // Do everthing to make it work until time limites
    // Brut force V2
    // Take n commandes, use maximum drones, 1 drone per commandes
    for (var order_id = 0; order_id < input.orders.length; order_id++) {
        var order = input.orders[order_id];

        Tools.map(function(type, nb_items) {
            var weight = input.weights_by_type[type];
            while (nb_items > 0) {
                var path_payload = nb_items * weight;
                Tools.debug_deep('Path payload : ' + path_payload);
                if (path_payload > input.max_payload) { // OPTIMM : >= ?
                    path_payload = input.max_payload;
                    Tools.debug_deep('Adjusted payload : ' + path_payload);
                }
                var path_max_item = Math.floor(path_payload / weight);
                Tools.debug_deep('Items handled : ' + path_max_item + ' / ' + nb_items);
                var available_warehouses = warehouses_by_type[type];
                var target_warehouse = null;
                for (var it = 0; it < available_warehouses.length; it++) {
                    var warehouse = available_warehouses[it];
                    var nb_items_available = warehouse.nb_item_by_type[type];
                    if (nb_items_available === 0) {
                        Tools.debug_deep(
                            'No more drone available for commande {0} of type {1}'
                        .format(order_id, type));
                        continue;
                    }
                    assert(nb_items_available > 0,
                    'Algo bug, can not have negative item available');
                    if (path_max_item > nb_items_available) {// OPTIM : >= ?
                        path_max_item = nb_items_available;
                    }
                    warehouse.nb_item_by_type[type] -= path_max_item;
                    Tools.debug_deep('Stock for warehouse[' + it + '] is '
                    + warehouse.nb_item_by_type[type] + ' for type ' + type);
                    target_warehouse = warehouse;
                    break;
                }
                // Il n'y a plus de stock de ce type de produit dans le plateau
                if (null === target_warehouse) {
                    Tools.debug('Stock for type : ' + type + ' do not exist anymore ');
                    return [type, nb_items]; // TODO : not used return code => should be .walk
                }

                // on selectionne un drone pour faire le voyage depuis sa position, vers la warehouse, vers l'order destination
                var drone_worker_id = null;
                for (var worker_id in available_drones) {
                    var cost = cost_by_drone_worker_id[worker_id];
                    var position = position_by_drone_worker_id[worker_id];
                    var delta_cost_to_warehouse = Math.ceil(Math.sqrt(Math.pow(position.x - target_warehouse.loc.x, 2)
                    + Math.pow(position.y - target_warehouse.loc.y, 2)));
                    var delta_cost_to_order = Math.ceil(Math.sqrt(Math.pow(target_warehouse.loc.x - order.loc.x, 2)
                    + Math.pow(target_warehouse.loc.y - order.loc.y, 2)));
                    var total_cost = cost + delta_cost_to_warehouse + delta_cost_to_order + 2; // our drone go to warehouse and back home + take 1 turn for loading and 1 turn to deliver
                    if (total_cost < input.nb_turns) {
                        drone_worker_id = worker_id;
                        cost_by_drone_worker_id[worker_id] = total_cost;
                        position_by_drone_worker_id[worker_id] = order.loc;
                        break;
                    } // TODO : optim drone checking availability by removing drones that will not have more time...
                }
                if (null == drone_worker_id) {
                    // no drones have time left to carry items accordingly to this order
                    continue; // So go to next order
                }

                cmd = {
                    type:SolverBrutforce.CMD_LOAD,
                    drone_id: drone_worker_id,
                    warehouse_id: target_warehouse.id,
                    product_type: type,
                    nb_items:path_max_item,
                };
                drone_cmds.push(cmd);
                cmd = {
                    type:SolverBrutforce.CMD_DELIVER,
                    drone_id: drone_worker_id,
                    order_id: order_id,
                    product_type: type,
                    nb_items:path_max_item,
                };
                drone_cmds.push(cmd);
                nb_items -= path_max_item;
            }
            //assert(nb_items === 0,
            //'Algo bug, should have check all orders');
            return [type, nb_items]; // TODO : not used return code => should be .walk function
        }, order.nb_item_by_type);
    }
    Tools.debug(drone_cmds);

    return SolverBrutforce.translate_cmd(drone_cmds);
};
