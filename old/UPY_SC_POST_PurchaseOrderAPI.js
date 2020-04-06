/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/search', 'N/log', 'N/email', 'N/runtime', 'N/error','N/file', 'N/http', 'N/https', 'N/keyControl', 'N/sftp', './Appzen_Integration_library.js'],

    function (record, search, log, email, runtime, error, file, http, https, keyControl, sftp) {

        function execute() {

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

            var paramAppzenSFTP_purchase_order_folder = scriptObj.getParameter({
                name: 'custscript_appzen_sftp_dir_purch_ord'
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

            if(!isBlank(hostKey)){
                myConn = createSftpConnection(sftp, paramAppzenSFTP_username, paramAppzenSFTP_URL, hostKey, keyControlModule.scriptId);
            }

            if(!isBlank(myConn)) {

                //Create a Folder
                var tempDate = new Date();;
                var tempFolder =  tempDate.toISOString().split('.')[0]+"Z";
                var isoDateFolder = tempFolder.replace(/:\s*/g, ".");
                ISO_DATE_FOLDER = isoDateFolder;

                var ftpRelativePath = paramAppzenSFTP_dir + paramAppzenSFTP_purchase_order_folder;

                myConn.makeDirectory({
                    path: ftpRelativePath + isoDateFolder
                });

                myConn.makeDirectory({
                    path: ftpRelativePath + isoDateFolder + '/attachments'
                });
            }

            //endregion Create SFTP Directories

            log.debug({
                title : 'PARAMETERS',
                details : 'ENDPOINT : ' + ENDPOINT + ' | Base URI: ' + paramBaseURI + ' | Purchase Order Endpoint: ' + paramPurchaseOrderEndpoint + ' | Search: ' + paramPurchaseOrderSearch + ' | Capture Logs: ' + IS_LOG_ON
            });

            //region POST DATA
            var postData = [];
            var files = [];
            var _data = [];
            var addressArr = [];
            var contactArr = [];

            var fileAttachments = getAttachments(search);

            var runTimeContext = runtime.getCurrentScript();
            var purchaseOrderId = runTimeContext.getParameter('custscript_search_purch_ord_id');


            //region PURCHASE ORDER SEARCH
            var searchPurchaseOrder = search.load({
                id: paramPurchaseOrderSearch
            });

            if(!isBlank(purchaseOrderId)){
                var internalIdFilter = search.createFilter({
                    name: 'internalidnumber',
                    operator: 'greaterthanorequalto',
                    values: purchaseOrderId
                });

                searchPurchaseOrder.filters.push(internalIdFilter);
            }

            searchPurchaseOrder.run().each(function(result){

                var purchaseOrderArr = [];

                var columns = result.columns;
                var internalid = result.id;
                var INTERNAL_ID = result.id;

                var isResched = rescheduleScript(internalid, myConn, ftpRelativePath, ISO_DATE_FOLDER, paramAppzenSFTP_integration_folder);
                if(!isResched){
                    return;
                }
                else {

                    //external_supplier_id
                    var external_purchase_order_number = result.getValue(columns[0]);

                    //external_supplier_id
                    var external_supplier_id = result.getValue({
                        name: 'internalid',
                        join: 'vendor'
                    });

                    var payment_term = {};

                    var terms = result.getValue({
                        name: 'terms'
                    });

                    if (!isBlank(terms)) {

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

                        if (!isBlank(num_days)) {
                            payment_term.num_days = parseInt(num_days);
                        } else {
                            payment_term.num_days = parseInt(0);
                        }

                        var due_date = result.getValue({
                            name: 'duedate'
                        });

                        if (!isBlank(due_date)) {
                            var due_date = new Date(due_date).toISOString();
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
                        })

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

                    } else {
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
                        name: 'amount'
                    });
                    if (!isBlank(total)) {
                        total = parseFloat(total);
                    }

                    var currency = result.getText({
                        name: 'currency'
                    });

                    _total.amount = total;
                    _total.currency_code = currency;

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

                    //org_id
                    var org_id = result.getValue({
                        name: 'subsidiarynohierarchy'
                    });

                    //org_name
                    var org_name = result.getText({
                        name: 'subsidiarynohierarchy'
                    });

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
                        }
                    }

                    //endregion ATTACHMENTS

                    //lines.external_line_id
                    var lines_external_line_id = result.getValue({
                        name: 'lineuniquekey'
                    });

                    //lines.external_line_number
                    var lines_external_line_number = result.getValue({
                        name: 'line'
                    });

                    //lines.line_number
                    var lines_line_number = result.getValue({
                        name: 'linesequencenumber'
                    });

                    if (!isBlank(lines_line_number)) {
                        lines_line_number = parseInt(lines_line_number);
                    }

                    //lines.item
                    var lines_item = result.getValue({
                        name: 'item'
                    });

                    if (!isBlank(lines_item)) {
                        lines_item = parseInt(lines_item);
                    } else {
                        lines_item = parseInt(0);
                    }

                    //lines.item_description
                    var lines_item_description = result.getText({
                        name: 'item'
                    });

                    //lines.quantity
                    var lines_quantity = result.getValue({
                        name: 'quantity'
                    });

                    if (isBlank(lines_item_description)) {

                        lines_item_description = result.getText({
                            name: 'expensecategory'
                        });

                        lines_quantity = parseInt(1);
                    }

                    //lines.unit_of_measure
                    var lines_unit_of_measure = result.getValue({
                        name: 'unit'
                    });

                    //lines.committedquantity
                    var lines_committedquantity = result.getValue({
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
                    var commited_amount_amount = result.getValue({
                        name: 'amount'
                    });
                    if (!isBlank(commited_amount_amount)) {
                        commited_amount_amount = parseFloat(commited_amount_amount);
                    } else {
                        commited_amount_amount = parseInt(0);
                    }
                    //lines.commited_amount.currency_code
                    var commited_amountcurrency = result.getText({
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
                    var amount_amount = result.getValue({
                        name: 'amount'
                    });
                    if (!isBlank(amount_amount)) {
                        amount_amount = parseFloat(amount_amount);
                    } else {
                        amount_amount = parseFloat(0.00);
                    }
                    //lines.amount.currency_code
                    var amount_currency_code = result.getText({
                        name: 'currency'
                    });

                    amount.amount = amount_amount;
                    amount.currency_code = amount_currency_code;

                    //endregion amount

                    //region unit_list_price
                    var base_unit_price = {};

                    //lines.base_unit_price.amount
                    var base_unit_price_amount = result.getValue({
                        name: 'baseprice',
                        join: 'item'
                    });

                    if (!isBlank(base_unit_price_amount)) {
                        base_unit_price_amount = parseFloat(base_unit_price_amount);
                    } else {
                        base_unit_price_amount = parseFloat(0.00);
                    }

                    //lines.unit_list_price.currency_code
                    var base_unit_price_currency_code = result.getText({
                        name: 'currency'
                    });

                    base_unit_price.amount = base_unit_price_amount;
                    base_unit_price.currency_code = base_unit_price_currency_code;

                    //endregion unit_list_price


                    var lines = [];
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

                    var payloadGrouped = groupBy(purchaseOrderArr, 'external_purchase_order_number');
                    var postData = buildPurchaseOrderJSON(payloadGrouped);
                    moveJSONFile(postData, myConn, ISO_DATE_FOLDER, TIMESTAMP, paramAppzenSFTP_integration_folder, ftpRelativePath, isoDateFolder);

                    return true;
                }
            });

            //endregion PURCHASE ORDER SEARCH


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

            postData.push(_data);

            /*
            var appzenResponse = https.post({
                url : ENDPOINT,
                body : postData
            });
            var code = appzenResponse.code;
            var body = JSON.stringify(appzenResponse.body);

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
             */
        }

        function buildPurchaseOrderJSON(payloadGrouped) {

            var _dataArr = [];

            for(var i in payloadGrouped){

                var invoiceArrTemp = payloadGrouped[i].data;

                if(invoiceArrTemp.length > 1){
                    //multiple lines
                    var mainArr = invoiceArrTemp[0];
                    for(var t in invoiceArrTemp){

                        if(parseInt(t) != 0) {
                            mainArr.lines.push(invoiceArrTemp[t].lines[0]);
                        }
                    }
                    _dataArr.push(mainArr);
                }
                else{
                    _dataArr.push(invoiceArrTemp[0]);
                }
            }

            return _dataArr;
        }

        function rescheduleScript(id, myConn, ftpRelativePath, ISO_DATE_FOLDER, paramAppzenSFTP_integration_folder){
            var ret = true;
            var usage = runtime.getCurrentScript().getRemainingUsage();
            log.debug({
                title : 'USAGE',
                details : usage
            });
            if (usage <= 1000)
            {
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
                    'custscript_search_purch_ord_id' : id
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

        function moveJSONFile(postData, myConn, ISO_DATE_FOLDER, TIMESTAMP, paramAppzenSFTP_integration_folder, ftpRelativePath, isoDateFolder){

            if(!isBlank(postData)) {

                for(var i in postData){

                    var post = {};
                    var invoice = postData[i];
                    var fileName = invoice.external_invoice_id  + '_' + TIMESTAMP + '.json';
                    post.purchaseOrders = postData;
                    var fileId = createFile(file, fileName, JSON.stringify(post), paramAppzenSFTP_integration_folder);

                    var loadFile = file.load({
                        id : fileId
                    });

                    myConn.upload({
                        directory: ftpRelativePath + isoDateFolder,
                        filename: fileName,
                        file: loadFile,
                        replaceExisting: true
                    });
                }
            }
        }

        return {
            execute: execute
        };
    }
);