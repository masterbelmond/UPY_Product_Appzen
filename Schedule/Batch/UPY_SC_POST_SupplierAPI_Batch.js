/**
 * Name : UPY | SC | POST Supplier API Batch
 * ID : customdeploy_upy_sc_post_supplierapi_v2
 * Link : https://5432907-sb1.app.netsuite.com/app/common/scripting/scriptrecord.nl?id=1360
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/search', 'N/log', 'N/email', 'N/runtime', 'N/error','N/file', 'N/http', 'N/https', 'N/keyControl', 'N/sftp', 'N/task', 'N/format', './Appzen_Integration_library.js'],

    function (record, search, log, email, runtime, error, file, http, https, keyControl, sftp, task, format) {

        function execute() {

            try {

                var now = new Date();

                var IS_SERVER_FILE = true;
                var IS_TRIGGER_FILE = true;

                //region COMPANY PREFERENCES

                var scriptObj = runtime.getCurrentScript();

                var paramBaseURI = scriptObj.getParameter({
                    name: 'custscript_appzen_base_uri'
                });
                var paramSupplierEndpoint = scriptObj.getParameter({
                    name: 'custscript_appzen_supplier_endpoint'
                });
                var paramSupplierSearch = scriptObj.getParameter({
                    name: 'custscript_appzen_supplier_search'
                });
                var paramAppzenCustomerID = scriptObj.getParameter({
                    name: 'custscript_appzen_customer_id'
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
                var paramAppzenSFTP_supplier_folder = scriptObj.getParameter({
                    name: 'custscript_appzen_sftp_dir_supplier'
                });

                var paramAppzenSFTP_contracts_folder = scriptObj.getParameter({
                    name: 'custscript_appzen_sftp_dir_contracts'
                });

                var paramAppzenBatch_Limit = scriptObj.getParameter({
                    name: 'custscript_appzen_batch_limit'
                });

                log.debug({
                    title: 'COMPANY PREFERENCES',
                    details: 'Base URI: ' + paramBaseURI + ' | Supplier Endpoint: ' + paramSupplierEndpoint + ' | Supplier Search: ' + paramSupplierSearch + ' | Customer ID: ' + paramAppzenCustomerID + ' | SFTP URL: ' + paramAppzenSFTP_URL + ' SFTP username: ' + paramAppzenSFTP_username + ' | SFTP dir: ' + paramAppzenSFTP_dir + ' | Integration folder: ' + paramAppzenSFTP_integration_folder
                });

                //endregion COMPANY PREFERENCES

                //region USER PREFERENCES
                var IS_LOG_ON = scriptObj.getParameter({
                    name: 'custscript_appzen_sc_supplier_logs'
                });
                //endregion USER PREFERENCES

                //region GLOBAL VAR
                var URI = paramBaseURI + paramSupplierEndpoint;
                var TYPE = 'type=supplier';
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

                    var ftpRelativePath = paramAppzenSFTP_dir + paramAppzenSFTP_supplier_folder;

                    myConn.makeDirectory({
                        path: ftpRelativePath + isoDateFolder
                    });
                }

                //endregion Create SFTP Directories

                //region POST DATA
                var postData = {};

                //region SUPPLIER SEARCH

                var SUPPLIERS_ARR = [];
                var COUNT = parseInt(1);
                var INTERNAL_ID = '';

                var runTimeContext = runtime.getCurrentScript();
                var supplierId = runTimeContext.getParameter('custscript_search_batch_supplier_id');

                var searchSupplier = search.load({
                    id: paramSupplierSearch
                });

                if (!isBlank(supplierId)) {
                    var internalIdFilter = search.createFilter({
                        name: 'internalidnumber',
                        operator: 'greaterthan',
                        values: supplierId
                    });

                    searchSupplier.filters.push(internalIdFilter);
                    log.debug({
                        title: 'FILTERED',
                        details: 'SUPPLIER FILTER: ' + supplierId
                    });
                }

                //region Contracts
                var fileAttachments = getVendorAttachments(search, supplierId);
                if (!isBlank(fileAttachments)) {
                    for (var f in fileAttachments) {
                        var fileObj = file.load({
                            id: fileAttachments[f].fileId
                        });
                        var fileName = fileObj.name;
                        myConn.upload({
                            directory: paramAppzenSFTP_dir + paramAppzenSFTP_contracts_folder,
                            filename: fileName,
                            file: fileObj,
                            replaceExisting: true
                        });
                    }
                }
                //endregion Contracts

                searchSupplier.run().each(function (result) {

                    var supplier = [];
                    var columns = result.columns;
                    var internalid = result.id;


                    var isResched = rescheduleScript(internalid, myConn, ftpRelativePath, ISO_DATE_FOLDER, paramAppzenSFTP_integration_folder);
                    if (!isResched) {
                        return;
                    } else {

                        //external_supplier_id
                        var internalid = result.getValue({
                            name: 'internalid',
                            summary: 'GROUP'
                        });

                        INTERNAL_ID = internalid;
                        log.debug({
                            title: 'INTERNAL ID',
                            details: internalid
                        });

                        //external_site_id
                        var addressinternalid = result.getValue({
                            name: 'addressinternalid',
                            summary: 'MAX'
                        });


                        //isperson
                        var isperson = result.getValue({
                            name: 'isperson',
                            summary: 'GROUP'
                        });

                        //supplier_name
                        var supplier_name1 = result.getValue(columns[3]);
                        var supplier_name2 = result.getValue(columns[4]);
                        var supplier_name = '';
                        if (isperson) {
                            supplier_name = supplier_name1;
                        } else {
                            supplier_name = supplier_name2;
                        }

                        //url
                        var url = result.getValue({
                            name: 'url',
                            summary: 'GROUP'
                        });

                        if (url == '- None -') {
                            url = '';
                        }

                        //on_file_1099
                        var on_file_1099 = '';
                        var is1099eligible = result.getValue({
                            name: 'is1099eligible',
                            summary: 'GROUP'
                        });

                        if (!isBlank(is1099eligible)) {
                            if (is1099eligible) {
                                on_file_1099 = "true";
                            } else {
                                on_file_1099 = "false";
                            }
                        } else {
                            on_file_1099 = "false";
                        }

                        //vat_registration_number
                        var vat_registration_number = result.getValue(columns[7]);
                        if (vat_registration_number == '- None -') {
                            vat_registration_number = '';
                        }

                        //fed_tax_id
                        var accountnumber = result.getValue({
                            name: 'taxidnum',
                            summary: 'GROUP'
                        });

                        if (accountnumber == '- None -') {
                            accountnumber = '';
                        }

                        //is_active
                        var is_inactive = result.getValue({
                            name: 'isinactive',
                            summary: 'GROUP'
                        });

                        var is_active;
                        var deactive_date;
                        if (is_inactive) {
                            is_active = "false";
                        } else {
                            is_active = "true";
                        }

                        //note
                        var note = result.getValue({
                            name: 'comments',
                            summary: 'GROUP'
                        });

                        if (note == '- None -') {
                            note = '';
                        }

                        //region CONTACT SEARCH

                        var contactArr = [];

                        var searchContact = search.load({
                            id: 'customsearch_upy_vendor_contacts'
                        });

                        if (!isBlank(internalid)) {
                            var internalIdContactFilter = search.createFilter({
                                name: 'company',
                                operator: 'anyof',
                                values: internalid
                            });
                            searchContact.filters.push(internalIdContactFilter);
                        }

                        searchContact.run().each(function (resultContact) {

                            //company
                            var company = resultContact.getValue({
                                name: 'company'
                            });

                            //firstname
                            var firstname = resultContact.getValue({
                                name: 'firstname'
                            });

                            //lastname
                            var lastname = resultContact.getValue({
                                name: 'lastname'
                            });

                            //email
                            var email = resultContact.getValue({
                                name: 'email'
                            });

                            //phone
                            var phone = resultContact.getValue({
                                name: 'phone'
                            });

                            contactArr.push({
                                'first_name': firstname,
                                'last_name': lastname,
                                'email': email,
                                'phone': phone
                            });

                            return true;

                        });

                        //endregion CONTACT SEARCH

                        //region ADDRESS SEARCH
                        var addressArr = [];
                        var searchAddress = search.load({
                            id: 'customsearch_upy_vendor_address_search'
                        });

                        if (!isBlank(internalid)) {
                            var internalIdAddressFilter = search.createFilter({
                                name: 'internalid',
                                operator: 'anyof',
                                values: internalid
                            });
                            searchAddress.filters.push(internalIdAddressFilter);
                        }

                        searchAddress.run().each(function (resultAddress) {

                            //address_line1
                            var address_line1 = resultAddress.getValue({
                                name: 'address1',
                                join: 'Address'
                            });

                            //address_line2
                            var address_line2 = resultAddress.getValue({
                                name: 'address2',
                                join: 'Address'
                            });

                            //address_line3
                            var address_line3 = resultAddress.getValue({
                                name: 'address3',
                                join: 'Address'
                            });

                            //city
                            var city = resultAddress.getValue({
                                name: 'city',
                                join: 'Address'
                            });

                            //state
                            var state = resultAddress.getValue({
                                name: 'state',
                                join: 'Address'
                            });

                            //zip_code
                            var zip = resultAddress.getValue({
                                name: 'zipcode',
                                join: 'Address'
                            });

                            //country
                            var country = resultAddress.getValue({
                                name: 'country',
                                join: 'Address'
                            });

                            //phone
                            var phone = resultAddress.getValue({
                                name: 'addressphone',
                                join: 'Address'
                            });

                            //
                            var isdefaultbilling = resultAddress.getValue({
                                name: 'isdefaultbilling',
                                join: 'Address',
                            });

                            var address_type = '';
                            if (isdefaultbilling) {
                                address_type = 'BILL_TO';
                            } else {
                                address_type = 'OFFICE';
                            }

                            if (!isBlank(contactArr)) {
                                addressArr.push({
                                    'address_type': address_type,
                                    'address_line1': address_line1,
                                    'address_line2': address_line2,
                                    'address_line3': address_line3,
                                    'city': city,
                                    'state': state,
                                    'zip': zip,
                                    'country': country,
                                    'phone': phone,
                                    'employees': contactArr
                                });
                            } else {
                                addressArr.push({
                                    'address_type': address_type,
                                    'address_line1': address_line1,
                                    'address_line2': address_line2,
                                    'address_line3': address_line3,
                                    'city': city,
                                    'state': state,
                                    'zip': zip,
                                    'country': country,
                                    'phone': phone
                                });
                            }
                            return true;
                        });

                        //endregion ADDRESS SEARCH

                        supplier.push({
                            'external_supplier_id': internalid,
                            'external_site_id': addressinternalid,
                            'supplier_name': supplier_name,
                            'web_site': url,
                            'on_file_1099': on_file_1099,
                            'vat_registration_number': vat_registration_number,
                            'fed_tax_id': accountnumber,
                            'is_active': is_active,
                            'note': note,
                            'addresses': addressArr
                        });


                        record.submitFields({
                            type: search.Type.VENDOR,
                            id: internalid,
                            values: {
                                'custentity_appzen_last_modified': now
                            }
                        });

                        log.debug({
                            title: 'supplier',
                            details: JSON.stringify(supplier)
                        });

                        if (COUNT < paramAppzenBatch_Limit) {
                            SUPPLIERS_ARR.push(supplier[0]);
                            supplier = [];
                            addressArr = [];
                            contactArr = [];
                            COUNT++;
                            return true;
                        } else {
                            rescheduleScriptNextBatch(internalid);
                        }
                    }

                });

                var postData = {};
                postData.suppliers = SUPPLIERS_ARR;
                log.debug({
                    title: 'SUPPLIERS ARR',
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

                //endregion SUPPLIER SEARCH

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

            }
            catch(ex){
                log.error({
                    title: 'ERROR',
                    details: 'Error Code: ' + ex.getCode() + ' | Error Details: ' + ex.getDetails()
                });
            }

        }

        function moveJSONFile(postData, myConn, ISO_DATE_FOLDER, TIMESTAMP, paramAppzenSFTP_integration_folder, ftpRelativePath, isoDateFolder){

            if(!isBlank(postData)) {

                for(var i in postData.suppliers){

                    var supplier = postData.suppliers[i];
                    var fileName = supplier.external_supplier_id  + '_' + TIMESTAMP + '.json';
                    var fileId = createFile(file, fileName, JSON.stringify(postData), paramAppzenSFTP_integration_folder);

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

        function addAddressContacts(suppliersArr, addressArr, contactArr){

            var _data = [];
            var post = {};
            var id = suppliersArr[0].external_supplier_id;

            var arrSupplier = findFromArray(suppliersArr, 'external_supplier_id', id);
            var arrAddress = filteredArray(addressArr, 'external_supplier_id', id);
            var arrContact = filteredArray(contactArr, 'external_supplier_id', id);

            if(!isBlank(arrAddress)){

                if(!isBlank(arrContact)) {
                    for (var z in arrAddress) {
                        arrAddress[z]['employees'] = arrContact;
                    }
                }
                arrSupplier.addresses = arrAddress;
            }
            else{
                arrSupplier.addresses = arrAddress;
            }
            _data.push(arrSupplier);
            log.debug({
                title : 'ADDRESS',
                details : JSON.stringify(_data)
            });
            return _data;
        }

        function rescheduleScript(id, myConn, ftpRelativePath, ISO_DATE_FOLDER, paramAppzenSFTP_integration_folder){
            var ret = true;
            var usage = runtime.getCurrentScript().getRemainingUsage();
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
                    'custscript_search_supplier_id' : id
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

        function rescheduleScriptNextBatch(id){

            var scriptTask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT
            });
            scriptTask.scriptId = runtime.getCurrentScript().id;
            scriptTask.deploymentId = runtime.getCurrentScript().deploymentId;
            scriptTask.params = {
                'custscript_search_batch_supplier_id' : id
            }
            var scriptStat = scriptTask.submit();
            log.debug({
                title : 'RESCHEDULED',
                details : 'Parameter: ' + id
            });
        }

        return {
            execute: execute
        };
    }
);