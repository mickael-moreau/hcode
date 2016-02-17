var Parser = {
    current_warhouses_it:0,
    current_order_id:0,
    order_modulo:0,
};

// 100 100 3 50 500
// 100rows,1 00columns,3drones,50turns,maxpayloadis500u
Parser.loadBoard = function(index, input, output) {
    Tools.debug_deep('' + index + ':' + input);
    var tokens = input.split(' ');

    if (0 === index) {
        output.nb_row = parseInt(tokens[0]);
        assert(!isNaN(output.nb_row), 'nb_row should be a defined number');
        output.nb_columns = parseInt(tokens[1]);
        assert(!isNaN(output.nb_columns), 'nb_columns should be a defined number');
        output.nb_drones = parseInt(tokens[2]);
        assert(!isNaN(output.nb_drones), 'nb_drones should be a defined number');
        output.nb_turns = parseInt(tokens[3]);
        assert(!isNaN(output.nb_turns), 'nb_turns should be a defined number');
        output.max_payload = parseInt(tokens[4]);
        assert(!isNaN(output.max_payload), 'max_payload should be a defined number');
        Tools.debug('{0} rows, {1} columns, {2} drones, {3} turns, max payload is {4}u'
        .format(output.nb_row, output.nb_columns, output.nb_drones,
            output.nb_turns, output.max_payload
        ));
    }
    if (1 === index) {
        output.nb_product_type = parseInt(tokens[0]);
        assert(!isNaN(output.nb_product_type), 'nb_product_type should be a defined number');
        Tools.debug('There are {0} different product types.'
        .format(output.nb_product_type));
    }
    if (2 === index) {
        output.weights_by_type = [];
        for (var it = 0; it < tokens.length; it++) {
            var token = parseInt(tokens[it]);
            assert(!isNaN(token), 'nb_product_type should be a defined number');
            output.weights_by_type.push(token);
        }
        assert(output.weights_by_type.length == output.nb_product_type,
            "You miss some weights type : " + output.weights_by_type.length +
            " instead of " + output.nb_product_type
        );

        Tools.debug('The product types weight : {0}'
        .format(output.weights_by_type.join('u, ')));
    }
    if (3 === index) {
        output.nb_warehouses = parseInt(tokens[0]);
        assert(!isNaN(output.nb_warehouses), 'nb_warehouses should be a defined number');
        Tools.debug('There are {0} warehouses.'
        .format(output.nb_warehouses));
    }
    if (!output.warehouses) {
        output.warehouses = [];
    }
    var warhouse_end_loading_sentinel = 3 + output.nb_warehouses * 2;
    if (index >= 4 && index <= warhouse_end_loading_sentinel) {
        if (0 === index % 2) {
            var warhouse = {
                id: Parser.current_warhouses_it,
                loc: {x:parseInt(tokens[0]), y:parseInt(tokens[1])},
                nb_item_by_type:{},
            };
            assert(!isNaN(warhouse.loc.x) && !isNaN(warhouse.loc.y)
            , 'warhouse.loc.{x,y} should be defined number');
            Tools.debug('warehouse[{0}] is located at [{1}]'
            .format(Parser.current_warhouses_it, Tools.reduce(
                Tools.reduce_printer, warhouse.loc, []).join(', ')
            ));
            output.warehouses.push(warhouse);
        } else {
            for (var it = 0; it < tokens.length; it++) {
                var token = tokens[it]
                var warehouse = output.warehouses[output.warehouses.length - 1];
                var nb_item = parseInt(token);
                assert(!isNaN(nb_item)
                , 'nb_item for warehouse.nb_item_by_type should be a defined number');
                warehouse.nb_item_by_type[it] = nb_item;
            }
            Tools.debug('warehouse[{0}] stock : {1}'.format(Parser.current_warhouses_it,
                Tools.reduce(function (k, v, initial) {
                    if (v) {
                        initial.push("{0} items of product type {1}".format(v, k));
                    }
                    return initial;
                }, warehouse.nb_item_by_type, []).join(', ')
            ));
            Parser.current_warhouses_it += 1;
        }
    }

    if (warhouse_end_loading_sentinel + 1 === index) {
        output.nb_orders = parseInt(tokens[0]);
        assert(!isNaN(output.nb_orders), 'nb_orders should be a defined number');
        Tools.debug('There are {0} orders.'.format(output.nb_orders));
    }

    if (!output.orders) {
        output.orders = [];
    }
    var order_end_loading_sentinel = warhouse_end_loading_sentinel + 1
    + output.nb_orders * 3;
    if (index >= (warhouse_end_loading_sentinel + 2)
    && index <= order_end_loading_sentinel) {
        switch (Parser.order_modulo) {
            case 0:
            var order = {
                id : Parser.current_order_id,
                loc : {x:parseInt(tokens[0]), y:parseInt(tokens[1])},
                nb_item_by_type:{},
            };
            assert(!isNaN(order.loc.x) && !isNaN(order.loc.y)
            , 'order.loc.{x,y} should be defined number');
            Tools.debug('order[{0}] to be delivered to [{1}]'
            .format(Parser.current_order_id, Tools.reduce(
                Tools.reduce_printer, order.loc, []).join(', ')
            ));
            output.orders.push(order);
            break;
            case 1:
            var nb_item = parseInt(tokens[0]);
            assert(!isNaN(nb_item), 'nb_item for order be a defined number');
            Tools.debug('order[{0}] contains {1} items.'
            .format(Parser.current_order_id, nb_item));
            // TODO : contole for 2
            break;
            case 2:
            for (var it = 0; it < tokens.length; it++) {
                var token = tokens[it]
                var order = output.orders[output.orders.length - 1];
                var type = parseInt(token);
                assert(!isNaN(type)
                , 'type for order.nb_item_by_type should be a defined number');
                if (type in order.nb_item_by_type) {
                    order.nb_item_by_type[type] += 1;
                } else {
                    order.nb_item_by_type[type] = 1;
                }
            }
            Tools.debug('Order[{0}] commande : {1}'.format(Parser.current_order_id,
                Tools.reduce(function (k, v, initial) {
                    if (v) {
                        initial.push("{0} items of product type {1}".format(v, k));
                    }
                    return initial;
                }, order.nb_item_by_type, []).join(', ')
            ));
            Parser.current_order_id += 1;
            break;
        }
        Parser.order_modulo += 1;
        if (Parser.order_modulo > 2) {
            Parser.order_modulo = 0;
        }
    }
};

if (typeof window === "undefined" || window === null) {
    module.exports = Parser;
}
