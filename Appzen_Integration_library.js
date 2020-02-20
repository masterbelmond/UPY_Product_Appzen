//region FUNCTIONS

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
    'VENDOR' : '-3'
};

//endregion LIST