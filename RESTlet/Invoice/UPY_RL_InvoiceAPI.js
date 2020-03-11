/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define([ 'N/log', 'N/record', 'N/search', 'N/runtime', './Appzen_Integration_library.js'],

    function(log, record, search, runtime) {

        function doPost(){
        }

        function doGet(requestParams) {

            //region COMPANY PREFERENCES
            var scriptObj = runtime.getCurrentScript();

            var paramBaseURI = scriptObj.getParameter({
                name: 'custscript_appzen_base_uri'
            });
            var paramAppzenCustomerID = scriptObj.getParameter({
                name: 'custscript_appzen_customer_id'
            });
            var paramInvoiceEndpoint = scriptObj.getParameter({
                name: 'custscript_appzen_invoice_endpoint'
            });
            var paramInvoiceSearch = scriptObj.getParameter({
                name: 'custscript_appzen_invoice_search'
            });
            //endregion COMPANY PREFERENCES

            //region USER PREFERENCES
            var IS_LOG_ON = scriptObj.getParameter({
                name: 'custscript_appzen_sc_supplier_logs'
            });
            //endregion USER PREFERENCES

            //region GLOBAL VAR
            var URI = paramBaseURI + paramInvoiceEndpoint;
            var TYPE = 'type=invoice';
            var NETSUITE_CUSTOMER_ID = '&customer_id=' + paramAppzenCustomerID;
            var ENDPOINT = URI + TYPE + NETSUITE_CUSTOMER_ID;
            //endregion GLOBAL VAR

            log.debug({
                title : 'PARAMETERS',
                details : 'ENDPOINT : ' + ENDPOINT + ' | Base URI: ' + paramBaseURI + ' | Invoice Endpoint: ' + paramInvoiceEndpoint + ' | Search: ' + paramInvoiceSearch + ' | Capture Logs' + IS_LOG_ON
            });

            //region POST DATA
            var postData = [];

            var _data = [];
            var invoiceArr = [];
            var addressArr = [];
            var contactArr = [];

            //region INVOICE SEARCH
            var searchSupplier = search.load({
                id: paramInvoiceSearch
            });

            var resultSet = searchSupplier.run();
            searchSupplier.run().each(function(result){

                var columns = result.columns;
                var internalid = result.id;
                var INTERNAL_ID = result.id;

                //external_invoice_id
                var external_invoice_id = result.getValue({
                    name : 'internalid'
                });

                //external_invoice_number
                var external_invoice_number = result.getValue(columns[1]);

                //external_supplier_id
                var external_supplier_id = result.getValue({
                    name: 'internalid',
                    join: 'vendor'
                });

                //invoice_date
                var invoice_date = result.getValue({
                    name : 'trandate'
                });

                if(!isBlank(invoice_date)){
                    invoice_date = new Date(invoice_date).toISOString();
                }

                //accounting-date
                var accounting_date = result.getValue({
                    name : 'trandate'
                });

                if(!isBlank(accounting_date)){
                    accounting_date = new Date(accounting_date).toISOString();
                }

                //due_date
                var due_date = result.getValue({
                    name : 'duedate'
                });

                if(!isBlank(due_date)){
                    due_date = new Date(due_date).toISOString();
                }

                var payment_term = {};

                var terms = result.getValue({
                    name : 'terms'
                });

                var document_type = result.getValue({
                    name : 'type'
                });

                if(!isBlank(document_type)){
                    if(document_type == 'VendBill'){
                        document_type = 'invoice';
                    }
                    else if(document_type == 'VendCred'){
                        document_type = 'credit note';
                    }
                }

                if(!isBlank(terms)) {

                    var objTerms = record.load({
                        type: 'term',
                        id: terms
                    });

                    payment_term.source = objTerms.getValue({
                        fieldId: 'name'
                    });
                    var num_days = objTerms.getValue({
                        fieldId: 'daysuntilnetdue'
                    });

                    if(!isBlank(num_days)) {
                        payment_term.num_days = parseInt(num_days);
                    }
                    else{
                        payment_term.num_days = parseInt(0);
                    }

                    var tempDueDate = result.getValue({
                        name: 'duedate'
                    });

                    if(!isBlank(tempDueDate)){
                        var due_date = new Date(tempDueDate).toISOString();
                        payment_term.date = due_date;
                    }

                    var discount_days = objTerms.getValue({
                        fieldId : 'daysuntilexpiry'
                    });

                    if(!isBlank(discount_days)) {
                        discount_days = parseInt(discount_days);
                    }
                    else{
                        discount_days = parseInt(0);
                    }

                    var discount_percent = objTerms.getValue({
                        fieldId : 'discountpercent'
                    });

                    if(!isBlank(discount_percent)){
                        discount_percent = parseFloat(discount_percent);
                    }
                    else{
                        discount_percent = parseInt(0);
                    }

                    var discount = [];
                    discount.push({
                        'discount_days': discount_days,
                        'discount_percent': discount_percent
                    });

                    payment_term.discount = discount;

                    var _total = {};

                    var total = result.getValue({
                        name : 'amount'
                    });
                    if(!isBlank(total)){
                        total = parseFloat(total);
                    }

                    var currency = result.getText({
                        name : 'currency'
                    });

                    _total.amount = total;
                    _total.currency_code = currency;

                }
                else{
                    payment_term.source = '';
                    payment_term.num_days = parseInt(0);
                    payment_term.date = '';
                    var discount = [];
                    discount.push({
                        'discount_days': parseInt(0),
                        'discount_percent': parseInt(0)
                    });
                    payment_term.discount = discount;
                }


                //payment_status
                var payment_status = result.getValue({
                    name : 'statusref'
                });

                //payment_date
                var payment_date = result.getValue({
                    name : 'closedate'
                });

                if(!isBlank(payment_date)){
                    payment_date = new Date(payment_date).toISOString();
                }

                var _total = {};

                //total.amount
                var total = result.getValue({
                    name : 'total'
                });
                if(!isBlank(total)){
                    total = parseFloat(total);
                }

                //total.currency_code
                var currency_code = result.getText({
                    name : 'currency'
                });

                _total.amount = total;
                _total.currency_code = currency_code;

                var exchange_rate = {};
                //exchange_rate.to_currency_code
                var exchange_rate_to_currency_code = result.getText({
                    name : 'currency'
                });

                //exchange_rate.from_currency_code
                var exchange_rate_from_currency_code = result.getText({
                    name : 'currency'
                });

                //exchange_rate.conversion_rate
                var exchange_rate_conversion_rate = result.getValue({
                    name : 'exchangerate'
                });

                if(!isBlank(exchange_rate_conversion_rate)){
                    exchange_rate_conversion_rate = parseFloat(exchange_rate_conversion_rate);
                }

                exchange_rate.to_currency_code = exchange_rate_to_currency_code;
                exchange_rate.from_currency_code = exchange_rate_from_currency_code;
                exchange_rate.conversion_rate = exchange_rate_conversion_rate;

                //external_status
                var external_status = result.getValue({
                    name : 'statusRef'
                });

                if(isBlank(external_status)){
                    external_status = '';
                }

                //lines.line_number
                var lines_line_number = result.getValue({
                    name : 'linesequencenumber'
                });

                if(!isBlank(lines_line_number)){
                    lines_line_number = parseInt(lines_line_number);
                }

                var ship_to_address = {};

                //ship_to_address.address_line1
                var ship_to_address_address_line1 = result.getValue({
                    name: "address1",
                    join: "shippingAddress"
                });

                //ship_to_address.address_line2
                var ship_to_address_address_line2 = result.getValue({
                    name: "address2",
                    join: "shippingAddress"
                });

                //ship_to_address.address_line3
                var ship_to_address_address_line3 = result.getValue({
                    name: "address3",
                    join: "shippingAddress"
                });

                //ship_to_address.city
                var ship_to_address_city = result.getValue({
                    name: "city",
                    join: "shippingAddress"
                });

                //ship_to_address.state
                var ship_to_address_state = result.getValue({
                    name: "state",
                    join: "shippingAddress"
                });

                //ship_to_address.zip
                var ship_to_address_zip = result.getValue({
                    name: "zip",
                    join: "shippingAddress"
                });

                //ship_to_address.country
                var ship_to_address_country = result.getValue({
                    name: "country",
                    join: "shippingAddress"
                });

                //ship_to_address.phone
                var ship_to_address_phone = result.getValue({
                    name: "phone",
                    join: "shippingAddress"
                });

                ship_to_address.address_line1 = ship_to_address_address_line1;
                ship_to_address.address_line2 = ship_to_address_address_line2;
                ship_to_address.address_line3 = ship_to_address_address_line3;
                ship_to_address.cite = ship_to_address_city;
                ship_to_address.state = ship_to_address_state;
                ship_to_address.zip = ship_to_address_zip;
                ship_to_address.state = ship_to_address_state;
                ship_to_address.country = ship_to_address_country;
                ship_to_address.phone = ship_to_address_phone;

                var bill_to_address = {};

                //bill_to_address.address_line1
                var bill_to_address_address_line1 = result.getValue({
                    name: "address1",
                    join: "billingAddress"
                });

                //bill_to_address.address_line2
                var bill_to_address_address_line2 = result.getValue({
                    name: "address2",
                    join: "billingAddress"
                });

                //bill_to_address.address_line3
                var bill_to_address_address_line3 = result.getValue({
                    name: "address3",
                    join: "billingAddress"
                });

                //bill_to_address.city
                var bill_to_address_city = result.getValue({
                    name: "city",
                    join: "billingAddress"
                });

                //bill_to_address.state
                var bill_to_address_state = result.getValue({
                    name: "state",
                    join: "billingAddress"
                });

                //bill_to_address.zip
                var bill_to_address_zip = result.getValue({
                    name: "zip",
                    join: "billingAddress"
                });

                //bill_to_address.country
                var bill_to_address_country = result.getValue({
                    name: "country",
                    join: "billingAddress"
                });

                //bill_to_address.phone
                var bill_to_address_phone = result.getValue({
                    name: "phone",
                    join: "billingAddress"
                });

                bill_to_address.address_line1 = bill_to_address_address_line1;
                bill_to_address.address_line2 = bill_to_address_address_line2;
                bill_to_address.address_line3 = bill_to_address_address_line3;
                bill_to_address.cite = bill_to_address_city;
                bill_to_address.state = bill_to_address_state;
                bill_to_address.zip = bill_to_address_zip;
                bill_to_address.state = bill_to_address_state;
                bill_to_address.country = bill_to_address_country;
                bill_to_address.phone = bill_to_address_phone;

                //region Lines

                //lines.external_line_number
                var lines_external_line_number = result.getValue({
                    name : 'lineuniquekey'
                });

                //lines.line_number
                var lines_line_number = result.getValue({
                    name : 'linesequencenumber'
                });

                if(!isBlank(lines_line_number)){
                    lines_line_number = parseInt(lines_line_number);
                }

                //lines.item_description
                var lines_item_description = result.getText({
                    name : 'item'
                });

                //lines.quantity
                var lines_quantity = result.getValue({
                    name : 'quantity'
                });

                if(isBlank(lines_item_description)){
                    lines_item_description = result.getText({
                        name : 'expensecategory'
                    });

                    lines_quantity = parseInt(1);
                }

                if(!isBlank(lines_quantity)) {
                    lines_quantity = parseInt(lines_quantity);
                }
                else{
                    lines_quantity = parseInt(0);
                }

                //lines.unit_of_measure
                var lines_unit_of_measure = result.getValue({
                    name : 'unit'
                });

                //region unit_price
                var lines_unit_price = {};

                //lines.base_unit_price.amount
                var lines_unit_price_amount = result.getValue({
                    name : 'rate'
                });

                if(!isBlank(lines_unit_price_amount)){
                    lines_unit_price_amount = parseFloat(lines_unit_price_amount);
                }
                else{
                    lines_unit_price_amount = parseFloat(0.00);
                }

                //lines.unit_list_price.currency_code
                var lines_unit_price_currency_code = result.getText({
                    name : 'currency'
                });

                lines_unit_price.amount = lines_unit_price_amount;
                lines_unit_price.currency_code = lines_unit_price_currency_code;

                //endregion unit_price


                //region total_price
                var lines_total_price = {};

                //lines.base_unit_price.amount
                var lines_total_price_amount = result.getValue({
                    name : 'amount'
                });

                if(!isBlank(lines_total_price_amount)){
                    lines_total_price_amount = parseFloat(lines_total_price_amount);
                }
                else{
                    lines_total_price_amount = parseFloat(0.00);
                }


                //lines.unit_list_price.currency_code
                var lines_total_price_currency_code = result.getText({
                    name : 'currency'
                });

                lines_total_price.amount = lines_total_price_amount;
                lines_total_price.currency_code = lines_total_price_currency_code;

                //endregion unit_price

                //lines.unit_of_measure
                var lines_unit_of_measure = result.getValue({
                    name : 'unit'
                });

                //lines.external_status
                var lines_external_status = result.getValue({
                    name : 'statusref'
                });

                //lines.external_purchase_order_number
                var lines_external_purchase_order_number = result.getValue({
                    name : 'tranid',
                    join: 'appliedToTransaction'
                });

                //endregion Lines


                var lines = [];
                lines.push({
                    'external_line_number' : lines_external_line_number,
                    'line_number' : lines_line_number,
                    'external_purchase_order_number' : lines_external_purchase_order_number,
                    'item_description' : lines_item_description,
                    'quantity' : lines_quantity,
                    'unit_price' : lines_unit_price,
                    'total_price' : lines_total_price,
                    'unit_of_measure' : lines_unit_of_measure,
                    'external_status' : lines_external_status
                });
                invoiceArr.push({
                    'external_invoice_id' : external_invoice_id,
                    'external_invoice_number' : external_invoice_number,
                    'external_supplier_id' : external_supplier_id,
                    'invoice_date' : invoice_date,
                    'accounting-date' : accounting_date,
                    'document_type' : document_type,
                    'payment_term' : payment_term,
                    'payment_status' : lines_external_status,
                    'payment_date' : payment_date,
                    'due_date' : due_date,
                    'total' : _total,
                    'exchange_rate' : exchange_rate,
                    'bill_to_address' : bill_to_address,
                    'ship_to_address' : ship_to_address,
                    'external_status' : external_status,
                    'lines' : lines
                });

                return true;
            });

            //endregion INVOICE SEARCH


            var payloadGrouped = groupBy(invoiceArr, 'external_invoice_id');

            log.debug('payloadGrouped ', JSON.stringify(payloadGrouped));

            var _data = [];

            for(var i in payloadGrouped){

                var invoiceArrTemp = payloadGrouped[i];

                if(invoiceArrTemp.length > 1){
                    //multiple ilines
                    var mainArr = invoiceArrTemp[0];
                    for(var t in invoiceArrTemp){

                        if(parseInt(t) != 0) {
                            mainArr.lines.push(invoiceArrTemp[t].lines);
                        }
                    }
                    _data.push(invoiceArrTemp);
                    //log.debug('2 | Sequence: ' + i, invoiceArrTemp);
                }
                else{
                    _data.push(invoiceArrTemp);
                    //log.debug('1 | Sequence: ' + i, invoiceArrTemp);
                }
            }

            postData.push(_data);


            postData = invoiceArr;
            //endregion POST DATA

            return postData;
        }

        var groupBy = function(xs, key) {
            return xs.reduce(function(rv, x) {
                (rv[x[key]] = rv[x[key]] || []).push(x);
                return rv;
            }, {});
        };

        return {
            get : doGet,
            post : doPost
        };
    }
);