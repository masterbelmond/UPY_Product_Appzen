//region FUNCTIONS

function groupBy(arr, key) {
    var newArr = [],
        types = {},
        newItem, i, j, cur;
    for (i = 0, j = arr.length; i < j; i++) {
        cur = arr[i];
        if (!(cur[key] in types)) {
            types[cur[key]] = { type: cur[key], data: [] };
            newArr.push(types[cur[key]]);
        }
        types[cur[key]].data.push(cur);
    }
    return newArr;
}


/**
 * @param {string} msg message title
 * @param {string} str debug message
 */
var loggerJSON = function(log, msg, str) {

    var sequenceNum = '';
    if (!isBlank(str)) {
        if (str.length >= 4000) {
            var arrStr = str.match(/.{1,4000}/g);
            for (var i in arrStr) {
                sequenceNum = (parseInt(i) + 1) + ' of ' + arrStr.length;
                log.debug('DEBUG', msg + ' | ' + sequenceNum, arrStr[i]);
            }
        } else {
            sequenceNum = '';
            log.debug('DEBUG', msg + ' | ' + sequenceNum, str);
        }
    }
};

function getAttachments(search) {

    var fileArr = [];

    var transactionSearchObj = search.create({
        type: 'transaction',
        filters:
            [
                ['type','anyof','VendBill','VendCred','PurchOrd'],
                'AND',
                ['file.internalid','noneof','@NONE@']
            ],
        columns:
            [
                search.createColumn({
                    name: 'internalid',
                    summary: 'GROUP',
                    label: 'Internal ID'
                }),
                search.createColumn({
                    name: 'type',
                    summary: 'GROUP',
                    label: 'Type'
                }),
                search.createColumn({
                    name: 'internalid',
                    join: 'file',
                    summary: 'GROUP',
                    label: 'Internal ID'
                })
            ]
    });
    var searchResultCount = transactionSearchObj.runPaged().count;
    transactionSearchObj.run().each(function(result){
        // .run().each has a limit of 4,000 results

        var transactionId = result.getValue({
            name: 'internalid',
            summary: 'GROUP'
        });

        var transactionType = result.getValue({
            name: 'type',
            summary: 'GROUP'
        });

        var fileId = result.getValue({
            name: 'internalid',
            join: 'file',
            summary: 'GROUP'
        });

        fileArr.push({
            'transactionId' : transactionId,
            'transactionType' : transactionType,
            'fileId' : fileId
        });

        return true;
    });

    return fileArr;
}

function getVendorAttachments(search){

    var fileArr = [];

    var vendorSearchObj = search.create({
        type: 'vendor',
        filters:
            [
                ['file.internalid','noneof','@NONE@']
            ],
        columns:
            [
                search.createColumn({
                    name: 'internalid',
                    summary: 'GROUP',
                    label: 'Internal ID'
                }),
                search.createColumn({
                    name: 'internalid',
                    join: 'file',
                    summary: 'GROUP',
                    label: 'Internal ID'
                })
            ]
    });
    var searchResultCount = vendorSearchObj.runPaged().count;
    vendorSearchObj.run().each(function(result){

        var supplierId = result.getValue({
            name: 'internalid',
            summary: 'GROUP'
        });

        var fileId = result.getValue({
            name: 'internalid',
            join: 'file',
            summary: 'GROUP'
        });

        fileArr.push({
            'supplierId' : supplierId,
            'fileId' : fileId
        });
        return true;
    });

    return fileArr;
}

function getSupplierAttachments(json, suppliersArr) {

    var attachments = [];
    for(var i in json){
        for(var z in suppliersArr){
            var supplierId = suppliersArr[z];
            if(supplierId == json[i].supplierId){
                attachments.push(json[i].fileId);
            }
        }
    }
    return attachments;
}

function getTransactionAttachments(json, transactionId) {

    var attachments = [];
    for(var i in json){
        if(transactionId == json[i].transactionId){
            attachments.push(json[i].fileId);
        }
    }
    return attachments;
}

