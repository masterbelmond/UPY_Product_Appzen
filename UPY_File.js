/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope Public
 */

define(['N/ui/serverWidget', 'N/search', 'N/task', 'N/file', 'N/record', 'N/runtime'],

    function (nsServerWidget, nsSearch, nsTask, nsFile, nsRecord, nsRuntime) {

        function onRequest(context) {
            var transactionSearchObj = nsSearch.create({
                type: 'transaction',
                filters:
                    [
                        ['type','anyof','VendBill','VendCred','PurchOrd'],
                        'AND',
                        ['file.internalid','noneof','@NONE@'],
                        'AND',
                        ['internalid','anyof','28340']
                    ],
                columns:
                    [
                        nsSearch.createColumn({
                            name: 'internalid',
                            summary: 'GROUP',
                            label: 'Internal ID'
                        }),
                        nsSearch.createColumn({
                            name: 'type',
                            summary: 'GROUP',
                            label: 'Type'
                        }),
                        nsSearch.createColumn({
                            name: 'internalid',
                            join: 'file',
                            summary: 'GROUP',
                            label: 'Internal ID'
                        })
                    ]
            });
            var searchResultCount = transactionSearchObj.runPaged().count;
            log.debug('transactionSearchObj result count',searchResultCount);
            transactionSearchObj.run().each(function(result){
                // .run().each has a limit of 4,000 results
                var fileId = result.getValue({
                    name: 'internalid',
                    join: 'file',
                    summary: 'GROUP'
                });

                var fileObj = nsFile.load({
                    id : fileId
                });

                var content = fileObj.getContents();

                log.debug({
                    title : 'File Content',
                    details : content
                });

                return true;
            });
        }

        return {
            onRequest: onRequest
        }
    });