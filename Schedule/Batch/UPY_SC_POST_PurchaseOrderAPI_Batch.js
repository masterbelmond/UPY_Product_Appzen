/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/search', 'N/log', 'N/email', 'N/runtime', 'N/error','N/file', 'N/http', 'N/https', 'N/keyControl', 'N/sftp', 'N/task', './Appzen_Integration_library.js'],

    function (record, search, log, email, runtime, error, file, http, https, keyControl, sftp, task) {

        function execute() {

            try {
                var IS_SERVER_FILE = true;
                var IS_TRIGGER_FILE = true;

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

                var paramAppzenSFTP_URL = scriptObj.getParameter({
                    name: 'custscript_appzen_sftp_url'
                });
                var paramAppzenSFTP_username = scriptObj.getParameter({
                    name: 'custscript_appzen_sftp_username'
                });
                var paramAppzenSFTP_dir = scriptObj.getParameter({
                    name: 'custscript_appzen_sftp_root_dir'
                });
                var paramAppzenSFTP_integration_folder = scriptObj.getParameter({
                    name: 'custscript_appzen_integration_folder_id'
                });

                var paramAppzenSFTP_invoice_folder = scriptObj.getParameter({
                    name: 'custscript_appzen_sftp_dir_purch_ord'
                });

                var paramAppzenBatch_Limit = scriptObj.getParameter({
                    name: 'custscript_appzen_batch_limit'
                });
                //endregion COMPANY PREFERENCES

                //region USER PREFERENCES
                var IS_LOG_ON = scriptObj.getParameter({
                    name: 'custscript_appzen_sc_purch_ord_logs'
                });
                //endregion USER PREFERENCES

                //region GLOBAL VAR
                var URI = paramBaseURI + paramPurchaseOrderEndpoint;
                var TYPE = 'type=purchaseorder';
                var NETSUITE_CUSTOMER_ID = '&customer_id=' + paramAppzenCustomerID;
                var ENDPOINT = URI + TYPE + NETSUITE_CUSTOMER_ID;
                var TIMESTAMP = new Date().getTime();
                //endregion GLOBAL VAR

                //region Create SFTP Directories
                var myConn = '';

                var ISO_DATE_FOLDER = '';
                var HOST_KEY_TOOL_URL = 'https://ursuscode.com/tools/sshkeyscan.php?url=';
                var url = paramAppzenSFTP_URL;
                var port = '';
                var hostKeyType = '';
                var myUrl = HOST_KEY_TOOL_URL + url + "&port=" + port + "&type=" + hostKeyType;

                var tempHostKey = https.get({url: myUrl}).body;
                var hostKey = tempHostKey.replace(paramAppzenSFTP_URL + ' ssh-rsa ', '');

                var keyControlModule = keyControl.loadKey({
                    scriptId: 'custkey_appzen_sftp'
                });

                if (!isBlank(hostKey)) {
                    myConn = createSftpConnection(sftp, paramAppzenSFTP_username, paramAppzenSFTP_URL, hostKey, keyControlModule.scriptId);
                }

                if (!isBlank(myConn)) {

                    //Create a Folder
                    var tempDate = new Date();
                    ;
                    var tempFolder = tempDate.toISOString().split('.')[0] + "Z";
                    var isoDateFolder = tempFolder.replace(/:\s*/g, ".");
                    ISO_DATE_FOLDER = isoDateFolder;

                    var ftpRelativePath = paramAppzenSFTP_dir + paramAppzenSFTP_invoice_folder;

                    myConn.makeDirectory({
                        path: ftpRelativePath + isoDateFolder
                    });

                    myConn.makeDirectory({
                        path: ftpRelativePath + isoDateFolder + '/attachments'
                    });
                }

                //endregion Create SFTP Directories

                //region POST DATA
                var postData = [];
                var files = [];

                var _data = [];
                var addressArr = [];
                var contactArr = [];

                var fileAttachments = getAttachments(search);

                //region INVOICE SEARCH

                var PURCHASE_ORDER_ARR = [];
                var COUNT = parseInt(1);
                var INTERNAL_ID = '';

                var runTimeContext = runtime.getCurrentScript();
                var purchaseOrderId = runTimeContext.getParameter('custscript_search_batch_purch_ord_id');

                var searchInvoice = search.load({
                    id: '204'
                });

                if (!isBlank(purchaseOrderId)) {

                    var internalIdFilter = search.createFilter({
                        name: 'internalidnumber',
                        operator: 'greaterthan',
                        values: purchaseOrderId
                    });

                    searchInvoice.filters.push(internalIdFilter);
                }

                searchInvoice.run().each(function (result) {

                    var columns = result.columns;
                    var internalid = result.id;
                    INTERNAL_ID = internalid;

                    var purchaseOrderArr = [];

                    var isResched = rescheduleScript(internalid, myConn, ftpRelativePath, ISO_DATE_FOLDER, paramAppzenSFTP_integration_folder);
                    if (!isResched) {
                        return;
                    } else {

                        //external_purchase_order_id
                        var external_purchase_order_number = internalid;

                        //external_invoice_number
                        //var external_purchase_order_number = result.getValue(columns[1]);

                        //external_supplier_id
                        var external_supplier_id = result.getValue({
                            name: 'internalid',
                            join: 'vendor'
                        });

                        //invoice_date
                        var invoice_date = result.getValue({
                            name: 'trandate'
                        });

                        if (!isBlank(invoice_date)) {
                            invoice_date = new Date(invoice_date).toISOString();
                        }

                        //accounting-date
                        var accounting_date = result.getValue({
                            name: 'trandate'
                        });

                        if (!isBlank(accounting_date)) {
                            accounting_date = new Date(accounting_date).toISOString();
                        }


                        var searchFields = search.lookupFields({
                            type: 'vendorbill',
                            id: internalid,
                            columns: ['duedate']
                        });

                        if (!isBlank(searchFields.duedate)) {
                            due_date = new Date(searchFields.duedate).toISOString();
                        } else {
                            due_date = '';
                        }

                        var payment_term = {};

                        var terms = result.getValue({
                            name: 'terms'
                        });

                        if (!isBlank(terms)) {

                            var objTerms = record.load({
                                type: 'term',
                                id: terms
                            });
                            payment_term.code = '';
                            payment_term.date = due_date;
                            payment_term.source = objTerms.getValue({
                                fieldId: 'name'
                            });
                            var num_days = objTerms.getValue({
                                fieldId: 'daysuntilnetdue'
                            });

                            if (!isBlank(num_days)) {
                                payment_term.num_days = parseInt(num_days);
                            } else {
                                payment_term.num_days = parseInt(0);
                            }

                            var tempDueDate = result.getValue({
                                name: 'duedate'
                            });

                            if (!isBlank(tempDueDate)) {
                                var due_date = new Date(tempDueDate).toISOString();
                                payment_term.date = due_date;
                            }

                            var discount_days = objTerms.getValue({
                                fieldId: 'daysuntilexpiry'
                            });

                            if (!isBlank(discount_days)) {
                                discount_days = parseInt(discount_days);
                            } else {
                                discount_days = parseInt(0);
                            }

                            var discount_percent = objTerms.getValue({
                                fieldId: 'discountpercent'
                            });

                            if (!isBlank(discount_percent)) {
                                discount_percent = parseFloat(discount_percent);
                            } else {
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
                                name: 'fxamountpaid'
                            });
                            if (!isBlank(total)) {
                                total = parseFloat(total);
                            }

                            var currency = result.getText({
                                name: 'currency'
                            });

                            _total.amount = total;
                            _total.currency_code = currency;

                        } else {
                            payment_term.code = '';
                            payment_term.date = '';
                            payment_term.source = '';
                            payment_term.num_days = parseInt(0);
                            var discount = [];
                            discount.push({
                                'discount_days': parseInt(0),
                                'discount_percent': parseInt(0)
                            });
                            payment_term.discount = discount;
                        }

                        //payment_status
                        var payment_status = result.getValue({
                            name: 'statusref'
                        });

                        //payment_date
                        var payment_date = result.getValue({
                            name: 'closedate'
                        });

                        if (!isBlank(payment_date)) {
                            payment_date = new Date(payment_date).toISOString();
                        }

                        var _total = {};

                        //total.amount
                        var total = result.getValue({
                            name: "formulacurrency",
                            formula: "{fxamount}"
                        });
                        if (!isBlank(total)) {
                            total = parseFloat(total);
                        }

                        //total.currency_code
                        var currency_code = result.getText({
                            name: 'currency'
                        });

                        _total.amount = total;
                        _total.currency_code = currency_code;

                        var exchange_rate = {};
                        //exchange_rate.to_currency_code
                        var exchange_rate_to_currency_code = result.getText({
                            name: 'currency'
                        });

                        //exchange_rate.from_currency_code
                        var exchange_rate_from_currency_code = result.getText({
                            name: 'currency'
                        });

                        //exchange_rate.conversion_rate
                        var exchange_rate_conversion_rate = result.getValue({
                            name: 'exchangerate'
                        });

                        if (!isBlank(exchange_rate_conversion_rate)) {
                            exchange_rate_conversion_rate = parseFloat(exchange_rate_conversion_rate);
                        }

                        exchange_rate.to_currency_code = exchange_rate_to_currency_code;
                        exchange_rate.from_currency_code = exchange_rate_from_currency_code;
                        exchange_rate.conversion_rate = exchange_rate_conversion_rate;

                        //external_status
                        var external_status = result.getValue({
                            name: 'statusRef'
                        });

                        if (isBlank(external_status)) {
                            external_status = '';
                        }

                        //lines.external_status
                        var lines_external_status = result.getValue({
                            name: 'statusref'
                        });

                        //org_id
                        var org_id = result.getValue({
                            name: 'subsidiarynohierarchy'
                        });

                        //org_name
                        var org_name = result.getText({
                            name: 'subsidiarynohierarchy'
                        });

                        //requestor
                        var requestor = result.getText({
                            name: 'altname',
                            join: 'employee',
                        });

                        if (isBlank(requestor)) {
                            requestor = '';
                        }
                        //submitter
                        var submitter = result.getText({
                            name: 'createdby'
                        });

                        if (isBlank(requestor)) {
                            requestor = submitter;
                        }
                        //region ATTACHMENTS


                        var attachmentsBase64 = [];

                        files = getTransactionAttachments(fileAttachments, internalid);
                        if (!isBlank(files)) {

                            for (var f in files) {
                                var fileObj = file.load({
                                    id: files[f]
                                });
                                attachmentsBase64.push({
                                    'fileName': fileObj.name,
                                    'fileExtension': fileObj.fileType
                                });

                                var attachmentFileName = fileObj.name;

                                myConn.upload({
                                    directory: ftpRelativePath + isoDateFolder + '/attachments',
                                    filename: attachmentFileName,
                                    file: fileObj,
                                    replaceExisting: true
                                });
                            }
                        }

                        //endregion ATTACHMENTS

                        //lines.line_number
                        var lines_line_number = result.getValue({
                            name: 'linesequencenumber'
                        });

                        if (!isBlank(lines_line_number)) {
                            lines_line_number = parseInt(lines_line_number);
                        }

                        //lines.external_purchase_order_number
                        var lines_external_purchase_order_number = result.getValue({
                            name: 'tranid',
                            join: 'appliedToTransaction'
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
                        ship_to_address.city = ship_to_address_city;
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
                        bill_to_address.city = bill_to_address_city;
                        bill_to_address.state = bill_to_address_state;
                        bill_to_address.zip = bill_to_address_zip;
                        bill_to_address.state = bill_to_address_state;
                        bill_to_address.country = bill_to_address_country;
                        bill_to_address.phone = bill_to_address_phone;


                        //region LINES
                        var lines = [];

                        var searchPurchaseOrderLines = search.load({
                            id: '217'
                        });

                        if (!isBlank(internalid)) {
                            var internalIdLinesFilter = search.createFilter({
                                name: 'internalid',
                                operator: 'anyof',
                                values: internalid
                            });

                            searchPurchaseOrderLines.filters.push(internalIdLinesFilter);

                        }

                        searchPurchaseOrderLines.run().each(function (resultLines) {

                            var lines_external_line_id = resultLines.getValue({
                                name: 'lineuniquekey'
                            });

                            //lines.external_line_number
                            var lines_external_line_number = resultLines.getValue({
                                name: 'line'
                            });

                            //lines.line_number
                            var lines_line_number = resultLines.getValue({
                                name: 'linesequencenumber'
                            });

                            if (!isBlank(lines_line_number)) {
                                lines_line_number = parseInt(lines_line_number);
                            }

                            //lines.item
                            var lines_item = resultLines.getValue({
                                name: 'item'
                            });

                            if (!isBlank(lines_item)) {
                                lines_item = parseInt(lines_item);
                            } else {
                                lines_item = parseInt(0);
                            }

                            //lines.item_description
                            var lines_item_description = resultLines.getText({
                                name: 'item'
                            });

                            //lines.quantity
                            var lines_quantity = resultLines.getValue({
                                name: 'quantity'
                            });

                            if (isBlank(lines_item_description)) {

                                lines_item_description = resultLines.getText({
                                    name: 'expensecategory'
                                });

                                lines_quantity = parseInt(1);
                            }

                            //lines.unit_of_measure
                            var lines_unit_of_measure = resultLines.getValue({
                                name: 'unit'
                            });

                            //lines.committedquantity
                            var lines_committedquantity = resultLines.getValue({
                                name: 'quantitycommitted'
                            });

                            if (!isBlank(lines_committedquantity)) {
                                lines_committedquantity = parseInt(lines_committedquantity);
                            } else {
                                lines_committedquantity = parseInt(0);
                            }

                            //region commited_amount
                            var commited_amount = {};

                            //lines.commited_amount.amount
                            var commited_amount_amount = resultLines.getValue({
                                name: 'amount'
                            });
                            if (!isBlank(commited_amount_amount)) {
                                commited_amount_amount = parseFloat(commited_amount_amount);
                            } else {
                                commited_amount_amount = parseInt(0);
                            }
                            //lines.commited_amount.currency_code
                            var commited_amountcurrency = resultLines.getText({
                                name: 'currency'
                            });

                            commited_amount.amount = commited_amount_amount;
                            commited_amount.currency_code = commited_amountcurrency;

                            //endregion commited_amount

                            if (!isBlank(lines_quantity)) {
                                lines_quantity = parseInt(lines_quantity);
                            } else {
                                lines_quantity = parseInt(0);
                            }

                            //region amount
                            var amount = {};

                            //lines.amount.amount
                            var amount_amount = resultLines.getValue({
                                name: 'amount'
                            });
                            if (!isBlank(amount_amount)) {
                                amount_amount = parseFloat(amount_amount);
                            } else {
                                amount_amount = parseFloat(0.00);
                            }
                            //lines.amount.currency_code
                            var amount_currency_code = resultLines.getText({
                                name: 'currency'
                            });

                            amount.amount = amount_amount;
                            amount.currency_code = amount_currency_code;

                            //endregion amount

                            //region unit_list_price
                            var base_unit_price = {};

                            //lines.base_unit_price.amount
                            var base_unit_price_amount = resultLines.getValue({
                                name: 'baseprice',
                                join: 'item'
                            });

                            if (!isBlank(base_unit_price_amount)) {
                                base_unit_price_amount = parseFloat(base_unit_price_amount);
                            } else {
                                base_unit_price_amount = parseFloat(0.00);
                            }

                            //lines.unit_list_price.currency_code
                            var base_unit_price_currency_code = resultLines.getText({
                                name: 'currency'
                            });

                            base_unit_price.amount = base_unit_price_amount;
                            base_unit_price.currency_code = base_unit_price_currency_code;

                            //endregion unit_list_price

                            //endregion Lines

                            lines.push({
                                'external_line_id': lines_external_line_id,
                                'external_line_number': lines_external_line_number,
                                'line_number': lines_line_number,
                                'org_id': org_id,
                                'org_name': org_name,
                                'item_id': lines_item,
                                'item_description': lines_item_description,
                                'unit_of_measure': lines_unit_of_measure,
                                'commited_quantity': lines_committedquantity,
                                'commited_amount': commited_amount,
                                'quantity': lines_quantity,
                                'amount': amount,
                                'base_unit_price': base_unit_price
                            });

                            return true;

                        });

                        //endregion LINES

                        purchaseOrderArr.push({
                            'external_purchase_order_number': external_purchase_order_number,
                            'external_supplier_id': external_supplier_id,
                            'payment_term': payment_term,
                            'total': _total,
                            'exchange_rate': exchange_rate,
                            'org_id': org_id,
                            'org_name': org_name,
                            'lines': lines,
                            'attachmentsBase64': attachmentsBase64
                        });

                        lines = [];

                        PURCHASE_ORDER_ARR.push(purchaseOrderArr[0]);

                        if (COUNT < paramAppzenBatch_Limit) {
                            COUNT++;
                            return true;
                        } else {
                            rescheduleScriptNextBatch(internalid, task, runtime);
                        }
                    }

                });

                var postData = {};
                postData.purchaseOrders = PURCHASE_ORDER_ARR;
                log.debug({
                    title: 'postData',
                    details: JSON.stringify(postData)
                });

                if (IS_SERVER_FILE) {

                    var fileName = INTERNAL_ID + '_' + TIMESTAMP + '.json';
                    var fileId = createFile(file, fileName, JSON.stringify(postData), paramAppzenSFTP_integration_folder);

                    var loadFile = file.load({
                        id: fileId
                    });

                    myConn.upload({
                        directory: ftpRelativePath + isoDateFolder,
                        filename: fileName,
                        file: loadFile,
                        replaceExisting: true
                    });
                }

                if (IS_TRIGGER_FILE) {
                    //region Create Trigger File
                    var fileName = ISO_DATE_FOLDER + '.trigger';
                    var _data = '';
                    var fileTrigger = createFile(file, fileName, _data, paramAppzenSFTP_integration_folder);
                    var loadFile = file.load({
                        id: fileTrigger
                    });

                    myConn.upload({
                        directory: ftpRelativePath,
                        filename: fileName,
                        file: loadFile,
                        replaceExisting: true
                    });
                    //endregion Create Trigger File
                }
                //endregion INVOICE SEARCH
            }
            catch(ex){
                log.error({
                    title: 'ERROR',
                    details: 'Error Code: ' + ex.getCode() + ' | Error Details: ' + ex.getDetails()
                });
            }

        }

        function rescheduleScript(id, myConn, ftpRelativePath, ISO_DATE_FOLDER, paramAppzenSFTP_integration_folder){

            var ret = true;
            var usage = runtime.getCurrentScript().getRemainingUsage();
            if (usage <= 1000)
            {
                log.debug({
                    title : 'USAGE',
                    details : usage
                });

                //region Create Trigger File
                var fileName = ISO_DATE_FOLDER + '.trigger';
                var _data = '';
                var fileTrigger = createFile(file, fileName, _data, paramAppzenSFTP_integration_folder);
                var loadFile = file.load({
                    id : fileTrigger
                });

                myConn.upload({
                    directory: ftpRelativePath,
                    filename: fileName,
                    file: loadFile,
                    replaceExisting: true
                });
                //endregion Create Trigger File

                var scriptTask = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT
                });
                scriptTask.scriptId = runtime.getCurrentScript().id;
                scriptTask.deploymentId = runtime.getCurrentScript().deploymentId;
                scriptTask.params = {
                    'custscript_search_invoice_id' : id
                }
                var scriptStat = scriptTask.submit();
                log.debug({
                    title : 'RESCHEDULED',
                    details : 'Parameter: ' + id
                });

                ret = false;
            }

            return ret;
        }

        return {
            execute: execute
        };
    }
);