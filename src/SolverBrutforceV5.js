var is_node_js_env = typeof global !== "undefined";
if (is_node_js_env) {
    var GameBoard = require(__dirname + '/GameBoard.js');
    var SolverBrutforce = require(__dirname + '/SolverBrutforce.js');
    var Tools = require(__dirname + '/Tools.js');
}

// All our Distances will be values between [0..1],
// associating meanings this way : [best..worst]

// All our Distances can be parametrised by coefficients having a sum of 1

var SolverBrutforceV5 = {
    // callback when order is fullfilled
    onOrderFullfilled : function(){},
    // callback when a drone move (ie : load/deliver cmd to other position than last one)
    onDroneMouve : function(){},
    // callback when a cmd is computed and stored in game solution
    onDroneEnding : function(){},
    // callback when a cmd is computed and stored in game solution
    onCmdSended : function(){},
    // rayon de calcul pour déterminer l'aspect central d'un point vis à vis de
    // de ses voisins par une fonction de distance prenant en compte
    // - minimisation du poid total des livraisons
    // - maximisation du nombre d'order à livrer dans le rayon indiqué
    density_radius: null,
    // if density_radius is null, will compute the density_radius value from
    // board hypotenus * density_percent
    density_percent: 0.1,
    // WARNING : sum(coef) Must = 1
    coef_density_minim_euclidian:0.2,
    coef_density_minim_weight:0.4,
    coef_density_maxim_nb_orders:0.4,

    // coefficients used to chose the best commande, by commandes actions
    // TODO : may be organize by distances computing ? add multiple choice limited to a maximum nb instead of only one ?
    optimal:{
        // WARNING : Sum(all weight use in one distance function)
        // must exactly be equal to 1
        // => euclidien_weight + manana_seguro_weight === 1 // distance for drone loading cmd
        // => euclidien_weight + density_weight === 1 // distance for drone delivery cmd
        euclidien_weight:0.20,
        manana_seguro_weight:0.80,
        euclidien_to_density_weight:0.80,
        cmd: {
            pondered_distance:0, // resulting cost fun is allways between 0 and 1
            drone_cmd:null,
        },
        // TODO : handle N optimal, sorted from best to worst, using N best possibilities ??? (for now, all drone to one best density point)
        // // The number of density center to keep in the computation of where to
        // // drive drones to
        // nb_density_centers:1,
        // // The best nb_density_centers density points from best to lowest
        // optimal_densities:[],
        density: {
            pondered_distance:0, // resulting cost fun is allways between 0 and 1
            //orders:[],
            //weight_by_type:{},
            order_center:null,
        }
    }
};

Tools.assert(
    SolverBrutforceV5.coef_density_minim_euclidian
    + SolverBrutforceV5.coef_density_minim_weight
    + SolverBrutforceV5.coef_density_maxim_nb_orders
    == 1,
    'Sum of all coefficient for optimal density lookup must do 1'
)
Tools.assert(
    SolverBrutforceV5.optimal.euclidien_weight
    + SolverBrutforceV5.optimal.manana_seguro_weight
    == 1,
    'Sum of all coefficient for optimal LOAD command lookup must do 1'
)
Tools.assert(
    SolverBrutforceV5.optimal.euclidien_weight
    + SolverBrutforceV5.optimal.euclidien_to_density_weight
    == 1,
    'Sum of all coefficient for optimal DELIVER command lookup must do 1'
)

SolverBrutforceV5.computeDistance = function(loc1, loc2) {
    return Math.ceil(Math.sqrt(Math.pow(loc1.x - loc2.x, 2)
    + Math.pow(loc1.y - loc2.y, 2)));
}

// Algo :
// Tout drone plein vas deliver à l'order la plus proche avec pour distance:
// - euclidienne : cf subject
// - euclidienne vs optimal density center.

// Tout drone vide vas à la warehouse la plus proche avec pour distance:
// - euclidienne : cf subject
// - manana seguro : optimal.density.weight_by_type fullfilled at most
// => commande de load de produit avec en priorité les demandes optimal

