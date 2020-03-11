/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/search', 'N/log', 'N/email', 'N/runtime', 'N/error','N/file', 'N/http', 'N/https', 'N/keyControl', 'N/sftp', 'N/task', './Appzen_Integration_library.js'],

    function (record, search, log, email, runtime, error, file, http, https, keyControl, sftp, task) {

        function execute() {
            log.debug({
                title : 'START',
                details : '----'
            });

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

            log.debug({
                title : 'COMPANY PREFERENCES',
                details : 'Base URI: ' + paramBaseURI + ' | Supplier Endpoint: ' + paramSupplierEndpoint + ' | Supplier Search: ' + paramSupplierSearch + ' | Customer ID: ' + paramAppzenCustomerID + ' | SFTP URL: ' + paramAppzenSFTP_URL + ' SFTP username: ' + paramAppzenSFTP_username + ' | SFTP dir: ' + paramAppzenSFTP_dir + ' | Integration folder: ' + paramAppzenSFTP_integration_folder
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

            if(!isBlank(hostKey)){
                myConn = createSftpConnection(sftp, paramAppzenSFTP_username, paramAppzenSFTP_URL, hostKey, keyControlModule.scriptId);
            }

            if(!isBlank(myConn)) {

                //Create a Folder
                var tempDate = new Date();;
                var tempFolder =  tempDate.toISOString().split('.')[0]+"Z";
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
            var _data = [];
            var addressArr = [];
            var contactArr = [];
            var supplierIds = [];

            //region ADDRESS SEARCH

            var searchAddress = search.load({
                id: 'customsearch_upy_vendor_address_search'
            });
            searchAddress.run().each(function(result){

                var columns = result.columns;
                var internalid = result.id;

                var address = [];

                //address_line1
                var address_line1 = result.getValue({
                    name: 'address1',
                    join: 'Address'
                });

                //address_line2
                var address_line2 = result.getValue({
                    name: 'address2',
                    join: 'Address'
                });

                //address_line3
                var address_line3 = result.getValue({
                    name: 'address3',
                    join: 'Address'
                });

                //city
                var city = result.getValue({
                    name: 'city',
                    join: 'Address'
                });

                //state
                var state = result.getValue({
                    name: 'state',
                    join: 'Address'
                });

                //zip_code
                var zip = result.getValue({
                    name: 'zipcode',
                    join: 'Address'
                });

                //country
                var country = result.getValue({
                    name: 'country',
                    join: 'Address'
                });

                //phone
                var phone = result.getValue({
                    name: 'addressphone',
                    join: 'Address'
                });

                //
                var isdefaultbilling = result.getValue({
                    name: 'isdefaultbilling',
                    join: 'Address',
                });

                var address_type = '';
                if(isdefaultbilling){
                    address_type = 'SUPPLIER_SITE';
                }
                else{
                    address_type = 'OFFICE';
                }

                addressArr.push({
                    'external_supplier_id' : internalid,
                    'address_type' : address_type,
                    'address_line1' : address_line1,
                    'address_line2' : address_line2,
                    'address_line3' : address_line2,
                    'city' : city,
                    'state': state,
                    'zip' : zip,
                    'country' : country,
                    'phone' : phone
                });
                return true;
            });

            //endregion ADDRESS SEARCH

            //region CONTACT SEARCH

            var searchContact = search.load({
                id: 'customsearch_upy_vendor_contacts'
            });

            searchContact.run().each(function(result) {

                var columns = result.columns;
                var internalid = result.id;

                //company
                var company = result.getValue({
                    name: 'company'
                });

                //firstname
                var firstname = result.getValue({
                    name: 'firstname'
                });

                //lastname
                var lastname = result.getValue({
                    name: 'lastname'
                });

                //email
                var email = result.getValue({
                    name: 'email'
                });

                //phone
                var phone = result.getValue({
                    name: 'phone'
                });

                contactArr.push({
                    'external_supplier_id' : company,
                    'first_name' : firstname,
                    'last_name' : lastname,
                    'email' : email,
                    'phone' : phone
                });

                return true;

            });

            //endregion CONTACT SEARCH

            //region SUPPLIER SEARCH

            var runTimeContext = runtime.getCurrentScript();
            var supplierId = runTimeContext.getParameter('custscript_search_supplier_id');

            var searchSupplier = search.load({
                id: paramSupplierSearch
            });

            if(!isBlank(supplierId)){
                var internalIdFilter = search.createFilter({
                    name: 'internalidnumber',
                    operator: 'greaterthanorequalto',
                    values: supplierId
                });

                searchSupplier.filters.push(internalIdFilter);
            }

            searchSupplier.run().each(function(result){

                var suppliersArr = [];
                var columns = result.columns;
                var internalid = result.id;

                var isResched = rescheduleScript(internalid, myConn, ftpRelativePath, ISO_DATE_FOLDER, paramAppzenSFTP_integration_folder);
                if(!isResched){
                    return;
                }
                else {

                    supplierIds.push(internalid);
                    //external_site_id
                    var addressinternalid = result.getValue({
                        name: 'addressinternalid'
                    });

                    //isperson
                    var isperson = result.getValue({
                        name: 'isperson'
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
                        name: 'url'
                    });

                    //on_file_1099
                    var on_file_1099 = '';
                    var is1099eligible = result.getValue({
                        name: 'is1099eligible'
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

                    //fed_tax_id
                    var accountnumber = result.getValue({
                        name: 'accountnumber'
                    });

                    //is_active
                    var is_inactive = result.getValue({
                        name: 'isinactive'
                    });

                    var is_active;
                    var deactive_date;
                    if (is_inactive) {
                        is_active = "true";
                    } else {
                        is_active = "false";
                    }

                    //note
                    var note = result.getValue({
                        name: 'comments'
                    });

                    suppliersArr.push({
                        'external_supplier_id': internalid,
                        'external_site_id': addressinternalid,
                        'supplier_name': supplier_name,
                        'web_site': url,
                        'on_file_1099': on_file_1099,
                        'vat_registration_number': vat_registration_number,
                        'fed_tax_id': accountnumber,
                        'is_active': is_active,
                        'note': note
                    });

                    var postData = addAddressContacts(suppliersArr, addressArr, contactArr);

                    moveJSONFile(postData, myConn, ISO_DATE_FOLDER, TIMESTAMP, paramAppzenSFTP_integration_folder, ftpRelativePath, isoDateFolder);

                    return true;
                }

            });

            //endregion SUPPLIER SEARCH

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

            //region REGROUP

            //endregion REGROUP

            //postData.suppliers = _data;

            //endregion POST DATA

            //region FILE

            /**
             if(!isBlank(postData)) {

                var supplierCount = postData.suppliers.length;

                for(var i in postData.suppliers){

                    var _temp = [];
                    var _data = {};
                    var supplier = postData.suppliers[i];
                    _temp.push(supplier);
                    var fileName = supplier.external_supplier_id  + '_' + TIMESTAMP + '.json';
                    _data.suppliers = _temp;
                    var fileId = createFile(file, fileName, JSON.stringify(_data), paramAppzenSFTP_integration_folder);

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

            }
             **/

            //var contents = JSON.stringify(postData);

            //endregion FILE

            //region Contracts
            /**
             var fileAttachments = getVendorAttachments(search);
             if(!isBlank(fileAttachments && !isBlank(suppliersArr))){
                var fileArr = getSupplierAttachments(fileAttachments, supplierIds);
                if(!isBlank(fileArr)) {
                    for (var f in fileArr) {
                        var fileObj = file.load({
                            id : fileArr[f]
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
            }
             **/
            //endregion Contracts

            /*
            var appzenResponse = https.post({
                url : ENDPOINT,
                body : postData
            });
            var code = appzenResponse.code;
            var body = JSON.stringify(appzenResponse.body);
            */

            /*
            if(IS_LOG_ON) {

                var _log = {
                    'datetime' : new Date(),
                    'request' : contents,
                    'response' : body,
                    'url' : ENDPOINT,
                    'code' : code,
                    'record_type' : RECORD_TYPE_LIST.VENDOR
                };

                generateLog(record, _log);
            }
            */
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
            post.suppliers = _data
            return post;
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

        return {
            execute: execute
        };
    }
);