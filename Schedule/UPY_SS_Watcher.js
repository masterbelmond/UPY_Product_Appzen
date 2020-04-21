/**
 * Name : UPY | SS | Watcher
 * ID : customscript_upy_ss_watcher
 * Link :
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */

define(['N/runtime', 'N/task', 'N/redirect', 'N/search'],

    function(runtime, task, redirect, search) {

        function watch() {

            var scriptId = 'customscript_upy_sc_post_invoiceapi_v2';
            var deploymentId = 'customdeploy_upy_sc_post_invoiceapi_v2';

            //Run the script
            var rerunSchedule = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT
            });
            rerunSchedule.scriptId = scriptId;
            rerunSchedule.deploymentId = deploymentId;
            try {
                rerunSchedule.submit();
                log.audit({
                    title: 'EXECUTED SCRIPT',
                    details: 'Status: Executed'
                });
            }
            catch (e) {
                
            }
        }

        function getActiveJobs(scriptId, deploymentId) {

            var restartScript = false;

            var scheduledscriptinstanceSearchObj = search.create({

                type: 'scheduledscriptinstance',
                filters:
                    [
                        ['script.scriptid','is', scriptId],
                        'AND',
                        ['status','anyof','COMPLETE','CANCELED','FAILED'],
                        'AND',
                        ['scriptdeployment.scriptid','is', deploymentId],
                        'AND',
                        ['datecreated','within','minutesago15']
                    ],
                columns:
                    [
                        search.createColumn({
                            name: 'name',
                            join: 'script',
                            label: 'Name'
                        }),
                        search.createColumn({
                            name: 'datecreated',
                            sort: search.Sort.ASC,
                            label: 'Date Created'
                        }),
                        search.createColumn({name: 'startdate', label: 'Start Date'}),
                        search.createColumn({name: 'enddate', label: 'End Date'}),
                        search.createColumn({name: 'queue', label: 'Queue'}),
                        search.createColumn({name: 'status', label: 'Status'}),
                        search.createColumn({name: 'mapreducestage', label: 'Map/Reduce Stage'}),
                        search.createColumn({name: 'percentcomplete', label: 'Percent Complete'}),
                        search.createColumn({name: 'queueposition', label: 'Queue Position'})
                    ]
            });

            scheduledscriptinstanceSearchObj.run().each(function(result){
                restartScript = true;
                return true;
            });

            return hasFailedJobs;

        }

        return {
            execute : watch
        };
    });
