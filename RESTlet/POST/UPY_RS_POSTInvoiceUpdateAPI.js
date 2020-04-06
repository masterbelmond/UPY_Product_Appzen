/**
 * https://5432907-sb1.app.netsuite.com/app/common/scripting/scriptrecord.nl?id=1362
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
                                    'paymenthold': 'F'
                                }
                            });

                            var _logs = {};
                            _logs.invoice_id = invoiceId;
                            _logs.timestamp = new Date();
                            _logs.comment = comment;
                            _logs.status = APPZEN_STATUS.APPROVE;
                            createAppzenPaymentLogs(_logs);


                            success.code = 'SUCCESS';
                            success.message = SUCCESS_STATUS.UPDATE_STATUS_APPROVE;
                            success.invoice_id = invoiceId;
                            postResponse.success = success;
                        }
                        else if (status == 'reject'){

                            record.submitFields({
                                type: 'vendorbill',
                                id: invoiceId,
                                values: {
                                    'paymenthold': 'T'
                                }
                            });

                            var _logs = {};
                            _logs.invoice_id = invoiceId;
                            _logs.timestamp = new Date();
                            _logs.comment = comment;
                            _logs.status = APPZEN_STATUS.HOLD;
                            createAppzenPaymentLogs(_logs);

                            success.code = 'SUCCESS';
                            success.message = SUCCESS_STATUS.UPDATE_STATUS_REJECT;
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
            'UPDATE_STATUS_APPROVE' : 'Release from Payment On Hold',
            'UPDATE_STATUS_REJECT' : 'Payment On Hold',
        };

        var ERROR_STATUS = {
            'MISSING_INVOICE_ID' : 'Missing invoice_id field unable to process request',
            'INVOICE_ID_NOT_VALID' : 'invoice_id field is not a valid record'
        };

        var APPZEN_STATUS = {
            'HOLD' : '1',
            'REJECT' : '2',
            'APPROVE' : '3'
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

        function createAppzenPaymentLogs(_log) {
            var logs = record.create({
                type: 'customrecord_appzen_payment_status',
                isDynamic: true
            });
            logs.setValue({
                fieldId: 'custrecord_appzen_payment_transaction',
                value: _log.invoice_id
            });
            logs.setValue({
                fieldId: 'custrecord_appzen_payment_status',
                value: _log.status
            });
            logs.setValue({
                fieldId: 'custrecord_appzen_payment_comment',
                value: _log.comment
            });
            logs.setValue({
                fieldId: 'custrecord_appzen_payment_timestamp',
                value: _log.timestamp
            });
            try{
                var logId = logs.save();
            }
            catch(ex){
                log.error('Error', e);
            }
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