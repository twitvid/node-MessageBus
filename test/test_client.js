// for testing, use http://visionmedia.github.com/mocha/

var MsgBusClient = require('../lib/client.js'),
	assert = require("assert"),
	fs = require("fs");

var apiKey = "YOUR_ACCOUNT_API_KEY_GOES_HERE";
var emailAddress  = "test@example.com";

var testOverridesExist = fs.existsSync("../.test.json");
if (testOverridesExist) {
	var testOptions = require("../../.test.json");
	apiKey = testOptions.apiKey;
	emailAddress = testOptions.emailAddress;
}



describe('message/email/send', function() {
	it('bad api key', function(done) {
		var client = new MsgBusClient("fake key");
		client.sendEmailMessage(emailAddress, "cs@example.com", "Hello subjective world", {}, function(err, resp) {
			assert.equal(403, resp.statusCode);
			done();
		});
	});

	it('email stats', function(done) {
		var client = new MsgBusClient(apiKey);
		client.emailStatsSince(3600000, function(err, resp) {
			assert.ok(!err);
			assert.equal(200, resp.statusCode);
			assert.ok(resp.stats);
			assert.equal("number", typeof resp.stats.msgsAttemptedCount);
			done();
		});
	});

	it('simple send', function(done) {
		var client = new MsgBusClient(apiKey);
		client.sendEmailMessage(emailAddress, "cs@example.com", "Hello subjective world", {}, function(err, resp) {
			assert.ok(!err);
			assert.equal(202, resp.statusCode);
			assert.ok(resp.results);
			assert.equal("number", typeof resp.results.length);
			done();
		});
	});
});