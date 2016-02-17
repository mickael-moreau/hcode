var SolverKNN = {
};
SolverKNN.computeDistance = function(loc1, loc2) {
    return Math.ceil(Math.sqrt(Math.pow(loc1.x - loc2.x, 2)
    + Math.pow(loc1.y - loc2.y, 2)));
}

SolverKNN.solveBoard = function(input) {
    // Tools.debug_deep('' + index + ':' + input);
    // assert(!isNaN(output.nb_row), 'nb_row should be a defined number');
    var drone_cmds = [];

    // Tools
    var min_weight = null;
    for (var type in input.weights_by_type) {
        var w = input.weights_by_type[type];
        if (null === min_weight || w < min_weight) {
            min_weight = w;
        }
    }
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
    var available_drones = []; // when drone have reach it's ending time, the go out of the available status
    for (var i = 0; i < input.nb_drones; i++) {
        cost_by_drone_worker_id[i] = 0;
        position_by_drone_worker_id[i] = input.warehouses[0].loc;
        available_drones.push(i);
    }
    var available_orders = input.orders.slice(); // copy array by ref : Warning : will modify in both, not a deep copy

    // EquiReparti drone on all warehouses. At least 2 drones per warehouses
    // doing close delivery, going to other warehouse when
    // all products in the gravity circle are fullfilled and if cost to go
    // to warehouse is lower than to go to deliver, check product type that
    // are in warehouse_gravity and have higer demand
    // drop or fill all products in that warehouse depending of closest type,
    //
    // fill drone at maximum payload, adjust with input.payload
    // Parameter : warehouse_gravity => a number in same unit as nb_turns that
    // represent a circle around warehouse
    var warehouse_gravity = SolverKNN.computeDistance(
        {x:0,y:0},
        {x:input.nb_row,y:input.nb_columns}
    ) / input.warehouses.length; // Improvement ? : can be a function, taking a fixed nb of commande roundind it to adjust the gravity

    // TODO : répartir plus de drone sur les zones ayant le plus de points dans
    // le rayon warehouse_gravity => équirépartitions sur cercles
    var compare_by_dist_param = function init_compare_by_dist_param(origin) {
        compare_by_dist_param = {
            ref_pos:origin.loc,
            count_inside_gravity:0,
            nb_item_inside_gravity_by_type:[], // name already too long, since on order ref : nb items for all orders
        };
        return compare_by_dist_param;
    }();
    function compare_by_dist(a,b) {
        var a_dist = SolverKNN.computeDistance(
            a.loc, compare_by_dist_param.ref_pos
        );
        // Warehouse gravity computing (done here to optimise for loops etc...)
        if (a_dist < warehouse_gravity) {
            compare_by_dist_param.count_inside_gravity += 1;
            for (var type in a.nb_item_by_type) {
                type = parseInt(type); // hopfully, types are int, avoiding use of dictionary :)
                if (type in compare_by_dist_param.nb_item_inside_gravity_by_type){
                    compare_by_dist_param.nb_item_inside_gravity_by_type[type]
                    += a.nb_item_by_type[type];
                } else {
                    compare_by_dist_param.nb_item_inside_gravity_by_type[type]
                    = a.nb_item_by_type[type];
                }
            }
        }
        // Back to regular compare distance function
        var b_dist = SolverKNN.computeDistance(
            b.loc, compare_by_dist_param.ref_pos
        );
        if (a_dist < b_dist)
        return -1;
        else if (a_dist > b_dist)
        return 1;
        else
        return 0;
    }
    function most_item_first(a,b) {
        if (a.nb < b.nb)
          return -1;
        else if (a.nb > b.nb)
          return 1;
        else
          return 0;
    }

    var orders_by_distances_from_warehouses_id = {};
    for (var i = 0; i < input.warehouses.length; i++) {
        var warehouse = input.warehouses[i];
        var orders_by_disances = input.orders.slice();
        ref_pos_for_compare_by_dist = warehouse.loc;
        init_compare_by_dist_param(warehouse);
        orders_by_disances.sort(compare_by_dist);
        warehouse.nb_orders_inside_gravity
        = compare_by_dist_param.count_inside_gravity;
        orders_by_distances_from_warehouses_id[warehouse.id]
        = orders_by_disances;

        var nb_item_ordered_inside_gravity = [];
        for (var i = 0; i < compare_by_dist_param.nb_item_inside_gravity_by_type; i++) {
            var nb = compare_by_dist_param.nb_item_inside_gravity_by_type[i];
            nb_item_ordered_inside_gravity.push({
                type:i,
                nb:nb,
                // orders: TODO, // we need orders fullfilling this type to link back etc
            });
        }
        nb_item_ordered_inside_gravity.sort(most_item_first);

        // TODO : use one drone to fullfill commandes with maximum load =>
        // besoin de répartir suffisament de produit pour chaque
        // nb_item_ordered_inside_gravity depuis les autres warehouses si besoin
        // => au max 1 drone pour faire les transferts ?? ou avoir depuis le
        // début le bon nombre de drone pour remplir les payload ??

        // TODO : faire au plus simple pour l'instant => replir tous les
        // drones au max d'un type, pour chaques produits dispo en warehouse 1

        // TODO : autre idée d'algo => garder la flote groupé, détecter les
        // zones centrales ayant le plus de commandes solvables par la totalité
        // des types remplis par le groupe de drone
        for (var drone_id = 0; drone_id < input.nb_drones; drone_id++) {
            cmd = {
                type:SolverBrutforce.CMD_LOAD,
                drone_id: drone_id,
                warehouse_id: warehouse.id,
                product_type: optimal.type,
                nb_items: optimal.path_max_item,
            };
            drone_cmds.push(cmd);
        }
    }

    // TODO : adapt with below instructions
    // pour chaque mouvements, on calcule l'order optimal, puis on fait un mouvement
    // avec l'optimal. Ensuite on recommance la même idée jusqu'a ce que tous les drones aient fini leur temps ou qu'il n'y ai plus de commandes
    while (available_drones.length > 0 && available_orders.length > 0) {
        var optimal = null;
        for (var drone_av_idx in available_drones) {
            var worker_id = available_drones[drone_av_idx];
            for (var order_av_idx = 0; order_av_idx < available_orders.length; order_av_idx++) {
                var order = available_orders[order_av_idx];
                var order_id = order.id;

                for (var type in order.nb_item_by_type) {
                    var nb_items = order.nb_item_by_type[type];

                    if (0 === nb_items) {
                        // order have been fullfilled for this type, go to next one
                        continue;
                    }
                    var weight = input.weights_by_type[type];
                    var path_payload = nb_items * weight;
                    //Tools.debug_deep('Path payload : ' + path_payload);
                    if (path_payload > input.max_payload) { // OPTIMM : >= ?
                        path_payload = input.max_payload;
                        //Tools.debug_deep('Adjusted payload : ' + path_payload);
                    }
                    var path_max_item = Math.floor(path_payload / weight);
                    //Tools.debug_deep('Items handled : ' + path_max_item + ' / ' + nb_items);
                    var available_warehouses = warehouses_by_type[type];
                    for (var warhouse_it = 0; warhouse_it < available_warehouses.length; warhouse_it++) {
                        var warehouse = available_warehouses[warhouse_it];
                        var nb_items_available = warehouse.nb_item_by_type[type];
                        if (nb_items_available === 0) {
                            // Tools.debug_deep(
                            //     'warehouse[{2}] : no item of type {1} available for commande {0} '
                            //     .format(order_id, type, warehouse.id)
                            // );
                            continue;
                        }
                        assert(nb_items_available > 0,
                            'Algo bug, can not have negative item available'
                        );
                        if (path_max_item > nb_items_available) {// OPTIM : >= ?
                            path_max_item = nb_items_available;
                        }

                        var cost = cost_by_drone_worker_id[worker_id];
                        var position = position_by_drone_worker_id[worker_id];
                        var delta_cost_to_warehouse = SolverKNN.computeDistance(position, warehouse.loc);
                        var delta_cost_to_order = SolverKNN.computeDistance(warehouse.loc, order.loc);
                        var total_cost = cost + delta_cost_to_warehouse + delta_cost_to_order + 2; // our drone go to warehouse and back home + take 1 turn for loading and 1 turn to deliver
                        if (total_cost < input.nb_turns // Limite to possible move in time availability only
                            && (
                                null === optimal || total_cost < optimal.total_cost
                            )
                        ) {
                            optimal = {
                                drone:worker_id,
                                drone_available_index:drone_av_idx,
                                order:order,
                                order_available_index:order_av_idx,
                                warehouse: warehouse,
                                warhouse_it: warhouse_it,
                                path_max_item:path_max_item,
                                total_cost:total_cost,
                                type:type,
                            };
                        }
                    }
                    break;
                }
            }
        }

        if (null === optimal) {
            Tools.info('No more optimal found, but still having order or drone available... exiting...');
            break;
        }
        // update board data with the optimal mouvement
        var worker_id = optimal.drone;
        cost_by_drone_worker_id[worker_id] = optimal.total_cost;
        // TODO : should clean available drone not capable to carry product anymore... pb : will never over passe time limite by current algo...
        // TODO : assum min of all orders left is 1 item of min weight
        if (optimal.total_cost + min_weight > input.nb_turns) {
            available_drones.splice(optimal.drone_available_index, 1);
            Tools.info('nb_drones lefts : ' + available_drones.length);
        }
        position_by_drone_worker_id[worker_id] = optimal.order.loc;
        optimal.warehouse.nb_item_by_type[optimal.type] -= optimal.path_max_item;
        if (0 === optimal.warehouse.nb_item_by_type[optimal.type]) {
            warehouses_by_type[optimal.type].splice(optimal.warehouse_id, 1);
        }
        optimal.order.nb_item_by_type[optimal.type] -= optimal.path_max_item;
        var order_is_fullfilled = false;
        for (var type in optimal.order.nb_item_by_type) {
            order_is_fullfilled = true;
            if (0 !== optimal.order.nb_item_by_type[type]) {
                order_is_fullfilled = false;
                break;
            }
        }
        if (order_is_fullfilled) {
            available_orders.splice(optimal.order_available_index,1);
            Tools.info('nb_orders lefts : ' + available_orders.length);
        }

        // send command with that optimal move
        cmd = {
            type:SolverBrutforce.CMD_LOAD,
            drone_id: worker_id,
            warehouse_id: optimal.warehouse.id,
            product_type: optimal.type,
            nb_items: optimal.path_max_item,
        };
        drone_cmds.push(cmd);
        cmd = {
            type:SolverBrutforce.CMD_DELIVER,
            drone_id: worker_id,
            order_id: optimal.order.id,
            product_type: optimal.type,
            nb_items: optimal.path_max_item,
        };
        drone_cmds.push(cmd);
    }
    Tools.debug(drone_cmds);

    return SolverBrutforce.translate_cmd(drone_cmds);
};
if (typeof window === "undefined" || window === null) {
    module.exports = SolverKNN;
}
