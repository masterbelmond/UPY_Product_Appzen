/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 *@NModuleScope Public
 */

define(['N/sftp', 'N/file','N/search', 'N/keyControl', 'N/https'],

    function(sftp, file, search, keyControl, https) {

        /**
         * Definition of the Scheduled script trigger point.
         *
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
         * @Since 2015.2
         */
        function execute(scriptContext) {

            var HOST_KEY_TOOL_URL = 'https://ursuscode.com/tools/sshkeyscan.php?url=';
            var url = 'sftp.appzen.com';
            var port = '';
            var hostKeyType = '';
            var myUrl = HOST_KEY_TOOL_URL + url + "&port=" + port + "&type=" + hostKeyType;
            var response = https.get({url: myUrl}).body;
            log.debug({
                title : 'HOST KEY',
                details : response
            });

            var hostKey = 'AAAAB3NzaC1yc2EAAAADAQABAAABAQCztIqodM9dOk7RWC/eBcLEL8RD9M+dCgyddFG6pEfDiBWYy3ubOStYSLjPc5Dg22rNpimSL1bRN5Bi4d1uIr2UBaoOccPmmyr/NZnrGdHeCTNl2675bLzn/xiEHLJ4mVHAWs6OzDGVUGBKvV+R/qN/NL35RNjJ7ow/vYrcxpySWn5bnd4duOjO2hC1FeauYCA/EUGOauuW7OXTxYvK6e94+uaTh3N0N1ecYuCmPi1Hpx3IY5P6J24ZfJdMl+frkS+5rkMus7Vi0ieGOTrh8ERUSlffiIWq3pK+b628o7pmqvTAoIcmlnlEH+Vrgz+6uEnJkI40z7Z0ijmCzm8q7Rq1';
             //sftp.appzen.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCztIqodM9dOk7RWC/eBcLEL8RD9M+dCgyddFG6pEfDiBWYy3ubOStYSLjPc5Dg22rNpimSL1bRN5Bi4d1uIr2UBaoOccPmmyr/NZnrGdHeCTNl2675bLzn/xiEHLJ4mVHAWs6OzDGVUGBKvV+R/qN/NL35RNjJ7ow/vYrcxpySWn5bnd4duOjO2hC1FeauYCA/EUGOauuW7OXTxYvK6e94+uaTh3N0N1ecYuCmPi1Hpx3IY5P6J24ZfJdMl+frkS+5rkMus7Vi0ieGOTrh8ERUSlffiIWq3pK+b628o7pmqvTAoIcmlnlEH+Vrgz+6uEnJkI40z7Z0ijmCzm8q7Rq1
            var keyControlModule = keyControl.loadKey({
                scriptId: 'custkey_appzen_sftp'
            });

            log.debug({
                title : 'Key',
                details : keyControlModule.scriptId
            });

            var myConn = createSftpConnection('upaya', 'sftp.appzen.com', hostKey, keyControlModule.scriptId);

            log.debug({
                title : 'Connection',
                details : myConn
            });

            var myFile = file.load({
                id : '3456'
            });

            var fileName = myFile.name;

            myConn.upload({
                directory: "/",
                filename: fileName,
                file: myFile,
                replaceExisting: true
            });

            /**
            var myFile = file.load({
                id : keyControlModule
            });

            log.debug({
                title : 'File',
                details : myFile
            });
             **/
        };
        function createSftpConnection(user, url, hostKey, keyId){
            // establish connection to remote FTP server
            var connection = sftp.createConnection({
                username: user,
                url: url,
                keyId: keyId,
                hostKey : hostKey
            });
            return connection;
        };
        return {
            execute: execute
        };

    });

