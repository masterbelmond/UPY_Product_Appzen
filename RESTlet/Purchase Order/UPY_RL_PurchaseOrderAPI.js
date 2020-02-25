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
            var postData = {};

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

                //external_supplier_id
                var external_purchase_order_number = result.getValue(columns[0]);

                //external_supplier_id
                var external_supplier_id = result.getValue({
                    name : 'internalid'
                });

                //org_id
                var org_id = result.getValue({
                    name : 'subsidiarynohierarchy'
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
                    payment_term.num_days = objTerms.getValue({
                        fieldId: 'daysuntilnetdue'
                    });
                    payment_term.date = result.getValue({
                        name: 'duedate'
                    });

                    var discount_days = objTerms.getValue({
                        fieldId : 'daysuntilexpiry'
                    });

                    var discount_percent = objTerms.getValue({
                        fieldId : 'discountpercent'
                    })

                    var discount = [];
                    discount.push({
                        'discount_days': discount_days,
                        'discount_percent': discount_percent
                    });

                    payment_term.discount = discount;

                    var _total = {};

                    var total = result.getValue({
                        name : 'total'
                    });

                    var currency = result.getValue({
                        name : 'currency'
                    });

                    _total.amount = total;
                    _total.currency = currency;

                }

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

                //lines.item
                var lines_item = result.getValue({
                    name : 'item'
                });

                //lines.item_description
                var lines_item_description = result.getValue({
                    name : 'salesdescription',
                    join: 'item'
                });

                //lines.unit_of_measure
                var lines_unit_of_measure = result.getValue({
                    name : 'unit'
                });

                //lines.committedquantity
                var lines_committedquantity = result.getValue({
                    name : 'quantitycommitted'
                });

                //region commited_amount
                var commited_amount = {};

                //lines.commited_amount.amount
                var commited_amount_amount = result.getValue({
                    name : 'amount'
                });
                //lines.commited_amount.currency_code
                var commited_amountcurrency = result.getValue({
                    name : 'currency'
                });

                commited_amount.amount = commited_amount_amount;
                commited_amount.currency = commited_amountcurrency;

                //endregion commited_amount

                //lines.quantity
                var lines_quantity = result.getValue({
                    name : 'quantity'
                });

                //region amount
                var amount = {};

                //lines.amount.amount
                var amount_amount = result.getValue({
                    name : 'amount'
                });
                //lines.amount.currency_code
                var amount_currency_code = result.getValue({
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
                //lines.unit_list_price.currency_code
                var base_unit_price_currency_code = result.getValue({
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
                    'item' : lines_item,
                    'item_description' : lines_item_description,
                    'unite_of_measure' : lines_unit_of_measure,
                    'commited_quantity' : lines_committedquantity,
                    'commited_amount' : commited_amount,
                    'quantity' : lines_quantity,
                    'amount' : amount,
                    'base_unit_price' : base_unit_price
                });

                purchaseOrderArr.push({
                    'external_purchase_order_number' : external_purchase_order_number,
                    'external_supplier_id' : external_supplier_id,
                    'org_id' : org_id,
                    'payment_term' : payment_term,
                    'total' : _total,
                    'lines' : lines
                });
                return true;
            });

            //endregion PURCHASE ORDER SEARCH

            postData = purchaseOrderArr;

            return postData;

            //endregion POST DATA
        }

        return {
            get : doGet,
            post : doPost
        };
    }
);