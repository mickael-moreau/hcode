var SolverBrutforceV4 = {
    // TODO : playing with coefficient distance may improve / deprouve resuts..
    // Sum of all coefficient must do 1
    coefficient_distance_euclidienne:0.80,
    coefficient_distance_manana_seguro:0.20,
};

assert(
    SolverBrutforceV4.coefficient_distance_euclidienne
    + SolverBrutforceV4.coefficient_distance_manana_seguro
    == 1,
    'Sum of all coefficient must do 1'
)

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
            last_cmd:null,
        });
    }
    var available_orders = input.orders.slice(); // copy array by ref : Warning : will modify in both, not a deep copy
    var min_weight = null;
    var min_of_orders_items_by_type = {};
    var max_of_orders_items_by_type = {};
    for (var type in input.weights_by_type) {
        var w = input.weights_by_type[type];
        if (null === min_weight || w < min_weight) {
            min_weight = w;
        }
        min_of_orders_items_by_type[type] = Infinity;
        max_of_orders_items_by_type[type] = 0;
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
        nb_categories = Object.keys(order.nb_item_by_type).length;
        x_y_nbCategoriesToFullfill[order.loc.x][order.loc.y].nbCategoriesToFullfill =
        nb_categories;
        if (nb_categories > max_categories_to_fullfill) {
            max_categories_to_fullfill = nb_categories;
        }
        for (var type in order.nb_item_by_type) {
            if (min_of_orders_items_by_type[type] > order.nb_item_by_type[type]) {
                min_of_orders_items_by_type[type] = order.nb_item_by_type[type];
            }
            if (max_of_orders_items_by_type[type] < order.nb_item_by_type[type]) {
                max_of_orders_items_by_type[type] = order.nb_item_by_type[type];
            }
        }
    }

    // pour chaque mouvements, on calcule l'order optimal, puis on fait un mouvement
    // avec l'optimal. Ensuite on recommance la même idée jusqu'a ce que tous les drones aient fini leur temps ou qu'il n'y ai plus de commandes
    while (available_drones.length > 0 && available_orders.length > 0) {
        // optimal for DELIVERY commande
        var optimal = null;
        // optimal for LOAD/UNLOAD commande
        var w_optimal = null;
        // Drone will try to fullfill the closest order with it's loads
        for (var drone_av_idx in available_drones) {
            var drone = available_drones[drone_av_idx];
            if (drone.nb_item > 0) { // TODO : some heuristique ? or maybe done by optimal selection...
                for (var order_av_idx = 0; order_av_idx < available_orders.length; order_av_idx++) {
                    var order = available_orders[order_av_idx];
                    var order_id = order.id;

                    // on deliver, commnand do not change type
                    // for (var type in order.nb_item_by_type) {
                    var type = drone.type;
                    {
                        if (!(type in order.nb_item_by_type)) {
                            // drone can't satisfy this order
                            continue;
                        }
                        var nb_items = order.nb_item_by_type[type];

                        if (0 === nb_items) {
                            // order have been fullfilled for this type, go to next one
                            continue;
                        }
                        var path_max_item = nb_items;

                        if (path_max_item > drone.nb_item) {// OPTIM : >= ?
                            path_max_item = drone.nb_item;
                        }

                        var cost = cost_by_drone_id[drone.id];
                        var position = position_by_drone_id[drone.id];
                        var delta_cost_to_order = SolverBrutforceV4
                        .computeDistance(position, order.loc);
                        var total_cost = cost + delta_cost_to_order + 1; // our drone go to to order and 1 turn to deliver
                        // Distances must be values between [0..1], associating meanings this way : [best..worst]
                        var euclidian_distance = total_cost / input.nb_turns;
                        // Distances must be values between [0..1], associating meanings this way : [best..worst]
                        var manana_seguro_distance
                        = x_y_nbCategoriesToFullfill[order.loc.x][order.loc.y]
                        .nbCategoriesToFullfill
                        / max_categories_to_fullfill;
                        var pondered_distance = euclidian_distance
                        * SolverBrutforceV4.coefficient_distance_euclidienne
                        + manana_seguro_distance
                        * SolverBrutforceV4.coefficient_distance_manana_seguro;
                        assert(!isNaN(total_cost), 'Order : Something is wrong with total_cost');
                        assert(!isNaN(pondered_distance), 'Order : Something is wrong with pondered_distance');
                        assert(!isNaN(path_max_item), 'Order : Something is wrong with path_max_item');
                        assert(path_max_item <= order.nb_item_by_type[type],
                            'Order : path_max_item can not be higer than order.nb_item_by_type[type]'
                        );

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
                                path_max_item:path_max_item,
                                total_cost:total_cost,
                                type:type,
                                pondered_distance:pondered_distance,
                            };
                        } else {
                            //Tools.debug({msg:'No optimal found for delivery'});
                        }
                    }
                }
            }

            /////// If DRONE can't deliver a full command anymore, go back warehouse
            // Or same if path to next delivery is higher thant going to warhouse
            // + some parmetrisable heuristique (in our case : 3 unit point
            // for unloading in warhouse, loading and going then to same order point)
            var warehouse_detour_consuming_heuristique = 3;
            var is_faster_to_stop_at_warehouse
            = drone.nb_item < min_of_orders_items_by_type[drone.type]
            || 0 === max_of_orders_items_by_type[drone.type]
            || null !== optimal; // TODO : null or not null ?
            if (Infinity === min_of_orders_items_by_type[drone.type]) {
                min_of_orders_items_by_type[drone.type] = 0;
            }
            if ((null === drone.last_cmd || null === optimal
                || drone.last_cmd.type !== SolverBrutforce.CMD_LOAD)
                || is_faster_to_stop_at_warehouse
            ) {
                // w_optimal for LOAD/UNLOAD commande
                w_optimal = null;
                for (var next_type in warehouses_by_type) {
                    if (max_of_orders_items_by_type[next_type] <= 0
                        && 0 === drone.nb_item // TODO : we want to forsee cyclics, need only on unload, no direct load
                    ) {
                        continue; // avoid transporting product not requested anymore
                    }
                    var available_warehouses = warehouses_by_type[next_type];
                    for (var warhouse_it = 0; warhouse_it < available_warehouses.length; warhouse_it++) {
                        var warehouse = available_warehouses[warhouse_it];
                        assert(null !== warehouse, 'Algo is may be bugging some where ?');
                        if (0 === warehouse.nb_item_by_type[next_type]) {
                            continue;
                        }

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
                            'Warehouse : Algo bug, can not have negative item available'
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
                        var pondered_distance = euclidian_distance
                        * SolverBrutforceV4.coefficient_distance_euclidienne; // TODO : playing with coefficient distance may improve / deprouve resuts..
                        assert(!isNaN(total_cost), 'Warehouse : Something is wrong with total_cost');
                        assert(!isNaN(pondered_distance), 'Warehouse : Something is wrong with pondered_distance');
                        var weight = input.weights_by_type[next_type];
                        var path_max_item = warehouse.nb_item_by_type[next_type];
                        var path_payload = path_max_item * weight;
                        //Tools.debug_deep('Path payload : ' + path_payload);
                        if (path_payload > input.max_payload) { // OPTIMM : >= ?
                            path_payload = input.max_payload;
                            //Tools.debug_deep('Adjusted payload : ' + path_payload);
                        }
                        path_max_item = Math.floor(path_payload / weight);
                        assert(path_max_item <= warehouse.nb_item_by_type[next_type],
                            'Warehouse : path_max_item can not be higer than warehouse.nb_item_by_type[next_type]'
                        );

                        if (total_cost < input.nb_turns // Limite to possible move in time availability only
                            && (
                                null === w_optimal || pondered_distance < w_optimal.pondered_distance
                            )
                        ) {
                            w_optimal = {
                                drone:drone,
                                warehouse: warehouse,
                                pondered_distance: pondered_distance,
                                go_to_next_loop: true,
                                total_cost: total_cost,
                                type: next_type,
                                path_max_item:path_max_item,
                                is_faster_to_stop_at_warehouse:
                                is_faster_to_stop_at_warehouse
                                && (null === optimal
                                    || (optimal.total_cost
                                        + warehouse_detour_consuming_heuristique
                                        > total_cost
                                        && position.x !== warehouse.loc.x
                                        && position.y !== warehouse.loc.y
                                    )
                                )
                            };                            //Tools.debug({msg:'No optimal found for unloading'});
                        }
                    }
                }
                //assert(null !== w_optimal, 'Algo bug, w_optimal must be set'); // TODO : it can be null if total_cost < input.nb_turns ===> bad assert ?
                if (null !== w_optimal && (null===optimal || w_optimal.is_faster_to_stop_at_warehouse)) {
                    if (w_optimal.drone.nb_item > 0) {
                        cmd = {
                            type:SolverBrutforce.CMD_UNLOAD,
                            drone_id: w_optimal.drone.id,
                            warehouse_id: w_optimal.warehouse.id,
                            product_type: w_optimal.drone.type,
                            nb_items: w_optimal.drone.nb_item,
                            ['nb_item_by_type_' + w_optimal.drone.type]:
                            w_optimal.warehouse.nb_item_by_type[w_optimal.drone.type],
                        };
                        drone_cmds.push(cmd);
                        w_optimal.drone.last_cmd = cmd;
                        if (w_optimal.drone.type in w_optimal.warehouse.nb_item_by_type) {
                            w_optimal.warehouse.nb_item_by_type[w_optimal.drone.type]
                            += w_optimal.drone.nb_item;
                        } else {
                            w_optimal.warehouse.nb_item_by_type[w_optimal.drone.type]
                            = w_optimal.drone.nb_item;
                        }
                        assert(!isNaN(w_optimal.warehouse.nb_item_by_type[w_optimal.drone.type]),
                        '(2) Warhouse : Something is wrong with w_optimal.warehouse.nb_item_by_type');
                        assert((w_optimal.warehouse.nb_item_by_type[w_optimal.drone.type] >= 0),
                        '(2) Warhouse : w_optimal.warehouse.nb_item_by_type must stay positive');
                        w_optimal.drone.nb_item = 0;
                    }
                    if (max_of_orders_items_by_type[w_optimal.type] > 0) { // only load product that can be delivered on day
                        var path_max_item = w_optimal.path_max_item;
                        assert(!isNaN(path_max_item), 'Warehouse : Something is wrong with path_max_item');
                        w_optimal.drone.type = w_optimal.type;
                        cmd = {
                            type:SolverBrutforce.CMD_LOAD,
                            drone_id: w_optimal.drone.id,
                            warehouse_id: w_optimal.warehouse.id,
                            product_type: w_optimal.type,
                            nb_items: path_max_item,
                            ['nb_item_by_type_' + w_optimal.type]:
                            w_optimal.warehouse.nb_item_by_type[w_optimal.type],
                        };
                        drone_cmds.push(cmd);
                        w_optimal.drone.last_cmd = cmd;
                        cost_by_drone_id[w_optimal.drone.id] = w_optimal.total_cost;
                        // TODO : should clean available drone not capable to carry product anymore... pb : will never over passe time limite by current algo...
                        // TODO : assum min of all orders left is 1 item of min weight
                        if (w_optimal.total_cost + min_weight > input.nb_turns) {
                            available_drones.splice(w_optimal.drone_available_index, 1);
                            Tools.info('nb_drones lefts : ' + available_drones.length);
                        }
                        position_by_drone_id[w_optimal.drone.id] = w_optimal.warehouse.loc;
                        w_optimal.warehouse.nb_item_by_type[w_optimal.type] -= path_max_item;
                        assert(!isNaN(w_optimal.warehouse.nb_item_by_type[w_optimal.type]),
                        '(1) Warhouse : Something is wrong with w_optimal.warehouse.nb_item_by_type');
                        assert((w_optimal.warehouse.nb_item_by_type[w_optimal.type] >= 0),
                        '(1) Warhouse : w_optimal.warehouse.nb_item_by_type must stay positive');
                        if (0 === w_optimal.warehouse.nb_item_by_type[w_optimal.type]) {
                            //warehouses_by_type[w_optimal.type].splice(w_optimal.warehouse_id, 1);
                            // TODO : remove them /  add them back on load methode etc...
                        }
                        w_optimal.drone.nb_item += path_max_item;
                        assert(!isNaN(w_optimal.drone.nb_item), 'Warhouse : Something is wrong with w_optimal.drone.nb_item');
                    }
                    continue; // Switch to next drone, this drone will compute it's disance next turn, taking new position from others ones
                } else {
                    w_optimal = null;
                }
            }
        }

        if (w_optimal !== null && w_optimal.go_to_next_loop) {
            w_optimal = null;
            continue; // TODO : below code should go inside for loop ?
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
        optimal.drone.type = optimal.type; //Type may have change if selected for w_optimal and finally switched ??

        // update board data with the optimal mouvement
        cost_by_drone_id[optimal.drone.id] = optimal.total_cost;
        position_by_drone_id[optimal.drone.id] = optimal.order.loc;
        // DELIVER Command do not impact warehouse.nb_item_by_type, only LOAD and UNLOAD do
        //optimal.warehouse.nb_item_by_type[optimal.type] -= optimal.path_max_item;
        position_by_drone_id[optimal.drone.id] = optimal.order.loc;
        optimal.order.nb_item_by_type[optimal.type] -= optimal.path_max_item;
        if (optimal.order.nb_item_by_type[optimal.type]
            < min_of_orders_items_by_type[optimal.type]
        ) {
            min_of_orders_items_by_type[optimal.type]
            = optimal.order.nb_item_by_type[optimal.type]
        }
        if (optimal.order.nb_item_by_type[optimal.type]
            > max_of_orders_items_by_type[optimal.type]
        ) {
            max_of_orders_items_by_type[optimal.type]
            = optimal.order.nb_item_by_type[optimal.type]
        }
        if (0 === optimal.order.nb_item_by_type[optimal.type]) {
            x_y_nbCategoriesToFullfill[optimal.order.loc.x][optimal.order.loc.y]
            .nbCategoriesToFullfill -= 1;
            // TODO : remove from optimal.order.nb_item_by_type ?? not mandatory...
        }
        assert(!isNaN(optimal.order.nb_item_by_type[optimal.type]),
        '213: Warhouse : Something is wrong with optimal.order.nb_item_by_type');
        var order_is_fullfilled = false;
        for (var type in optimal.order.nb_item_by_type) {
            order_is_fullfilled = true;
            var nb_item = optimal.order.nb_item_by_type[type];
            if (0 !== nb_item) {
                order_is_fullfilled = false;
                break;
            }
        }
        if (order_is_fullfilled) {
            var local_score = Math.ceil((input.nb_turns - optimal.total_cost)
            / input.nb_turns * 100);
            GameBoard.global_score += local_score;
            available_orders.splice(optimal.order_available_index,1);
            Tools.info('available_orders size : ' + available_orders.length + '. '
            + ' Drone[' + optimal.drone.id + '] did deliver the last '
            + optimal.path_max_item + ' items at time : ' + optimal.total_cost
            + ' giving us : ' + local_score + 'pts on ' + GameBoard.global_score
            + '. End state : Order type [' + optimal.type + ']');
        }
        optimal.drone.nb_item -= optimal.path_max_item;
        // optimal.drone.type = optimal.type; Done type do not change on deliver
        assert(optimal.drone.type === optimal.type, 'Type should not change');
        assert(!isNaN(optimal.drone.nb_item), 'Something is wrong with drone.nb_item');

        // send command with that optimal move
        cmd = {
            type:SolverBrutforce.CMD_DELIVER,
            drone_id: optimal.drone.id,
            order_id: optimal.order.id,
            product_type: optimal.type,
            nb_items: optimal.path_max_item,
            ['nb_item_by_type_' + optimal.type]:
            optimal.order.nb_item_by_type[optimal.type],
        };
        drone_cmds.push(cmd);
        optimal.drone.last_cmd = cmd;
    }
    Tools.debug(drone_cmds);

    return SolverBrutforce.translate_cmd(drone_cmds);
};

if (is_node_js_env) {
    module.exports = SolverBrutforceV4;
}