function createFile(file, fileName, contents, folder) {

    var fileObj = file.create({
        name: fileName,
        fileType: file.Type.PLAINTEXT,
        contents: contents,
        folder : folder
    });

    var id = fileObj.save();
    return id;
}

function createFileObj(file, fileName, contents, folder) {

    var fileObj = file.create({
        name: fileName,
        fileType: file.Type.PLAINTEXT,
        contents: contents,
        folder : folder
    });

    var id = fileObj.save();
    return fileObj;
}

function createSftpConnection(sftp, user, url, hostKey, keyId){
    // establish connection to remote FTP server
    var connection = sftp.createConnection({
        username: user,
        url: url,
        keyId: keyId,
        hostKey : hostKey
    });
    return connection;
};

function timeStamp() {
// Create a date object with the current time
    var now = new Date();

// Create an array with the current month, day and time
    var date = [ now.getMonth() + 1, now.getDate(), now.getFullYear() ];

// Create an array with the current hour, minute and second
    var time = [ now.getHours(), now.getMinutes(), now.getSeconds() ];

// Determine AM or PM suffix based on the hour
    var suffix = ( time[0] < 12 ) ? "AM" : "PM";

// Convert hour from military time
    time[0] = ( time[0] < 12 ) ? time[0] : time[0] - 12;

// If hour is 0, set it to 12
    time[0] = time[0] || 12;

// If seconds and minutes are less than 10, add a zero
    for ( var i = 1; i < 3; i++ ) {
        if ( time[i] < 10 ) {
            time[i] = "0" + time[i];
        }
    }

// Return the formatted string
    return date.join("-") + "-" + time.join("-") + "-" + suffix;
}

function filteredArray(arr, key, value) {
    const newArray = [];
    for(i=0, l=arr.length; i<l; i++) {
        if(arr[i][key] === value) {
            delete arr[i].external_supplier_id;
            newArray.push(arr[i]);
        }
    }
    return newArray;
}

function findFromArray(array,key,value) {
    return array.filter(function (element) {
        return element[key] == value;
    }).shift();
}

function generateLog(record, _log){

    var req = _log.request;
    var request = '';
    if(!isBlank(req)) {
        request = req.slice(0, 999);
    }
    else{
        request = req;
    }
    var logs = record.create({
        type: 'customrecord_appzen_integration_logs',
        isDynamic: true
    });

    logs.setValue({
        fieldId: 'custrecord_appzen_datetime',
        value: _log.datetime
    });

    logs.setValue({
        fieldId: 'custrecord_appzen_request',
        value: request
    });

    logs.setValue({
        fieldId: 'custrecord_appzen_response',
        value: _log.response
    });

    logs.setValue({
        fieldId: 'custrecord_appzen_url',
        value: _log.url
    });

    logs.setValue({
        fieldId: 'custrecord_appzen_code',
        value: _log.code
    });

    logs.setValue({
        fieldId: 'custrecord_appzen_netsuite_record_type',
        value: _log.record_type
    });

    try{
        var logId = logs.save();
    }
    catch(ex){
        log.error('Error', e);
    }
}

/**
 * @param {string} test input the string to look for space characters
 * @return {boolean}
 */
function isBlank(test) {
    if ((test == '') || (test == null) || (test == undefined) ||
        (test.toString().charCodeAt() == 32)) {
        return true;
    } else {
        return false;
    }
}

function convertStrToBool(str)
{
    switch(String(str).toLowerCase())
    {
        case 'undefined': case 'null': case 'nan': case 'false': case 'no': case 'f': case 'n': case '0': case 'off': case '':
        return false;
        break;
        default:
            return true;
    };
};

//endregion FUNCTIONS

//region LIST


var RECORD_TYPE_LIST = {
    'VENDOR' : '-3',
    'PURCHASE_ORDER' : '-30',
    'INVOICE' : '-30'
};

//endregion LIST