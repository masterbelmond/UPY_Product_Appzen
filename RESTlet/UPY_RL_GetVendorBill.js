/**
 * Link: https://tstdrv1507457.app.netsuite.com/app/common/scripting/script.nl?id=1108&id=1108&whence=
 * @param dataIn
 * @returns {string}
 */

function get(dataIn){

    loggerJSON('JSON', JSON.parse(dataIn));

    var json  = JSON.parse(dataIn);

    var jsonResult = [];

    var customFields = {};
    var header = {};
    var lineItems = {};
    var lineExpense = {};

    if(!isBlank(json)){
        var id = json.id;

        var obj = nlapiLoadRecord('vendorbill', id);
        var headerFields = obj.getAllFields();
        for(var i in headerFields){

            var field = headerFields[i];
            //custom fields
            if(field.indexOf('custbody_') == 0){

                var val = obj.getFieldValue(headerFields[i]);
                if(!isBlank(val)) {
                    if(field == 'custbody_report_timestamp') {
                        customFields[field] = nlapiStringToDate(clean(val.toString()));
                    }
                    else{
                        customFields[field] = clean(val.toString());
                    }
                }
            }
        }

        //region Line Items
        var itemFields = obj.getAllLineItemFields('item');
        var itemLineCount = obj.getLineItemCount('item');

        for(var i = 1; i <= itemLineCount; i++) {
            for (var v in itemFields) {
                var field = itemFields[v];
                var temp = obj.getLineItemValue('item', itemFields[v], i);
                if(!isBlank(temp)) {
                    lineItems[field] = clean(temp);
                }
            }
        }
        //endregion Line Items

        //region Expense Items
        var expenseFields = obj.getAllLineItemFields('expense');
        var expenseLineCount = obj.getLineItemCount('expense');

        for(var i = 1; i <= expenseLineCount; i++) {
            for (var v in expenseFields) {
                var field = expenseFields[v];
                var temp = obj.getLineItemValue('expense', expenseFields[v], i);
                if(!isBlank(temp)) {
                    lineExpense[field] = clean(temp);
                }
            }
        }
        //endregion Expense Items

        var arrFields = VENDOR_BILL_FIELDS;
        var keys = Object.keys(arrFields);
        for(var i = 0; i < keys.length; i++){
            var field = keys[i];
            var dataType = arrFields[field];

            var val = obj.getFieldValue(field);

            if(!isBlank(val)) {
                if(dataType == 'datetime') {
                    header[field] = nlapiStringToDate(val.toString());
                }
                else{
                    header[field] = clean(val.toString());
                }
            }
        }
    }

    var lines = []
    lines.push({
        'items' : lineItems,
        'expense' : lineExpense
    })

    jsonResult.push({
        'fields' : header,
        'customfields' : customFields,
        'lines' : lines
    })

    loggerJSON('RESULT', JSON.stringify(jsonResult));
    var json = JSON.stringify(jsonResult);
    return json.replace(/\n/g, " ");
}