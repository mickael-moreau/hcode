var SolverBrutforceV4 = {
};
SolverBrutforceV4.computeDistance = function(loc1, loc2) {
    return Math.ceil(Math.sqrt(Math.pow(loc1.x - loc2.x, 2)
    + Math.pow(loc1.y - loc2.y, 2)));
}

SolverBrutforceV4.solveBoard = function(input) {
    // Tools.debug_deep('' + index + ':' + input);
    // assert(!isNaN(output.nb_row), 'nb_row should be a defined number');
    var drone_cmds = [];

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
    var warehouse_gravity = SolverBrutforceV4.computeDistance(
        {x:0,y:0},
        {x:input.nb_row,y:input.nb_columns}
    );// / input.warehouses.length; // Improvement ? : can be a function, taking a fixed nb of commande roundind it to adjust the gravity

    var cost_by_drone_id = {};
    var position_by_drone_id = {};
    var available_drones = []; // when drone have reach it's ending time, the go out of the available status
    for (var i = 0; i < input.nb_drones; i++) {
        cost_by_drone_id[i] = 0;
        position_by_drone_id[i] = input.warehouses[0].loc;
        available_drones.push({
            id:i,
            // un drone ne peut porter qu'1 type d'item à la fois ?? ou plus ??
            nb_item:0,
            type:0,
        });
    }
    var available_orders = input.orders.slice(); // copy array by ref : Warning : will modify in both, not a deep copy
    var min_weight = null;
    var min_of_orders_items_by_type = {};
    for (var type in input.weights_by_type) {
        var w = input.weights_by_type[type];
        if (null === min_weight || w < min_weight) {
            min_weight = w;
        }
        min_of_orders_items_by_type[type] = Infinity;
    }

    // Chaque drone prend un max par ordre des type les plus fournis dans la
    // warehouse ou ils sont le plus proche et s'envole d'order en order les
    // plus proche ayant besoin du type qu'ils transportent
    // Quand ils sont vide, il vont à la warehouse la plus proche ayant encore
    // des items en stock

    // pareto : 80% des commandes peuvent être remplis rapidement

    // cibler en priorité les commandes ayant 1 items
    // TODO optim : event system to drone to let them coordinate around best choice
    // rassembler des groupes de drone de type != vers zones de demandes combinée les plus élévées
    // => la distance prend donc en compte la densité du lieu des demandes
    var x_y_nbCategoriesToFullfill = {};
    // {
    //     x : {
    //         y : {
    //             nbCategoriesToFullfill : 0
    //         }
    //     }
    // };

    var max_categories_to_fullfill = 0;
    for (var order_av_idx = 0; order_av_idx < available_orders.length; order_av_idx++) {
        var order = available_orders[order_av_idx];
        if (!(order.loc.x in x_y_nbCategoriesToFullfill)) {
            x_y_nbCategoriesToFullfill[order.loc.x] = {};
        }
        if (!(order.loc.y in x_y_nbCategoriesToFullfill[order.loc.x])) {
            x_y_nbCategoriesToFullfill[order.loc.x][order.loc.y] = {};
        }
        x_y_nbCategoriesToFullfill[order.loc.x][order.loc.y].nbCategoriesToFullfill =
        order.nb_item_by_type.length;
        if (order.nb_item_by_type.length > max_categories_to_fullfill) {
            max_categories_to_fullfill = order.nb_item_by_type.length;
        }
        for (var type in order.nb_item_by_type) {
            if (min_of_orders_items_by_type[type] > order.nb_item_by_type[type]) {
                min_of_orders_items_by_type[type] = order.nb_item_by_type[type];
            }
        }
    }

    // pour chaque mouvements, on calcule l'order optimal, puis on fait un mouvement
    // avec l'optimal. Ensuite on recommance la même idée jusqu'a ce que tous les drones aient fini leur temps ou qu'il n'y ai plus de commandes
    while (available_drones.length > 0 && available_orders.length > 0) {
        var optimal = null;
        for (var drone_av_idx in available_drones) {
            var drone = available_drones[drone_av_idx];
            /////// DRONE can't deliver a full command anymore, go back warehouse
            if (Infinity === min_of_orders_items_by_type[drone.type]) {
                min_of_orders_items_by_type[drone.type] = 0;
            }
            if (drone.nb_item < min_of_orders_items_by_type[drone.type]) {
                var next_type = drone.type;
                for (var type in warehouses_by_type) {
                    var warehouse = null;
                    var warehouses = warehouses_by_type[type];
                    if (warehouses.length > 0) {
                        warehouse = warehouses[0]; // TODO heuristique to chose best warehouse ?? (similar to downstaire no ??)
                        assert(null !== warehouse, 'Algo is may be bugging some where ?');
                        if (warehouse.nb_item_by_type[type] > 0) {
                            next_type = type; // TODO : heuristique to find best type to get from warehouses lefts ?
                            break;
                        }
                    }
                }
                var available_warehouses = warehouses_by_type[next_type];
                optimal = null;
                for (var warhouse_it = 0; warhouse_it < available_warehouses.length; warhouse_it++) {
                    var warehouse = available_warehouses[warhouse_it];
                    var nb_items_available = warehouse.nb_item_by_type[next_type];
                    if (nb_items_available === 0) {
                        // TODO : with current algo, shoul not go there unless speciifed in loading : clean loading board, and put assert not possible, algo bug here ?
                        // Tools.debug_deep(
                        //     'warehouse[{2}] : no item of type {1} available for commande {0} '
                        //     .format(order_id, type, warehouse.id)
                        // );
                        //assert(false, 'Should no go up to there, algo bug...');
                        continue;
                    }
                    assert(nb_items_available > 0,
                        'Algo bug, can not have negative item available'
                    );
                    var cost = cost_by_drone_id[drone.id];
                    var position = position_by_drone_id[drone.id];
                    var delta_cost_to_warehouse = SolverBrutforceV4
                    .computeDistance(position, warehouse.loc);
                    var total_cost = cost + delta_cost_to_warehouse + 1; // our drone go to warehouse + take 1 turn for loading
                    // Distances must be values between [0..1], associating meanings this way : [best..worst]
                    var euclidian_distance = total_cost / input.nb_turns;
                    // Distances must be values between [0..1], associating meanings this way : [best..worst]
                    // TODO : distance taking in account density of type fullfillable by most orders close from all others
                    // var manana_seguro_distance
                    // = x_y_nbCategoriesToFullfill[order.loc.x][order.loc.y]
                    // .nbCategoriesToFullfill
                    // / max_categories_to_fullfill;
                    var pondered_distance = euclidian_distance * 0.5; // TODO : playing with coefficient distance may improve / deprouve resuts..
                    if (total_cost < input.nb_turns // Limite to possible move in time availability only
                        && (
                            null === optimal || pondered_distance < optimal.pondered_distance
                        )
                    ) {
                        optimal = {
                            warehouse: warehouse,
                            pondered_distance:pondered_distance,
                            go_to_next_loop: true,
                            total_cost: total_cost,
                        };
                    }
                }
                assert(null !== optimal, 'Algo bug, optimal must be set');
                var path_max_item = optimal.warehouse.nb_item_by_type[next_type];
                var weight = input.weights_by_type[next_type];
                var path_payload = path_max_item * weight;
                //Tools.debug_deep('Path payload : ' + path_payload);
                if (path_payload > input.max_payload) { // OPTIMM : >= ?
                    path_payload = input.max_payload;
                    //Tools.debug_deep('Adjusted payload : ' + path_payload);
                }
                path_max_item = Math.floor(path_payload / weight);

                cmd = {
                    type:SolverBrutforce.CMD_LOAD,
                    drone_id: drone.id,
                    warehouse_id: optimal.warehouse.id,
                    product_type: next_type,
                    nb_items: path_max_item,
                };
                drone_cmds.push(cmd);
                cost_by_drone_id[drone.id] = optimal.total_cost;
                // TODO : should clean available drone not capable to carry product anymore... pb : will never over passe time limite by current algo...
                // TODO : assum min of all orders left is 1 item of min weight
                if (optimal.total_cost + min_weight > input.nb_turns) {
                    available_drones.splice(optimal.drone_available_index, 1);
                    Tools.info('nb_drones lefts : ' + available_drones.length);
                }
                position_by_drone_id[drone.id] = optimal.warehouse.loc;
                optimal.warehouse.nb_item_by_type[optimal.type] -= optimal.path_max_item;
                if (0 === optimal.warehouse.nb_item_by_type[optimal.type]) {
                    warehouses_by_type[optimal.type].splice(optimal.warehouse_id, 1);
                }
                drone.nb_item += optimal.path_max_item;
                continue; // Switch to next drone, this drone will compute it's disance next turn, taking new position from others ones
            }

            // Drone will try to fullfill the closest order with it's loads
            optimal = null;
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

                        var cost = cost_by_drone_id[drone.id];
                        var position = position_by_drone_id[drone.id];
                        var delta_cost_to_warehouse = SolverBrutforceV4
                        .computeDistance(position, warehouse.loc);
                        var delta_cost_to_order = SolverBrutforceV4
                        .computeDistance(warehouse.loc, order.loc);
                        var total_cost = cost + delta_cost_to_warehouse
                        + delta_cost_to_order + 2; // our drone go to warehouse and back home + take 1 turn for loading and 1 turn to deliver
                        // Distances must be values between [0..1], associating meanings this way : [best..worst]
                        var euclidian_distance = total_cost / input.nb_turns;
                        // Distances must be values between [0..1], associating meanings this way : [best..worst]
                        var manana_seguro_distance
                        = x_y_nbCategoriesToFullfill[order.loc.x][order.loc.y]
                        .nbCategoriesToFullfill
                        / max_categories_to_fullfill;
                        var pondered_distance = euclidian_distance * 0.5
                        + manana_seguro_distance * 0.5; // TODO : playing with coefficient distance may improve / deprouve resuts..
                        if (total_cost < input.nb_turns // Limite to possible move in time availability only
                            && (
                                null === optimal || pondered_distance < optimal.pondered_distance
                            )
                        ) {
                            optimal = {
                                drone:drone,
                                drone_available_index:drone_av_idx,
                                order:order,
                                order_available_index:order_av_idx,
                                warehouse: warehouse,
                                warhouse_it: warhouse_it,
                                path_max_item:path_max_item,
                                total_cost:total_cost,
                                type:type,
                                pondered_distance:pondered_distance,
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

        // TODO : should clean available drone not capable to carry product anymore... pb : will never over passe time limite by current algo...
        // TODO : assum min of all orders left is 1 item of min weight
        if (optimal.total_cost + min_weight > input.nb_turns) {
            available_drones.splice(optimal.drone_available_index, 1);
            Tools.info('nb_drones lefts : ' + available_drones.length);
        }
        if (optimal !== null && optimal.go_to_next_loop) {
            optimal = null;
            continue; // TODO : below code should go inside for loop ?
        }

        // update board data with the optimal mouvement
        var drone = optimal.drone;
        cost_by_drone_id[drone.id] = optimal.total_cost;
        position_by_drone_id[drone.id] = optimal.order.loc;
        optimal.warehouse.nb_item_by_type[optimal.type] -= optimal.path_max_item;
        if (0 === optimal.warehouse.nb_item_by_type[optimal.type]) {
            warehouses_by_type[optimal.type].splice(optimal.warehouse_id, 1);
        }
        position_by_drone_id[drone.id] = optimal.order.loc;
        optimal.order.nb_item_by_type[optimal.type] -= optimal.path_max_item;
        if (optimal.order.nb_item_by_type[optimal.type]
            < min_of_orders_items_by_type[optimal.type]
        ) {
            min_of_orders_items_by_type[optimal.type]
            = optimal.order.nb_item_by_type[optimal.type]
        }
        var order_is_fullfilled = false;
        for (var type in optimal.order.nb_item_by_type) {
            order_is_fullfilled = true;
            var nb_item = optimal.order.nb_item_by_type[type];
            x_y_nbCategoriesToFullfill[optimal.order.loc.x][optimal.order.loc.y]
            .nbCategoriesToFullfill = optimal.order.nb_item_by_type.length;
            if (0 !== nb_item) {
                order_is_fullfilled = false;
                break;
            }
        }
        if (order_is_fullfilled) {
            available_orders.splice(optimal.order_available_index,1);
            Tools.info('nb_orders lefts : ' + available_orders.length);
        }
        drone.nb_item -= optimal.path_max_item;

        // send command with that optimal move
        cmd = {
            type:SolverBrutforce.CMD_DELIVER,
            drone_id: drone.id,
            order_id: optimal.order.id,
            product_type: optimal.type,
            nb_items: optimal.path_max_item,
        };
        drone_cmds.push(cmd);
    }
    Tools.debug(drone_cmds);

    return SolverBrutforce.translate_cmd(drone_cmds);
};
