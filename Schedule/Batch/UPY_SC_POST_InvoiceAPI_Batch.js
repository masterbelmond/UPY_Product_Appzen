/**
 * Name : UPY | SC | POST Invoice API Batch
 * ID : customscript_upy_sc_post_invoiceapi_v2
 * Link : https://5432907-sb1.app.netsuite.com/app/common/scripting/scriptrecord.nl?id=1359
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
                var paramInvoiceEndpoint = scriptObj.getParameter({
                    name: 'custscript_appzen_invoice_endpoint'
                });
                var paramInvoiceSearch = scriptObj.getParameter({
                    name: 'custscript_appzen_invoice_search'
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
                    name: 'custscript_appzen_sftp_dir_invoice'
                });

                var paramAppzenBatch_Limit = scriptObj.getParameter({
                    name: 'custscript_appzen_batch_limit'
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

                var runTimeContext = runtime.getCurrentScript();
                var invoiceId = runTimeContext.getParameter('custscript_search_invoice_id');

                //region INVOICE SEARCH

                var INVOICE_ARR = [];
                var COUNT = parseInt(1);
                var INTERNAL_ID = '';

                var runTimeContext = runtime.getCurrentScript();
                var invoiceId = runTimeContext.getParameter('custscript_search_batch_invoice_id');

                var searchInvoice = search.load({
                    id: 'customsearch_upy_invoice_header_search'
                });

                if (!isBlank(invoiceId)) {

                    var internalIdFilter = search.createFilter({
                        name: 'internalidnumber',
                        operator: 'greaterthan',
                        values: invoiceId
                    });

                    searchInvoice.filters.push(internalIdFilter);
                }

                searchInvoice.run().each(function (result) {

                    var columns = result.columns;
                    var internalid = result.id;
                    INTERNAL_ID = internalid;

                    var invoiceArr = [];

                    var isResched = rescheduleScript(internalid, myConn, ftpRelativePath, ISO_DATE_FOLDER, paramAppzenSFTP_integration_folder);
                    if (!isResched) {
                        return;
                    } else {

                        //external_invoice_id
                        var external_invoice_id = result.getValue({
                            name: 'internalid'
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
                            payment_term.date = invoice_date;
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
                                name: 'fxamount'
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

                        //document_type
                        var document_type = result.getValue({
                            name: 'type'
                        });

                        if (!isBlank(document_type)) {
                            if (document_type == 'VendBill') {
                                document_type = 'invoice';
                            } else if (document_type == 'VendCred') {
                                document_type = 'credit note';
                            }
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
                            name: 'fxamount'
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

                        var searchInvoiceLines = search.load({
                            id: 'customsearch_upy_invoice_lines_search'
                        });

                        if (!isBlank(internalid)) {
                            var internalIdLinesFilter = search.createFilter({
                                name: 'internalid',
                                operator: 'anyof',
                                values: internalid
                            });

                            searchInvoiceLines.filters.push(internalIdLinesFilter);

                        }

                        var lines_external_purchase_order_number = '';

                        searchInvoiceLines.run().each(function (resultLines) {

                            var columns = resultLines.columns;
                            var internalid = resultLines.id;

                            //region Lines
                            //lines.external_line_number
                            var lines_external_line_number = resultLines.getValue({
                                name: 'lineuniquekey'
                            });

                            //lines.line_number
                            var lines_line_number = resultLines.getValue({
                                name: 'linesequencenumber'
                            });

                            if (!isBlank(lines_line_number)) {
                                lines_line_number = parseInt(lines_line_number);
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

                            if (isBlank(lines_item_description)) {
                                lines_item_description = resultLines.getText({
                                    name: 'account'
                                });
                                lines_quantity = parseInt(1);
                            }

                            if (!isBlank(lines_quantity)) {
                                lines_quantity = parseInt(lines_quantity);
                            } else {
                                lines_quantity = parseInt(0);
                            }

                            //lines.unit_of_measure
                            var lines_unit_of_measure = resultLines.getValue({
                                name: 'unit'
                            });

                            //region unit_price
                            var lines_unit_price = {};

                            //lines.base_unit_price.amount
                            var lines_unit_price_amount = resultLines.getValue({
                                name: "formulacurrency",
                                formula: "{fxamount}/ NULLIF({quantity},0)"
                            });

                            if (!isBlank(lines_unit_price_amount)) {
                                lines_unit_price_amount = parseFloat(lines_unit_price_amount);
                            } else {
                                var lines_total_price_amount = resultLines.getValue({
                                    name: "formulacurrency",
                                    formula: "{fxamount}/ NULLIF({quantity},0)"
                                });
                                lines_unit_price_amount = parseFloat(lines_total_price_amount)
                            }

                            //lines.unit_list_price.currency_code
                            var lines_unit_price_currency_code = resultLines.getText({
                                name: 'currency'
                            });

                            lines_unit_price.amount = lines_unit_price_amount;
                            lines_unit_price.currency_code = lines_unit_price_currency_code;

                            //endregion unit_price

                            //region total_price
                            var lines_total_price = {};

                            //lines.base_unit_price.amount
                            var lines_total_price_amount = resultLines.getValue({
                                name: "formulacurrency",
                                formula: "{fxamount}/{exchangerate}"
                            });

                            if (!isBlank(lines_total_price_amount)) {
                                lines_total_price_amount = parseFloat(lines_total_price_amount);
                            } else {
                                lines_total_price_amount = parseFloat(0.00);
                            }

                            //lines.unit_list_price.currency_code
                            var lines_total_price_currency_code = resultLines.getText({
                                name: 'currency'
                            });

                            lines_total_price.amount = lines_total_price_amount;
                            lines_total_price.currency_code = lines_total_price_currency_code;

                            //endregion unit_price

                            //lines.unit_of_measure
                            var lines_unit_of_measure = resultLines.getValue({
                                name: 'unit'
                            });

                            //lines.external_status
                            var lines_external_status = resultLines.getValue({
                                name: 'statusref'
                            });

                            //lines.external_purchase_order_number
                            lines_external_purchase_order_number = resultLines.getValue({
                                name: 'tranid',
                                join: 'appliedToTransaction'
                            });

                            //endregion Lines

                            lines.push({
                                'external_line_number': lines_external_line_number,
                                'line_number': lines_line_number,
                                'external_purchase_order_number': lines_external_purchase_order_number,
                                'item_description': lines_item_description,
                                'quantity': lines_quantity,
                                'unit_price': lines_unit_price,
                                'total_price': lines_total_price,
                                'unit_of_measure': lines_unit_of_measure,
                                'external_status': lines_external_status
                            });

                            return true;

                        });

                        //endregion LINES

                        invoiceArr.push({
                            'external_invoice_id': external_invoice_id,
                            'external_invoice_number': external_invoice_number,
                            'external_supplier_id': external_supplier_id,
                            'invoice_date': invoice_date,
                            'accounting-date': accounting_date,
                            'external_purchase_order_number': lines_external_purchase_order_number,
                            'document_type': document_type,
                            'org_id': org_id,
                            'org_name': org_name,
                            'requestor': requestor,
                            'submitter': submitter,
                            'payment_term': payment_term,
                            'payment_status': lines_external_status,
                            'payment_date': payment_date,
                            'due_date': due_date,
                            'total': _total,
                            'attachmentsBase64': attachmentsBase64,
                            'exchange_rate': exchange_rate,
                            'bill_to_address': bill_to_address,
                            'ship_to_address': ship_to_address,
                            'external_status': external_status,
                            'lines': lines
                        });

                        lines = [];

                        INVOICE_ARR.push(invoiceArr[0]);

                        if (COUNT < paramAppzenBatch_Limit) {
                            COUNT++;
                            return true;
                        } else {
                            rescheduleScriptNextBatch(internalid, task, runtime);
                        }
                    }

                });

                var postData = {};
                postData.invoices = INVOICE_ARR;

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