SolverBrutforceV5.solveBoard = function(input) {
    // Tools.debug_deep('' + index + ':' + input);
    // Tools.assert(!isNaN(output.nb_row), 'nb_row should be a defined number');
    var drone_cmds = [];
    var euclidian_norme = SolverBrutforceV5.computeDistance(
        {x:0,y:0},
        {x:input.nb_row,y:input.nb_columns}
    );

    if (null === SolverBrutforceV5.density_radius) {
        SolverBrutforceV5.density_radius = SolverBrutforceV5.density_percent
        * euclidian_norme;
    }

    // Tools
    var available_drones = []; // when drone have reach it's ending time, the go out of the available status
    for (var i = 0; i < input.nb_drones; i++) {
        available_drones.push({ // TODO : eq clean drone construtor
            id:i,
            // un drone ne peut porter plus d'1 type d'item à la fois
            nb_items:0,
            nb_turn_consumed:0,
            position:input.warehouses[0].loc,
            nb_item_by_type:{},
        });
    }
    var available_orders = input.orders.slice(); // copy array by ref : Warning : will modify in both, not a deep copy
    var available_warehouses = input.warehouses.slice(); // copy array by ref : Warning : will modify in both, not a deep copy

    var min_weight = null;
    for (var type in input.weights_by_type) {
        var w = input.weights_by_type[type];
        if (null === min_weight || w < min_weight) {
            min_weight = w;
        }
    }

    // Chaque drone prend un max par ordre des type les plus fournis dans la
    // warehouse ou ils sont le plus proche et s'envole d'order en order les
    // plus proche ayant besoin du type qu'ils transportent
    // Quand ils sont vide, il vont à la warehouse la plus proche ayant encore
    // des items en stock

    // pareto : 80% des commandes peuvent être remplis rapidement

    // cibler en priorité les commandes ayant 1 items ?
    // TODO optim : event system to drone to let them coordinate around best choice
    // rassembler des groupes de drone de type != vers zones de demandes combinée les plus élévées
    // => la distance prend donc en compte la densité du lieu des demandes

    // pour chaque mouvements, on calcule l'order optimal, puis on fait un mouvement
    // avec l'optimal. Ensuite on recommance la même idée jusqu'a ce que tous les drones aient fini leur temps ou qu'il n'y ai plus de commandes
    function needNextIteration () {
        return available_drones.length > 0 && available_orders.length > 0;
    }
    function solveIteration () {
        while (needNextIteration()) {
            if (GameBoard.is_paused) {
                break;
            }
            // Compute optimal density center from all orders (could be done for each drone, but in js, may be slow to compute...)
            SolverBrutforceV5.optimal.density = null;
            var maximum_order_weight = 0; // TODO : compute on change instead of each loop ?? ok for now
            for (var o_idx = 0; o_idx < available_orders.length; o_idx++) {
                var order = available_orders[o_idx];
                var w = 0;
                for (var type in order.nb_item_by_type) {
                    w += order.nb_item_by_type[type]
                    * input.weights_by_type[type];
                }
                order.w = w; // reuse instead of re-compute on next loop
                if (w > maximum_order_weight) {
                    maximum_order_weight = w;
                }
            }

            for (var o_idx = 0; o_idx < available_orders.length; o_idx++) {
                var order = available_orders[o_idx];
                // check neighbour
                var weight_distance = 0;
                var euclidian_distance = 0;
                var nb_neighbour = 0;
                var nb_item_by_type = {};
                for (var n_idx = 0; n_idx < available_orders.length; n_idx++) {
                    var neighbour = available_orders[n_idx];
                    var dist = SolverBrutforceV5.computeDistance(
                        order.loc, neighbour.loc
                    );
                    if (dist <= SolverBrutforceV5.density_radius) {
                        nb_neighbour += 1;
                        euclidian_distance += dist / SolverBrutforceV5.density_radius;
                        weight_distance += neighbour.w / maximum_order_weight;
                        for (var type in neighbour.nb_item_by_type) {
                            if (type in nb_item_by_type) {
                                nb_item_by_type[type] += neighbour.nb_item_by_type[type];
                            } else {
                                nb_item_by_type[type] = neighbour.nb_item_by_type[type];
                            }
                        }
                    }
                }
                // bring back our distance between 0 and 1
                euclidian_distance /= nb_neighbour;
                weight_distance /= weight_distance;
                var nb_order_distance = nb_neighbour / available_orders.length;
                var pondered_distance = euclidian_distance
                * SolverBrutforceV5.coef_density_minim_euclidian
                + weight_distance
                * SolverBrutforceV5.coef_density_minim_weight
                + (1 - nb_order_distance) // 1 - X since we want to maximise with a minimisie global checking
                * SolverBrutforceV5.coef_density_maxim_nb_orders;
                if (
                    null === SolverBrutforceV5.optimal.density
                    || pondered_distance < SolverBrutforceV5.optimal.density.pondered_distance
                ) {
                    SolverBrutforceV5.optimal.density = {
                        pondered_distance:pondered_distance,
                        order_center:order,
                        nb_item_by_type:nb_item_by_type,
                    }
                }
            }
            Tools.assert(SolverBrutforceV5.optimal.density, 'Algo bug ? density must be defined or turn ended and not going there any more');

            // Compute optimal cmd for all available drones
            SolverBrutforceV5.optimal.cmd = null;
            for (var drone_av_idx = 0; drone_av_idx < available_drones.length; drone_av_idx++) {
                var drone = available_drones[drone_av_idx];
                if (drone.nb_items > 0) {
                    // Check best order to go deliver to
                    for (var order_av_idx = 0; order_av_idx < available_orders.length; order_av_idx++) {
                        var order = available_orders[order_av_idx];
                        var order_id = order.id;

                        // on deliver, commnand do not change type
                        for (var type in drone.nb_item_by_type) {
                            if (!(type in order.nb_item_by_type)) {
                                // drone can't satisfy this order
                                continue;
                            }
                            var nb_items = order.nb_item_by_type[type];

                            if (0 === nb_items) {
                                // order have been fullfilled for this type, go to next one
                                continue;
                            }

                            if (nb_items > drone.nb_items) {// OPTIM : >= ?
                                nb_items = drone.nb_items;
                            }

                            var cost = drone.nb_turn_consumed;
                            var position = drone.position;
                            var delta_cost_to_order = SolverBrutforceV5
                            .computeDistance(position, order.loc);
                            var total_cost = cost + delta_cost_to_order + 1; // our drone go to to order and 1 turn to deliver
                            // Distances must be values between [0..1], associating meanings this way : [best..worst]
                            var euclidian_distance = total_cost / input.nb_turns; // TODO : this one is more like a time distance than euclidian distance
                            // Distances must be values between [0..1], associating meanings this way : [best..worst]
                            var euclidian_vs_optimal_density_distance
                            = SolverBrutforceV5.computeDistance(
                                position, SolverBrutforceV5
                                .optimal.density.order_center.loc
                            );
                            var pondered_distance = euclidian_distance
                            * SolverBrutforceV5.optimal.euclidien_weight
                            + euclidian_vs_optimal_density_distance
                            * SolverBrutforceV5.optimal.euclidien_to_density_weight;
                            Tools.assert(!isNaN(total_cost), 'Order : Something is wrong with total_cost');
                            Tools.assert(!isNaN(pondered_distance), 'Order : Something is wrong with pondered_distance');
                            Tools.assert(!isNaN(nb_items), 'Order : Something is wrong with nb_items');
                            Tools.assert(nb_items <= order.nb_item_by_type[type],
                                'Order : nb_items can not be higer than order.nb_item_by_type[type]'
                            );

                            if (total_cost < input.nb_turns // Limite to possible move in time availability only
                                && (
                                    null === SolverBrutforceV5.optimal.cmd
                                    || pondered_distance < SolverBrutforceV5.optimal.cmd.pondered_distance
                                )
                            ) {
                                SolverBrutforceV5.optimal.cmd = {
                                    pondered_distance:pondered_distance,
                                    drone:drone,
                                    drone_delta_item: -nb_items,
                                    drone_available_index:drone_av_idx,
                                    order:order,
                                    order_available_index:order_av_idx,
                                    total_cost:total_cost,
                                    drone_cmd:{
                                        type:SolverBrutforce.CMD_DELIVER,
                                        drone_id: drone.id,
                                        order_id: order.id,
                                        product_type: type,
                                        nb_items: nb_items,
                                        ['nb_item_by_type_' + type]:
                                        order.nb_item_by_type[type],
                                    }
                                }
                            } else {
                                //Tools.debug({msg:'Not an optimal'});
                            }
                        }
                    }
                } else {
                    // load cmd
                    // Check best warehouse to go load from
                    for (var warehouse_av_idx = 0; warehouse_av_idx < available_warehouses.length; warehouse_av_idx++) {
                        var warehouse = available_warehouses[warehouse_av_idx];
                        // on deliver, commnand do not change type
                        for (var type in warehouse.nb_item_by_type) {
                            if (!(type in SolverBrutforceV5.optimal.density.nb_item_by_type)) {
                                // drone can't satisfy the optimal density with this warehouse
                                continue;
                            }
                            var nb_items = warehouse.nb_item_by_type[type];

                            if (0 === nb_items) {
                                // warehouse have been empty for this type, go to next one
                                continue;
                            }

                            var weight = input.weights_by_type[type];
                            var drone_payload = nb_items * weight;
                            //Tools.debug_deep('Path payload : ' + path_payload);
                            // TODO : input.max_payload - drone.payload : use drone pay load inside !! + Multiple type loading ??
                            if (drone_payload > input.max_payload) { // OPTIMM : >= ?
                                drone_payload = input.max_payload;
                                //Tools.debug_deep('Adjusted payload : ' + path_payload);
                            }
                            nb_items = Math.floor(drone_payload / weight);

                            var cost = drone.nb_turn_consumed;
                            var position = drone.position;
                            var delta_cost_to_warehouse = SolverBrutforceV5
                            .computeDistance(position, warehouse.loc);
                            var total_cost = cost + delta_cost_to_warehouse + 1; // our drone go to to warehouse and 1 turn to deliver
                            // Distances must be values between [0..1], associating meanings this way : [best..worst]
                            var euclidian_distance = total_cost / input.nb_turns; // TODO : this one is more like a time distance than euclidian distance
                            // Distances must be values between [0..1], associating meanings this way : [best..worst]
                            // var manana_seguro_distance
                            // = SolverBrutforceV5.computeDistance(
                            //     position, SolverBrutforceV5
                            //     .optimal.density.warehouse_center.loc
                            // );
                            var pondered_distance = euclidian_distance;

                            // TODO : manana seguro distance
                            // var pondered_distance = euclidian_distance
                            // * SolverBrutforceV5.optimal.euclidien_weight
                            // + manana_seguro_distance
                            // * SolverBrutforceV5.optimal.manana_seguro_weight;
                            Tools.assert(!isNaN(total_cost), 'warehouse : Something is wrong with total_cost');
                            Tools.assert(!isNaN(pondered_distance), 'warehouse : Something is wrong with pondered_distance');
                            Tools.assert(!isNaN(nb_items), 'warehouse : Something is wrong with nb_items');
                            Tools.assert(nb_items <= warehouse.nb_item_by_type[type],
                                'warehouse : nb_items can not be higer than warehouse.nb_item_by_type[type]'
                            );

                            if (total_cost < input.nb_turns // Limite to possible move in time availability only
                                && (
                                    null === SolverBrutforceV5.optimal.cmd
                                    || pondered_distance < SolverBrutforceV5.optimal.cmd.pondered_distance
                                )
                            ) {
                                SolverBrutforceV5.optimal.cmd = {
                                    pondered_distance:pondered_distance,
                                    drone:drone,
                                    drone_delta_item: -nb_items,
                                    drone_available_index:drone_av_idx,
                                    warehouse:warehouse,
                                    warehouse_available_index:warehouse_av_idx,
                                    total_cost:total_cost,
                                    drone_cmd:{
                                        type:SolverBrutforce.CMD_LOAD,
                                        drone_id: drone.id,
                                        warehouse_id: warehouse.id,
                                        product_type: type,
                                        nb_items: nb_items,
                                        ['nb_item_by_type_' + type]:
                                        warehouse.nb_item_by_type[type],
                                    }
                                }
                            } else {
                                //Tools.debug({msg:'Not an optimal'});
                            }
                        }
                    }
                }
            }
            // Fetch optimal
            var optimal = SolverBrutforceV5.optimal.cmd;
            if (null === optimal) {
                available_drones = [];
                break;// TODO : remove on each step of algo, instead of all at once if ending...
            }
            Tools.assert(optimal, 'Algo bug ? cmd must be defined or turn ended and not going there any more');
            // send drone cmd
            drone_cmds.push(optimal.drone_cmd);
            SolverBrutforceV5.onCmdSended();
            // update drone availability
            optimal.drone.nb_turn_consumed = optimal.total_cost;
            optimal.drone.nb_items += optimal.drone_delta_item;
            optimal.drone.nb_item_by_type[optimal.drone_cmd.product_type]
            += optimal.drone_delta_item;
            if (optimal.drone.nb_turn_consumed > input.nb_turns) { // TODO : this end condition will never be called, use optimal === null to empty all array at once for now...
                available_drones.splice(optimal.drone_available_index, 1);
                SolverBrutforceV5.onDroneEnding();
                Tools.info('nb_drones lefts : ' + available_drones.length);
            }
            if (SolverBrutforce.CMD_DELIVER === optimal.drone_cmd.type) {
                // update orders availability
                optimal.order.nb_item_by_type[optimal.drone_cmd.product_type]
                -= optimal.drone_delta_item;
                var order_is_fullfilled = false;
                for (var type in optimal.order.nb_item_by_type) {
                    order_is_fullfilled = true;
                    var nb_items = optimal.order.nb_item_by_type[type];
                    if (0 !== nb_items) {
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
                    + optimal.nb_items + ' items at time : ' + optimal.total_cost
                    + ' giving us : ' + local_score + 'pts on ' + GameBoard.global_score
                    + '. End state : Order type [' + optimal.type + ']');
                }
            }
            if (SolverBrutforce.CMD_LOAD === optimal.drone_cmd.type) {
                // update warehouse availability
                optimal.warehouse.nb_item_by_type[optimal.drone_cmd.product_type]
                -= optimal.drone_delta_item;
                var warehouse_is_empty = false;
                for (var type in optimal.warehouse.nb_item_by_type) {
                    warehouse_is_empty = true;
                    var nb_items = optimal.warehouse.nb_item_by_type[type];
                    if (0 !== nb_items) {
                        warehouse_is_empty = false;
                        break;
                    }
                }
                if (warehouse_is_empty) {
                    available_warehouses.splice(optimal.warehouse_available_index,1);
                }
            }
        }
        if (GameBoard.is_paused && needNextIteration()) {
            setTimeout(solveIteration, 2000);
        }
    };
    solveIteration();
    Tools.debug(drone_cmds);

    // TODO: take in account iteration can be paused !!
    // will return before end, need event syst or callback syst to make it work
    return SolverBrutforce.translate_cmd(drone_cmds);
};

if (is_node_js_env) {
    module.exports = SolverBrutforceV5;
}
