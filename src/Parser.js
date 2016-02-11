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
    }
    if (1 === index) {
        output.nb_product_type = parseInt(tokens[0]);
    }
    if (2 === index) {
        output.weights_by_type = [];
        for (var token in tokens) {
            output.weights_by_type.push(token);
        }
        assert(output.weights_by_type.length == output.nb_product_type,
        "You miss some weights type : " + output.weights_by_type.length +
        " instead of " + output.nb_product_type);
    }
    if (3 === index) {
        output.nb_warehouses = parseInt(tokens[0]);
    }
    if (!output.warehouses) {
        output.warehouses = [];
    }
    var warhouse_end_loading_sentinel = 3 + output.nb_warehouses * 2;
    if (index >= 4 && index < warhouse_end_loading_sentinel) {
        if (0 === index % 2) {
            output.warehouses.push({
                location: {x:parseInt(tokens[0]), y:parseInt(tokens[1])},
                nb_item_by_type:[],
            });
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
        }
    }

    if (warhouse_end_loading_sentinel === index) {
        output.nb_orders = parseInt(tokens[0]);
    }

    if (!output.orders) {
        output.orders = [];
    }
    var order_end_loading_sentinel = warhouse_end_loading_sentinel + output.nb_orders * 2;
    var line_pos = -1;
    if (index >= warhouse_end_loading_sentinel && index <= order_end_loading_sentinel) {
        line_pos += 1;
        if (line_pos > 2) {
            line_pos = 0;
        }
        switch (line_pos) {
            case 0:
            output.orders.push({
                location: {x:parseInt(tokens[0]), y:parseInt(tokens[1])},
                nb_item_by_type:[],
            });
            break;
            case 1:
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
            break;
        }
    }
};
