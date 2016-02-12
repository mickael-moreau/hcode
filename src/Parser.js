var Parser = {};

// 100 100 3 50 500
// 100rows,1 00columns,3drones,50turns,maxpayloadis500u
Parser.loadBoard = function(index, input, output) {
    console.log('' + index + ':' + input);
    var tokens = input.split(' ');

    if (0 === index) {
        output.nb_row = parseInt(tokens[0]);
        output.nb_columns = parseInt(tokens[1]);
        output.nb_drones = parseInt(tokens[2]);
        output.nb_turns = parseInt(tokens[3]);
        output.max_payload = parseInt(tokens[4]);
        console.log('{0}rows, {1} columns, {2} drones, {3} turns, max payload is {4}u'
        .format(output.nb_row, output.nb_columns, output.nb_drones,
            output.nb_turns, output.max_payload
        ));
    }
    if (1 === index) {
        output.nb_product_type = parseInt(tokens[0]);
        console.log('There are {0} different product types.'
        .format(output.nb_product_type));
    }
    if (2 === index) {
        output.weights_by_type = [];
        for (var token in tokens) {
            output.weights_by_type.push(token);
        }
        assert(output.weights_by_type.length == output.nb_product_type,
        "You miss some weights type : " + output.weights_by_type.length +
        " instead of " + output.nb_product_type);

        console.log('The product types weight : {0}'
        .format(output.weights_by_type.join('u, ')));
    }
    if (3 === index) {
        output.nb_warehouses = parseInt(tokens[0]);
        console.log('There are {0} warehouses.'
        .format(output.nb_warehouses));
    }
    if (!output.warehouses) {
        output.warehouses = [];
    }
    var warhouse_end_loading_sentinel = 3 + output.nb_warehouses * 2;
    var warhouse_it = 0;
    if (index >= 4 && index < warhouse_end_loading_sentinel) {
        if (0 === index % 2) {
            var warhouse = {
                loc: {x:parseInt(tokens[0]), y:parseInt(tokens[1])},
                nb_item_by_type:[],
            };
            console.log('id:{0} warehouse is located at [{1}]'
            .format(warhouse_it, warhouse.loc.join(', ')));
            output.warehouses.push(warhouse);
        } else {
            for (var token in tokens) {
                var warehouse = output.warehouses[output.warehouses.length - 1];
                var type = parseInt(token);
                if (type in warehouse.nb_item_by_type) {
                    warehouse.nb_item_by_type[type] = 1;
                } else {
                    warehouse.nb_item_by_type[type] += 1;
                }
            }
            console.log('It stores {0}'.format(warehouse.nb_item_by_type
                .map(function(x){
                    return "{0} items of product {1}".format(
                        warehouse.nb_item_by_type[x], x);
                })
                .join(', ')
            ));
            warhouse_it += 1;
        }
    }

    if (warhouse_end_loading_sentinel === index) {
        output.nb_orders = parseInt(tokens[0]);
        console.log('There are {0} orders.'.format(output.nb_orders));
    }

    if (!output.orders) {
        output.orders = [];
    }
    var order_end_loading_sentinel = warhouse_end_loading_sentinel + output.nb_orders * 2;
    var line_pos = -1;
    var order_id = 0;
    if (index >= warhouse_end_loading_sentinel && index <= order_end_loading_sentinel) {
        line_pos += 1;
        if (line_pos > 2) {
            line_pos = 0;
        }
        switch (line_pos) {
            case 0:
            var order = {
                loc : {x:parseInt(tokens[0]), y:parseInt(tokens[1])},
                nb_item_by_type:[],
            };
            console.log('order:{0} to be delivered to [{1}]'
            .format(order.loc.join(', ')));
            output.orders.push(order);
            break;
            case 1:
            var nb_item = parseInt(tokens[0]);
            console.log('order:{0} contains {1} items.'
            .format(nb_item));
            // TODO : contole for 2
            break;
            case 2:
            for (var token in tokens) {
                var order = output.orders[output.orders.length - 1];
                var type = parseInt(token);
                if (type in order.nb_item_by_type) {
                    order.nb_item_by_type[type] = 1;
                } else {
                    order.nb_item_by_type[type] += 1;
                }
            }
            console.log('It stores {0}'.format(order.nb_item_by_type
                .map(function(x){
                    return "{0} items of product {1}".format(
                        order.nb_item_by_type[x], x);
                })
                .join(', ')
            ));
            order_id += 1;
            break;
        }
    }
};
