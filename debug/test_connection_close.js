//// for testing, use http://visionmedia.github.com/mocha/
//
//var MsgBusClient = require('../lib/client.js'),
//	assert = require('assert'),
//	fs = require('fs'),
//	https = require('https');
//
//var apiKey = 'YOUR_ACCOUNT_API_KEY_GOES_HERE';
//var emailAddress  = 'test@example.com';
//var channelGuid = '0123456789abcdef';
//
//var testOverridesExist = fs.existsSync('../.test.json');
//if (testOverridesExist) {
//	var testOptions = require('../../.test.json');
//	apiKey = testOptions.apiKey;
//	emailAddress = testOptions.emailAddress;
//	channelGuid = testOptions.default_channel_guid;
//}
//
//// client
//var client = new MsgBusClient(apiKey);
//
//// callback
//function responseCallback(num, err, resp) {
//	console.info("RESPONSE FROM CALL", num);
//	if (err) {
//		console.error(err);
//	} else {
//		console.log(resp);
//	}
//}
//
//describe('test Jetty forced connection close', function() {
//	// 90-seconds
//	this.timeout(90000);
//
//	it('each second for 1-minute', function(done) {
//		for (var i = 0; i < 200; i++) {
////			var callInMs = 1000 * i;
//			var callInMs = 20 * i;
//			setTimeout(client.getEmailStatsSince.bind(client, 10000, responseCallback.bind(this, i)), callInMs);
//		}
//	});
//});