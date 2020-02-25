/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define([ 'N/log', 'N/record', 'N/search', 'N/runtime'],

    function(log, record, search, runtime) {

        function doPost(){
        }

        function doGet(requestParams) {

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
            //endregion COMPANY PREFERENCES

            //region USER PREFERENCES
            var paramSupplierLogs = scriptObj.getParameter({
                name: 'custscript_appzen_supplier_logs'
            });
            //endregion USER PREFERENCES

            //region GLOBAL VAR
            var URI = paramBaseURI + paramSupplierEndpoint;
            var TYPE = 'type=supplier';
            var NETSUITE_CUSTOMER_ID = '&customer_id=' + paramAppzenCustomerID;
            var ENDPOINT = URI + TYPE + NETSUITE_CUSTOMER_ID;
            //endregion GLOBAL VAR

            /**
            log.debug({
                title : 'PARAMETERS',
                details : 'ENDPOINT : ' + ENDPOINT + ' | Base URI: ' + paramBaseURI + ' | Supplier Endpoint: ' + paramSupplierEndpoint + ' | Search: ' + paramSupplierSearch
            });
             **/

            var postData = {};

            var _data = [];
            var suppliersArr = [];
            var addressArr = [];
            var contactArr = [];columns

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

            var _log = {
                'datetime' : new Date(),
                'request' : postData,
                'url' : ENDPOINT
            };

            generateLog(_log);

            return postData;
        }

        //region FUNCTIONS

        function filteredArray(arr, key, value) {
            const newArray = [];
            for(i=0, l=arr.length; i<l; i++) {
                if(arr[i][key] === value) {
                    delete arr[i].external_supplier_id;
                    newArray.push(arr[i]);
                }
            }
            return newArray;
        }

        function findFromArray(array,key,value) {
            return array.filter(function (element) {
                return element[key] == value;
            }).shift();
        }

        function generateLog(_log){

            var logs = record.create({
                type: 'customrecord_appzen_integration_logs',
                isDynamic: true
            });

            logs.setValue({
                fieldId: 'custrecord_appzen_datetime',
                value: _log.datetime
            });

            logs.setValue({
                fieldId: 'custrecord_appzen_request',
                value: JSON.stringify(_log.request)
            });

            logs.setValue({
                fieldId: 'custrecord_appzen_response',
                value: ''
            });

            logs.setValue({
                fieldId: 'custrecord_appzen_url',
                value: _log.url
            });

            logs.setValue({
                fieldId: 'custrecord_appzen_code',
                value: ''
            });

            /*
            logs.setValue({
                fieldId: 'custrecord_appzen_netsuite_record_type',
                value: ''
            });
            */

            try{
                var logId = logs.save();
            }
            catch(ex){
                log.error('Error', e);
            }
        }

        /**
         * @param {string} test input the string to look for space characters
         * @return {boolean}
         */
        function isBlank(test) {
            if ((test == '') || (test == null) || (test == undefined) ||
                (test.toString().charCodeAt() == 32)) {
                return true;
            } else {
                return false;
            }
        }

        //endregion FUNCTIONS

        return {
            get : doGet,
            post : doPost
        };
    }
);