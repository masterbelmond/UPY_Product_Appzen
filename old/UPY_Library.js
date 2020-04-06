//region COMMON FUNCTIONS

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

/**
 * @param {string} msg message title
 * @param {string} str debug message
 */
var loggerJSON = function(msg, str) {
    var d = nlapiDateToString(new Date(), 'datetimetz');
    var sequenceNum = '';
    if (!isBlank(str)) {
        if (str.length > 4000) {
            var arrStr = str.match(/.{1,4000}/g);
            for (var i in arrStr) {
                sequenceNum = 'Datetime: ' + d + ' | ' + (parseInt(i) + 1) + ' of ' +
                    arrStr.length;
                nlapiLogExecution('DEBUG', msg + ' | ' + sequenceNum, arrStr[i]);
            }
        } else {
            sequenceNum = 'Datetime: ' + d;
            nlapiLogExecution('DEBUG', msg + ' | ' + sequenceNum, str);
        }
    }
};

function clean(str){
    return str.replace(/(\r\n|\n|\r)/gm, "")
}

//endregion COMMON FUNCTIONS

//region LIST

var VENDOR_BILL_FIELDS = {

    'account' : 'select',
    'approvalstatus' : 'select',
    'availablevendorcredit' : 'currency',
    'balance' : 'text',
    'billaddresslist' : 'select',
    'class' : 'select',
    'createddate' : 'datetime',
    'creditlimit' : 'currency',
    'currency' : 'select',
    'currencyname' : 'text',
    'currencysymbol' : 'text',
    'customform' : 'select',
    'department' : 'select',
    'discountamount' : 'currency',
    'discountdate' : 'date',
    'documentstatus' : 'text',
    'duedate' : 'date',
    'entity' : 'select',
    'entitynexus' : 'select',
    'entitytaxregnum' : 'select',
    'exchangerate' : 'currency2',
    'externalid' : 'text',
    'isbasecurrency' : 'checkbox',
    'landedcostperline' : 'checkbox',
    'lastmodifieddate' : 'datetime',
    'location' : 'select',
    'memo' : 'text',
    'nextapprover' : 'select',
    'nexus' : 'select',
    'paymenthold' : 'checkbox',
    'postingperiod' : 'select',
    'received' : 'text',
    //'status' : 'text',
    'statusRef' : 'text',
    'subsidiary' : 'select',
    'subsidiarytaxregnum' : 'select',
    'taxdetailsoverride' : 'checkbox',
    'taxregoverride' : 'checkbox',
    'terms' : 'select',
    'total' : 'currency',
    'trandate' : 'date',
    'tranid' : 'text',
    'transactionnumber' : 'text',
    'unbilledorders' : 'text',
    'usertotal' : 'currency'
};

//endregion LIST