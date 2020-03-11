/**
 *
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 *
 */
var aDependencies = ['N/record', 'N/search', 'N/log', 'N/email', 'N/runtime', 'N/error','N/file', 'N/http', 'N/https', 'N/keyControl', 'N/sftp', './Appzen_Integration_library.js']

function uploadFiles(record, search, log, email, runtime, error, file, http, https, keyControl, sftp) {

    function execute(){

        //region COMPANY PREFERENCES
        var scriptObj = runtime.getCurrentScript();

        var paramBaseURI = scriptObj.getParameter({
            name: 'custscript_appzen_base_uri'
        });
        var paramAppzenCustomerID = scriptObj.getParameter({
            name: 'custscript_appzen_customer_id'
        });
        var paramInvoiceEndpoint = scriptObj.getParameter({
            name: 'custscript_appzen_invoice_endpoint'
        });
        var paramInvoiceSearch = scriptObj.getParameter({
            name: 'custscript_appzen_invoice_search'
        });

        var paramAppzenSFTP_URL = scriptObj.getParameter({
            name: 'custscript_appzen_sftp_url'
        });
        var paramAppzenSFTP_username = scriptObj.getParameter({
            name: 'custscript_appzen_sftp_username'
        });
        var paramAppzenSFTP_dir = scriptObj.getParameter({
            name: 'custscript_appzen_sftp_root_dir'
        });
        var paramAppzenSFTP_integration_folder = scriptObj.getParameter({
            name: 'custscript_appzen_integration_folder_id'
        });

        var paramAppzenSFTP_invoice_folder = scriptObj.getParameter({
            name: 'custscript_appzen_sftp_dir_invoice'
        });
        //endregion COMPANY PREFERENCES

        //region USER PREFERENCES
        var IS_LOG_ON = scriptObj.getParameter({
            name: 'custscript_appzen_sc_invoice_logs'
        });
        //endregion USER PREFERENCES

        //region GLOBAL VAR
        var URI = paramBaseURI + paramInvoiceEndpoint;
        var TYPE = 'type=invoice';
        var NETSUITE_CUSTOMER_ID = '&customer_id=' + paramAppzenCustomerID;
        var ENDPOINT = URI + TYPE + NETSUITE_CUSTOMER_ID;
        var TIMESTAMP = new Date().getTime();
        //endregion GLOBAL VAR

        //region Create SFTP Directories
        var myConn = '';

        var ISO_DATE_FOLDER = '';
        var HOST_KEY_TOOL_URL = 'https://ursuscode.com/tools/sshkeyscan.php?url=';
        var url = paramAppzenSFTP_URL;
        var port = '';
        var hostKeyType = '';
        var myUrl = HOST_KEY_TOOL_URL + url + "&port=" + port + "&type=" + hostKeyType;

        var tempHostKey = https.get({url: myUrl}).body;
        var hostKey = tempHostKey.replace(paramAppzenSFTP_URL + ' ssh-rsa ', '');

        var keyControlModule = keyControl.loadKey({
            scriptId: 'custkey_appzen_sftp'
        });

        if(!isBlank(hostKey)){
            myConn = createSftpConnection(sftp, paramAppzenSFTP_username, paramAppzenSFTP_URL, hostKey, keyControlModule.scriptId);
        }

        var ftpRelativePath;

        if(!isBlank(myConn)) {

            //Create a Folder
            var tempDate = new Date();;
            var tempFolder =  tempDate.toISOString().split('.')[0]+"Z";
            var isoDateFolder = tempFolder.replace(/:\s*/g, ".");
            ISO_DATE_FOLDER = isoDateFolder;

            ftpRelativePath = '/UPAYA/testupload';

            myConn.makeDirectory({
                path: ftpRelativePath
            });

        }

        //endregion Create SFTP Directories

        log.debug({
            title : 'PARAMETERS',
            details : 'ENDPOINT : ' + ENDPOINT + ' | Base URI: ' + paramBaseURI + ' | Invoice Endpoint: ' + paramInvoiceEndpoint + ' | Search: ' + paramInvoiceSearch + ' | Capture Logs' + IS_LOG_ON
        });

        var files = getFiles();

        for(var i in files){

            //load file
            var fileObj = file.load({
                id : files[i]
            });
            var fileName = fileObj.name;
            //region Upload a File

            //Time BEFORE we upload
            var remainingStart = runtime.getCurrentScript().getRemainingUsage();
            var startDateTime = new Date();
            log.debug({
                title : 'START',
                details : 'Start Upload: ' + startDateTime + ' | Remaining: ' + remainingStart
            });
            myConn.upload({
                directory: ftpRelativePath,
                filename: fileName,
                file: fileObj,
                replaceExisting: true
            });
            var remainingEnd = runtime.getCurrentScript().getRemainingUsage();
            var endDateTime = new Date();
            log.debug({
                title : 'END',
                details : 'End Upload: ' + endDateTime + ' | Remaining: ' + remainingEnd
            });

            //Time AFTER we upload
        }

        log.debug({
            title : 'Files',
            details : JSON.stringify(files)
        });

    }

    function getFiles(){

        var files = [];
        var fileSearchObj = search.create({
            type: 'file',
            filters:
                [
                    ['folder','anyof','72'],
                    'AND',
                    ['created','within','3/4/2020 12:00 am','3/4/2020 11:59 pm']
                ],
            columns:
                [
                    search.createColumn({
                        name: 'name',
                        sort: search.Sort.ASC,
                        label: 'Name'
                    }),
                    search.createColumn({name: 'folder', label: 'Folder'}),
                    search.createColumn({name: 'documentsize', label: 'Size (KB)'}),
                    search.createColumn({name: 'url', label: 'URL'}),
                    search.createColumn({name: 'created', label: 'Date Created'}),
                    search.createColumn({name: 'modified', label: 'Last Modified'}),
                    search.createColumn({name: 'filetype', label: 'Type'})
                ]
        });
        var searchResultCount = fileSearchObj.runPaged().count;
        log.debug('fileSearchObj result count',searchResultCount);
        fileSearchObj.run().each(function(result){
            // .run().each has a limit of 4,000 results
            files.push(result.id);
            return true;
        });
        return files;
    }

    return {
        execute: execute
    };

}

define(aDependencies, uploadFiles)