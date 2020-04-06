/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */

var TIMESTAMP = 'test TIMESTAMP';
var FTP_RELATIVEPATH = 'test TIMESTAMP';

define(['N/record', 'N/search', 'N/log', 'N/email', 'N/runtime', 'N/error','N/file', 'N/http', 'N/https', 'N/keyControl', 'N/sftp', './Appzen_Integration_library.js'],

    function (record, search, log, email, runtime, error, file, http, https, keyControl, sftp) {

        function getInputData(){

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
            TIMESTAMP = new Date().getTime();
            FTP_RELATIVEPATH = paramAppzenSFTP_dir + paramAppzenSFTP_supplier_folder;
            //endregion GLOBAL VAR

            //region SUPPLIER SEARCH

            /*
            var postData = {};
            var _data = [];
            var suppliersArr = [];
            var addressArr = [];
            var contactArr = [];
            var supplierIds = [];

            //region SUPPLIER SEARCH
            var searchSupplier = search.load({
                id: paramSupplierSearch
            });

            var resultSet = searchSupplier.run();

            searchSupplier.run().each(function(result){

                var columns = result.columns;
                var internalid = result.id;
                supplierIds.push(internalid);

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
                var on_file_1099 = '';
                var is1099eligible = result.getValue({
                    name : 'is1099eligible'
                });

                if(!isBlank(is1099eligible)){
                    if(is1099eligible){
                        on_file_1099 = "true";
                    }
                    else{
                        on_file_1099 = "false";
                    }
                }
                else{
                    on_file_1099 = "false";
                }

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
                    is_active = "true";
                }
                else{
                    is_active = "false";
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
                    'on_file_1099' : on_file_1099,
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
                id: 'customsearch_upy_vendor_address_search'
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
                id: 'customsearch_upy_vendor_contacts'
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
            log.debug({
                title : 'GET INPUT DATA',
                details : JSON.stringify(postData)
            });
            return postData;
            */

            var searchSupplier = search.load({
                id: paramSupplierSearch
            });

            return searchSupplier;
        }

        function map(context){

            try{

                var scriptObj = runtime.getCurrentScript();

                var paramSupplierSearch = scriptObj.getParameter({
                    name: 'custscript_appzen_supplier_search'
                });
                var paramAppzenSFTP_integration_folder = scriptObj.getParameter({
                    name: 'custscript_appzen_integration_folder_id'
                });

                var paramAppzenSFTP_URL = scriptObj.getParameter({
                    name: 'custscript_appzen_sftp_url'
                });

                var paramAppzenSFTP_username = scriptObj.getParameter({
                    name: 'custscript_appzen_sftp_username'
                });

                var _tempPostData = JSON.parse(context.value);
                var supplierId = _tempPostData.id;

                //region CONTACT SEARCH
                var contactArr = [];
                var contactSearchObj = search.create({
                    type: 'contact',
                    filters:
                        [
                            ['company.type','anyof','Vendor'],
                            'AND',
                            ['vendor.internalidnumber','equalto', supplierId]
                        ],
                    columns:
                        [
                            search.createColumn({name: 'company', label: 'Company'}),
                            search.createColumn({name: 'firstname', label: 'First Name'}),
                            search.createColumn({name: 'lastname', label: 'Last Name'}),
                            search.createColumn({name: 'email', label: 'Email'}),
                            search.createColumn({name: 'phone', label: 'Phone'})
                        ]
                });
                contactSearchObj.run().each(function(result){
                    // .run().each has a limit of 4,000 results
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
                        'first_name' : firstname,
                        'last_name' : lastname,
                        'email' : email,
                        'phone' : phone
                    });
                    return true;
                });
                //endregion CONTACT SEARCH

                //region ADDRESS SEARCH
                var addressArr = [];
                var searchAddress = search.create({
                    type: 'vendor',
                    filters:
                        [
                            ['internalid','anyof', supplierId]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: 'internalid',
                                sort: search.Sort.ASC,
                                label: 'Internal ID'
                            }),
                            search.createColumn({
                                name: 'address',
                                join: 'Address',
                                label: 'Address'
                            }),
                            search.createColumn({
                                name: 'address1',
                                join: 'Address',
                                label: 'Address 1'
                            }),
                            search.createColumn({
                                name: 'address2',
                                join: 'Address',
                                label: 'Address 2'
                            }),
                            search.createColumn({
                                name: 'address3',
                                join: 'Address',
                                label: 'Address 3'
                            }),
                            search.createColumn({
                                name: 'addressinternalid',
                                join: 'Address',
                                label: 'Address Internal ID'
                            }),
                            search.createColumn({
                                name: 'addresslabel',
                                join: 'Address',
                                label: 'Address Label'
                            }),
                            search.createColumn({
                                name: 'addressphone',
                                join: 'Address',
                                label: 'Address Phone'
                            }),
                            search.createColumn({
                                name: 'addressee',
                                join: 'Address',
                                label: 'Addressee'
                            }),
                            search.createColumn({
                                name: 'attention',
                                join: 'Address',
                                label: 'Attention'
                            }),
                            search.createColumn({
                                name: 'city',
                                join: 'Address',
                                label: 'City'
                            }),
                            search.createColumn({
                                name: 'country',
                                join: 'Address',
                                label: 'Country'
                            }),
                            search.createColumn({
                                name: 'countrycode',
                                join: 'Address',
                                label: 'Country Code'
                            }),
                            search.createColumn({
                                name: 'isdefaultbilling',
                                join: 'Address',
                                label: 'Default Billing Address'
                            }),
                            search.createColumn({
                                name: 'isdefaultshipping',
                                join: 'Address',
                                label: 'Default Shipping Address'
                            }),
                            search.createColumn({
                                name: 'internalid',
                                join: 'Address',
                                label: 'Internal ID'
                            }),
                            search.createColumn({
                                name: 'state',
                                join: 'Address',
                                label: 'State/Province'
                            }),
                            search.createColumn({
                                name: 'statedisplayname',
                                join: 'Address',
                                label: 'State/Province Display Name'
                            }),
                            search.createColumn({
                                name: 'zipcode',
                                join: 'Address',
                                label: 'Zip Code'
                            })
                        ]
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

                    if(isBlank(contactArr)){
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
                    }
                    else{
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
                            'phone' : phone,
                            'employees' : contactArr
                        });
                    }


                    return true;
                });

                //endregion ADDRESS SEARCH

                //region SUPPLIER SEARCH
                var searchSupplier = search.load({
                    id: paramSupplierSearch
                });
                var filter1 = search.createFilter({
                    name: 'internalid',
                    operator: search.Operator.IS,
                    values: supplierId
                });
                searchSupplier.filters.push(filter1);

                var suppliersArr = [];

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
                    var on_file_1099 = '';
                    var is1099eligible = result.getValue({
                        name : 'is1099eligible'
                    });

                    if(!isBlank(is1099eligible)){
                        if(is1099eligible){
                            on_file_1099 = "true";
                        }
                        else{
                            on_file_1099 = "false";
                        }
                    }
                    else{
                        on_file_1099 = "false";
                    }

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
                        is_active = "true";
                    }
                    else{
                        is_active = "false";
                    }

                    //note
                    var note = result.getValue({
                        name : 'comments'
                    });

                    if(isBlank(addressArr)) {
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
                    }
                    else{
                        suppliersArr.push({
                            'external_supplier_id': internalid,
                            'external_site_id': addressinternalid,
                            'supplier_name': supplier_name,
                            'web_site': url,
                            'on_file_1099': on_file_1099,
                            'vat_registration_number': vat_registration_number,
                            'fed_tax_id': accountnumber,
                            'is_active': is_active,
                            'note': note,
                            'addresses' : addressArr
                        });
                    }

                    return true;

                });
                //endregion SUPPLIER SEARCH

                var _data = {};
                _data.supplier = suppliersArr;

                var fileName = suppliersArr[0].external_supplier_id  + '.json';
                var fileId = createFile(file, fileName, JSON.stringify(_data), paramAppzenSFTP_integration_folder);

                /*
                var loadFile = file.load({
                    id : fileId
                });

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

                myConn.upload({
                    directory: '/6800/TEST/',
                    filename: fileName,
                    file: loadFile,
                    replaceExisting: true
                });
                */

                log.debug('MAP : ADDRESS', JSON.stringify(suppliersArr));
                context.write(suppliersArr);

                /*
                if(!isBlank(_tempPostData)) {

                    for (var i in _tempPostData) {

                        var _temp = [];
                        var _data = {};
                        var supplier = _tempPostData[i];

                        var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
                        log.debug('MAP : supplier | Remaining Usage: ' + remainingUsage, JSON.stringify(supplier));

                        _temp.push(supplier);
                        var fileName = supplier.external_supplier_id + '_' + TIMESTAMP + '.json';

                        _data.suppliers = _temp;
                        var loadFile = createFileObj(file, fileName, JSON.stringify(_data), paramAppzenSFTP_integration_folder);

                        myConn.upload({
                            directory: ftpRelativePath + isoDateFolder,
                            filename: fileName,
                            file: loadFile,
                            replaceExisting: true
                        });
                    }
                }

                 */
            }
            catch(err){
                log.error('ERROR','Details: ' + err.message);
                context.write(null,'1NONE1' + ',NONE');
            }

        }

        function reduce(context) {
            try {
                log.debug('REDUCE STAGE', 'Key: ' + context.key);
                log.debug('REDUCE STAGE', 'Values: ' + JSON.stringify(context.values));
            } catch (err) {
                log.error("Error Creating Label (if required)", "Details: " + err.message);
            }
        }

        function summarize(summary) {

            var type = summary.toString();
            log.debug({
                title: "This is the full summary:",
                details: summary
            });

            log.debug(type + ' Usage Consumed', summary.usage);
            log.debug(type + ' Concurrency Number ', summary.concurrency);
            log.debug(type + ' Number of Yields', summary.yields);

        }

        return {
            getInputData: getInputData,
            map: map,
            //reduce: reduce,
            summarize: summarize
        }
    }
);