// for testing, use http://visionmedia.github.com/mocha/

var MsgBusClient = require('../lib/client.js'),
	BatchSender = require('../lib/batch_sender.js'),
	assert = require('assert'),
	fs = require('fs');

var apiKey = 'YOUR_ACCOUNT_API_KEY_GOES_HERE';
var emailAddresses  = ['test@example.com', 'test2@example.com'];
var channelGuid = '0123456789abcdef';

var testOverridesExist = fs.existsSync('../.test.json');
if (testOverridesExist) {
	var testOptions = require('../../.test.json');
	apiKey = testOptions.apiKey;
	emailAddresses = testOptions.emailAddresses;
	channelGuid = testOptions.default_channel_guid;
}


describe('BatchSender tests:', function() {
	it('send 2', function(done) {
		var client = new MsgBusClient(apiKey);
		var batch = new BatchSender(client);

		var count = 0;
		emailAddresses.forEach(function(emailAddress) {
			batch.push(emailAddress, 'cs@example.com', 'Email Test #' + count, {}, function(err, resp) {
				console.info(resp);
				assert.ok(!err);
				assert.equal(202, resp.statusCode);
				assert.ok(resp.results);
				assert.equal('number', typeof resp.results.length);

				++count;
				if (count === emailAddresses.length) {
					done();
				}
			});
		});

		batch.flush();
	});
});