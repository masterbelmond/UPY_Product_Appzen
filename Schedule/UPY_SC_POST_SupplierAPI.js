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
            //endregion GLOBAL VAR


            //region POST DATA
            var postData = {};

            var _data = [];
            var suppliersArr = [];
            var addressArr = [];
            var contactArr = [];

            //region SUPPLIER SEARCH
            var searchSupplier = search.load({
                id: paramSupplierSearch
            });

            var resultSet = searchSupplier.run();
            searchSupplier.run().each(function(result){

                var columns = result.columns;
                var internalid = result.id;

                //external_site_id
                var addressinternalid = result.getValue({
                    name : 'addressinternalid'
                });

                //isperson
                var isperson = result.getValue({
                    name : 'isperson'
                });

                //supplier_name
                var supplier_name1 = result.getValue(columns[3]);
                var supplier_name2 = result.getValue(columns[4]);
                var supplier_name = '';
                if(isperson){
                    supplier_name = supplier_name1;
                }
                else{
                    supplier_name = supplier_name2;
                }

                //url
                var url = result.getValue({
                    name : 'url'
                });

                //on_file_1099
                var is1099eligible = result.getValue({
                    name : 'is1099eligible'
                });

                //vat_registration_number
                var vat_registration_number = result.getValue(columns[7]);

                //fed_tax_id
                var accountnumber = result.getValue({
                    name : 'accountnumber'
                });

                //is_active
                var is_inactive = result.getValue({
                    name : 'isinactive'
                });

                var is_active;
                var deactive_date;
                if(is_inactive){
                    is_active = true;
                }
                else{
                    is_active = false;
                }

                //note
                var note = result.getValue({
                    name : 'comments'
                });

                suppliersArr.push({
                    'external_supplier_id' : internalid,
                    'external_site_id' : addressinternalid,
                    'supplier_name' : supplier_name,
                    'web_site' : url,
                    'on_file_1099' : is1099eligible,
                    'vat_registration_number' : vat_registration_number,
                    'fed_tax_id' : accountnumber,
                    'is_active' : is_active,
                    'note' : note
                });
                return true;
            });

            //endregion SUPPLIER SEARCH

            //region ADDRESS SEARCH

            var searchAddress = search.load({
                id: '202'
            });
            var addressResultSet = searchAddress.run();
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
                id: '203'
            });

            var contactResultSet = searchContact.run();
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

            for(var i in suppliersArr){

                var id = suppliersArr[i].external_supplier_id;

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
            }

            postData.suppliers = _data;

            var appzenResponse = https.post({
                url : ENDPOINT,
                body : postData
            });

            var code = appzenResponse.code;
            var body = JSON.stringify(appzenResponse.body);

            //endregion POST DATA

            //region FILE

            var fileName = 'SUPPLIER_' + timeStamp() + '.json';
            var contents = JSON.stringify(postData);
            var fileId = createFile(fileName, contents, paramAppzenSFTP_integration_folder);

            //endregion FILE

            //region SFTP
            if(!isBlank(fileId)){

                var myConn = '';

                var HOST_KEY_TOOL_URL = 'https://ursuscode.com/tools/sshkeyscan.php?url=';
                var url = paramAppzenSFTP_URL;
                var port = '';
                var hostKeyType = '';
                var myUrl = HOST_KEY_TOOL_URL + url + "&port=" + port + "&type=" + hostKeyType;

                var tempHostKey = https.get({url: myUrl}).body;
                var hostKey = tempHostKey.replace(paramAppzenSFTP_URL + ' ssh-rsa ', '');

                log.debug({
                    title : 'HostKey',
                    details : tempHostKey
                })

                var keyControlModule = keyControl.loadKey({
                    scriptId: 'custkey_appzen_sftp'
                });

                if(!isBlank(hostKey)){
                    myConn = createSftpConnection(paramAppzenSFTP_username, paramAppzenSFTP_URL, hostKey, keyControlModule.scriptId);
                }

                if(!isBlank(myConn)) {

                    var loadFile = file.load({
                        id : fileId
                    });

                    myConn.upload({
                        directory: paramAppzenSFTP_dir,
                        filename: fileName,
                        file: loadFile,
                        replaceExisting: true
                    });
                }

            }
            //endregion SFTP

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

        function createFile(fileName, contents, folder) {
            var fileObj = file.create({
                name: fileName,
                fileType: file.Type.PLAINTEXT,
                contents: contents,
                folder : folder
            });

            var id = fileObj.save();
            return id;
        }
        
        return {
            execute: execute
        };
    }
);