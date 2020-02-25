/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/search', 'N/log', 'N/email', 'N/runtime', 'N/error','N/file', 'N/http', 'N/https', './Appzen_Integration_library.js'],

    function (record, search, log, email, runtime, error, file, http, https) {

        function execute() {

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
                name: 'custscript_appzen_sc_invoice_logs'
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
            var postData = {};

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

                //external_invoice_id
                var external_invoice_id = result.getValue({
                    name : 'internalid'
                });

                //external_invoice_number
                var external_invoice_number = result.getValue(columns[1]);

                //external_supplier_id
                var external_supplier_id = result.getValue({
                    name : 'entity'
                });

                //invoice_date
                var invoice_date = result.getValue({
                    name : 'trandate'
                });

                //accounting-date
                var accounting_date = result.getValue({
                    name : 'trandate'
                });

                //due_date
                var due_date = result.getValue({
                    name : 'duedate'
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
                        name : 'amount'
                    });

                    var currency = result.getText({
                        name : 'currency'
                    });

                    _total.amount = total;
                    _total.currency = currency;

                }


                //payment_status
                var payment_status = result.getValue({
                    name : 'statusref'
                });

                //payment_date
                var payment_date = result.getValue({
                    name : 'closedate'
                });

                var _total = {};

                //total.amount
                var total = result.getValue({
                    name : 'total'
                });

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

                exchange_rate.to_currency_code = exchange_rate_to_currency_code;
                exchange_rate.from_currency_code = exchange_rate_from_currency_code;
                exchange_rate.conversion_rate = exchange_rate_conversion_rate;

                //external_status
                var payment_status = result.getValue({
                    name : 'payment_status'
                });

                //external_status
                var external_status = result.getValue({
                    name : 'line'
                });

                //region ATTACHMENTS PENDING
                var attachments = [];
                //endregion ATTACHMENTS PENDING

                //lines.line_number
                var lines_line_number = result.getValue({
                    name : 'linesequencenumber'
                });

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

                //lines.item_description
                var lines_item_description = result.getValue({
                    name : 'salesdescription',
                    join: 'item'
                });

                //lines.quantity
                var lines_quantity = result.getValue({
                    name : 'quantity'
                });

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

                //endregion Lines


                var lines = [];
                lines.push({
                    'external_line_number' : lines_external_line_number,
                    'line_number' : lines_line_number,
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
                    'invoice_date' : invoice_date,
                    'accounting-date' : accounting_date,
                    'external_supplier_id' : external_supplier_id,
                    'payment_term' : payment_term,
                    'payment_status' : payment_status,
                    'payment_date' : payment_date,
                    'due_date' : due_date,
                    'total' : total,
                    'exchange_rate' : exchange_rate,
                    'bill_to_address' : bill_to_address,
                    'ship_to_address' : ship_to_address,
                    'external_status' : external_status,
                    'lines' : lines
                });
                return true;
            });

            //endregion INVOICE SEARCH

            postData = invoiceArr;
            //endregion POST DATA

            var appzenResponse = https.post({
                url : ENDPOINT,
                body : postData
            });

            var code = appzenResponse.code;
            var body = JSON.stringify(appzenResponse.body);

            log.debug({
                title : 'Appzen Response Code',
                details : 'Code: ' + code
            });

            log.debug({
                title : 'Appzen Response Body',
                details : body
            });

            if(IS_LOG_ON) {

                var _log = {
                    'datetime' : new Date(),
                    'request' : postData,
                    'response' : body,
                    'url' : ENDPOINT,
                    'code' : code,
                    'record_type' : RECORD_TYPE_LIST.VENDOR
                };

                generateLog(record, _log);
            }
        }

        return {
            execute: execute
        };
    }
);