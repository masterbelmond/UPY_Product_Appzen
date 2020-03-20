/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/search'],

    function(record, search, runtime) {

        function doPost(restletBody){

            var postResponse = {};
            var error = {};
            var success = {};

            if(!isEmpty(restletBody)) {

                var invoiceId =  restletBody.invoice_id.toString();
                var status =  restletBody.status.toString();
                var comment =  restletBody.comment.toString();

                if(!isEmpty(invoiceId)){

                    var isValid = getInvoiceById(invoiceId);
                    if(isValid) {
                        if (status == 'approve') {
                            record.submitFields({
                                type: 'vendorbill',
                                id: invoiceId,
                                values: {
                                    'approvalstatus': APPROVAL_STATUS.APPROVED,
                                    'memo': comment
                                }
                            });
                            success.code = 'SUCCESS';
                            success.message = SUCCESS_STATUS.UPDATE_STATUS;
                            success.invoice_id = invoiceId;
                            postResponse.success = success;
                        }
                    }
                    else{
                        error.code = 'INVALID_INVOICE_ID';
                        error.message = ERROR_STATUS.INVOICE_ID_NOT_VALID;
                        postResponse.error = error;
                    }
                }
                else{
                    error.code = 'MISSING_INVOICE_ID';
                    error.message = ERROR_STATUS.MISSING_INVOICE_ID;
                    postResponse.error = error;
                }
                return postResponse;
            }

        }

        var SUCCESS_STATUS = {
            'UPDATE_STATUS' : 'Status set to Approved'
        };

        var ERROR_STATUS = {
            'MISSING_INVOICE_ID' : 'Missing invoice_id field unable to process request',
            'INVOICE_ID_NOT_VALID' : 'invoice_id field is not a valid record'
        };

        var APPROVAL_STATUS = {
            'PENDING_APPROVAL' : '1',
            'APPROVED' : '2'
        };

        function getInvoiceById(internalId) {

            var isValid = false;

            var vendorbillSearchObj = search.create({
                type: 'vendorbill',
                filters:
                    [
                        ['type','anyof','VendBill'],
                        'AND',
                        ['internalid','anyof', internalId],
                        'AND',
                        ['mainline','is','T']
                    ],
                columns:
                    [
                        search.createColumn({name: 'internalid', label: 'Internal ID'}),
                        search.createColumn({name: 'approvalstatus', label: 'Approval Status'}),
                        search.createColumn({name: 'memomain', label: 'Memo (Main)'})
                    ]
            });

            vendorbillSearchObj.run().each(function(result){
                var _id = result.getValue({
                    name: 'internalid'
                });
                if(!isEmpty(_id)){
                    isValid = true;
                }
                log.debug({
                    title : 'SEARCH',
                    details : 'STATUS: ' + _id
                })
            });

            return isValid;
        }

        function isEmpty(stValue) {
            return ((stValue === '' || stValue == null || stValue == undefined) ||
                (stValue.constructor === Array && stValue.length == 0) ||
                (stValue.constructor === Object && (function(v) {
                    for (var k in v) return false;
                    return true;
                })(stValue)));
        }

        return {
            post : doPost
        };

    }
);