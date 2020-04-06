/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/search', 'N/log', 'N/email', 'N/runtime', 'N/error','N/file', 'N/http', 'N/https', 'N/keyControl', 'N/sftp', 'N/task', './Appzen_Integration_library.js'],

    function (record, search, log, email, runtime, error, file, http, https, keyControl, sftp, task) {

        function execute() {

            //region SUPPLIER SEARCH
            var searchSupplier = search.load({
                id: '201'
            });
            var internalIdFilter = search.createFilter({
                name: 'internalidnumber',
                operator: 'GREATERTHAN',
                values: '100'
            });
            searchSupplier.filters.push(internalIdFilter);

            var rscnt = 1000;
            var nextStartIndex = 0;
            var nextEndIndex = 1000;
            var resultSet = searchSupplier.run();

            while (rscnt == 1000){
                var rs = resultSet.getRange({
                    start: nextStartIndex,
                    end: nextEndIndex
                });

                if(rs != null) {
                    for (var x = 0; x < rs.length; x++) {
                        var internalId = rs[x].getValue({
                            name : 'internalid'
                        });
                        log.debug({
                            title : 'INTERNAL ID',
                            details : internalId
                        });
                    }
                    rscnt = rs.length;
                }
                else{
                    rscnt = 0;
                }
                nextStartIndex = nextEndIndex;
                nextEndIndex = nextEndIndex + 1000;
                log.debug({
                    title : 'WHILE',
                    details : 'nextStartIndex: ' + nextStartIndex + ' | nextEndIndex: ' + nextEndIndex
                })
            }
        }

        function rescheduleScript(){

            var usage = runtime.getCurrentScript().getRemainingUsage();
            if (usage <= 1000)
            {
                var scriptTask = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT
                });
                scriptTask.scriptId = runtime.getCurrentScript().id;
                scriptTask.deploymentId = runtime.getCurrentScript().deploymentId;
                return scriptTask.submit();
            }
        }

        return {
            execute: execute
        };
    }
);