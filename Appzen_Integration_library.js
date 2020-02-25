//region FUNCTIONS

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
        value: JSON.stringify(_log.request)
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

//endregion FUNCTIONS

//region LIST

var RECORD_TYPE_LIST = {
    'VENDOR' : '-3',
    'PURCHASE_ORDER' : '',
    'INVOICE' : ''
};

//endregion LIST