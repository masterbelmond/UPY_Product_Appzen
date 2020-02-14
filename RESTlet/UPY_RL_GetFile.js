function getFile(dataIn){

    var xml = '';
    var json = JSON.parse(dataIn);
    var fileId = json.file;

    xml += '<soapenv:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">';
    xml += '    <soapenv:Header>';
    xml += '        <ns3:applicationInfo soapenv:mustUnderstand="0" soapenv:actor="http://schemas.xmlsoap.org/soap/actor/next" xmlns:ns3="urn:messages_2019_1.platform.webservices.netsuite.com">';
    xml += '            <ns3:applicationId>A8A9998D-F63F-4C87-9103-1A6C66E4A5ED</ns3:applicationId>';
    xml += '        </ns3:applicationInfo>';
    xml += '        <passport soapenv:mustUnderstand="0" soapenv:actor="http://schemas.xmlsoap.org/soap/actor/next" xmlns="urn:core_2019_1.platform.webservices.netsuite.com">';
    xml += '            <email>eliseo@upayasolution.com</email>';
    xml += '            <password>2009M@rielle!</password>';
    xml += '            <account>TSTDRV1507457</account>';
    xml += '        </passport>';
    xml += '    </soapenv:Header>';
    xml += '    <soapenv:Body>';
    xml += '        <platformMsg:get xmlns:platformMsg="urn:messages_2019_1.platform.webservices.netsuite.com">';
    xml += '            <platformMsg:baseRef xsi:type="platformCore:RecordRef" type="file" internalId="' + fileId + '" xmlns:platformCore="urn:core_2019_1.platform.webservices.netsuite.com" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">';
    xml += '                <platformCore:name/>';
    xml += '            </platformMsg:baseRef>';
    xml += '        </platformMsg:get>';
    xml += '    </soapenv:Body>';
    xml += '</soapenv:Envelope>';

    var url = 'https://tstdrv1507457.suitetalk.api.netsuite.com/services/NetSuitePort_2019_1';
    var header = new Array();
    header['SOAPAction'] = 'get';
    header['Content-Type'] = 'application/xml';

    var response = nlapiRequestURL(url, xml, header, null, null);

    if (response.length <= 1) {
        nlapiLogExecution('error', 'null response from get File', 'response is null, exiting');
        return;
    }

    var responseXML = nlapiStringToXML(response.getBody());

    return response.getBody();
}