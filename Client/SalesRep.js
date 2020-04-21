/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

define(['N/ui/dialog'],
    function(dialog){

        function saveRecord(context) {
            var currentRecord = context.currentRecord;
            var salesTeam = currentRecord.getValue({
                sublistId : 'salesteam',
                fieldId: 'employee',
                line: 1
            });

            if(isEmpty(salesTeam)){
                dialog.alert({
                    title: 'Error',
                    message: 'Please assign a Sales Rep on the Sales Team list.'
                });
                return false;
            }
            else{
                return true;
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
            saveRecord: saveRecord
        }
    }
);