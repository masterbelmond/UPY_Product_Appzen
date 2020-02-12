/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define([ 'N/log', 'N/record', 'N/search', 'N/runtime'],

    function(log, record, search, runtime) {

        function doPost(){

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

            log.debug({
                title : 'PARAMETERS',
                details : 'Base URI: ' + paramBaseURI + ' | Supplier Endpoint: ' + paramSupplierEndpoint + ' | Search: ' + paramSupplierSearch
            });

        }

        function doGet(requestParams) {

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

            log.debug({
                title : 'PARAMETERS',
                details : 'Base URI: ' + paramBaseURI + ' | Supplier Endpoint: ' + paramSupplierEndpoint + ' | Search: ' + paramSupplierSearch
            });

            //region SEARCH
            var searchSupplier = search.load({
                id: paramSupplierSearch
            });

            var resultSet = searchSupplier.run();
            var suppliers = {};
            var suppliersArr = [];
            searchSupplier.run().each(function(result){

                var columns = result.columns;

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

                //Address array
                var addresses = {};

                //address_type
                var address_type = result.getValue(columns[12]);
                var address_line1 = result.getValue({
                    name : 'address1'
                });
                addresses.address_type = address_type;
                addresses.address_line1 = address_line1;

                suppliersArr.push({
                    'external_supplier_id' : result.id,
                    'external_site_id' : addressinternalid,
                    'supplier_name' : supplier_name,
                    'web_site' : url,
                    'on_file_1099' : is1099eligible,
                    'vat_registration_number' : vat_registration_number,
                    'fed_tax_id' : accountnumber,
                    'is_active' : is_active,
                    'note' : note,
                    'addresses' : addresses
                });
                return true;
            });

            suppliers.suppliers = suppliersArr;

            //endregion SEARCH
            return suppliers;
        }

        return {
            get : doGet,
            post : doPost
        };
    }
);