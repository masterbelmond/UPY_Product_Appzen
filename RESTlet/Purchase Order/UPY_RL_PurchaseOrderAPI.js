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
            var paramPurchaseOrderEndpoint = scriptObj.getParameter({
                name: 'custscript_appzen_purch_ord_endpoint'
            });
            var paramPurchaseOrderSearch = scriptObj.getParameter({
                name: 'custscript_appzen_purch_ord_search'
            });
            //endregion COMPANY PREFERENCES

            //region USER PREFERENCES
            var paramSupplierLogs = scriptObj.getParameter({
                name: 'custscript_appzen_supplier_logs'
            });
            //endregion USER PREFERENCES

            //region GLOBAL VAR
            var URI = paramBaseURI + paramPurchaseOrderEndpoint;
            var TYPE = 'type=purchaseorder';
            var NETSUITE_CUSTOMER_ID = '&customer_id=' + paramAppzenCustomerID;
            var ENDPOINT = URI + TYPE + NETSUITE_CUSTOMER_ID;
            //endregion GLOBAL VAR

            /**
             log.debug({
                title : 'PARAMETERS',
                details : 'ENDPOINT : ' + ENDPOINT + ' | Base URI: ' + paramBaseURI + ' | Supplier Endpoint: ' + paramSupplierEndpoint + ' | Search: ' + paramSupplierSearch
            });
             **/

            //region POST DATA
            var postData = [];

            var _data = [];
            var purchaseOrderArr = [];
            var addressArr = [];
            var contactArr = [];

            //region PURCHASE ORDER SEARCH
            var searchSupplier = search.load({
                id: paramPurchaseOrderSearch
            });

            var resultSet = searchSupplier.run();
            searchSupplier.run().each(function(result){

                var columns = result.columns;
                var internalid = result.id;
                var INTERNAL_ID = result.id;

                //external_supplier_id
                var external_purchase_order_number = result.getValue(columns[0]);

                //external_supplier_id
                var external_supplier_id = result.getValue({
                    name: 'internalid',
                    join: 'vendor'
                });

                var payment_term = {};

                var terms = result.getValue({
                    name : 'terms'
                });

                if(!isBlank(terms)) {

                    var objTerms = record.load({
                        type: 'term',
                        id: terms
                    });

                    payment_term.source = objTerms.getValue({
                        fieldId: 'name'
                    });
                    payment_term.code = '';
                    var num_days = objTerms.getValue({
                        fieldId: 'daysuntilnetdue'
                    });

                    if(!isBlank(num_days)) {
                        payment_term.num_days = parseInt(num_days);
                    }
                    else{
                        payment_term.num_days = parseInt(0);
                    }

                    var due_date = result.getValue({
                        name: 'duedate'
                    });

                    if(!isBlank(due_date)){
                        var due_date = new Date(due_date).toISOString();
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
                    })

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

                }
                else{
                    payment_term.source = '';
                    payment_term.code = '';
                    payment_term.num_days = parseInt(0);
                    payment_term.date = '';
                    var discount = [];
                    discount.push({
                        'discount_days': parseInt(0),
                        'discount_percent': parseInt(0)
                    });
                    payment_term.discount = discount;
                }

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

                //org_id
                var org_id = result.getValue({
                    name : 'subsidiarynohierarchy'
                });

                //org_name
                var org_name = result.getText({
                    name : 'subsidiarynohierarchy'
                });

                //region ATTACHMENTS


                var attachmentsBase64 = [];

                //endregion ATTACHMENTS

                //lines.external_line_id
                var lines_external_line_id = result.getValue({
                    name : 'lineuniquekey'
                });

                //lines.external_line_number
                var lines_external_line_number = result.getValue({
                    name : 'line'
                });

                //lines.line_number
                var lines_line_number = result.getValue({
                    name : 'linesequencenumber'
                });

                if(!isBlank(lines_line_number)){
                    lines_line_number = parseInt(lines_line_number);
                }

                //lines.item
                var lines_item = result.getValue({
                    name : 'item'
                });

                if(!isBlank(lines_item)){
                    lines_item = parseInt(lines_item);
                }
                else{
                    lines_item = parseInt(0);
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

                //lines.committedquantity
                var lines_committedquantity = result.getValue({
                    name : 'quantitycommitted'
                });

                if(!isBlank(lines_committedquantity)){
                    lines_committedquantity = parseInt(lines_committedquantity);
                }
                else{
                    lines_committedquantity = parseInt(0);
                }

                //region commited_amount
                var commited_amount = {};

                //lines.commited_amount.amount
                var commited_amount_amount = result.getValue({
                    name : 'amount'
                });
                if(!isBlank(commited_amount_amount)){
                    commited_amount_amount = parseFloat(commited_amount_amount);
                }
                else{
                    commited_amount_amount = parseInt(0);
                }
                //lines.commited_amount.currency_code
                var commited_amountcurrency = result.getText({
                    name : 'currency'
                });

                commited_amount.amount = commited_amount_amount;
                commited_amount.currency_code = commited_amountcurrency;

                //endregion commited_amount

                //region amount
                var amount = {};

                //lines.amount.amount
                var amount_amount = result.getValue({
                    name : 'amount'
                });
                if(!isBlank(amount_amount)){
                    amount_amount = parseFloat(amount_amount);
                }
                else{
                    amount_amount = parseFloat(0.00);
                }
                //lines.amount.currency_code
                var amount_currency_code = result.getText({
                    name : 'currency'
                });

                amount.amount = amount_amount;
                amount.currency_code = amount_currency_code;

                //endregion amount

                //region unit_list_price
                var base_unit_price = {};

                //lines.base_unit_price.amount
                var base_unit_price_amount = result.getValue({
                    name : 'baseprice',
                    join: 'item'
                });

                if(!isBlank(base_unit_price_amount)){
                    base_unit_price_amount = parseFloat(base_unit_price_amount);
                }
                else{
                    base_unit_price_amount = parseFloat(0.00);
                }

                //lines.unit_list_price.currency_code
                var base_unit_price_currency_code = result.getText({
                    name : 'currency'
                });

                base_unit_price.amount = base_unit_price_amount;
                base_unit_price.currency_code = base_unit_price_currency_code;

                //endregion unit_list_price


                var lines = [];
                lines.push({
                    'external_line_id' : lines_external_line_id,
                    'external_line_number' : lines_external_line_number,
                    'line_number' : lines_line_number,
                    'org_id' : org_id,
                    'org_name' : org_name,
                    'item_id' : lines_item,
                    'item_description' : lines_item_description,
                    'unit_of_measure' : lines_unit_of_measure,
                    'commited_quantity' : lines_committedquantity,
                    'commited_amount' : commited_amount,
                    'quantity' : lines_quantity,
                    'amount' : amount,
                    'base_unit_price' : base_unit_price
                });

                purchaseOrderArr.push({
                    'external_purchase_order_number' : external_purchase_order_number,
                    'external_supplier_id' : external_supplier_id,
                    'payment_term' : payment_term,
                    'total' : _total,
                    'exchange_rate' : exchange_rate,
                    'org_id' : org_id,
                    'org_name' : org_name,
                    'lines' : lines,
                    'attachmentsBase64' : attachmentsBase64
                });
                return true;
            });

            //endregion PURCHASE ORDER SEARCH

            var payloadGrouped = groupBy(purchaseOrderArr, 'external_purchase_order_number');
            log.debug('payload PO', JSON.stringify(payloadGrouped));

            var _dataArr = [];

            for(var i in payloadGrouped){

                var purchaseOrderArrTemp = payloadGrouped[i].data;

                if(purchaseOrderArrTemp.length > 1){
                    //multiple lines
                    var mainArr = purchaseOrderArrTemp[0];
                    for(var t in purchaseOrderArrTemp){

                        if(parseInt(t) != 0) {
                            mainArr.lines.push(purchaseOrderArrTemp[t].lines[0]);
                        }
                    }
                    _dataArr.push(mainArr);
                }
                else{
                    _dataArr.push(purchaseOrderArrTemp[0]);
                }
            }

            postData.push(_dataArr);
            return postData;

            //endregion POST DATA
        }

        return {
            get : doGet,
            post : doPost
        };
    }
);