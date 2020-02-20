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
            var paramAppzenCustomerID = scriptObj.getParameter({
                name: 'custscript_appzen_customer_id'
            });
            var paramPurchaseOrderEndpoint = scriptObj.getParameter({
                name: 'custscript_appzen_purch_ord_endpoint'
            });
            var paramPurchaseOrderSearch = scriptObj.getParameter({
                name: 'custscript_appzen_purch_ord_search'
            });
            //endregion COMPANY PREFERENCES

            //region USER PREFERENCES
            var paramSupplierLogs = scriptObj.getParameter({
                name: 'custscript_appzen_supplier_logs'
            });
            //endregion USER PREFERENCES

            //region GLOBAL VAR
            var URI = paramBaseURI + paramPurchaseOrderEndpoint;
            var TYPE = 'type=purchaseorder';
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
            var purchaseOrderArr = [];
            var addressArr = [];
            var contactArr = [];

            //region PURCHASE ORDER SEARCH
            var searchSupplier = search.load({
                id: paramPurchaseOrderSearch
            });

            var resultSet = searchSupplier.run();
            searchSupplier.run().each(function(result){

                var columns = result.columns;
                var internalid = result.id;

                //external_supplier_id
                var external_purchase_order_number = result.getValue(columns[0]);

                //external_supplier_id
                var external_supplier_id = result.getValue({
                    name : 'internalid'
                });

                //org_id
                var org_id = result.getValue({
                    name : 'subsidiarynohierarchy'
                });


                purchaseOrderArr.push({
                    'external_purchase_order_number' : external_purchase_order_number,
                    'external_supplier_id' : external_supplier_id,
                    'org_id' : org_id
                });
                return true;
            });

            //endregion PURCHASE ORDER SEARCH

            postData = purchaseOrderArr;

            return postData;
        }

        return {
            get : doGet,
            post : doPost
        };
    }
);