/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define([ 'N/log', 'N/record', 'N/search', 'N/runtime'],

    function(log, record, search, runtime) {

        function doPost(){

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

            log.debug({
                title : 'PARAMETERS',
                details : 'ENDPOINT : ' + ENDPOINT + ' | Base URI: ' + paramBaseURI + ' | Supplier Endpoint: ' + paramSupplierEndpoint + ' | Search: ' + paramSupplierSearch
            });

        }

        function doGet(requestParams) {

            //region COMPANY PREFERENCES
            var scriptObj = runtime.getCurrentScript();

            //Appzen Base URI
            var paramBaseURI = scriptObj.getParameter({
                name: 'custscript_appzen_base_uri'
            });
            //Appzen Supplier Endpoint
            var paramSupplierEndpoint = scriptObj.getParameter({
                name: 'custscript_appzen_supplier_endpoint'
            });
            //Appzen Supplier Search
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

            log.debug({
                title : 'PARAMETERS',
                details : 'ENDPOINT : ' + ENDPOINT + ' | Base URI: ' + paramBaseURI + ' | Supplier Endpoint: ' + paramSupplierEndpoint + ' | Search: ' + paramSupplierSearch
            });

            var addresses = getAddresses();

            //region SEARCH
            var searchSupplier = search.load({
                id: paramSupplierSearch
            });

            var resultSet = searchSupplier.run();
            var suppliers = {};
            var suppliersArr = [];
            searchSupplier.run().each(function(result){

                var columns = result.columns;

                var internalid = result.id;

                var address = [];
                if(!isBlank(internalid)) {
                    log.debug({
                        title : 'ADDRESS INSIDE',
                        details : JSON.stringify(addresses)
                    });
                    address = findAddressByVendorId(addresses, 'internalid', internalid.toString());
                }

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
                var is_active = result.getValue({
                    name : 'isinactive'
                });

                //note
                var note = result.getValue({
                    name : 'comments'
                });

                //region Address
                //Address array
                var addresses = [];

                //address_type
                var address_type = result.getValue(columns[12]);

                //address_line1
                var address_line1 = result.getValue({
                    name : 'address1'
                });

                //address_line2
                var address_line2 = result.getValue({
                    name : 'address2'
                });

                //address_line3
                var address_line3 = result.getValue({
                    name : 'address3'
                });

                //city
                var city = result.getValue({
                    name : 'city'
                });

                //state
                var state = result.getValue({
                    name : 'state'
                });

                //zip
                var zip = result.getValue({
                    name : 'zipcode'
                });

                //country
                var country = result.getValue({
                    name : 'country'
                });

                //phone
                var phone = result.getValue({
                    name : 'addressphone'
                });

                //endregion Address

                //region Employee

                var employee = [];

                //firstname
                var cfirstname = result.getValue({
                    name: 'firstname',
                    join: 'contactPrimary',
                });

                //lastname
                var clastname = result.getValue({
                    name: 'lastname',
                    join: 'contactPrimary',
                });

                //email
                var cemail = result.getValue({
                    name: 'email',
                    join: 'contactPrimary',
                });

                //phone
                var cphone = result.getValue({
                    name: 'phone',
                    join: 'contactPrimary',
                });

                employee.push({
                    'firstname' : cfirstname,
                    'lastname' : clastname,
                    'email' : cemail,
                    'phone' : cphone
                })

                //endregion Employee

                suppliersArr.push({
                    'external_supplier_id' : internalid,
                    'external_site_id' : addressinternalid,
                    'supplier_name' : supplier_name,
                    'web_site' : url,
                    'on_file_1099' : is1099eligible,
                    'vat_registration_number' : vat_registration_number,
                    'fed_tax_id' : accountnumber,
                    'is_active' : is_active,
                    'note' : note,
                    'addresses' : address
                });
                return true;
            });

            suppliers.suppliers = suppliersArr;

            //endregion SEARCH
            return suppliers;
        }

        function getAddresses() {

            var addresses = [];

            var vendorSearchObj = search.create({
                type: 'vendor',
                filters:
                    [],
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
            var searchResultCount = vendorSearchObj.runPaged().count;
            log.debug('vendorSearchObj result count',searchResultCount);
            vendorSearchObj.run().each(function(result){
                var internalid = result.getValue({
                    name: 'internalid'
                });
                var address_line1 = result.getValue({
                    name: 'address1',
                    join: 'Address'
                });
                var address_line2 = result.getValue({
                    name: 'address2',
                    join: 'Address'
                });
                var address_line3 = result.getValue({
                    name: 'address3',
                    join: 'Address'
                });
                var city = result.getValue({
                    name: 'city',
                    join: 'Address'
                });
                var state = result.getValue({
                    name: 'state',
                    join: 'Address'
                });
                var zip = result.getValue({
                    name: 'zipcode',
                    join: 'Address'
                });
                var country = result.getValue({
                    name: 'country',
                    join: 'Address'
                });
                var phone = result.getValue({
                    name: 'phone',
                    join: 'Address'
                });
                var isdefaultbilling = result.getValue({
                    name: 'isdefaultbilling',
                    join: 'Address'
                });
                var address_type = 'REMIT_TO';
                if(isdefaultbilling){
                    address_type = 'SUPPLIER_SITE';
                }


                addresses.push({
                    'internalid' : internalid,
                    'address_type' : address_type,
                    'address_line1' : address_line1,
                    'address_line2' : address_line2,
                    'address_line3' : address_line3,
                    'city' : city,
                    'state' : state,
                    'zip' : zip,
                    'country' : country,
                    'phone' : phone
                });
                return true;
            });

            return addresses;
        }

        function findAddressByVendorId(array, key, value) {
            var tempArr = [];
            for (var i = 0; i < array.length; i++) {
                if (array[i][key] === value) {
                    console.log(array[i]);
                    tempArr.push(array[i]);
                }
            }
            return tempArr;
        }

        function generateLog(){

            var logs = record.create({
                type: 'customrecord_appzen_integration_logs',
                isDynamic: true
            });

            logs.setValue({
                fieldId: 'custrecord_appzen_datetime',
                value: ''
            });

            logs.setValue({
                fieldId: 'custrecord_appzen_request',
                value: ''
            });

            logs.setValue({
                fieldId: 'custrecord_appzen_response',
                value: ''
            });

            logs.setValue({
                fieldId: 'custrecord_appzen_url',
                value: ''
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

        return {
            get : doGet,
            post : doPost
        };
    }
);